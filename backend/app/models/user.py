from datetime import datetime
from app import db
from werkzeug.security import generate_password_hash, check_password_hash

class User(db.Model):
    """Modèle pour les utilisateurs de l'application.
    
    Attributs:
        id (int): Identifiant unique de l'utilisateur
        email (str): Email de l'utilisateur (unique)
        firstname (str): Prénom de l'utilisateur
        lastname (str): Nom de l'utilisateur
        password_hash (str): Hash du mot de passe
        created_at (datetime): Date de création du compte
        is_active (bool): Statut du compte (actif/inactif)
        is_admin (bool): Droits administrateur
    """
    
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    firstname = db.Column(db.String(50), nullable=False)
    lastname = db.Column(db.String(50), nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    is_admin = db.Column(db.Boolean, default=False)

    def __init__(self, email, firstname, lastname, password=None):
        """Initialise un nouvel utilisateur.
        
        Args:
            email (str): Email de l'utilisateur
            firstname (str): Prénom de l'utilisateur
            lastname (str): Nom de l'utilisateur
            password (str, optional): Mot de passe en clair
        """
        self.email = email.lower()
        self.firstname = firstname
        self.lastname = lastname
        if password:
            self.set_password(password)

    def set_password(self, password):
        """Hash et stocke le mot de passe."""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Vérifie si le mot de passe correspond au hash.
        
        Returns:
            bool: True si le mot de passe correspond, False sinon
        """
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        """Convertit l'utilisateur en dictionnaire pour l'API.
        
        Returns:
            dict: Données de l'utilisateur
        """
        return {
            'id': self.id,
            'email': self.email,
            'firstname': self.firstname,
            'lastname': self.lastname,
            'created_at': self.created_at.isoformat(),
            'is_admin': self.is_admin
        }
        
    def __repr__(self):
        return f'<User {self.email}>'