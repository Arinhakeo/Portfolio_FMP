# backend/app/products/__init__.py

from flask import Blueprint

products_bp = Blueprint('products', __name__)

from . import routes  # Import des routes