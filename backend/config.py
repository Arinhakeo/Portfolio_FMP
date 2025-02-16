import os
from datetime import timedelta
from dotenv import load_dotenv

# Chargement des variables d'environnement
load_dotenv()

class Config:
    """Configuration générale de l'application.
    
    Cette classe contient toutes les variables de configuration nécessaires
    pour le fonctionnement de l'authentification et de la sécurité.
    
    Attributs:
        SECRET_KEY (str): Clé secrète pour Flask
        JWT_SECRET_KEY (str): Clé secrète pour les tokens JWT
        JWT_ACCESS_TOKEN_EXPIRES (timedelta): Durée de validité du token d'accès
        JWT_REFRESH_TOKEN_EXPIRES (timedelta): Durée de validité du token de rafraîchissement
        SQLALCHEMY_DATABASE_URI (str): URL de connexion à la base de données
        SQLALCHEMY_TRACK_MODIFICATIONS (bool): Désactive le suivi des modifications SQLAlchemy
        PASSWORD_SALT (str): Sel pour le hashage des mots de passe
    """
    
    # Clés secrètes
    SECRET_KEY = os.environ.get('SECRET_KEY', 'default-secret-key')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'default-jwt-key')
    
    # Configuration des uploads
    UPLOAD_FOLDER = os.path.join('app', 'static', 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max-size
    
    # Configuration JWT
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)  # Token valide 1 heure
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)  # Refresh token valide 30 jours
    JWT_TOKEN_LOCATION = ['headers']  # Emplacement du token dans la requête
    JWT_HEADER_NAME = 'Authorization'  # Nom du header contenant le token
    JWT_HEADER_TYPE = 'Bearer'  # Type de token (format: "Bearer <token>")
    
    # Configuration de la base de données
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'sqlite:///fmp.db'  # Base de données par défaut
    SQLALCHEMY_TRACK_MODIFICATIONS = False  # Optimisation des performances
    
    # Configuration de sécurité
    PASSWORD_SALT = os.environ.get('PASSWORD_SALT') or 'change-this-salt-in-production'
    BCRYPT_LOG_ROUNDS = 12  # Nombre de rounds pour le hashage (12 est recommandé)
    
    # Configuration des cookies
    SESSION_COOKIE_SECURE = True  # Cookies uniquement en HTTPS
    SESSION_COOKIE_HTTPONLY = True  # Cookies inaccessibles en JavaScript
    SESSION_COOKIE_SAMESITE = 'Lax'  # Protection CSRF
    
    # Configuration de sécurité supplémentaire
    SECURITY_PASSWORD_SALT = os.environ.get('SECURITY_PASSWORD_SALT') or 'security-salt-change-in-production'
    SECURITY_PASSWORD_LENGTH_MIN = 8  # Longueur minimale du mot de passe
    SECURITY_PASSWORD_REQUIREMENTS = {
        'uppercase': 1,  # Au moins 1 majuscule
        'lowercase': 1,  # Au moins 1 minuscule
        'numbers': 1,    # Au moins 1 chiffre
        'special': 1     # Au moins 1 caractère spécial
    }

class DevelopmentConfig(Config):
    """Configuration pour l'environnement de développement.
    
    Hérite de la configuration de base mais modifie certains paramètres
    pour faciliter le développement.
    """
    DEBUG = True
    TESTING = False
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=1)  # Token valide 1 jour en dev
    SESSION_COOKIE_SECURE = False  # Permet HTTP en développement

class TestingConfig(Config):
    """Configuration pour les tests.
    
    Configuration spécifique pour l'exécution des tests unitaires
    et d'intégration.
    """
    TESTING = True
    DEBUG = False
    # Utilise une base de données en mémoire pour les tests
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    # Désactive la protection CSRF pour les tests
    WTF_CSRF_ENABLED = False

class ProductionConfig(Config):
    """Configuration pour la production.
    
    Configuration sécurisée pour l'environnement de production.
    Nécessite la définition de variables d'environnement.
    """
    DEBUG = False
    TESTING = False
    # Force l'utilisation de variables d'environnement en production
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///fallback.db')
    SECRET_KEY = os.environ['SECRET_KEY']
    JWT_SECRET_KEY = os.environ['JWT_SECRET_KEY']
    PASSWORD_SALT = os.environ['PASSWORD_SALT']
    SECURITY_PASSWORD_SALT = os.environ['SECURITY_PASSWORD_SALT']

# Dictionnaire des configurations disponibles
config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}

# Création des dossiers nécessaires
@staticmethod
def init_upload_folders(app):
    """Initialise les dossiers d'upload."""
    folders = [
        os.path.join(app.config['UPLOAD_FOLDER'], 'products'),
        os.path.join(app.config['UPLOAD_FOLDER'], 'temp')
    ]
        
    for folder in folders:
        os.makedirs(folder, exist_ok=True)