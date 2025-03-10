# backend/app/products/routes.py

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from app import db
from app.models.user import User
from app.products.models import Product, Category, Brand, ProductImage, ProductSpecification
from app.products.schemas import ProductSchema, CategorySchema, BrandSchema
from app.products.utils import save_product_image, delete_product_image, allowed_file
import os, uuid
from slugify import slugify
from functools import wraps  # Partie de la bibliothèque standard de Python
from flask import abort      # Partie de Flask
from app.utils.decorators import admin_required

products_bp = Blueprint('products', __name__, url_prefix='/api/products')

# Initialisation des schémas pour la sérialisation
product_schema = ProductSchema()
products_schema = ProductSchema(many=True)
category_schema = CategorySchema()
categories_schema = CategorySchema(many=True)
brand_schema = BrandSchema()
brands_schema = BrandSchema(many=True)

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        if not user or not user.is_admin:
            return jsonify({"error": "Accès administrateur requis"}), 403
        return f(*args, **kwargs)
    return decorated_function
# ============================================================================
#                   Routes pour recherche des produits
# ============================================================================
@products_bp.route('/search', methods=['GET'])
def search_products():
    """Recherche de produits avec mots clés"""
    try:
        query = request.args.get('q', '')
        if not query or len(query) < 2:
            return jsonify({"error": "Requête de recherche trop courte"}), 400
            
        # Diviser la requête en mots clés
        keywords = query.lower().split()
        
        # Construction de la requête
        search_query = Product.query.filter(Product.is_active == True)
        
        # Appliquer chaque mot clé
        for keyword in keywords:
            search_term = f"%{keyword}%"
            search_query = search_query.filter(
                (Product.name.ilike(search_term)) |
                (Product.sku.ilike(search_term)) |
                (Product.short_description.ilike(search_term)) |
                (Product.description.ilike(search_term))
            )
        
        # Limiter les résultats
        products = search_query.limit(20).all()
        
        return jsonify({
            "results": products_schema.dump(products),
            "count": len(products),
            "query": query
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Erreur de recherche: {str(e)}")
        return jsonify({"error": str(e)}), 500

# ============================================================================
#                         Routes pour la gestion des produits
# ============================================================================

@products_bp.route('/', methods=['GET'])
def get_products():
    """Récupère la liste des produits avec filtres optionnels."""
    try:
        # Filtres de recherche
        search = request.args.get('search', '')
        category_id = request.args.get('category_id', type=int)
        brand_id = request.args.get('brand_id', type=int)
        min_price = request.args.get('min_price', type=float)
        max_price = request.args.get('max_price', type=float)
        in_stock = request.args.get('in_stock', type=bool, default=False)
        
        # Pagination
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        
        # Construction de la requête
        query = Product.query
        
        # Application des filtres
        if search:
            search_term = f"%{search}%"
            query = query.filter(Product.name.ilike(search_term) | Product.sku.ilike(search_term))
        
        if category_id:
            query = query.filter(Product.category_id == category_id)
            
        if brand_id:
            query = query.filter(Product.brand_id == brand_id)
            
        if min_price is not None:
            query = query.filter(Product.price >= min_price)
            
        if max_price is not None:
            query = query.filter(Product.price <= max_price)
            
        if in_stock:
            query = query.filter(Product.stock_quantity > 0)
            
        # Tri par défaut
        query = query.order_by(Product.name)
        
        # Exécution de la requête paginée
        paginated_products = query.paginate(page=page, per_page=per_page, error_out=False)
        
        # Résultat formaté
        result = {
            'items': products_schema.dump(paginated_products.items),
            'total': paginated_products.total,
            'pages': paginated_products.pages,
            'page': page,
            'per_page': per_page
        }
        
        return jsonify(result), 200
    
    except Exception as e:
        current_app.logger.error(f"Erreur lors de la récupération des produits: {str(e)}")
        return jsonify({"error": str(e)}), 500
    
@products_bp.route('/favorites', methods=['GET'])
@jwt_required()
def get_favorites():
    """
    Récupère les produits favoris de l'utilisateur.
    """
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'Utilisateur non trouvé'}), 404

        favorites = user.favorites.all()
        return jsonify([product.to_dict() for product in favorites]), 200

    except Exception as e:
        logger.error(f"Erreur récupération favoris: {str(e)}")
        return jsonify({'error': str(e)}), 500

