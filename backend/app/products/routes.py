# backend/app/products/routes.py

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.products.models import Product, Category, Brand, ProductImage, ProductSpecification
from app.products.schemas import ProductSchema, CategorySchema, BrandSchema
from app.models.user import User
from app.products.utils import save_product_image, delete_product_image

# Création du Blueprint
products_bp = Blueprint('products', __name__, url_prefix='/api/products')

# Initialisation des schémas
product_schema = ProductSchema()
products_schema = ProductSchema(many=True)
category_schema = CategorySchema()
categories_schema = CategorySchema(many=True)
brand_schema = BrandSchema()
brands_schema = BrandSchema(many=True)

# =========================================
# Routes pour les produits
# =========================================

@products_bp.route('/', methods=['GET'])
def get_products():
    """Récupère la liste des produits avec filtres optionnels.
    
    Query Params:
        category (str): Filtre par catégorie
        brand (str): Filtre par marque
        search (str): Recherche dans le nom/description
        sort (str): Tri par champ
        page (int): Numéro de page
        limit (int): Nombre d'éléments par page
    """
    try:
        # Récupération des paramètres
        category = request.args.get('category')
        brand = request.args.get('brand')
        search = request.args.get('search')
        sort = request.args.get('sort', 'name')
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))

        # Construction de la requête
        query = Product.query.filter_by(is_active=True)

        # Application des filtres
        if category:
            query = query.join(Category).filter(Category.slug == category)
        
        if brand:
            query = query.join(Brand).filter(Brand.slug == brand)
        
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                (Product.name.ilike(search_term)) |
                (Product.description.ilike(search_term)) |
                (Product.sku.ilike(search_term))
            )

        # Tri
        if sort.startswith('-'):
            query = query.order_by(getattr(Product, sort[1:]).desc())
        else:
            query = query.order_by(getattr(Product, sort).asc())

        # Pagination
        pagination = query.paginate(page=page, per_page=limit, error_out=False)
        products = pagination.items

        # Préparation de la réponse
        response = {
            'items': products_schema.dump(products),
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page
        }

        return jsonify(response), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@products_bp.route('/<string:slug>', methods=['GET'])
def get_product(slug):
    """Récupère les détails d'un produit par son slug."""
    try:
        product = Product.query.filter_by(slug=slug, is_active=True).first_or_404()
        return jsonify(product_schema.dump(product)), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@products_bp.route('/', methods=['POST'])
@jwt_required()
def create_product():
    """Crée un nouveau produit (admin seulement)."""
    try:
        # Vérification des droits admin
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user or not user.is_admin:
            return jsonify({'error': 'Accès non autorisé'}), 403

        # Validation des données
        data = request.get_json()
        errors = product_schema.validate(data)
        if errors:
            return jsonify({'error': errors}), 400

        # Création du produit
        product = Product(
            sku=data['sku'],
            name=data['name'],
            price=data['price'],
            category_id=data['category_id'],
            brand_id=data['brand_id'],
            description=data.get('description'),
            short_description=data.get('short_description'),
            stock_quantity=data.get('stock_quantity', 0),
            min_stock_level=data.get('min_stock_level', 5)
        )

        # Ajout des spécifications
        if 'specifications' in data:
            for spec in data['specifications']:
                product.specifications.append(
                    ProductSpecification(**spec)
                )

        db.session.add(product)
        db.session.commit()

        return jsonify(product_schema.dump(product)), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@products_bp.route('/<int:product_id>', methods=['PUT'])
