# backend/app/products/schemas.py

from marshmallow import Schema, fields, validate

class CategorySchema(Schema):
    """Schéma de validation pour les catégories."""
    
    id = fields.Int(dump_only=True)
    name = fields.Str(required=True, validate=validate.Length(min=2, max=100))
    description = fields.Str()
    image_url = fields.Str()
    parent_id = fields.Int(allow_none=True)

class BrandSchema(Schema):
    """Schéma de validation pour les marques."""
    
    id = fields.Int(dump_only=True)
    name = fields.Str(required=True, validate=validate.Length(min=2, max=100))
    description = fields.Str()
    logo_url = fields.Str()
    website = fields.Str()

class ProductImageSchema(Schema):
    """Schéma de validation pour les images de produits."""
    
    id = fields.Int(dump_only=True)
    url = fields.Str(required=True)
    alt = fields.Str()
    is_primary = fields.Bool()
    position = fields.Int()

class ProductSpecificationSchema(Schema):
    """Schéma de validation pour les spécifications produits."""
    
    id = fields.Int(dump_only=True)
    name = fields.Str(required=True, validate=validate.Length(min=2, max=100))
    value = fields.Str(required=True)
    unit = fields.Str()
    position = fields.Int()

class ProductSchema(Schema):
    """Schéma de validation pour les produits."""
    
    id = fields.Int(dump_only=True)
    sku = fields.Str(required=True, validate=validate.Length(min=3, max=50))
    name = fields.Str(required=True, validate=validate.Length(min=3, max=200))
    description = fields.Str()
    short_description = fields.Str(validate=validate.Length(max=500))
    price = fields.Float(required=True, validate=validate.Range(min=0))
    stock_quantity = fields.Int()
    min_stock_level = fields.Int()
    category_id = fields.Int(required=True)
    brand_id = fields.Int(required=True)
    is_active = fields.Bool()
    images = fields.Nested(ProductImageSchema, many=True)
    specifications = fields.Nested(ProductSpecificationSchema, many=True)