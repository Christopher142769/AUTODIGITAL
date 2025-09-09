from pydantic.json_schema import JsonSchemaValue
from pydantic import BaseModel, Field, BeforeValidator
import config
from fastapi import FastAPI, HTTPException, Depends, status, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
import logging
from pathlib import Path
from Assistant_Dux import AssistantDux
import re
from typing import Dict, List, Any, Optional
import json
import bcrypt
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from datetime import datetime, timedelta
from enum import Enum
import shutil
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from typing_extensions import Annotated
import certifi
from motor.motor_asyncio import AsyncIOMotorClient
import ssl
from fastapi import FastAPI
from motor.motor_asyncio import AsyncIOMotorClient
import certifi
import logging
from config import settings, mongodb_client, db  # Utilisation directe de config.py
import config  # ton fichier config.py avec Settings()
# --- IMPORTS PAYDUNYA ---
import paydunya
from paydunya import Invoice
# --- Configuration PayDunya ---
PAYDUNYA_ACCESS_TOKENS = {
    'PAYDUNYA-MASTER-KEY': "wQzk9ZwR-Qq9m-0hD0-zpud-je5coGC3FHKW",
    'PAYDUNYA-PRIVATE-KEY': "test_private_rMIdJM3PLLhLjyArx9tF3VURAF5",
    'PAYDUNYA-TOKEN': "IivOiOxGJuWhc5znlIiK"
}
paydunya.debug = True
paydunya.api_keys = PAYDUNYA_ACCESS_TOKENS

# --- Logging ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Répertoire upload ---
UPLOAD_DIR = Path("upload")
UPLOAD_DIR.mkdir(exist_ok=True)

# --- App FastAPI ---
app = FastAPI(
    title="Assistant Dux Web",
    description="API pour modifier des fichiers web avec l'IA",
    version="1.0.0"
)

# --- CORS ---
from fastapi.middleware.cors import CORSMiddleware

origins = [
    "http://localhost:3000",
    "https://autodigitalservices.onrender.com"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,       # ⚠️ Pas "*" si credentials=True
    allow_credentials=True,      
    allow_methods=["*"],         # OPTIONS sera automatiquement géré
    allow_headers=["*"],
)



# --- Authentification ---
SECRET_KEY = "votre-clé-secrète-ultra-sécurisée"  # ⚠️ Change ça avant prod
ALGORITHM = "HS256"
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


# ============================================================
#                        Modèles
# ============================================================

class UserRole(str, Enum):
    admin = "admin"
    user = "user"

class PaymentRequest(BaseModel):
    plan: str
    amount: int
    return_url: str
    callback_url: str

class PayDunyaCallback(BaseModel):
    token: str
    checkout_invoice_token: str

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v: Any, info: Any = None) -> ObjectId:
        if isinstance(v, ObjectId):
            return v
        if not ObjectId.is_valid(v):
            raise ValueError("ID invalide")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, core_schema, handler) -> JsonSchemaValue:
        field_schema = handler(core_schema)
        field_schema.update(type="string", example="507f1f77bcf86cd799439011")
        return field_schema

class UserInDB(BaseModel):
    id: Annotated[Optional[PyObjectId], BeforeValidator(PyObjectId)] = Field(alias="_id", default=None)
    username: str
    hashed_password: str
    role: UserRole = UserRole.user
    trials_left: int = 3
    subscription_end: str | None = None

    class Config:
        json_encoders = {ObjectId: str}
        populate_by_name = True
        arbitrary_types_allowed = True

class LoginRequest(BaseModel):
    username: str
    password: str

class UpdateSubscription(BaseModel):
    username: str
    months: int

class UpdateProfile(BaseModel):
    new_username: str | None = None
    new_password: str | None = None

class ManageAdmin(BaseModel):
    username: str

class NotificationInDB(BaseModel):
    timestamp: str
    message: str
    user: str
    months: Optional[int]
    status: str

class GenerationRequest(BaseModel):
    file_path: str
    user_query: str


