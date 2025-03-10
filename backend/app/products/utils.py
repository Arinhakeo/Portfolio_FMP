# backend/app/products/utils.py

import os
import uuid
from datetime import datetime
from PIL import Image
from flask import current_app
from werkzeug.utils import secure_filename
from app.products.models import Product, Category, Brand
# Configuration
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
IMAGE_SIZES = {
    'thumbnail': (150, 150),
    'medium': (400, 400),
    'large': (800, 800)
}

def allowed_file(filename):
    """Vérifie si l'extension du fichier est autorisée.
    
    Args:
        filename (str): Nom du fichier à vérifier
        
    Returns:
        bool: True si l'extension est autorisée
    """
    return '.' in filename and \
        filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def generate_unique_filename(filename):
    """Génère un nom de fichier unique.
    
    Args:
        filename (str): Nom original du fichier
        
    Returns:
        str: Nouveau nom de fichier unique
    """
    # Sécurisation du nom de fichier
    filename = secure_filename(filename)
    
    # Extraction de l'extension
    ext = filename.rsplit('.', 1)[1].lower()
    
    # Génération d'un nom unique
    unique_filename = f"{uuid.uuid4().hex}_{int(datetime.now().timestamp())}.{ext}"
    
    return unique_filename

def create_image_versions(image_path, filename):
    """Crée différentes versions d'une image.
    
    Args:
        image_path (str): Chemin de l'image originale
        filename (str): Nom du fichier
        
    Returns:
        dict: Chemins des différentes versions
    """
    versions = {}
    
    try:
        # Ouverture de l'image
        with Image.open(image_path) as img:
            # Conversion en RGB si nécessaire
            if img.mode in ('RGBA', 'P'):
                img = img.convert('RGB')
                
            # Création des différentes versions
            for size_name, dimensions in IMAGE_SIZES.items():
                # Création du nom de fichier pour cette version
                version_filename = f"{size_name}_{filename}"
                version_path = os.path.join(
                    current_app.config['UPLOAD_FOLDER'],
                    'products',
                    version_filename
                )
                
                # Redimensionnement et sauvegarde
                img_copy = img.copy()
                img_copy.thumbnail(dimensions, Image.LANCZOS)
                img_copy.save(version_path, quality=85, optimize=True)
                
                # Stockage du chemin relatif
                versions[size_name] = f"products/{version_filename}"
                
        return versions
        
    except Exception as e:
        # Suppression des fichiers en cas d'erreur
        for version_path in versions.values():
            try:
                os.remove(os.path.join(current_app.config['UPLOAD_FOLDER'], version_path))
            except:
                pass
        raise e

def save_product_image(file):
    """Sauvegarde une image de produit.
    
    Args:
        file: Objet fichier uploadé
        
    Returns:
        dict: URLs des différentes versions de l'image
    """
    if not file or not allowed_file(file.filename):
        raise ValueError('Type de fichier non autorisé')
    
    try:
        # Génération d'un nom unique
        filename = generate_unique_filename(file.filename)
        
        # Chemin de sauvegarde temporaire
        temp_path = os.path.join(
            current_app.config['UPLOAD_FOLDER'],
            'temp',
            filename
        )
        
        # Création du dossier temporaire si nécessaire
        os.makedirs(os.path.dirname(temp_path), exist_ok=True)
        
        # Sauvegarde temporaire du fichier
        file.save(temp_path)
        
        # Création des différentes versions
        versions = create_image_versions(temp_path, filename)
        
        # Suppression du fichier temporaire
        os.remove(temp_path)
        
        return versions
        
    except Exception as e:
        raise ValueError(f'Erreur lors de la sauvegarde de l\'image: {str(e)}')

def delete_product_image(url):
    try:
        # Chemin du fichier
        file_path = os.path.join(current_app.root_path, 'static', url.lstrip('/static/'))
        
        # Vérifier si le fichier existe avant de tenter de le supprimer
        if os.path.exists(file_path):
            os.remove(file_path)
            return True
        else:
            current_app.logger.warning(f"Fichier image introuvable: {file_path}")
            return False
    except Exception as e:
        current_app.logger.error(f"Erreur lors de la suppression de l'image: {str(e)}")
        return False

