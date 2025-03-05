# ============================================================================
#                         INITIALISATION APPLICATION                          
# ============================================================================

"""
Point d'entrée de l'application Flask
Configure l'application et ses extensions
"""
import os
import logging
from flask import Flask, send_from_directory, jsonify, send_file
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_mail import Mail
from flask_cors import CORS
from config import config
from flask_talisman import Talisman

# ============================================================================
#                         CONFIGURATION LOGGING                               
# ============================================================================

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============================================================================
#                         INITIALISATION EXTENSIONS                           
# ============================================================================

db = SQLAlchemy()
jwt = JWTManager()
mail = Mail()

# ============================================================================
#                         FONCTION FACTORY                                    
# ============================================================================

def create_app(config_name='default'):
    """
    Crée et configure l'instance de l'application Flask
    """
    app = Flask(__name__)
    
    # ============================================================================
    #                         ROUTE DE DEBUG ADMIN                               
    # ============================================================================
    
    @app.route('/debug-admin/<email>')
    def debug_admin(email):
        """
        Route de débogage pour promouvoir un utilisateur en admin
        
        Args:
            email (str): Email de l'utilisateur à promouvoir
            
        Returns:
            str: Message de confirmation
        """
        from app.models.user import User
        user = User.query.filter_by(email=email).first()
        if not user:
            return f"Utilisateur {email} non trouvé", 404
        
        # Mettre à jour l'utilisateur pour le rendre admin
        user.is_admin = True
        db.session.commit()
        
        return f"Utilisateur {email} défini comme admin. is_admin={user.is_admin}", 200

    # ============================================================================
    #                         ROUTES API ADMIN PROXY                             
    # ============================================================================
    
    @app.route('/api/admin/users', methods=['GET'])
    def api_admin_users():
        """
        Proxy pour récupérer tous les utilisateurs (API)
        
        Returns:
            Response: Liste des utilisateurs au format JSON
        """
        from app.auth.admin_routes import get_users
        return get_users()

    @app.route('/api/admin/users', methods=['POST'])
    def api_admin_users_create():
        """
        Proxy pour créer un nouvel utilisateur (API)
        
        Returns:
            Response: Données de l'utilisateur créé au format JSON
        """
        from app.auth.admin_routes import create_user
        return create_user()

    @app.route('/api/admin/users/<int:user_id>', methods=['GET'])
    def api_admin_user_detail(user_id):
        """
        Proxy pour récupérer les détails d'un utilisateur (API)
        
        Args:
            user_id (int): ID de l'utilisateur
            
        Returns:
            Response: Données de l'utilisateur au format JSON
        """
        from app.auth.admin_routes import get_user
        return get_user(user_id)

    @app.route('/api/admin/users/<int:user_id>', methods=['PUT'])
    def api_admin_user_update(user_id):
        """
        Proxy pour mettre à jour un utilisateur (API)
        
        Args:
            user_id (int): ID de l'utilisateur
            
        Returns:
            Response: Données mises à jour au format JSON
        """
        from app.auth.admin_routes import update_user
        return update_user(user_id)

    @app.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
    def api_admin_user_delete(user_id):
        """
        Proxy pour supprimer un utilisateur (API)
        
        Args:
            user_id (int): ID de l'utilisateur
            
        Returns:
            Response: Message de confirmation au format JSON
        """
        from app.auth.admin_routes import delete_user
        return delete_user(user_id)

    # ============================================================================
    #                         CONFIGURATION SÉCURITÉ                             
    # ============================================================================
    
    # Configuration de la CSP pour autoriser les styles inline et les CDN
    csp = {
        'default-src': "'self'",
        'style-src': "'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
        'script-src': "'self' 'unsafe-inline'",
        'font-src': "'self' https://cdnjs.cloudflare.com",
        'img-src': "'self' data:",
        'connect-src': "'self' http://localhost:5000",
    }

    Talisman(app, content_security_policy=csp)
    
    # Configuration générale
    app_config = config.get(config_name, config['default'])
    app.config.from_object(app_config)

    # Configuration des dossiers statiques et templates
    app.template_folder = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'frontend'))
    app.static_folder = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'frontend', 'static'))
                                        
    # Initialisation des extensions
    db.init_app(app)
    jwt.init_app(app)
    mail.init_app(app)
    
    # Configuration CORS
    CORS(app, resources={
        r"/*": {
            "origins": ["http://localhost:5000", "http://127.0.0.1:5000"],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "supports_credentials": True
        }
    })

    # ============================================================================
    #                         ENREGISTREMENT BLUEPRINTS                           
    # ============================================================================

    # Import des blueprints (UN SEUL ENDROIT)
    from app.auth.routes import auth_bp
    from app.products.routes import products_bp
    from app.orders.routes import orders_bp
    from app.auth.admin_routes import admin_users_bp

    # Enregistrement des blueprints (UN SEUL ENDROIT)
    app.register_blueprint(admin_users_bp)
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(products_bp, url_prefix='/api/products')
    app.register_blueprint(orders_bp, url_prefix='/api/orders')

    # ============================================================================
    #                         GESTIONNAIRES D'ERREURS JWT                         
    # ============================================================================

    @jwt.unauthorized_loader
    def unauthorized_callback(reason):
        """
        Gestionnaire pour les accès non autorisés (token manquant)
        
        Args:
            reason (str): Raison de l'erreur d'autorisation
            
        Returns:
            tuple: Réponse JSON avec code 401
        """
        logger.warning(f"Accès non autorisé: {reason}")
        return jsonify({
            'error': 'Authentification requise',
            'details': reason
        }), 401

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        """
        Gestionnaire pour les tokens expirés
        
        Args:
            jwt_header (dict): En-tête du token JWT
            jwt_payload (dict): Contenu du token JWT
            
        Returns:
            tuple: Réponse JSON avec code 401
        """
        logger.warning(f"Token expiré: {jwt_payload}")
        return jsonify({
            'error': 'Token expiré',
            'message': 'Veuillez vous reconnecter'
        }), 401

    # ============================================================================
    #                         ROUTES STATIQUES                                    
    # ============================================================================

    @app.route('/')
    def serve_home():
        """
        Sert la page d'accueil
        
        Returns:
            Response: Page d'accueil
        """
        try:
            return send_from_directory(app.template_folder, 'index.html')
        except Exception as e:
            logger.error(f"Erreur page d'accueil: {str(e)}")
            return "Page d'accueil non trouvée", 404
        
    # ============================================================================
    #                         ROUTES PANIER                                      
    # ============================================================================
    
    @app.route('/cart')
    @app.route('/pages/cart.html')
    def serve_cart():
        """
        Sert la page du panier
        
        Returns:
            Response: Page du panier
        """
        try:
            return send_from_directory(os.path.join(app.template_folder, 'pages'), 'cart.html')
        except Exception as e:
            logger.error(f"Erreur page panier: {str(e)}")
            return "Page panier non trouvée", 404

    # ============================================================================
    #                         ROUTES PAGES GÉNÉRALES                              
    # ============================================================================
    
    @app.route('/pages/<path:filename>')
    def serve_page_file(filename):
        """
        Sert les fichiers des pages générales
        
        Args:
            filename (str): Chemin du fichier dans le dossier pages
            
        Returns:
            Response: Page demandée
        """
        try:
            return send_from_directory(os.path.join(app.template_folder, 'pages'), filename)
        except Exception as e:
            logger.error(f"Erreur page {filename}: {str(e)}")
            return "Page non trouvée", 404
        
    @app.route('/static/<path:filename>')
    def serve_static(filename):
        """
        Sert les fichiers statiques (CSS, JS, images)
        
        Args:
            filename (str): Chemin du fichier dans le dossier static
            
        Returns:
            Response: Fichier statique demandé
        """
        return send_from_directory(app.static_folder, filename)

    # ============================================================================
    #                         ROUTES AUTHENTIFICATION                             
    # ============================================================================

    @app.route('/login')
    @app.route('/pages/login.html')
    def serve_login():
        """
        Sert la page de connexion
        
        Returns:
            Response: Page de connexion
        """
        try:
            return send_from_directory(os.path.join(app.template_folder, 'pages'), 'login.html')
        except Exception as e:
            logger.error(f"Erreur page login: {str(e)}")
            return "Page de connexion non trouvée", 404

    @app.route('/register')
    @app.route('/pages/register.html')
    def serve_register():
        """
        Sert la page d'inscription
        
        Returns:
            Response: Page d'inscription
        """
        try:
            return send_from_directory(os.path.join(app.template_folder, 'pages'), 'register.html')
        except Exception as e:
            logger.error(f"Erreur page register: {str(e)}")
            return "Page d'inscription non trouvée", 404
        
    # ============================================================================
    #                         ROUTES ADMIN                                       
    # ============================================================================
    
    @app.route('/admin/<path:filename>')
    def serve_admin_file(filename):
        """
        Sert les fichiers admin (y compris le dashboard)
        
        Args:
            filename (str): Chemin du fichier dans le dossier admin
            
        Returns:
            Response: Fichier admin demandé
        """
        try:
            # Vérifier d'abord à la racine du dossier admin
            admin_root_path = os.path.join(app.template_folder, 'admin', filename)
            if os.path.exists(admin_root_path):
                logger.info(f"Fichier admin trouvé à la racine: {admin_root_path}")
                return send_file(admin_root_path)
                
            # Ensuite vérifier dans le sous-dossier pages
            admin_pages_path = os.path.join(app.template_folder, 'admin', 'pages', filename)
            if os.path.exists(admin_pages_path):
                logger.info(f"Fichier admin trouvé dans pages: {admin_pages_path}")
                return send_file(admin_pages_path)
                
            logger.error(f"Fichier admin non trouvé: {filename}")
            return f"Page admin {filename} non trouvée", 404
        except Exception as e:
            logger.error(f"Erreur page admin {filename}: {str(e)}")
            return f"Erreur: {str(e)}", 500
    
    @app.route('/admin/pages/<path:filename>')
    def serve_admin_pages(filename):
        """
        Sert les fichiers dans le sous-dossier pages d'admin
        
        Args:
            filename (str): Chemin du fichier dans le dossier admin/pages
            
        Returns:
            Response: Fichier admin demandé
        """
        try:
            file_path = os.path.join(app.template_folder, 'admin', 'pages', filename)
            if os.path.exists(file_path):
                return send_file(file_path)
            else:
                logger.error(f"Fichier admin/pages non trouvé: {filename}")
                return f"Page admin {filename} non trouvée", 404
        except Exception as e:
            logger.error(f"Erreur page admin {filename}: {str(e)}")
            return f"Erreur: {str(e)}", 500
        
    @app.route('/admin/static/<path:filename>')
    def serve_admin_static(filename):
        """
        Sert les fichiers statiques des pages admin
        
        Args:
            filename (str): Chemin du fichier dans le dossier admin/static
            
        Returns:
            Response: Fichier statique admin demandé
        """
        admin_static_folder = os.path.join(app.template_folder, 'admin', 'static')
        return send_from_directory(admin_static_folder, filename)
        
    
    @app.route('/static/js/js_admin/<path:filename>')
    def serve_admin_js(filename):
        """
        Sert les fichiers JavaScript de l'administration
        
        Args:
            filename (str): Nom du fichier JS admin à servir
            
        Returns:
            Response: Fichier JavaScript demandé
        """
        try:
            admin_js_path = os.path.join(app.static_folder, 'js', 'js_admin')
            return send_from_directory(admin_js_path, filename)
        except Exception as e:
            logger.error(f"Erreur fichier JS admin {filename}: {str(e)}")
            return f"Fichier JS admin {filename} non trouvé", 404
    
    # ============================================================================
    #                         ROUTES PROFIL                                       
    # ============================================================================
    
    @app.route('/pages/profile.html')
    #@jwt_required()  # Laissez commenté pour tester
    def profile():
        """
        Sert la page de profil utilisateur
        
        Returns:
            Response: Page de profil
        """
        try:
            # Utilisez un chemin absolu pour tester
            pages_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'frontend', 'pages')
            
            # Débogage - afficher le chemin et vérifier l'existence
            profile_path = os.path.join(pages_dir, 'profile.html')
            logger.info(f"Chemin du profile: {profile_path}")
            logger.info(f"Le fichier existe: {os.path.exists(profile_path)}")
            
            return send_from_directory(pages_dir, 'profile.html')
        except Exception as e:
            # Afficher plus de détails sur l'erreur
            import traceback
            logger.error(f"Erreur page profile: {str(e)}")
            logger.error(traceback.format_exc())
            return f"Page profile non trouvée: {str(e)}", 404

    # ============================================================================
    #                         ROUTES PRODUITS                                     
    # ============================================================================

    @app.route('/pages/products/<filename>')
    def serve_product_pages(filename):
        """
        Sert les pages de produits individuels
        
        Args:
            filename (str): Nom du fichier produit demandé
            
        Returns:
            Response: Page de produit demandée
        """
        try:
            return send_from_directory(
                os.path.join(app.template_folder, 'pages', 'products'),
                filename
            )
        except Exception as e:
            logger.error(f"Erreur page produit {filename}: {str(e)}")
            return "Page produit non trouvée", 404

    @app.route('/pages/products-ecolo.html')
    def products_ecolo():
        """
        Sert la page des produits écologiques
        
        Returns:
            Response: Page des produits écologiques
        """
        try:
            return send_from_directory(
                os.path.join(app.template_folder, 'pages', 'products'),
                'products-ecolo.html'
            )
        except Exception as e:
            logger.error(f"Erreur page produits écolo: {str(e)}")
            return "Page non trouvée", 404

    @app.route('/pages/products-compatible.html')
    def products_compatible():
        """
        Sert la page des produits compatibles
        
        Returns:
            Response: Page des produits compatibles
        """
        try:
            return send_from_directory(
                os.path.join(app.template_folder, 'pages', 'products'),
                'products-compatible.html'
            )
        except Exception as e:
            logger.error(f"Erreur page produits compatibles: {str(e)}")
            return "Page non trouvée", 404

    @app.route('/pages/products-origines.html')
    def products_origines():
        """
        Sert la page des produits d'origine
        
        Returns:
            Response: Page des produits d'origine
        """
        try:
            return send_from_directory(
                os.path.join(app.template_folder, 'pages', 'products'),
                'products-origines.html'
            )
        except Exception as e:
            logger.error(f"Erreur page produits origine: {str(e)}")
            return "Page non trouvée", 404

    # ============================================================================
    #                         ROUTES DE DÉBOGAGE                                  
    # ============================================================================
    
    @app.route('/debug-api')
    def debug_api():
        """
        Route de débogage pour lister toutes les routes API
        
        Returns:
            Response: Liste des routes au format JSON
        """
        return jsonify({
            'status': 'ok',
            'routes': [
                {'url': rule.rule, 'methods': list(rule.methods)}
                for rule in app.url_map.iter_rules()
                if 'api' in rule.rule or 'admin' in rule.rule
            ]
        })
    
    @app.route('/debug-paths')
    def debug_paths():
        """
        Route de débogage pour vérifier les chemins des fichiers importants
        
        Returns:
            Response: Informations sur les chemins au format JSON
        """
        try:
            # Vérifier le chemin du dashboard
            dashboard_path = os.path.join(app.template_folder, 'admin', 'dashboard.html')
            dashboard_exists = os.path.exists(dashboard_path)
            
            # Vérifier les fichiers dans le dossier admin
            admin_dir = os.path.join(app.template_folder, 'admin')
            admin_exists = os.path.exists(admin_dir)
            
            admin_files = []
            if admin_exists:
                admin_files = os.listdir(admin_dir)
            
            return jsonify({
                'template_folder': app.template_folder,
                'static_folder': app.static_folder,
                'dashboard_path': dashboard_path,
                'dashboard_exists': dashboard_exists,
                'admin_dir': admin_dir,
                'admin_exists': admin_exists,
                'admin_files': admin_files
            })
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    # ============================================================================
    #                         INITIALISATION BDD                                  
    # ============================================================================

    with app.app_context():
        try:
            db.create_all()
            logger.info("Base de données initialisée")
        except Exception as e:
            logger.error(f"Erreur initialisation BDD: {str(e)}")

    return app