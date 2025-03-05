# ============================================================================
#                         POINT D'ENTRÉE APPLICATION
# ============================================================================

"""
Point d'entrée principal de l'application Flask
Gère le lancement du serveur de développement
"""

import os
from app import create_app
from dotenv import load_dotenv
from flask import Flask, send_from_directory
import logging

# ============================================================================
#                         CONFIGURATION
# ============================================================================

app = create_app(os.getenv('FLASK_CONFIG', 'default'))

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Chargement des variables d'environnement
load_dotenv()

# ============================================================================
#                         CONFIGURATION SERVEUR
# ============================================================================

def get_server_config():
    """
    Récupère la configuration du serveur depuis les variables d'environnement
    
    Returns:
        tuple: (debug, host, port)
    """
    config = {
        'debug': os.getenv('FLASK_DEBUG', 'true').lower() == 'true',
        'host': os.getenv('FLASK_HOST', '127.0.0.1'),
        'port': int(os.getenv('FLASK_PORT', 5000))
    }
    
    logger.info(f"Configuration serveur: {config}")
    return config

# ============================================================================
#                         CRÉATION APPLICATION
# ============================================================================

def init_app():
    """
    Initialise l'application Flask
    
    Returns:
        Flask: Instance de l'application
    """
    # Récupération de la configuration
    config_name = os.getenv('FLASK_CONFIG', 'default')
    
    # Création de l'application
    app = create_app(config_name)
    
        # Route pour servir les fichiers statiques dans /frontend/admin/static
    @app.route('/admin/static/<path:filename>')
    def serve_admin_static(filename):
        return send_from_directory('frontend/admin/static', filename)
    
    # Vérification de la configuration
    secret_key = os.getenv("SECRET_KEY")
    if not secret_key:
        logger.warning("SECRET_KEY non définie !")
    else:
        logger.info("Configuration de l'application chargée")
        
    return app

# ============================================================================
#                         POINT D'ENTRÉE
# ============================================================================

if __name__ == '__main__':
    app.run(
        host=os.getenv('FLASK_HOST', '127.0.0.1'),
        port=int(os.getenv('FLASK_PORT', 5000)),
        debug=os.getenv('FLASK_DEBUG', 'true').lower() == 'true'
    )
    
    try:
        # Initialisation de l'application
        app = init_app()
        
        # Récupération de la configuration serveur
        server_config = get_server_config()
        
        # Lancement du serveur
        logger.info(f"Démarrage du serveur sur {server_config['host']}:{server_config['port']}")
        app.run(
            host=server_config['host'],
            port=server_config['port'],
            debug=server_config['debug']
        )
    except Exception as e:
        logger.error(f"Erreur lors du démarrage: {str(e)}")

if __name__ == '__main__':
    app.run(debug=True)