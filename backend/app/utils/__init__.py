# app/utils/__init__.py

from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity
from app.models.user import User

def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        # Récupérer l'identité de l'utilisateur connecté
        user_id = get_jwt_identity()
        
        # Vérifier si l'utilisateur est un administrateur
        user = User.query.get(user_id)
        if not user or not user.is_admin:
            return jsonify(message="Accès non autorisé - droits administrateur requis"), 403
        
        # Si l'utilisateur est un administrateur, exécuter la fonction originale
        return fn(*args, **kwargs)
    
    return wrapper