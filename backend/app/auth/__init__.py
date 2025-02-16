# backend/app/auth/__init__.py

"""
Module d'authentification.
Contient toutes les fonctionnalités liées à l'authentification.
"""

from flask import Blueprint

# Création du blueprint
auth_bp = Blueprint('auth', __name__)

# Import des routes (après la création du blueprint pour éviter les imports circulaires)
from . import routes