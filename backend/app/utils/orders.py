from sqlalchemy.sql.expression import extract
from datetime import datetime
from app.orders.models import Order

def generate_order_number():
    now = datetime.now()
    year = now.year
    month = now.month
    
    # Trouver le dernier numéro de commande pour ce mois
    last_order = Order.query.filter(
        extract('year', Order.created_at) == year,
        extract('month', Order.created_at) == month
    ).order_by(Order.id.desc()).first()
    
    if last_order and last_order.order_number:
        try:
            seq_number = int(last_order.order_number.split('-')[-1])
            seq_number += 1
        except (ValueError, IndexError):
            seq_number = 1
    else:
        seq_number = 1
    
    # Formater le numéro de commande
    order_number = f"FMP-{year}-{month:02d}-{seq_number:05d}"
    return order_number