# ============================================================
#               Connexion MongoDB (Startup/Shutdown)
# ============================================================

from motor.motor_asyncio import AsyncIOMotorClient
import certifi
import bcrypt
import logging
from fastapi import FastAPI
import config  # ton fichier config.py avec Settings()
import os
from dotenv import load_dotenv
load_dotenv()
logger = logging.getLogger(__name__)
app = FastAPI()

@app.on_event("startup")
async def startup_db_client():
    try:
        # --- Connexion sécurisée à MongoDB via variable d'environnement ---
        mongodb_url = os.environ.get("DATABASE_URL")
        if not mongodb_url:
            raise Exception("La variable d'environnement DATABASE_URL n'est pas définie.")
        
        app.mongodb_client = AsyncIOMotorClient(
            mongodb_url,
            tls=True,
            tlsCAFile=certifi.where(),
            tlsAllowInvalidCertificates=False
        )

        # Sélection de la base de données
        app.database = app.mongodb_client[os.environ.get("DB_NAME", "autodigital")]

        # Test de connexion
        await app.mongodb_client.admin.command("ping")
        logger.info(f"✅ Connecté à MongoDB '{app.database.name}'.")

        # Création de l'admin par défaut si absent
        admin_user = await app.database["users"].find_one({"username": "admin"})
        if not admin_user:
            logger.info("Création de l'admin par défaut...")
            admin_password = bcrypt.hashpw("admin_password".encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
            await app.database["users"].insert_one({
                "username": "admin",
                "hashed_password": admin_password,
                "role": "admin",
                "trials_left": -1
            })

    except Exception as e:
        logger.error(f"❌ Erreur connexion MongoDB: {e}")
        raise


@app.on_event("shutdown")
async def shutdown_db_client():
    if hasattr(app, "mongodb_client"):
        app.mongodb_client.close()
        logger.info("🛑 Connexion MongoDB fermée.")

@app.on_event("shutdown")
async def shutdown_db_client():
    app.mongodb_client.close()
    logger.info("Connection à la base de données MongoDB fermée.")

# --- Fonctions d'aide pour l'authentification (Mises à jour) ---
async def get_user_from_db(username: str) -> Optional[UserInDB]:
    user_data = await app.database[config.settings.USERS_COLLECTION_NAME].find_one({"username": username})
    if user_data:
        # Vérifier et mettre à jour le statut d'abonnement
        if user_data.get("subscription_end"):
            sub_end_date = datetime.fromisoformat(user_data["subscription_end"])
            if datetime.now() > sub_end_date:
                # Mettre à jour dans la base de données
                await app.database[config.settings.USERS_COLLECTION_NAME].update_one(
                    {"username": username},
                    {"$set": {"trials_left": 0, "subscription_end": None}}
                )
                user_data["trials_left"] = 0
                user_data["subscription_end"] = None
        return UserInDB(**user_data)
    return None

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=30)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Token invalide")
        user = await get_user_from_db(username)
        if user is None:
            raise HTTPException(status_code=401, detail="Utilisateur non trouvé")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalide")

# Fonction pour vérifier si l'utilisateur est un admin
async def get_current_admin_user(current_user: UserInDB = Depends(get_current_user)):
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Accès refusé. Vous n'êtes pas administrateur.")
    return current_user

# Fonction pour ajouter une notification
async def add_notification(message: str, user: str, months: Optional[int], status: str):
    try:
        notification_data = {
            "timestamp": datetime.now().isoformat(),
            "message": message,
            "user": user,
            "months": months,
            "status": status
        }
        await app.database[config.settings.NOTIFICATIONS_COLLECTION_NAME].insert_one(notification_data)
    except Exception as e:
        logger.error(f"Erreur d'ajout de notification: {e}")

# --- Regex pour extraire le code ---
CODE_PATTERN = re.compile(r'\[CODE_START\](.*?)\[CODE_END\]', re.DOTALL)


# --- Endpoints de l'application ---

