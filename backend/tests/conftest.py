# backend/tests/conftest.py

"""
Configuration des tests.
Contient les fixtures pytest utilisées dans les tests.
"""

import pytest
from app import create_app, db
from app.models.user import User

@pytest.fixture
def app():
    """Crée une instance de l'application pour les tests."""
    app = create_app('testing')
    
    # Création du contexte d'application
    with app.app_context():
        db.create_all()  # Création des tables
        yield app  # Fournit l'application aux tests
        db.session.remove()  # Nettoyage de la session
        db.drop_all()  # Suppression des tables

@pytest.fixture
def client(app):
    """Crée un client de test."""
    return app.test_client()

@pytest.fixture
def test_user(app):
    """Crée un utilisateur de test."""
    user = User(
        email='test@example.com',
        firstname='Test',
        lastname='User'
    )
    user.set_password('password123')
    
    with app.app_context():
        db.session.add(user)
        db.session.commit()
    
    return user