def get_product_stock_status(product):
    """Détermine le statut du stock d'un produit.
    
    Args:
        product: Instance du modèle Product
        
    Returns:
        tuple: (status, message)
    """
    if not product.is_active:
        return 'inactive', 'Produit non disponible'
        
    if product.stock_quantity <= 0:
        return 'out_of_stock', 'Rupture de stock'
        
    if product.stock_quantity <= product.min_stock_level:
        return 'low_stock', f'Plus que {product.stock_quantity} en stock'
        
    return 'in_stock', 'En stock'

def update_product_stock(product, quantity, operation='subtract'):
    """Met à jour le stock d'un produit.
    
    Args:
        product: Instance du modèle Product
        quantity (int): Quantité à ajouter ou soustraire
        operation (str): 'add' ou 'subtract'
        
    Returns:
        bool: True si la mise à jour est réussie
    """
    try:
        if operation == 'subtract':
            if product.stock_quantity < quantity:
                raise ValueError('Stock insuffisant')
            product.stock_quantity -= quantity
        else:
            product.stock_quantity += quantity
            
        return True
        
    except Exception as e:
        current_app.logger.error(f'Erreur de mise à jour du stock: {str(e)}')
        return False

def generate_sku(brand, category, identifier):
    """Génère un SKU unique pour un produit.
    
    Args:
        brand: Instance du modèle Brand
        category: Instance du modèle Category
        identifier: Identifiant unique
        
    Returns:
        str: SKU généré
    """
    # Format: BRD-CAT-IDENTIFIER
    brand_code = ''.join(word[0].upper() for word in brand.name.split())[:3]
    cat_code = ''.join(word[0].upper() for word in category.name.split())[:3]
    
    return f"{brand_code}-{cat_code}-{identifier}"

def format_price(price, currency='EUR'):
    """Formate un prix selon la devise.
    
    Args:
        price (float): Prix à formater
        currency (str): Code de la devise
        
    Returns:
        str: Prix formaté
    """
    if currency == 'EUR':
        return f"{price:.2f} €"
    elif currency == 'USD':
        return f"${price:.2f}"
    return f"{price:.2f}"

class ProductSearchBuilder:
    """Constructeur de requêtes de recherche de produits."""
    
def __init__(self, base_query):
    self.query = base_query
        
def with_category(self, category_slug):
    """Filtre par catégorie."""
    if category_slug:
        self.query = self.query.join(Category) \
                            .filter(Category.slug == category_slug)
        return self
        
def with_brand(self, brand_slug):
    """Filtre par marque."""
    if brand_slug:
        self.query = self.query.join(Brand) \
                            .filter(Brand.slug == brand_slug)
    return self
        
def with_price_range(self, min_price=None, max_price=None):
    """Filtre par fourchette de prix."""
    if min_price is not None:
        self.query = self.query.filter(Product.price >= min_price)
    if max_price is not None:
        self.query = self.query.filter(Product.price <= max_price)
    return self
        
def with_stock_status(self, in_stock_only=False):
    """Filtre selon le statut du stock."""
    if in_stock_only:
        self.query = self.query.filter(Product.stock_quantity > 0)
    return self
        
def with_search(self, search_term):
    """Recherche dans le nom et la description."""
    if search_term:
        search = f"%{search_term}%"
        self.query = self.query.filter(
            (Product.name.ilike(search)) |
            (Product.description.ilike(search)) |
            (Product.sku.ilike(search))
        )
    return self
        
def with_sorting(self, sort_by='name', order='asc'):
    """Applique le tri."""
    if hasattr(Product, sort_by):
        sort_column = getattr(Product, sort_by)
        if order == 'desc':
            sort_column = sort_column.desc()
        self.query = self.query.order_by(sort_column)
    return self
        
def build(self):
    """Retourne la requête construite."""
    return self.query