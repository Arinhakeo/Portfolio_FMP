# backend/app/products/models.py

from datetime import datetime
from .. import db
from slugify import slugify
from werkzeug.security import generate_password_hash, check_password_hash

class Category(db.Model):
    """Modèle pour les catégories de produits."""
    
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
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class Brand(db.Model):
    """Modèle pour les marques d'imprimantes."""
    
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
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Product(db.Model):
    """Modèle pour les produits (cartouches d'imprimante)."""
    
    __tablename__ = 'products'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    slug = db.Column(db.String(255), nullable=False)
    sku = db.Column(db.String(50), unique=True, nullable=False)
    description = db.Column(db.Text)
    short_description = db.Column(db.String(255))
    price = db.Column(db.Float, nullable=False)
    stock_quantity = db.Column(db.Integer, default=0)
    min_stock_level = db.Column(db.Integer, default=5)
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id'))
    brand_id = db.Column(db.Integer, db.ForeignKey('brands.id'))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relations
    images = db.relationship('ProductImage', backref='product', cascade='all, delete-orphan')
    specifications = db.relationship('ProductSpecification', backref='product', cascade='all, delete-orphan')
    
    def __init__(self, name, sku, price, category_id, brand_id, **kwargs):
        self.name = name
        self.slug = slugify(name)
        self.sku = sku
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
            'name': self.name,
            'slug': self.slug,
            'sku': self.sku,
            'description': self.description,
            'short_description': self.short_description,
            'price': self.price,
            'stock_quantity': self.stock_quantity,
            'min_stock_level': self.min_stock_level,
            'category_id': self.category_id,
            'brand_id': self.brand_id,
            'is_active': self.is_active,
            'images': [img.to_dict() for img in self.images],
            'specifications': [spec.to_dict() for spec in self.specifications],
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class ProductImage(db.Model):
    """Modèle pour les images de produits."""
    
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
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class ProductSpecification(db.Model):
    """Modèle pour les spécifications techniques des produits."""
    
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

class User(db.Model):
    """Modèle pour les utilisateurs."""
    
    id = db.Column(db.Integer, primary_key=True)
    firstname = db.Column(db.String(50), nullable=False)
    lastname = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)
    is_admin = db.Column(db.Boolean, default=False)
    is_verified = db.Column(db.Boolean, default=False)
    verification_token = db.Column(db.String(120), nullable=True)
    verification_token_expires = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def set_password(self, password):
        """Définit le mot de passe haché de l'utilisateur."""
        self.password = generate_password_hash(password)

    def check_password(self, password):
        """Vérifie si le mot de passe fourni correspond au mot de passe haché."""
        return check_password_hash(self.password, password)
        
    def to_dict(self):
        """Convertit l'utilisateur en dictionnaire (sans le mot de passe)."""
        return {
            'id': self.id,
            'firstname': self.firstname,
            'lastname': self.lastname,
            'email': self.email,
            'is_admin': self.is_admin,
            'is_verified': self.is_verified,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }