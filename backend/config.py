import os
from datetime import timedelta
from dotenv import load_dotenv

# Chargement des variables d'environnement
load_dotenv()

class Config:
    """Configuration générale de l'application."""
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    # Configuration email
    MAIL_SERVER = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.environ.get('MAIL_PORT', 587))
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'True') == 'True'
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME', 'votre-email@gmail.com')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD', 'votre-mot-de-passe-app')
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER', 'votre-email@gmail.com')
    
    # Clés secrètes
    SECRET_KEY = os.environ.get('SECRET_KEY', 'default-secret-key')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'default-jwt-key')
    
    # Configuration des uploads
    UPLOAD_FOLDER = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'app', 'static', 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max-size
    
    # Configuration JWT
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)  # Token valide 1 heure
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)  # Refresh token valide 30 jours
    JWT_TOKEN_LOCATION = ['headers']  # Emplacement du token dans la requête
    JWT_HEADER_NAME = 'Authorization'  # Nom du header contenant le token
    JWT_HEADER_TYPE = 'Bearer'  # Type de token (format: "Bearer <token>")
    
    # Configuration de la base de données
    SQLALCHEMY_DATABASE_URI = f"sqlite:///{os.path.join(BASE_DIR, 'instance', 'fmp.db')}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False  # Optimisation des performances
    
    # Configuration de sécurité
    PASSWORD_SALT = os.environ.get('PASSWORD_SALT', 'change-this-salt-in-production')
    BCRYPT_LOG_ROUNDS = 12  # Nombre de rounds pour le hashage (12 est recommandé)
    
    # Configuration des cookies
    SESSION_COOKIE_SECURE = os.environ.get('SESSION_COOKIE_SECURE', 'True') == 'True'
    SESSION_COOKIE_HTTPONLY = True  # Cookies inaccessibles en JavaScript
    SESSION_COOKIE_SAMESITE = 'Lax'  # Protection CSRF
    
    # Configuration de sécurité supplémentaire
    SECURITY_PASSWORD_SALT = os.environ.get('SECURITY_PASSWORD_SALT', 'security-salt-change-in-production')
    SECURITY_PASSWORD_LENGTH_MIN = 8  # Longueur minimale du mot de passe
    SECURITY_PASSWORD_REQUIREMENTS = {
        'uppercase': 1,  # Au moins 1 majuscule
        'lowercase': 1,  # Au moins 1 minuscule
        'numbers': 1,    # Au moins 1 chiffre
        'special': 1     # Au moins 1 caractère spécial
    }

    @staticmethod
    def init_upload_folders(app):
        """Initialise les dossiers d'upload."""
        folders = [
            os.path.join(app.config['UPLOAD_FOLDER'], 'products'),
            os.path.join(app.config['UPLOAD_FOLDER'], 'temp')
        ]
        for folder in folders:
            os.makedirs(folder, exist_ok=True)

class DevelopmentConfig(Config):
    """Configuration pour l'environnement de développement."""
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = f"sqlite:///{os.path.join(Config.BASE_DIR, 'instance', 'fmp.db')}"
    TESTING = False
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=1)  # Token valide 1 jour en dev
    SESSION_COOKIE_SECURE = False  # Permet HTTP en développement

class TestingConfig(Config):
    """Configuration pour les tests."""
    TESTING = True
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    WTF_CSRF_ENABLED = False

class ProductionConfig(Config):
    """Configuration pour la production."""
    DEBUG = False
    TESTING = False
    SQLALCHEMY_DATABASE_URI = os.environ['DATABASE_URL']  # Exige une base de données externe
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