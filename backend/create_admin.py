# backend/create_admin.py
import sys
import os

# Ajouter le dossier backend au path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models.user import User

def create_admin():
    """Crée un utilisateur administrateur"""
    app = create_app()
    
    with app.app_context():
        # Vérifier si un admin existe déjà
        admin = User.query.filter_by(email='admin@fmp.com').first()
        
        if admin:
            print("Un administrateur existe déjà. Mise à jour du mot de passe...")
            admin.set_password('Admin123!')
            admin.is_admin = True
        else:
            # Création d'un nouvel admin
            admin = User(
                email='admin@fmp.com',
                firstname='Admin',
                lastname='FMP'
            )
            admin.set_password('Admin123!')
            admin.is_admin = True
            db.session.add(admin)
            
        # Sauvegarder les changements
        db.session.commit()
        
        print("==============================================")
        print("Administrateur créé/mis à jour avec succès !")
        print("Email: admin@fmp.com")
        print("Mot de passe: Admin123!")
        print("==============================================")

if __name__ == "__main__":
    create_admin()