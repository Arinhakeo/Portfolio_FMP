from flask import Flask, send_from_directory, request
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from config import config
import os

db = SQLAlchemy()
jwt = JWTManager()

def create_app(config_name='default'):
    app = Flask(__name__,
                static_folder='../../frontend/static',
                template_folder='../../frontend')

    config_class = config.get(config_name, config['default'])
    app.config.from_object(config_class)

    db.init_app(app)
    jwt.init_app(app)
    
    CORS(app)

    # Route pour fichiers statiques
    @app.route('/static/<path:filename>')
    def serve_static(filename):
        return send_from_directory(app.static_folder, filename)

    # Routes principales
    @app.route('/')
    def serve_home():
        return send_from_directory(app.template_folder, 'index.html')

    # Route spécifique pour login
    @app.route('/login')
    @app.route('/login.html')
    def serve_login():
        try:
            return send_from_directory(os.path.join(app.template_folder, 'pages'), 'login.html')
        except:
            return "Page de connexion non trouvée", 404

    # Route spécifique pour register
    @app.route('/register')
    @app.route('/register.html')
    def serve_register():
        try:
            return send_from_directory(os.path.join(app.template_folder, 'pages'), 'register.html')
        except:
            return "Page d'inscription non trouvée", 404

    # Route pour les autres pages dans le dossier pages
    @app.route('/pages/<path:filename>')
    def serve_page_file(filename):
        try:
            return send_from_directory(os.path.join(app.template_folder, 'pages'), filename)
        except:
            return "Page non trouvée", 404

    # API Blueprints
    from app.auth import auth_bp
    app.register_blueprint(auth_bp, url_prefix='/api/auth')

    from app.products import products_bp
    app.register_blueprint(products_bp, url_prefix='/api/products')
    
    with app.app_context():
        db.create_all()

    return app