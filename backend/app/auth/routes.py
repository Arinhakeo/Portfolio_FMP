# ============================================================================
#                         ROUTES D'AUTHENTIFICATION                          
# ============================================================================

"""
Endpoints de l'API pour l'authentification des utilisateurs.
Gère l'inscription, la connexion, la déconnexion et la gestion du profil.
"""
from datetime import timedelta
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    get_jwt_identity,
    jwt_required
)
from app import db
from app.models.user import User
from email_validator import validate_email, EmailNotValidError
import logging

# ============================================================================
#                         CONFIGURATION                                      
# ============================================================================

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Création du Blueprint
auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

# ============================================================================
#                         UTILITAIRES                                        
# ============================================================================

def validate_registration_data(data):
    """
    Valide les données d'inscription
    
    Args:
        data (dict): Données à valider
        
    Returns:
        tuple: (is_valid, error_message)
    """
    required_fields = ['email', 'password', 'firstname', 'lastname']
    
    if not all(k in data for k in required_fields):
        return False, 'Tous les champs sont requis'
        
    try:
        valid = validate_email(data['email'])
        data['email'] = valid.email
    except EmailNotValidError as e:
        return False, str(e)
        
    if len(data['password']) < 8:
        return False, 'Le mot de passe doit faire au moins 8 caractères'
        
    return True, None

def create_tokens(user_id):
    """
    Crée les tokens d'authentification
    
    Args:
        user_id (int): ID de l'utilisateur
        
    Returns:
        tuple: (access_token, refresh_token)
    """
    access_token = create_access_token(identity=str(user_id))
    refresh_token = create_refresh_token(identity=str(user_id))
    return access_token, refresh_token

# ============================================================================
#                         ROUTES D'INSCRIPTION                               
# ============================================================================

