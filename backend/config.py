# ============================================================================
#                         CONFIGURATION APPLICATION
# ============================================================================

"""
Configuration de l'application Flask
Gère les différents environnements et paramètres
"""

import os
from datetime import timedelta
from dotenv import load_dotenv

# ============================================================================
#                         INITIALISATION
# ============================================================================

# Chargement des variables d'environnement
load_dotenv()

# Chemin de base de l'application
BASE_DIR = os.path.abspath(os.path.dirname(__file__))

# ============================================================================
#                         CONFIGURATION DE BASE
# ============================================================================

class Config:
    """Configuration de base de l'application"""
    
    # Chemins
    BASE_DIR = BASE_DIR
    STATIC_FOLDER = 'static'
    STATIC_URL_PATH = '/static'
    UPLOAD_FOLDER = os.path.join(BASE_DIR, 'app', 'static', 'uploads')

    # Sécurité
    SECRET_KEY = os.environ.get('SECRET_KEY', 'default-secret-key')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'default-jwt-key')
    PASSWORD_SALT = os.environ.get('PASSWORD_SALT', 'change-this-salt-in-production')
    SECURITY_PASSWORD_SALT = os.environ.get('SECURITY_PASSWORD_SALT', 'security-salt-change-in-production')

    # JWT Configuration
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    JWT_TOKEN_LOCATION = ['headers']
    JWT_HEADER_NAME = 'Authorization'
    JWT_HEADER_TYPE = 'Bearer'

    # Base de données
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_DATABASE_URI = f"sqlite:///{os.path.join(BASE_DIR, 'instance', 'fmp.db')}"

    # Email
    MAIL_SERVER = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.environ.get('MAIL_PORT', 587))
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'True') == 'True'
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER')

    # Upload
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB

    # Sécurité mot de passe
    SECURITY_PASSWORD_LENGTH_MIN = 8
    SECURITY_PASSWORD_REQUIREMENTS = {
        'uppercase': 1,
        'lowercase': 1,
        'numbers': 1,
        'special': 1
    }

    # Session et Cookies
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'

    @staticmethod
    def init_upload_folders(app):
        """Initialise les dossiers d'upload"""
        folders = [
            os.path.join(app.config['UPLOAD_FOLDER'], 'products'),
            os.path.join(app.config['UPLOAD_FOLDER'], 'temp')
        ]
        for folder in folders:
            os.makedirs(folder, exist_ok=True)

# ============================================================================
#                         CONFIGURATIONS SPÉCIFIQUES
# ============================================================================

class DevelopmentConfig(Config):
    """Configuration de développement"""
    
    DEBUG = True
    TESTING = False
    
    # Sécurité allégée pour le développement
    SESSION_COOKIE_SECURE = False
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=1)
    
    # Base de données de développement
    SQLALCHEMY_DATABASE_URI = f"sqlite:///{os.path.join(BASE_DIR, 'instance', 'fmp_dev.db')}"

class TestingConfig(Config):
    """Configuration de test"""
    
    TESTING = True
    DEBUG = False
    
    # Base de données en mémoire pour les tests
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    
    # Désactivation CSRF pour les tests
    WTF_CSRF_ENABLED = False
    
    # Tokens à courte durée pour les tests
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=5)

class ProductionConfig(Config):
    """Configuration de production"""
    
    DEBUG = False
    TESTING = False
    
    # Variables obligatoires en production
    SQLALCHEMY_DATABASE_URI = os.environ['DATABASE_URL']
    SECRET_KEY = os.environ['SECRET_KEY']
    JWT_SECRET_KEY = os.environ['JWT_SECRET_KEY']
    PASSWORD_SALT = os.environ['PASSWORD_SALT']
    SECURITY_PASSWORD_SALT = os.environ['SECURITY_PASSWORD_SALT']
    
    # Sécurité renforcée
    SESSION_COOKIE_SECURE = True
    PERMANENT_SESSION_LIFETIME = timedelta(days=1)

# ============================================================================
#                         CONFIGURATION PAR DÉFAUT
# ============================================================================

config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}

# ============================================================================
#                         VALIDATION CONFIGURATION
# ============================================================================

def validate_config(config_name):
    """
    Valide la configuration choisie
    
    Args:
        config_name (str): Nom de la configuration
        
    Returns:
        bool: True si la configuration est valide
    """
    if config_name not in config:
        raise ValueError(f"Configuration '{config_name}' inconnue")
    
    selected_config = config[config_name]
    
    if config_name == 'production':
        required_vars = ['DATABASE_URL', 'SECRET_KEY', 'JWT_SECRET_KEY', 
                        'PASSWORD_SALT', 'SECURITY_PASSWORD_SALT']
        
        for var in required_vars:
            if var not in os.environ:
                raise ValueError(f"Variable d'environnement '{var}' manquante en production")
    
    return True