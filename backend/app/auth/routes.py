from flask import jsonify, request
from flask import Blueprint
from flask_jwt_extended import jwt_required, get_jwt_identity
from . import auth_bp
from flask import jsonify, request, current_app
from flask_mail import Mail, Message
from werkzeug.security import generate_password_hash
from .. import db
from ..models.user import User
from werkzeug.security import check_password_hash
from flask_jwt_extended import create_access_token
import secrets

mail = Mail()

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() # Récupérer les données JSON de la requête
    if not data:
        return jsonify({"error": "No data provided"}), 400

    # Valider les données
    if 'email' not in data or 'password' not in data:
        return jsonify({"error": "Missing email or password"}), 400
    
    # Vérifier si l'email existe déjà
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email déjà utilisé'}), 400
    
    # Générer un token de vérification
    verification_token = secrets.token_urlsafe(32)
    
    # Créer un nouvel utilisateur
    new_user = User(
        firstname=data['firstname'],
        lastname=data['lastname'],
        email=data['email'],
        password=generate_password_hash(data['password']),
        verification_token=verification_token,
        is_verified=False
    )
    
    try:
        # Sauvegarder dans la base de données
        db.session.add(new_user)
        db.session.commit()
        
        # Envoyer l'email de vérification
        verification_url = f"http://localhost:5000/verify-email?token={verification_token}"
        msg = Message('Vérification de votre compte FMP',
                     sender='votre-email@domain.com',
                     recipients=[data['email']])
        msg.body = f"""
        Bienvenue sur FMP!
        
        Pour vérifier votre compte, cliquez sur le lien suivant:
        {verification_url}
        
        Ce lien expire dans 24 heures.
        """
        mail.send(msg)
        
        return jsonify({
            'message': 'Inscription réussie. Vérifiez votre email pour activer votre compte.'
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/verify-email', methods=['GET'])
def verify_email():
    token = request.args.get('token')
    
    user = User.query.filter_by(verification_token=token).first()
    
    if not user:
        return jsonify({'error': 'Token invalide'}), 400
    
    user.is_verified = True
    user.verification_token = None
    
    try:
        db.session.commit()
        return jsonify({'message': 'Email vérifié avec succès'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({"error": "Email et mot de passe requis"}), 400
        
    user = User.query.filter_by(email=data['email']).first()
    
    if user and user.check_password(data['password']):
        access_token = create_access_token(identity=user.id)
        return jsonify({
            'token': access_token,
            'user': {
                'id': user.id,
                'email': user.email,
                'firstname': user.firstname,
                'lastname': user.lastname,
                'is_admin': user.is_admin
            },
            # Ajouter le chemin de redirection selon le rôle
            'redirect': '/admin/pages/products' if user.is_admin else '/'
        }), 200

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    email = data.get('email')
    
    try:
        # Votre logique pour gérer le mot de passe oublié
        # Envoyer un email, etc.
        return jsonify({
            'message': 'Un email de réinitialisation a été envoyé'
        }), 200
    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 400

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    try:
        # Ici vous pouvez ajouter une logique supplémentaire
        # comme l'ajout du token à une liste noire
        return jsonify({
            'message': 'Déconnexion réussie'
        }), 200
    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 400