# backend/run.py

"""
Point d'entrée de l'application.
Lance le serveur de développement.
"""

import os
from app import create_app
from dotenv import load_dotenv

load_dotenv()

# Création de l'application
app = create_app(os.getenv('FLASK_CONFIG') or 'default')

if __name__ == '__main__':
    # Configuration du serveur de développement
    debug = os.getenv('FLASK_DEBUG', 'true').lower() == 'true'
    host = os.getenv('FLASK_HOST', '127.0.0.1')
    port = int(os.getenv('FLASK_PORT', 5000))
    
    # Lancement du serveur
    app.run(
        host=host,
        port=port,
        debug=debug
    )
    
    print("SECRET_KEY:", os.getenv("SECRET_KEY"))