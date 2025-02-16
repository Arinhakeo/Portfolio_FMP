# backend/app/products/models.py

from datetime import datetime
from app import db
from slugify import slugify

class Category(db.Model):
    """Modèle pour les catégories de produits.
    
    Attributs:
        id (int): Identifiant unique
        name (str): Nom de la catégorie
        slug (str): Slug pour l'URL
        description (str): Description de la catégorie
        image_url (str): URL de l'image de la catégorie
        parent_id (int): ID de la catégorie parente (pour sous-catégories)
        created_at (datetime): Date de création
        updated_at (datetime): Date de dernière modification
    """
    
    __tablename__ = 'categories'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    slug = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.Text)
    image_url = db.Column(db.String(255))
    parent_id = db.Column(db.Integer, db.ForeignKey('categories.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relations
    products = db.relationship('Product', backref='category', lazy=True)
    subcategories = db.relationship(
        'Category',
        backref=db.backref('parent', remote_side=[id]),
        lazy=True
    )

    def __init__(self, name, description=None, image_url=None, parent_id=None):
        self.name = name
        self.slug = slugify(name)
        self.description = description
        self.image_url = image_url
        self.parent_id = parent_id

    def to_dict(self):
        """Convertit la catégorie en dictionnaire."""
        return {
            'id': self.id,
            'name': self.name,
            'slug': self.slug,
            'description': self.description,
            'image_url': self.image_url,
            'parent_id': self.parent_id,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class Brand(db.Model):
    """Modèle pour les marques d'imprimantes.
    
    Attributs:
        id (int): Identifiant unique
        name (str): Nom de la marque
        slug (str): Slug pour l'URL
        description (str): Description de la marque
        logo_url (str): URL du logo de la marque
        website (str): Site web officiel
        created_at (datetime): Date de création
    """
    
    __tablename__ = 'brands'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    slug = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.Text)
    logo_url = db.Column(db.String(255))
    website = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relations
    products = db.relationship('Product', backref='brand', lazy=True)

    def __init__(self, name, description=None, logo_url=None, website=None):
        self.name = name
        self.slug = slugify(name)
        self.description = description
        self.logo_url = logo_url
        self.website = website

    def to_dict(self):
        """Convertit la marque en dictionnaire."""
        return {
            'id': self.id,
            'name': self.name,
            'slug': self.slug,
            'description': self.description,
            'logo_url': self.logo_url,
            'website': self.website,
            'created_at': self.created_at.isoformat()
        }

class Product(db.Model):
    """Modèle pour les produits (cartouches d'imprimante).
    
    Attributs:
        id (int): Identifiant unique
        sku (str): Référence unique du produit
        name (str): Nom du produit
        slug (str): Slug pour l'URL
        description (str): Description détaillée
        short_description (str): Description courte
        price (float): Prix de vente
        stock_quantity (int): Quantité en stock
        min_stock_level (int): Niveau minimum de stock
        category_id (int): ID de la catégorie
        brand_id (int): ID de la marque
        is_active (bool): Produit actif/inactif
        created_at (datetime): Date de création
        updated_at (datetime): Date de dernière modification
    """
    
    __tablename__ = 'products'

    id = db.Column(db.Integer, primary_key=True)
    sku = db.Column(db.String(50), unique=True, nullable=False)
    name = db.Column(db.String(200), nullable=False)
    slug = db.Column(db.String(200), unique=True, nullable=False)
    description = db.Column(db.Text)
    short_description = db.Column(db.String(500))
    price = db.Column(db.Float, nullable=False)
    stock_quantity = db.Column(db.Integer, default=0)
    min_stock_level = db.Column(db.Integer, default=5)
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id'), nullable=False)
    brand_id = db.Column(db.Integer, db.ForeignKey('brands.id'), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relations
    images = db.relationship('ProductImage', backref='product', lazy=True, cascade='all, delete-orphan')
    specifications = db.relationship('ProductSpecification', backref='product', lazy=True, cascade='all, delete-orphan')

    def __init__(self, sku, name, price, category_id, brand_id, **kwargs):
        self.sku = sku
        self.name = name
        self.slug = slugify(name)
        self.price = price
        self.category_id = category_id
        self.brand_id = brand_id
        
        # Attributs optionnels
        self.description = kwargs.get('description')
        self.short_description = kwargs.get('short_description')
        self.stock_quantity = kwargs.get('stock_quantity', 0)
        self.min_stock_level = kwargs.get('min_stock_level', 5)
        self.is_active = kwargs.get('is_active', True)

    def to_dict(self):
        """Convertit le produit en dictionnaire."""
        return {
            'id': self.id,
            'sku': self.sku,
            'name': self.name,
            'slug': self.slug,
            'description': self.description,
            'short_description': self.short_description,
            'price': self.price,
            'stock_quantity': self.stock_quantity,
            'min_stock_level': self.min_stock_level,
            'category': self.category.to_dict(),
            'brand': self.brand.to_dict(),
            'is_active': self.is_active,
            'images': [img.to_dict() for img in self.images],
            'specifications': [spec.to_dict() for spec in self.specifications],
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class ProductImage(db.Model):
    """Modèle pour les images de produits.
    
    Attributs:
        id (int): Identifiant unique
        product_id (int): ID du produit associé
        url (str): URL de l'image
        alt (str): Texte alternatif
        is_primary (bool): Image principale ou non
        position (int): Position dans la galerie
        created_at (datetime): Date de création
    """
    
    __tablename__ = 'product_images'

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    url = db.Column(db.String(255), nullable=False)
    alt = db.Column(db.String(200))
    is_primary = db.Column(db.Boolean, default=False)
    position = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        """Convertit l'image en dictionnaire."""
        return {
            'id': self.id,
            'url': self.url,
            'alt': self.alt,
            'is_primary': self.is_primary,
            'position': self.position,
            'created_at': self.created_at.isoformat()
        }

class ProductSpecification(db.Model):
    """Modèle pour les spécifications techniques des produits.
    
    Attributs:
        id (int): Identifiant unique
        product_id (int): ID du produit associé
        name (str): Nom de la spécification
        value (str): Valeur de la spécification
        unit (str): Unité de mesure (optionnel)
        position (int): Position dans la liste
    """
    
    __tablename__ = 'product_specifications'

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    value = db.Column(db.String(200), nullable=False)
    unit = db.Column(db.String(50))
    position = db.Column(db.Integer, default=0)

    def to_dict(self):
        """Convertit la spécification en dictionnaire."""
        return {
            'id': self.id,
            'name': self.name,
            'value': self.value,
            'unit': self.unit,
            'position': self.position
        }