# Endpoint pour créer une facture de paiement
@app.post("/create-payment-invoice")
async def create_payment_invoice(request: PaymentRequest, current_user: UserInDB = Depends(get_current_user)):
    try:
        invoice = Invoice()
        invoice.add_item(
            name=f"Abonnement {request.plan} pour {current_user.username}",
            quantity=1,
            unit_price=request.amount,
            total_price=request.amount
        )
        invoice.add_custom_data("username", current_user.username)
        invoice.add_custom_data("plan", request.plan)
        invoice.add_custom_data("months", {"1_month": 1, "6_months": 6, "12_months": 12}.get(request.plan))

        invoice.set_total_price(request.amount)
        invoice.set_cancel_url(request.return_url)
        invoice.set_return_url(request.return_url)
        invoice.set_callback_url(request.callback_url)

        if invoice.create():
            return {"success": True, "invoice_url": invoice.invoice_url}
        else:
            logger.error(f"PayDunya API Error: {invoice.response_text}")
            raise HTTPException(status_code=500, detail="Erreur lors de la création de la facture de paiement.")

    except Exception as e:
        logger.error(f"Erreur de création de facture: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur.")

# Endpoint pour la vérification de la transaction (Callback PayDunya)
@app.post("/payment-callback")
async def paydunya_callback(request: PayDunyaCallback):
    try:
        invoice = Invoice()
        invoice.confirm(request.token)

        if invoice.status == "completed":
            username = invoice.get_custom_data("username")
            plan = invoice.get_custom_data("plan")
            months = invoice.get_custom_data("months")

            user_in_db = await get_user_from_db(username)
            if user_in_db:
                # Mettre à jour l'abonnement dans la base de données
                await app.database[config.settings.USERS_COLLECTION_NAME].update_one(
                    {"username": username},
                    {"$set": {
                        "trials_left": -1,
                        "subscription_end": (datetime.now() + timedelta(days=months * 30)).isoformat()
                    }}
                )

                # Créer une notification pour l'administrateur
                notification_message = f"Paiement reçu ! 🎉 {username} a payé un abonnement de {months} mois pour le plan '{plan}'."
                await add_notification(notification_message, username, months, "success")
                logger.info(notification_message)

            return {"success": True, "message": "Paiement validé et abonnement mis à jour."}
        else:
            await add_notification(f"Échec de paiement pour l'utilisateur: {invoice.get_custom_data('username')}.", invoice.get_custom_data("username"), None, "failed")
            return {"success": False, "message": "Paiement non complété."}

    except Exception as e:
        logger.error(f"Erreur de callback PayDunya: {e}")
        await add_notification(f"Erreur interne du serveur lors du traitement d'un paiement.", "system", None, "error")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur lors du traitement du paiement.")


