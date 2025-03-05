# ============================================================================
#                         ROUTES ADMINISTRATION                              
# ============================================================================

"""
Gestion des routes API pour l'administration
Fournit les fonctionnalités CRUD pour les utilisateurs
"""

from flask import Blueprint, request, jsonify, send_from_directory, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.user import User
from functools import wraps
import secrets
import string
import os

# ============================================================================
#                         CONFIGURATION BLUEPRINT                            
# ============================================================================

# Création du Blueprint pour l'administration
admin_users_bp = Blueprint('admin_users', __name__, url_prefix='/api/admin')

# ============================================================================
#                         DÉCORATEURS DE SÉCURITÉ                            
# ============================================================================

# Décorateur pour vérifier si l'utilisateur est admin
def admin_required(f):
    """
    Vérifie si l'utilisateur connecté a le statut administrateur
    
    Args:
        f (function): La fonction à décorer
        
    Returns:
        function: La fonction décorée avec vérification admin
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user or not user.is_admin:
            return jsonify({'error': 'Accès administrateur requis'}), 403
            
        return f(*args, **kwargs)
    return decorated_function

# ============================================================================
#                  ROUTES API POUR LA GESTION DES UTILISATEURS                
# ============================================================================

# Liste des utilisateurs
@admin_users_bp.route('/users', methods=['GET'])
@jwt_required()
@admin_required
def get_users():
    """
    Récupère la liste des utilisateurs avec pagination et recherche
    
    Query params:
        page (int): Numéro de page (défaut: 1)
        per_page (int): Nombre d'éléments par page (défaut: 10)
        search (str): Terme de recherche (optionnel)
        
    Returns:
        Response: Liste paginée des utilisateurs au format JSON
    """
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    search = request.args.get('search', '')
    
    query = User.query
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (User.email.ilike(search_term)) |
            (User.firstname.ilike(search_term)) |
            (User.lastname.ilike(search_term))
        )
    
    users_page = query.order_by(User.created_at.desc()).paginate(page=page, per_page=per_page)
    
    return jsonify({
        'users': [user.to_dict() for user in users_page.items],
        'total': users_page.total,
        'pages': users_page.pages,
        'current_page': page
    })

# Détails d'un utilisateur
@admin_users_bp.route('/users/<int:user_id>', methods=['GET'])
@jwt_required()
@admin_required
def get_user(user_id):
    """
    Récupère les détails d'un utilisateur spécifique
    
    Args:
        user_id (int): ID de l'utilisateur à récupérer
        
    Returns:
        Response: Données de l'utilisateur au format JSON
    """
    user = User.query.get_or_404(user_id)
    return jsonify(user.to_dict())

# Création d'un utilisateur
@admin_users_bp.route('/users', methods=['POST'])
@jwt_required()
@admin_required
def create_user():
    """
    Crée un nouvel utilisateur
    
    Body JSON:
        email (str): Email de l'utilisateur
        firstname (str): Prénom de l'utilisateur
        lastname (str): Nom de famille de l'utilisateur
        password (str, optionnel): Mot de passe (généré automatiquement si absent)
        is_active (bool, optionnel): Statut actif/inactif
        is_admin (bool, optionnel): Statut administrateur
        is_verified (bool, optionnel): Statut vérifié
        
    Returns:
        Response: Données de l'utilisateur créé au format JSON
    """
    data = request.get_json()
    
    # Validation
    if not all(k in data for k in ['email', 'firstname', 'lastname']):
        return jsonify({'error': 'Données incomplètes'}), 400
        
    # Vérifier si l'email existe
    if User.query.filter_by(email=data['email'].lower()).first():
        return jsonify({'error': 'Cet email est déjà utilisé'}), 400
        
    # Générer un mot de passe si non fourni
    password = data.get('password')
    if not password:
        alphabet = string.ascii_letters + string.digits
        password = ''.join(secrets.choice(alphabet) for _ in range(12))
        generated_password = password
    else:
        generated_password = None
        
    try:
        user = User(
            email=data['email'],
            firstname=data['firstname'],
            lastname=data['lastname'],
            password=password
        )
        
        if 'is_active' in data:
            user.is_active = data['is_active']
        if 'is_admin' in data:
            user.is_admin = data['is_admin']
        if 'is_verified' in data:
            user.is_verified = data['is_verified']
        
        db.session.add(user)
        db.session.commit()
        
        response = user.to_dict()
        if generated_password:
            response['generated_password'] = generated_password
            
        return jsonify(response), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Mise à jour d'un utilisateur
@admin_users_bp.route('/users/<int:user_id>', methods=['PUT'])
@jwt_required()
@admin_required
def update_user(user_id):
    """
    Met à jour un utilisateur existant
    
    Args:
        user_id (int): ID de l'utilisateur à mettre à jour
        
    Body JSON:
        email (str, optionnel): Nouvel email
        firstname (str, optionnel): Nouveau prénom
        lastname (str, optionnel): Nouveau nom de famille
        is_active (bool, optionnel): Nouveau statut actif/inactif
        is_admin (bool, optionnel): Nouveau statut administrateur
        is_verified (bool, optionnel): Nouveau statut vérifié
        password (str, optionnel): Nouveau mot de passe
        
    Returns:
        Response: Données mises à jour au format JSON
    """
    user = User.query.get_or_404(user_id)
    data = request.get_json()
    
    try:
        if 'email' in data:
            # Vérifier si l'email existe déjà pour un autre utilisateur
            existing = User.query.filter_by(email=data['email'].lower()).first()
            if existing and existing.id != user_id:
                return jsonify({'error': 'Cet email est déjà utilisé'}), 400
            user.email = data['email'].lower()
            
        if 'firstname' in data:
            user.firstname = data['firstname']
        if 'lastname' in data:
            user.lastname = data['lastname']
        if 'is_active' in data:
            user.is_active = data['is_active']
        if 'is_admin' in data:
            user.is_admin = data['is_admin']
        if 'is_verified' in data:
            user.is_verified = data['is_verified']
            
        # Mise à jour du mot de passe
        if 'password' in data and data['password']:
            user.set_password(data['password'])
            
        db.session.commit()
        return jsonify(user.to_dict()), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Suppression d'un utilisateur
@admin_users_bp.route('/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_user(user_id):
    """
    Supprime ou désactive un utilisateur
    
    Args:
        user_id (int): ID de l'utilisateur à supprimer
        
    Query params:
        soft (str): "true" pour désactiver, "false" pour supprimer définitivement
        
    Returns:
        Response: Message de confirmation au format JSON
    """
    current_user_id = get_jwt_identity()
    
    # Empêcher la suppression de son propre compte
    if int(current_user_id) == user_id:
        return jsonify({'error': 'Vous ne pouvez pas supprimer votre propre compte'}), 403
        
    user = User.query.get_or_404(user_id)
    
    try:
        # Option soft delete (désactivation)
        if request.args.get('soft', 'true').lower() == 'true':
            user.is_active = False
            db.session.commit()
            return jsonify({'message': 'Utilisateur désactivé'}), 200
        else:
            db.session.delete(user)
            db.session.commit()
            return jsonify({'message': 'Utilisateur supprimé'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
    
    # Route pour la déconnexion
@admin_users_bp.route('/logout')
@jwt_required()
def logout():
    # Logique de déconnexion
    session.logout()
    return redirect('/')

    # Route pour la page de déconnexion
@admin_users_bp.route('/')#
def home():
    return send_from_directory('frontend', 'index.html')
