from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv
import os

# Charger les variables d'environnement
load_dotenv()

# Configuration minimale
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

def explore_db():
    with app.app_context():
        # Obtenez toutes les tables via l'inspection de SQLAlchemy
        tables = db.engine.table_names()
        print("Tables dans la base de données:")
        for table in tables:
            print(f"- {table}")
            
        # Si vous avez une table 'users', afficher son contenu
        if 'users' in tables:
            result = db.engine.execute("SELECT * FROM users")
            print("\nUtilisateurs dans la base de données:")
            for row in result:
                print(row)

if __name__ == "__main__":
    explore_db()