@auth_bp.route('/register', methods=['POST'])
def register():
    """
    Inscription d'un nouvel utilisateur
    
    Body JSON:
        email (str): Email de l'utilisateur
        password (str): Mot de passe
        firstname (str): Prénom
        lastname (str): Nom de famille
    
    Returns:
        Response: Données utilisateur et tokens au format JSON
    """
    try:
        data = request.get_json()
        
        # Validation des données
        is_valid, error = validate_registration_data(data)
        if not is_valid:
            return jsonify({'error': error}), 400

        # Vérification email unique
        if User.query.filter_by(email=data['email'].lower()).first():
            return jsonify({'error': 'Cet email est déjà utilisé'}), 400

        # Création utilisateur
        user = User(
            email=data['email'],
            firstname=data['firstname'],
            lastname=data['lastname']
        )
        user.set_password(data['password'])

        # Sauvegarde en base
        db.session.add(user)
        db.session.commit()

        # Création tokens
        access_token, refresh_token = create_tokens(user.id)

        return jsonify({
            'message': 'Inscription réussie',
            'user': user.to_dict(),
            'token': access_token,
            'refresh_token': refresh_token
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"Erreur inscription: {str(e)}")
        return jsonify({'error': 'Erreur lors de l\'inscription'}), 500

# ============================================================================
#                         ROUTES DE CONNEXION                                
# ============================================================================

@auth_bp.route('/login', methods=['POST'])
def login():
    """
    Connexion d'un utilisateur existant
    
    Body JSON:
        email (str): Email de l'utilisateur
        password (str): Mot de passe
        
    Returns:
        Response: Données utilisateur et tokens au format JSON
    """
    try:
        data = request.get_json()
        
        # Validation
        if not data or 'email' not in data or 'password' not in data:
            return jsonify({'error': 'Email et mot de passe requis'}), 400

        # Recherche utilisateur
        user = User.query.filter_by(email=data['email'].lower()).first()
        
        # Log pour débogage
        logger.info(f"Tentative de connexion pour: {data['email']}")
        logger.info(f"Utilisateur trouvé: {user is not None}")
        if user:
            logger.info(f"Est admin: {user.is_admin}")

        # Vérification
        if not user or not user.check_password(data['password']):
            return jsonify({'error': 'Email ou mot de passe incorrect'}), 401

        # Vérification compte actif
        if not user.is_active:
            return jsonify({'error': 'Ce compte a été désactivé'}), 401

        # Création token avec l'ID utilisateur en tant que chaîne
        # Pour éviter le problème "Subject must be a string"
        access_token = create_access_token(identity=str(user.id))
        refresh_token = create_refresh_token(identity=str(user.id))

        # Dernière connexion
        user.update_last_login()
        db.session.commit()

        return jsonify({
            'message': 'Connexion réussie',
            'user': user.to_dict(),
            'token': access_token,
            'refresh_token': refresh_token
        }), 200
    except Exception as e:
        logger.error(f"Erreur login: {str(e)}")
        return jsonify({'error': str(e)}), 500

# ============================================================================
#                         ROUTES DE PROFIL                                   
# ============================================================================

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_profile():
    """
    Récupère le profil de l'utilisateur connecté
    Nécessite un token JWT valide
    
    Returns:
        Response: Données du profil au format JSON
    """
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'Utilisateur non trouvé'}), 404

        return jsonify(user.to_dict()), 200

    except Exception as e:
        logger.error(f"Erreur récupération profil: {str(e)}")
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/me', methods=['PUT'])
@jwt_required()
def update_profile():
    """
    Met à jour le profil utilisateur, y compris l'adresse principale.
    """
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'Utilisateur non trouvé'}), 404

        data = request.get_json()
        
        # Mise à jour des champs basiques
        if 'firstname' in data:
            user.firstname = data['firstname']
        if 'lastname' in data:
            user.lastname = data['lastname']
        if 'email' in data:
            user.email = data['email']
        if 'phone' in data:
            user.phone = data['phone']
            
        # Mise à jour de l'adresse principale
        if 'address' in data:
            address_data = data['address']
            if not user.addresses:
                # Créer une nouvelle adresse si aucune n'existe
                new_address = Address(
                    user_id=current_user_id,
                    firstname=user.firstname,
                    lastname=user.lastname,
                    address=address_data.get('street'),
                    city=address_data.get('city'),
                    postal_code=address_data.get('zip'),
                    country=address_data.get('country'),
                    is_default=True
                )
                db.session.add(new_address)
            else:
                # Mettre à jour l'adresse principale existante
                main_address = user.addresses.filter_by(is_default=True).first()
                if main_address:
                    main_address.address = address_data.get('street', main_address.address)
                    main_address.city = address_data.get('city', main_address.city)
                    main_address.postal_code = address_data.get('zip', main_address.postal_code)
                    main_address.country = address_data.get('country', main_address.country)

        db.session.commit()

        return jsonify({
            'message': 'Profil mis à jour',
            'user': user.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Erreur mise à jour profil: {str(e)}")
        return jsonify({'error': str(e)}), 500

# ============================================================================
#                         ROUTES DE SESSION                                  
# ============================================================================

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh_token():
    """
    Renouvelle le token d'accès avec un refresh token
    Nécessite un refresh token valide
    
    Returns:
        Response: Nouveau token d'accès au format JSON
    """
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user or not user.is_active:
            return jsonify({'error': 'Compte utilisateur invalide'}), 401

        new_access_token = create_access_token(identity=str(current_user_id))
        
        return jsonify({
            'token': new_access_token
        }), 200

    except Exception as e:
        logger.error(f"Erreur refresh token: {str(e)}")
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """
    Déconnexion de l'utilisateur
    Révoque le token côté serveur
    
    Returns:
        Response: Message de confirmation au format JSON
    """
    try:
        return jsonify({
            'message': 'Déconnexion réussie'
        }), 200

    except Exception as e:
        logger.error(f"Erreur logout: {str(e)}")
        return jsonify({'error': str(e)}), 500