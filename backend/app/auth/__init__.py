# backend/app/auth/__init__.py
"""
Module d'authentification.
Contient toutes les fonctionnalités liées à l'authentification.
"""

# Ne pas créer de blueprints ici
# Ils seront importés directement depuis les fichiers routes.py et admin_routes.py

from app.auth.routes import auth_bp
from app.auth.admin_routes import admin_users_bp

# Export pour faciliter l'import
__all__ = ['auth_bp', 'admin_users_bp']