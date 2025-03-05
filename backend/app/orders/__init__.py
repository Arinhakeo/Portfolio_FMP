# ============================================================================
#                         INITIALISATION DU PACKAGE ORDERS
# ============================================================================

from flask import Blueprint

# Création du blueprint pour les routes de commandes
orders_bp = Blueprint('orders', __name__, url_prefix='/api/orders')

# Ne pas importer routes ici pour éviter l'importation circulaire