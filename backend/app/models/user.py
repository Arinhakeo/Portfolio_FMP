# ============================================================================
#                         MODÈLE UTILISATEUR
# ============================================================================

"""
Modèle de données pour la gestion des utilisateurs
Inclut la gestion des mots de passe, des tokens et des rôles
"""

from datetime import datetime, timedelta
from app import db
from werkzeug.security import generate_password_hash, check_password_hash
import secrets

# ============================================================================
#                         CONFIGURATION
# ============================================================================

PASSWORD_MIN_LENGTH = 8
TOKEN_EXPIRY_HOURS = 24

# ============================================================================
#                         MODÈLE PRINCIPAL
# ============================================================================

class User(db.Model):
    """
    Modèle utilisateur avec gestion de l'authentification
    """
    __tablename__ = 'users'

    # Champs d'identification
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    
    # Informations personnelles
    firstname = db.Column(db.String(50), nullable=False)
    lastname = db.Column(db.String(50), nullable=False)
    
    # Champs de statut
    is_active = db.Column(db.Boolean, default=True)
    is_admin = db.Column(db.Boolean, default=False)
    is_verified = db.Column(db.Boolean, default=False)
    
    # Champs de vérification
    verification_token = db.Column(db.String(100), unique=True, nullable=True)
    verification_token_expires = db.Column(db.DateTime, nullable=True)
    
    # Métadonnées
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime, nullable=True)

    # Relations
    orders = db.relationship('Order', back_populates='user', lazy='dynamic')
    addresses = db.relationship('Address', back_populates='user', lazy='dynamic')
    
    def __init__(self, email, firstname, lastname, password=None):
        """
        Initialise un nouvel utilisateur
        
        Args:
            email (str): Email de l'utilisateur
            firstname (str): Prénom
            lastname (str): Nom
            password (str, optional): Mot de passe en clair
        """
        self.email = email.lower()
        self.firstname = firstname
        self.lastname = lastname
        
        if password:
            self.set_password(password)
            
        # Génération token de vérification
        self.generate_verification_token()

    # ============================================================================
    #                         GESTION MOT DE PASSE
    # ============================================================================

    def set_password(self, password):
        """
        Hash et stocke le mot de passe
        
        Args:
            password (str): Mot de passe en clair
        """
        if len(password) < PASSWORD_MIN_LENGTH:
            raise ValueError(f"Le mot de passe doit faire au moins {PASSWORD_MIN_LENGTH} caractères")
        
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """
        Vérifie si le mot de passe correspond
        
        Args:
            password (str): Mot de passe à vérifier
            
        Returns:
            bool: True si le mot de passe correspond
        """
        return check_password_hash(self.password_hash, password)

    # ============================================================================
    #                         GESTION VÉRIFICATION
    # ============================================================================

    def generate_verification_token(self):
        """Génère un nouveau token de vérification"""
        self.verification_token = secrets.token_urlsafe(32)
        self.verification_token_expires = datetime.utcnow() + timedelta(hours=TOKEN_EXPIRY_HOURS)

    def verify_email(self):
        """Marque l'email comme vérifié"""
        self.is_verified = True
        self.verification_token = None
        self.verification_token_expires = None

    def is_token_valid(self, token):
        """
        Vérifie si un token de vérification est valide
        
        Args:
            token (str): Token à vérifier
            
        Returns:
            bool: True si le token est valide et non expiré
        """
        return (
            self.verification_token == token and
            self.verification_token_expires > datetime.utcnow()
        )

    # ============================================================================
    #                         MÉTHODES UTILITAIRES
    # ============================================================================

    def to_dict(self):
        """
        Convertit l'utilisateur en dictionnaire pour l'API
        
        Returns:
            dict: Données de l'utilisateur
        """
        return {
            'id': self.id,
            'email': self.email,
            'firstname': self.firstname,
            'lastname': self.lastname,
            'is_active': self.is_active,
            'is_admin': self.is_admin,
            'is_verified': self.is_verified,
            'created_at': self.created_at.isoformat(),
            'last_login': self.last_login.isoformat() if self.last_login else None
        }

    def update_last_login(self):
        """Met à jour la date de dernière connexion"""
        self.last_login = datetime.utcnow()

    def __repr__(self):
        """Représentation string de l'utilisateur"""
        return f'<User {self.email}>'