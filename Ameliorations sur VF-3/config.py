import os
import logging
from pydantic_settings import BaseSettings, SettingsConfigDict

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class Settings(BaseSettings):
    """
    Configuration de l'application.
    Les variables sont chargées depuis le fichier .env
    """
    
    # Configuration de la base de données MongoDB
    DATABASE_URL: str
    DB_NAME: str
    USERS_COLLECTION_NAME: str
    NOTIFICATIONS_COLLECTION_NAME: str
    
    # Clé API Gemini
    GEMINI_API_KEY: str

    model_config = SettingsConfigDict(env_file='.env', extra='ignore')

# Création de l'instance des paramètres pour les charger depuis .env
try:
    settings = Settings()
    logger.info("Configuration chargée avec succès.")
except Exception as e:
    logger.critical(f"Erreur lors du chargement des paramètres: {e}")
    raise

# Vérifier si la clé API Gemini est définie
if not settings.GEMINI_API_KEY:
    logger.critical("La clé API Gemini n'est pas définie. Veuillez l'ajouter à votre fichier .env")
    raise ValueError("La clé API Gemini n'est pas définie. Veuillez l'ajouter à votre fichier .env")