@app.post("/register")
async def register(request: LoginRequest):
    if await get_user_from_db(request.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ce nom d'utilisateur existe déjà."
        )
    
    hashed_password = bcrypt.hashpw(request.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    new_user = {
        "username": request.username,
        "hashed_password": hashed_password,
        "role": "user",
        "trials_left": 3,
        "subscription_end": None
    }
    await app.database[config.settings.USERS_COLLECTION_NAME].insert_one(new_user)
    
    return {"message": "Utilisateur enregistré avec succès"}

@app.post("/login")
async def login(request: LoginRequest):
    logger.info(f"Tentative de connexion pour l'utilisateur: {request.username}")
    user_in_db = await get_user_from_db(request.username)

    if not user_in_db:
        logger.warning(f"Utilisateur non trouvé: {request.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nom d'utilisateur ou mot de passe incorrect."
        )

    try:
        password_valid = bcrypt.checkpw(
            request.password.encode('utf-8'),
            user_in_db.hashed_password.encode('utf-8')
        )
    except Exception as e:
        logger.error(f"Erreur lors de la vérification du mot de passe pour {request.username}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Erreur interne du serveur lors de la vérification du mot de passe."
        )

    if not password_valid:
        logger.warning(f"Mot de passe incorrect pour l'utilisateur: {request.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nom d'utilisateur ou mot de passe incorrect."
        )

    access_token = create_access_token(
        data={"sub": user_in_db.username},
        expires_delta=timedelta(hours=24)
    )

    logger.info(f"Connexion réussie pour l'utilisateur: {request.username}")
    return {"access_token": access_token, "token_type": "bearer", "role": user_in_db.role}

@app.get("/user/me")
async def get_my_info(current_user: UserInDB = Depends(get_current_user)):
    return {"username": current_user.username, "trials_left": current_user.trials_left, "role": current_user.role, "subscription_end": current_user.subscription_end}

@app.post("/generate")
async def generate_template(request: GenerationRequest, current_user: UserInDB = Depends(get_current_user)):
    if current_user.trials_left <= 0:
        if current_user.subscription_end:
            sub_end_date = datetime.fromisoformat(current_user.subscription_end)
            if datetime.now() > sub_end_date:
                 raise HTTPException(status_code=403, detail="Votre abonnement a expiré.")
        else:
            raise HTTPException(status_code=403, detail="Vous avez atteint votre limite de 3 essais.")
        
    try:
        assistant = AssistantDux()
        
        user_folder = UPLOAD_DIR / current_user.username
        if not user_folder.exists():
            user_folder.mkdir()
            
        target_file_path = user_folder / request.file_path

        modification_result = assistant.process_user_request(
            target_file=str(target_file_path),
            user_query=request.user_query
        )

        if modification_result["success"]:
            # Décrémenter le nombre de tentatives uniquement si l'utilisateur n'est pas en mode illimité
            if current_user.trials_left > 0:
                await app.database[config.settings.USERS_COLLECTION_NAME].update_one(
                    {"username": current_user.username},
                    {"$inc": {"trials_left": -1}}
                )
                current_user.trials_left -= 1
            
            full_code = modification_result.get("code_applied", "")
            match = CODE_PATTERN.search(full_code)
            clean_code = match.group(1).strip() if match else full_code
            
            return {
                "status": "success",
                "message": "Template généré et mis à jour avec succès !",
                "code": clean_code,
                "trials_left": current_user.trials_left
            }
        else:
            raise HTTPException(status_code=500, detail=f"Échec de la génération : {modification_result['message']}")
            
    except Exception as e:
        logger.error(f"Erreur lors de la génération du template : {e}")
        raise HTTPException(status_code=500, detail=f"Erreur interne du serveur : {str(e)}")

@app.get("/list-files")
async def list_files(current_user: UserInDB = Depends(get_current_user)):
    try:
        user_folder = UPLOAD_DIR / current_user.username
        if not user_folder.exists():
            return {"success": True, "files": [], "count": 0}
            
        files = []
        for item in user_folder.iterdir():
            if item.is_file() and not item.name.startswith('.'):
                files.append({
                    "name": item.name,
                    "path": str(item.relative_to(user_folder)),
                    "size": item.stat().st_size,
                    "extension": item.suffix
                })
        
        return {
            "success": True,
            "files": files,
            "count": len(files),
            "working_directory": str(user_folder.absolute())
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la lecture du répertoire d'upload : {str(e)}"
        )

@app.get("/get-file-content")
async def get_file_content(file_path: str, current_user: UserInDB = Depends(get_current_user)):
    user_folder = UPLOAD_DIR / current_user.username
    target_file_path = user_folder / file_path
    logger.info(f"Tentative de lecture du fichier : {target_file_path}")

    if not target_file_path.is_file():
        raise HTTPException(
            status_code=404,
            detail=f"Fichier non trouvé à l'emplacement : {target_file_path}"
        )
    
    with open(target_file_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    return {"content": content}

@app.get("/files/{username}/{file_path:path}")
async def serve_user_file(username: str):
    # La lecture du fichier est gérée par le serveur web
    # qui sert le contenu du répertoire 'upload'.
    # On laisse le code tel quel car il n'interagit pas avec la DB.
    pass

# --- Endpoints Admin mis à jour ---
@app.get("/admin/users")
async def get_all_users(current_admin: UserInDB = Depends(get_current_admin_user)):
    try:
        users = []
        async for user_data in app.database[config.settings.USERS_COLLECTION_NAME].find():
            user_data.pop('hashed_password', None)
            users.append(user_data)
        return {"users": users}
    except Exception as e:
        logger.error(f"Erreur de lecture de la base de données des utilisateurs: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur.")
        
@app.post("/admin/update-subscription")
async def update_subscription(request: UpdateSubscription, current_admin: UserInDB = Depends(get_current_admin_user)):
    if request.username == "admin":
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas modifier l'abonnement de l'administrateur.")
        
    user_in_db = await get_user_from_db(request.username)
    if not user_in_db:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé.")
        
    try:
        subscription_end_date = datetime.now() + timedelta(days=request.months * 30)
        
        await app.database[config.settings.USERS_COLLECTION_NAME].update_one(
            {"username": request.username},
            {"$set": {
                "trials_left": -1,
                "subscription_end": subscription_end_date.isoformat()
            }}
        )
        return {"message": f"Abonnement de {request.months} mois accordé à {request.username}."}
            
    except Exception as e:
        logger.error(f"Erreur lors de la mise à jour de l'abonnement: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur.")

# --- NOUVEAUX ENDPOINTS POUR L'ADMIN ---

@app.get("/admin/notifications")
async def get_admin_notifications(current_admin: UserInDB = Depends(get_current_admin_user)):
    try:
        notifications = []
        async for notification_data in app.database[config.settings.NOTIFICATIONS_COLLECTION_NAME].find().sort("timestamp", -1):
            notifications.append(notification_data)
        return {"notifications": notifications}
    except Exception as e:
        logger.error(f"Erreur de lecture de la base de données des notifications: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur.")

@app.put("/admin/profile")
async def update_admin_profile(request: UpdateProfile, current_admin: UserInDB = Depends(get_current_admin_user)):
    try:
        update_data = {}
        
        if request.new_password:
            hashed_password = bcrypt.hashpw(request.new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            update_data["hashed_password"] = hashed_password
        
        if request.new_username and request.new_username != current_admin.username:
            if await app.database[config.settings.USERS_COLLECTION_NAME].find_one({"username": request.new_username}):
                raise HTTPException(status_code=400, detail="Ce nom d'utilisateur est déjà pris.")
            
            update_data["username"] = request.new_username
            
            # Renommer le répertoire de l'utilisateur
            old_folder = UPLOAD_DIR / current_admin.username
            new_folder = UPLOAD_DIR / request.new_username
            if old_folder.exists():
                shutil.move(str(old_folder), str(new_folder))
        
        if update_data:
            await app.database[config.settings.USERS_COLLECTION_NAME].update_one(
                {"username": current_admin.username},
                {"$set": update_data}
            )

        return {"message": "Profil mis à jour avec succès", "new_username": request.new_username or current_admin.username}
    except Exception as e:
        logger.error(f"Erreur lors de la mise à jour du profil: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur.")

@app.post("/admin/profile/upload-image")
async def upload_profile_image(file: UploadFile = File(...), current_admin: UserInDB = Depends(get_current_admin_user)):
    try:
        user_folder = UPLOAD_DIR / current_admin.username
        if not user_folder.exists():
            user_folder.mkdir()
            
        # Supprimer les anciennes images de profil pour éviter l'encombrement
        for f in user_folder.glob("profile_image.*"):
            f.unlink()
            
        file_extension = Path(file.filename).suffix
        file_path = user_folder / f"profile_image{file_extension}"
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        return {"message": "Image de profil téléchargée avec succès", "image_url": f"/files/{current_admin.username}/profile_image{file_extension}"}
    except Exception as e:
        logger.error(f"Erreur lors du téléchargement de l'image de profil: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur.")


@app.delete("/admin/users/{username}")
async def delete_user(username: str, current_admin: UserInDB = Depends(get_current_admin_user)):
    if username == "admin" or username == current_admin.username:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas vous supprimer ou supprimer l'administrateur principal.")

    user_data = await app.database[config.settings.USERS_COLLECTION_NAME].find_one({"username": username})
    if not user_data:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé.")

    try:
        await app.database[config.settings.USERS_COLLECTION_NAME].delete_one({"username": username})
        
        # Supprimer le répertoire de l'utilisateur
        user_folder = UPLOAD_DIR / username
        if user_folder.exists():
            shutil.rmtree(user_folder)
            
        return {"message": f"Utilisateur {username} supprimé avec succès."}
    except Exception as e:
        logger.error(f"Erreur lors de la suppression de l'utilisateur: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur.")

@app.post("/admin/promote")
async def promote_user_to_admin(request: ManageAdmin, current_admin: UserInDB = Depends(get_current_admin_user)):
    if request.username == "admin":
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas modifier le rôle de l'administrateur principal.")
        
    user_in_db = await get_user_from_db(request.username)
    if not user_in_db:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé.")
        
    try:
        await app.database[config.settings.USERS_COLLECTION_NAME].update_one(
            {"username": request.username},
            {"$set": {"role": "admin"}}
        )
        return {"message": f"Utilisateur {request.username} promu au rôle d'administrateur avec succès."}
    except Exception as e:
        logger.error(f"Erreur lors de la promotion de l'utilisateur: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur.")

@app.post("/admin/demote")
async def demote_admin_to_user(request: ManageAdmin, current_admin: UserInDB = Depends(get_current_admin_user)):
    if request.username == "admin" or request.username == current_admin.username:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas rétrograder l'administrateur principal ou vous-même.")
        
    user_in_db = await get_user_from_db(request.username)
    if not user_in_db:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé.")
        
    try:
        await app.database[config.settings.USERS_COLLECTION_NAME].update_one(
            {"username": request.username},
            {"$set": {"role": "user"}}
        )
        return {"message": f"Administrateur {request.username} rétrogradé au rôle d'utilisateur avec succès."}
    except Exception as e:
        logger.error(f"Erreur lors de la rétrogradation de l'administrateur: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur.")
        
# --- Nouveau endpoint pour les statistiques de l'administrateur ---
@app.get("/admin/stats")
async def get_admin_stats(current_admin: UserInDB = Depends(get_current_admin_user)):
    try:
        # 1. Nombre total d'utilisateurs
        total_users = await app.database[config.settings.USERS_COLLECTION_NAME].count_documents({})
        
        # 2. Top 5 des utilisateurs les plus actifs
        user_generations = {}
        for user_folder in UPLOAD_DIR.iterdir():
            if user_folder.is_dir():
                username = user_folder.name
                # Compter le nombre de fichiers (générations) dans le dossier de l'utilisateur
                generations_count = len(list(user_folder.glob("*.html")))
                user_generations[username] = generations_count
        
        # Trier par nombre de générations décroissant et prendre le top 5
        top_users = sorted(user_generations.items(), key=lambda item: item[1], reverse=True)[:5]
        
        # Convertir en un format facile à utiliser pour le frontend
        top_users_data = [{"username": user, "generations": count} for user, count in top_users]

        return {
            "total_users": total_users,
            "top_users": top_users_data,
        }
        
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des statistiques: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur lors de la récupération des statistiques.")

if __name__ == "__main__":
    import uvicorn
    import os

    port = int(os.environ.get("PORT", 8000))

    logger.info("🚀 Démarrage d'Assistant Dux Web...")
    logger.info("📁 Répertoire d'upload: %s", UPLOAD_DIR.absolute())
    logger.info("🌐 Interface web: http://127.0.0.1:%s" % port)
    logger.info("📖 Documentation API: http://127.0.0.1:%s/docs" % port)
    
    uvicorn.run(
    "main:app",
    host="0.0.0.0",
    port=port
)
