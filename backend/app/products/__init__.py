# backend/app/products/__init__.py

from flask import Blueprint

products_bp = Blueprint('products', __name__, url_prefix='/api/products')

from . import routes  # Import des routes