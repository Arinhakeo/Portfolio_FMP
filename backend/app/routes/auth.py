from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    get_jwt_identity,
    jwt_required
)
from app import db
from app.models.user import User
from email_validator import validate_email, EmailNotValidError

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

    # Route d'enregistrement utilisateur

@auth_bp.route('/register', methods=['POST'])
def register():
    """Enregistrement d'un nouvel utilisateur.
    
    Attends un JSON avec:
        - email: Email de l'utilisateur
        - password: Mot de passe
        - firstname: Prénom
        - lastname: Nom
    
    Returns:
        JSON: Données utilisateur et token d'accès
    """
    try:
        data = request.get_json()

        # Validation des données
        if not all(k in data for k in ['email', 'password', 'firstname', 'lastname']):
            return jsonify({'error': 'Tous les champs sont requis'}), 400

        # Validation de l'email
        try:
            valid = validate_email(data['email'])
            email = valid.email
        except EmailNotValidError as e:
            return jsonify({'error': str(e)}), 400

        # Vérification si l'email existe déjà
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Cet email est déjà utilisé'}), 400

        # Création de l'utilisateur
        user = User(
            email=email,
            firstname=data['firstname'],
            lastname=data['lastname']
        )
        user.set_password(data['password'])

        # Sauvegarde en base de données
        db.session.add(user)
        db.session.commit()

        # Création des tokens
        access_token = create_access_token(identity=user.id)
        refresh_token = create_refresh_token(identity=user.id)

        return jsonify({
            'message': 'Inscription réussie',
            'user': user.to_dict(),
            'access_token': access_token,
            'refresh_token': refresh_token
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

    # Route de connexion utilisateur
    
@auth_bp.route('/login', methods=['POST'])
def login():
    """Route de connexion utilisateur.
    
    Attends un JSON avec:
        - email: Email de l'utilisateur
        - password: Mot de passe
    
    Returns:
        JSON: Données utilisateur et tokens d'accès/rafraîchissement
    """
    try:
        data = request.get_json()

        # Validation des données reçues
        if not data or not data.get('email') or not data.get('password'):
            return jsonify({
                'error': 'Email et mot de passe requis'
            }), 400

        # Recherche de l'utilisateur
        user = User.query.filter_by(email=data['email'].lower()).first()

        # Vérification de l'utilisateur et du mot de passe
        if not user or not user.check_password(data['password']):
            return jsonify({
                'error': 'Email ou mot de passe incorrect'
            }), 401

        # Vérification du statut du compte
        if not user.is_active:
            return jsonify({
                'error': 'Ce compte a été désactivé'
            }), 401

        # Création des tokens
        access_token = create_access_token(identity=user.id)
        refresh_token = create_refresh_token(identity=user.id)

        # Retour de la réponse
        return jsonify({
            'message': 'Connexion réussie',
            'user': user.to_dict(),
            'access_token': access_token,
            'refresh_token': refresh_token
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

    # Route de  récupération du profil utilisateur

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_profile():
    """Récupère le profil de l'utilisateur connecté.
    
    Nécessite un token JWT valide dans le header Authorization.
    
    Returns:
        JSON: Données du profil utilisateur
    """
    try:
        # Récupération de l'ID utilisateur depuis le token
        current_user_id = get_jwt_identity()
        
        # Recherche de l'utilisateur en base
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({
                'error': 'Utilisateur non trouvé'
            }), 404

        # Retour des données utilisateur
        return jsonify(user.to_dict()), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
    # Route de modification du profil utilisateur
    
@auth_bp.route('/me', methods=['PUT'])
@jwt_required()
def update_profile():
    """Met à jour le profil de l'utilisateur connecté.
    
    Attends un JSON avec les champs à modifier:
        - firstname (optionnel): Nouveau prénom
        - lastname (optionnel): Nouveau nom
        - current_password (requis pour changer le mot de passe)
        - new_password (optionnel): Nouveau mot de passe
    
    Returns:
        JSON: Données du profil mises à jour
    """
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({
                'error': 'Utilisateur non trouvé'
            }), 404

        data = request.get_json()
        
        # Mise à jour des champs de base
        if 'firstname' in data:
            user.firstname = data['firstname']
        if 'lastname' in data:
            user.lastname = data['lastname']
            
        # Gestion du changement de mot de passe
        if 'new_password' in data:
            # Vérification du mot de passe actuel
            if not data.get('current_password'):
                return jsonify({
                    'error': 'Mot de passe actuel requis'
                }), 400
                
            if not user.check_password(data['current_password']):
                return jsonify({
                    'error': 'Mot de passe actuel incorrect'
                }), 401
                
            # Mise à jour du mot de passe
            user.set_password(data['new_password'])

        # Sauvegarde des modifications
        db.session.commit()

        return jsonify({
            'message': 'Profil mis à jour avec succès',
            'user': user.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
    
    # Route de renouvellement du token d'accès

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh_token():
    """Renouvelle le token d'accès en utilisant le refresh token.
    
    Nécessite un refresh token valide dans le header Authorization.
    
    Returns:
        JSON: Nouveau token d'accès
    """
    try:
        current_user_id = get_jwt_identity()
        
        # Vérification que l'utilisateur existe toujours
        user = User.query.get(current_user_id)
        if not user or not user.is_active:
            return jsonify({
                'error': 'Compte utilisateur invalide'
            }), 401

        # Création d'un nouveau token d'accès
        new_access_token = create_access_token(identity=current_user_id)
        
        return jsonify({
            'access_token': new_access_token
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
    # Route de déconnexion utilisateur
    
@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """Gère la déconnexion de l'utilisateur.
    
    Dans une implémentation JWT, la déconnexion se fait côté client
    en supprimant le token, mais cette route peut être utilisée
    pour des actions supplémentaires (logging, invalidation de token, etc.)
    
    Returns:
        JSON: Message de confirmation
    """
    try:
        # Note: Dans une implémentation plus complexe, on pourrait
        # ajouter le token à une liste noire ici
        
        return jsonify({
            'message': 'Déconnexion réussie'
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500