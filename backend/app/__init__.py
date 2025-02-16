"""
Ce fichier est le point d'entrée de l'application.
Il initialise Flask et toutes les extensions nécessaires.
"""

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from config import config  # config est un dictionnaire

# Initialisation des extensions
db = SQLAlchemy()
jwt = JWTManager()

def create_app(config_name='default'):
    """
    Crée et configure l'application Flask.

    Args:
        config_name (str): Nom de la configuration à utiliser
                        ('development', 'production', 'testing', 'default')

    Returns:
        Flask: L'application Flask configurée
    """
    app = Flask(__name__)

    # Récupérer la classe de configuration correcte
    config_class = config.get(config_name, config['default'])
    app.config.from_object(config_class)

    # Initialisation des extensions avec l'application
    db.init_app(app)
    jwt.init_app(app)
    CORS(app)

    # Configuration des gestionnaires d'erreurs JWT
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        """Gère les tokens expirés."""
        return {
            'status': 401,
            'sub_status': 42,
            'message': 'Le token a expiré'
        }, 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        """Gère les tokens invalides."""
        return {
            'status': 401,
            'sub_status': 43,
            'message': 'Token invalide'
        }, 401

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        """Gère l'absence de token."""
        return {
            'status': 401,
            'sub_status': 44,
            'message': 'Token manquant'
        }, 401

    # Initialisation des dossiers d'upload si la méthode existe
    if hasattr(config_class, 'init_upload_folders'):
        config_class.init_upload_folders(app)

    # Enregistrement des blueprints
    from app.auth import auth_bp
    app.register_blueprint(auth_bp, url_prefix='/api/auth')

    from app.products import products_bp
    app.register_blueprint(products_bp, url_prefix='/api/products')

    return app
