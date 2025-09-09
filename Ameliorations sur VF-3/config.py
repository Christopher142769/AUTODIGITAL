# config.py
import os
import logging
from pydantic_settings import BaseSettings, SettingsConfigDict
from motor.motor_asyncio import AsyncIOMotorClient

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class Settings(BaseSettings):
    """
    Configuration de l'application.
    Les variables sont chargées depuis le fichier .env
    """

    # --- MongoDB ---
    DATABASE_URL: str
    DB_NAME: str
    USERS_COLLECTION_NAME: str
    NOTIFICATIONS_COLLECTION_NAME: str

    # --- API ---
    GEMINI_API_KEY: str

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


# Charger les settings depuis le .env
try:
    settings = Settings()
    logger.info("✅ Configuration chargée avec succès.")
except Exception as e:
    logger.critical(f"❌ Erreur lors du chargement des paramètres: {e}")
    raise

# Vérifier la clé API Gemini
if not settings.GEMINI_API_KEY:
    logger.critical("❌ La clé API Gemini n'est pas définie dans le fichier .env")
    raise ValueError("La clé API Gemini n'est pas définie dans le fichier .env")

# --- Connexion MongoDB ---
try:
    # motor async client avec SSL/TLS activé
    mongodb_client = AsyncIOMotorClient(
        settings.DATABASE_URL,
        tls=True,            # force TLS
        tlsAllowInvalidCertificates=False,  # True si certificat auto-signé, sinon False
        serverSelectionTimeoutMS=20000      # timeout 20s
    )
    db = mongodb_client[settings.DB_NAME]
    logger.info("✅ Connexion MongoDB initialisée avec succès.")
except Exception as e:
    logger.critical(f"❌ Erreur connexion MongoDB: {e}")
    raise
