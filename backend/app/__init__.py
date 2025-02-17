from flask import Flask, send_from_directory  # Ajout de send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from config import config

# Initialisation des extensions
db = SQLAlchemy()
jwt = JWTManager()

def create_app(config_name='default'):
    """
    Crée et configure l'application Flask.
    Args:
        config_name (str): Nom de la configuration à utiliser
    Returns:
        Flask: L'application Flask configurée
    """
    # Création de l'application Flask avec les chemins vers frontend
    app = Flask(__name__,
                static_folder='../../frontend/static',    # Dossier des fichiers CSS/JS
                template_folder='../../frontend')         # Dossier des fichiers HTML

    # Configuration de l'application
    config_class = config.get(config_name, config['default'])
    app.config.from_object(config_class)

    # Initialisation des extensions
    db.init_app(app)
    jwt.init_app(app)
    
    # Configuration CORS pour permettre les requêtes du frontend
    CORS(app, resources={
        r"/api/*": {
            "origins": ["http://localhost:5000", "http://127.0.0.1:5000"],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })

    # Routes pour servir les fichiers frontend
    @app.route('/')
    def serve_index():
        """Sert la page d'accueil"""
        return send_from_directory(app.template_folder, 'index.html')

    @app.route('/<path:filename>')
    def serve_static_html(filename):
        """Sert les autres pages HTML du frontend"""
        if '.' not in filename:  # Si pas d'extension, on ajoute .html
            filename = f"{filename}.html"
        try:
            return send_from_directory(app.template_folder, filename)
        except:
            return send_from_directory(app.template_folder, 'index.html')

    # Gestionnaires d'erreurs JWT
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return {
            'status': 401,
            'sub_status': 42,
            'message': 'Le token a expiré'
        }, 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return {
            'status': 401,
            'sub_status': 43,
            'message': 'Token invalide'
        }, 401

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return {
            'status': 401,
            'sub_status': 44,
            'message': 'Token manquant'
        }, 401

    # Initialisation des dossiers d'upload
    if hasattr(config_class, 'init_upload_folders'):
        config_class.init_upload_folders(app)

    # Enregistrement des blueprints (routes API)
    from app.auth import auth_bp
    app.register_blueprint(auth_bp, url_prefix='/api/auth')

    from app.products import products_bp
    app.register_blueprint(products_bp, url_prefix='/api/products')

    return app