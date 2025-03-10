## Guide de lancement du projet Portfolio_FMP

Ce guide vous aidera à configurer et lancer le projet Portfolio_FMP sur votre machine locale.

### Prérequis

- Python 3.7 ou supérieur
- pip (gestionnaire de paquets Python)
- Git (pour cloner le dépôt)

### Étape 1 : Cloner le dépôt

```bash
git clone https://github.com/Arinhakeo/Portfolio_FMP.git
cd Portfolio_FMP
```

### Étape 2 : Configurer l'environnement virtuel

```bash
python3 -m venv venv
```

Activez l'environnement virtuel :
- Sur Windows : `venv\Scripts\activate`
- Sur macOS/Linux : `source venv/bin/activate`

### Étape 3 : Installer les dépendances

```bash
pip install -r requirements.txt
```

### Étape 4 : Configurer les variables d'environnement

Créez un fichier `.env` à la racine du projet et ajoutez les variables nécessaires :

```
FLASK_APP=run.py
FLASK_ENV=development
SECRET_KEY=votre_clé_secrète_ici
DATABASE_URL=votre_url_de_base_de_données_si_nécessaire
```

### Étape 5 : Lancer l'application

Naviguez vers le dossier backend :

```bash
cd backend
```

Lancez l'application :

```bash
flask run
```

L'application devrait maintenant être accessible à l'adresse `http://127.0.0.1:5000`.

### Notes supplémentaires

- Si vous rencontrez des problèmes, assurez-vous que tous les fichiers nécessaires sont présents et que les chemins sont corrects.
- Vérifiez que toutes les dépendances sont correctement installées.
- En cas d'erreur, consultez les logs dans le terminal pour plus d'informations.

### Arrêt de l'application

Pour arrêter l'application, utilisez `Ctrl+C` dans le terminal.

Pour désactiver l'environnement virtuel, utilisez la commande `deactivate`.