@products_bp.route('/favorites/<int:product_id>', methods=['POST'])
@jwt_required()
def add_favorite(product_id):
    """
    Ajoute un produit aux favoris de l'utilisateur.
    """
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'Utilisateur non trouvé'}), 404

        product = Product.query.get(product_id)
        if not product:
            return jsonify({'error': 'Produit non trouvé'}), 404

        user.favorites.append(product)
        db.session.commit()

        return jsonify({
            'message': 'Produit ajouté aux favoris',
            'product': product.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Erreur ajout favori: {str(e)}")
        return jsonify({'error': str(e)}), 500

@products_bp.route('/favorites/<int:product_id>', methods=['DELETE'])
@jwt_required()
def remove_favorite(product_id):
    """
    Supprime un produit des favoris de l'utilisateur.
    """
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'Utilisateur non trouvé'}), 404

        product = Product.query.get(product_id)
        if not product:
            return jsonify({'error': 'Produit non trouvé'}), 404

        user.favorites.remove(product)
        db.session.commit()

        return jsonify({
            'message': 'Produit supprimé des favoris',
            'product': product.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Erreur suppression favori: {str(e)}")
        return jsonify({'error': str(e)}), 500

@products_bp.route('/<int:product_id>', methods=['GET'])
def get_product_by_id(product_id):
    """Récupère un produit par son ID."""
    try:
        product = Product.query.get_or_404(product_id)
        return jsonify(product_schema.dump(product)), 200
    except Exception as e:
        current_app.logger.error(f"Erreur lors de la récupération du produit {product_id}: {str(e)}")
        return jsonify({"error": str(e)}), 500

@products_bp.route('/<string:slug>', methods=['GET'])
def get_product_by_slug(slug):
    """Récupère un produit par son slug."""
    try:
        product = Product.query.filter_by(slug=slug).first_or_404()
        return jsonify(product_schema.dump(product)), 200
    except Exception as e:
        current_app.logger.error(f"Erreur lors de la récupération du produit {slug}: {str(e)}")
        return jsonify({"error": str(e)}), 500

@products_bp.route('/', methods=['POST'])
@jwt_required()
def create_product():
    """Crée un nouveau produit."""
    try:
        # Récupération des données
        data = request.json
        print("Données reçues:", data)  # Log de débogage
        print("Type de category_id:", type(data.get('category_id')))
        print("Valeur de category_id:", data.get('category_id'))
        print("Type de brand_id:", type(data.get('brand_id')))
        print("Valeur de brand_id:", data.get('brand_id'))
        # Génération du slug
        slug = slugify(data.get('name', ''))
        
        # Vérification de l'unicité du slug
        if Product.query.filter_by(slug=slug).first():
            # Ajout d'un identifiant unique si le slug existe déjà
            slug = f"{slug}-{uuid.uuid4().hex[:6]}"
        
        # Création du produit
        new_product = Product(
            sku=data.get('sku'),
            name=data.get('name'),
            slug=slug,
            description=data.get('description'),
            short_description=data.get('short_description'),
            price=data.get('price'),
            stock_quantity=data.get('stock_quantity', 0),
            min_stock_level=data.get('min_stock_level', 5),
            category_id=data.get('category_id'),
            brand_id=data.get('brand_id'),
            is_active=data.get('is_active', True)
        )
        
        db.session.add(new_product)
        db.session.commit()
        
        # Traitement des spécifications
        specifications = data.get('specifications', [])
        for spec in specifications:
            new_spec = ProductSpecification(
                product_id=new_product.id,
                name=spec.get('name'),
                value=spec.get('value'),
                unit=spec.get('unit', '')
            )
            db.session.add(new_spec)
        
        db.session.commit()
        
        return jsonify({
            "message": "Produit créé avec succès",
            "product": product_schema.dump(new_product)
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erreur lors de la création du produit: {str(e)}")
        return jsonify({"error": str(e)}), 500

@products_bp.route('/<int:product_id>', methods=['PUT'])
@jwt_required()
def update_product(product_id):
    """Met à jour un produit existant."""
    try:
        # Vérification des permissions admin
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        if not user or not user.is_admin:
            return jsonify({"error": "Accès non autorisé"}), 403
        
        # Récupération du produit
        product = Product.query.get_or_404(product_id)
        
        # Récupération des données
        data = request.json
        
        # Mise à jour des champs
        if 'name' in data:
            product.name = data['name']
            # Mise à jour du slug si le nom change
            product.slug = slugify(data['name'])
        
        if 'sku' in data:
            product.sku = data['sku']
            
        if 'description' in data:
            product.description = data['description']
            
        if 'short_description' in data:
            product.short_description = data['short_description']
            
        if 'price' in data:
            product.price = data['price']
            
        if 'stock_quantity' in data:
            product.stock_quantity = data['stock_quantity']
            
        if 'min_stock_level' in data:
            product.min_stock_level = data['min_stock_level']
            
        if 'category_id' in data:
            # Convertir en None si la valeur est None ou null
            product.category_id = data['category_id'] if data['category_id'] is not None else None
            
        if 'brand_id' in data:
            # Convertir en None si la valeur est None ou null
            product.brand_id = data['brand_id'] if data['brand_id'] is not None else None
            
        if 'is_active' in data:
            product.is_active = data['is_active']
        
        # Mise à jour des spécifications
        if 'specifications' in data:
            # Suppression des anciennes spécifications
            ProductSpecification.query.filter_by(product_id=product.id).delete()
            
            # Ajout des nouvelles spécifications
            for spec in data['specifications']:
                new_spec = ProductSpecification(
                    product_id=product.id,
                    name=spec.get('name'),
                    value=spec.get('value'),
                    unit=spec.get('unit', '')
                )
                db.session.add(new_spec)
        
        db.session.commit()
        
        return jsonify({
            "message": "Produit mis à jour avec succès",
            "product": product_schema.dump(product)
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erreur lors de la mise à jour du produit {product_id}: {str(e)}")
        return jsonify({"error": str(e)}), 500

@products_bp.route('/<int:product_id>', methods=['DELETE'])
@jwt_required()
def delete_product(product_id):
    """Supprime un produit."""
    try:
        # Vérification des permissions admin
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        if not user or not user.is_admin:
            return jsonify({"error": "Accès non autorisé"}), 403
        
        # Récupération du produit
        product = Product.query.get_or_404(product_id)
        
        # Suppression des images
        for image in product.images:
            try:
                delete_product_image(image.url)
            except Exception as e:
                current_app.logger.warning(f"Impossible de supprimer l'image {image.id}: {str(e)}")

        
        # Suppression du produit (la cascade supprimera les specs et images)
        db.session.delete(product)
        db.session.commit()
        
        return jsonify({"message": "Produit supprimé avec succès"}), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erreur lors de la suppression du produit {product_id}: {str(e)}")
        return jsonify({"error": str(e)}), 500

# ============================================================================
#                       Routes pour la gestion des images
# ============================================================================

@products_bp.route('/<int:product_id>/images', methods=['POST'])
@jwt_required()
def upload_product_image(product_id):
    """Ajoute une image à un produit."""
    try:
        # Vérification des permissions admin
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        if not user or not user.is_admin:
            return jsonify({"error": "Accès non autorisé"}), 403
        
        # Vérification du produit
        product = Product.query.get_or_404(product_id)
        
        # Vérification du fichier
        if 'image' not in request.files:
            return jsonify({"error": "Aucune image fournie"}), 400
            
        file = request.files['image']
        
        if file.filename == '':
            return jsonify({"error": "Aucun fichier sélectionné"}), 400
            
        if not allowed_file(file.filename):
            return jsonify({"error": "Type de fichier non autorisé"}), 400
        
        # Sauvegarde de l'image
        try:
            # Génération d'un nom de fichier unique
            filename = secure_filename(file.filename)
            unique_filename = f"{uuid.uuid4().hex}_{filename}"
            
            # Chemin de sauvegarde
            upload_folder = os.path.join(current_app.root_path, 'static', 'images', 'products')
            os.makedirs(upload_folder, exist_ok=True)
            file_path = os.path.join(upload_folder, unique_filename)
            
            # Sauvegarde du fichier
            file.save(file_path)
            
            # URL relative pour la base de données
            relative_path = f"/static/images/products/{unique_filename}"
            
            # Création de l'entrée dans la base de données
            new_image = ProductImage(
                product_id=product_id,
                url=relative_path,
                alt=request.form.get('alt', product.name),
                is_primary=request.form.get('is_primary', 'false').lower() == 'true'
            )
            
            db.session.add(new_image)
            db.session.commit()
            
            return jsonify({
                "message": "Image uploadée avec succès",
                "image": {
                    "id": new_image.id,
                    "url": new_image.url,
                    "alt": new_image.alt,
                    "is_primary": new_image.is_primary
                }
            }), 201
            
        except Exception as e:
            current_app.logger.error(f"Erreur lors de l'upload de l'image: {str(e)}")
            return jsonify({"error": f"Erreur lors de l'upload: {str(e)}"}), 500
            
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erreur lors de l'ajout d'image au produit {product_id}: {str(e)}")
        return jsonify({"error": str(e)}), 500


@products_bp.route('/images/<int:image_id>', methods=['DELETE'])
@jwt_required()
def delete_image(image_id):
    """Supprime une image de produit."""
    try:
        # Vérification des permissions admin
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        if not user or not user.is_admin:
            return jsonify({"error": "Accès non autorisé"}), 403
        
        # Récupération de l'image
        image = ProductImage.query.get_or_404(image_id)
        
        # Chemin du fichier
        file_path = os.path.join(current_app.root_path, 'static', image.url.lstrip('/static/'))
        
        # Suppression du fichier
        if os.path.exists(file_path):
            os.remove(file_path)
        
        # Suppression de l'entrée dans la base de données
        db.session.delete(image)
        db.session.commit()
        
        return jsonify({"message": "Image supprimée avec succès"}), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erreur lors de la suppression de l'image {image_id}: {str(e)}")
        return jsonify({"error": str(e)}), 500
    
@products_bp.route('/<int:product_id>/images/<int:image_id>/primary', methods=['PUT'])
@jwt_required()
def set_primary_image(product_id, image_id):
    """Définit une image comme image principale d'un produit."""
    try:
        # Vérification des permissions admin
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        if not user or not user.is_admin:
            return jsonify({"error": "Accès non autorisé"}), 403
        
        # Vérification du produit
        product = Product.query.get_or_404(product_id)
        
        # Vérification de l'image
        image = ProductImage.query.get_or_404(image_id)
        
        # Vérifier que l'image appartient bien au produit
        if image.product_id != product_id:
            return jsonify({"error": "Cette image n'appartient pas au produit spécifié"}), 400
        
        # Mettre à jour toutes les images du produit
        for img in product.images:
            img.is_primary = (img.id == image_id)
        
        db.session.commit()
        
        return jsonify({
            "message": "Image principale définie avec succès",
            "image": {
                "id": image.id,
                "url": image.url,
                "alt": image.alt,
                "is_primary": True
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erreur lors de la définition de l'image principale: {str(e)}")
        return jsonify({"error": str(e)}), 500

# ============================================================================
#                         Routes pour les catégories
# ============================================================================

@products_bp.route('/categories', methods=['GET'])
def get_categories():
    """Récupère la liste des catégories."""
    try:
        categories = Category.query.all()
        return jsonify(categories_schema.dump(categories)), 200
    except Exception as e:
        current_app.logger.error(f"Erreur lors de la récupération des catégories: {str(e)}")
        return jsonify({"error": str(e)}), 500

@products_bp.route('/categories', methods=['POST'])
@jwt_required()
def create_category():
    """Crée une nouvelle catégorie."""
    try:
        # Vérification des permissions admin
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        if not user or not user.is_admin:
            return jsonify({"error": "Accès non autorisé"}), 403
        
        # Récupération des données
        data = request.json
        
        # Création de la catégorie
        new_category = Category(
            name=data.get('name'),
            description=data.get('description'),
            image_url=data.get('image_url'),
            parent_id=data.get('parent_id')
        )
        
        db.session.add(new_category)
        db.session.commit()
        
        return jsonify({
            "message": "Catégorie créée avec succès",
            "category": category_schema.dump(new_category)
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erreur lors de la création de la catégorie: {str(e)}")
        return jsonify({"error": str(e)}), 500

# ============================================================================
#                         Routes pour les marques
# ============================================================================

@products_bp.route('/brands', methods=['GET'])
def get_brands():
    """Récupère la liste des marques."""
    try:
        brands = Brand.query.all()
        return jsonify(brands_schema.dump(brands)), 200
    except Exception as e:
        current_app.logger.error(f"Erreur lors de la récupération des marques: {str(e)}")
        return jsonify({"error": str(e)}), 500

@products_bp.route('/brands', methods=['POST'])
@jwt_required()
def create_brand():
    """Crée une nouvelle marque."""
    try:
        # Vérification des permissions admin
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        if not user or not user.is_admin:
            return jsonify({"error": "Accès non autorisé"}), 403
        
        # Récupération des données
        data = request.json
        
        # Création de la marque
        new_brand = Brand(
            name=data.get('name'),
            description=data.get('description'),
            logo_url=data.get('logo_url'),
            website=data.get('website')
        )
        
        db.session.add(new_brand)
        db.session.commit()
        
        return jsonify({
            "message": "Marque créée avec succès",
            "brand": brand_schema.dump(new_brand)
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erreur lors de la création de la marque: {str(e)}")
        return jsonify({"error": str(e)}), 500

@products_bp.route('/test', methods=['GET'])
def test_route():
    return jsonify({"message": "API est fonctionnelle"}), 200