@jwt_required()
def update_product(product_id):
    """Met à jour un produit existant (admin seulement)."""
    try:
        # Vérification des droits admin
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user or not user.is_admin:
            return jsonify({'error': 'Accès non autorisé'}), 403

        # Récupération du produit
        product = Product.query.get_or_404(product_id)

        # Validation des données
        data = request.get_json()
        errors = product_schema.validate(data, partial=True)
        if errors:
            return jsonify({'error': errors}), 400

        # Mise à jour des champs
        for field in ['name', 'description', 'short_description', 'price',
                    'stock_quantity', 'min_stock_level', 'category_id',
                    'brand_id', 'is_active']:
            if field in data:
                setattr(product, field, data[field])

        # Mise à jour des spécifications
        if 'specifications' in data:
            # Suppression des anciennes spécifications
            product.specifications = []
            
            # Ajout des nouvelles spécifications
            for spec in data['specifications']:
                product.specifications.append(
                    ProductSpecification(**spec)
                )

        db.session.commit()

        return jsonify(product_schema.dump(product)), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@products_bp.route('/<int:product_id>/images', methods=['POST'])
@jwt_required()
def upload_product_image(product_id):
    """Ajoute une image à un produit."""
    try:
        # Vérification des droits admin
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user or not user.is_admin:
            return jsonify({'error': 'Accès non autorisé'}), 403

        # Vérification du produit
        product = Product.query.get_or_404(product_id)

        # Vérification du fichier
        if 'image' not in request.files:
            return jsonify({'error': 'Aucune image fournie'}), 400

        file = request.files['image']
        
        if not file.filename:
            return jsonify({'error': 'Nom de fichier invalide'}), 400

        # Sauvegarde de l'image
        image_url = save_product_image(file)

        # Création de l'entrée dans la base
        image = ProductImage(
            product_id=product_id,
            url=image_url,
            alt=request.form.get('alt', product.name),
            is_primary=not bool(product.images),  # Premier = image principale
            position=len(product.images)
        )

        db.session.add(image)
        db.session.commit()

        return jsonify({
            'message': 'Image ajoutée avec succès',
            'image': image.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@products_bp.route('/<int:product_id>/images/<int:image_id>', methods=['DELETE'])
@jwt_required()
def delete_image(product_id, image_id):
    """Supprime une image d'un produit."""
    try:
        # Vérification des droits admin
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user or not user.is_admin:
            return jsonify({'error': 'Accès non autorisé'}), 403

        # Vérification de l'image
        image = ProductImage.query.filter_by(
            id=image_id,
            product_id=product_id
        ).first_or_404()

        # Suppression du fichier
        delete_product_image(image.url)

        # Suppression de l'entrée
        db.session.delete(image)
        db.session.commit()

        return jsonify({
            'message': 'Image supprimée avec succès'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# =========================================
# Routes pour les catégories
# =========================================

@products_bp.route('/categories', methods=['GET'])
def get_categories():
    """Récupère la liste des catégories."""
    try:
        categories = Category.query.all()
        return jsonify(categories_schema.dump(categories)), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@products_bp.route('/categories', methods=['POST'])
@jwt_required()
def create_category():
    """Crée une nouvelle catégorie (admin seulement)."""
    try:
        # Vérification des droits admin
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user or not user.is_admin:
            return jsonify({'error': 'Accès non autorisé'}), 403

        # Validation des données
        data = request.get_json()
        errors = category_schema.validate(data)
        if errors:
            return jsonify({'error': errors}), 400

        # Création de la catégorie
        category = Category(**data)
        
        db.session.add(category)
        db.session.commit()

        return jsonify(category_schema.dump(category)), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# =========================================
# Routes pour les marques
# =========================================

@products_bp.route('/brands', methods=['GET'])
def get_brands():
    """Récupère la liste des marques."""
    try:
        brands = Brand.query.all()
        return jsonify(brands_schema.dump(brands)), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@products_bp.route('/brands', methods=['POST'])
@jwt_required()
def create_brand():
    """Crée une nouvelle marque (admin seulement)."""
    try:
        # Vérification des droits admin
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user or not user.is_admin:
            return jsonify({'error': 'Accès non autorisé'}), 403

        # Validation des données
        data = request.get_json()
        errors = brand_schema.validate(data)
        if errors:
            return jsonify({'error': errors}), 400

        # Création de la marque
        brand = Brand(**data)
        
        db.session.add(brand)
        db.session.commit()

        return jsonify(brand_schema.dump(brand)), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500