# ============================================================================
#                         IMPORTS ET CONFIGURATION
# ============================================================================

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy.sql.expression import extract
from flask_mail import Message
from app import db
#from app.utils.emails import send_order_confirmation_email*/
from app.models.user import User
from app.orders.models import Order, OrderItem, OrderAddress, Address
from datetime import datetime
from app.models.user import User as UserModel

import logging

# Configuration du logging
logger = logging.getLogger(__name__)

# Création du blueprint
orders_bp = Blueprint('orders', __name__)

# ============================================================================
#                         UTILITAIRES ET FONCTIONS AUXILIAIRES
# ============================================================================

def generate_order_number():
    """
    Génère un numéro de commande unique
    Format: FMP-ANNÉE-MOIS-XXXXX (ex: FMP-2025-02-00001)
    
    Returns:
        str: Numéro de commande unique
    """
    now = datetime.now()
    year = now.year
    month = now.month
    
    # Trouver le dernier numéro de commande pour ce mois
    last_order = Order.query.filter(
        extract('year', Order.created_at) == year,
        extract('month', Order.created_at) == month
    ).order_by(Order.id.desc()).first()
    
    if last_order and last_order.order_number:
        # Extraire le numéro de séquence
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

def get_country_name(country_code):
    """
    Convertit un code pays en nom complet
    
    Args:
        country_code (str): Code pays à 2 lettres (ISO 3166-1 alpha-2)
        
    Returns:
        str: Nom complet du pays
    """
    countries = {
        'FR': 'France',
        'BE': 'Belgique',
        'CH': 'Suisse',
        'LU': 'Luxembourg'
    }
    return countries.get(country_code, country_code)

def send_order_confirmation_email(order):
    """
    Envoie un email de confirmation pour une commande
    
    Args:
        order (Order): Commande à confirmer
    """
    try:
        from app import mail
        from flask_mail import Message
        # Récupérer les informations nécessaires
        user = User.query.get(order.user_id)
        if not user or not user.email:
            logger.error(f"Impossible d'envoyer l'email de confirmation: utilisateur non trouvé")
            return
            
        # Créer le contenu de l'email
        subject = f"Confirmation de votre commande #{order.order_number}"
        
        # Construction du corps de l'email
        items_html = ""
        for item in order.items:
            items_html += f"""
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">{item.name}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">{item.reference}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">{item.price} €</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">{item.quantity}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">{float(item.price) * item.quantity} €</td>
            </tr>
            """
            
        # Formatage de l'adresse
        address = order.shipping_address
        address_html = f"""
        <p><strong>{address.firstname} {address.lastname}</strong></p>
        {f"<p>{address.company}</p>" if address.company else ""}
        <p>{address.address}</p>
        {f"<p>{address.address2}</p>" if address.address2 else ""}
        <p>{address.postal_code} {address.city}</p>
        <p>{get_country_name(address.country)}</p>
        <p>Tél: {address.phone}</p>
        """
        
        # Informations de paiement
        payment_info = ""
        if order.payment_method == 'transfer':
            payment_info = """
            <p>Veuillez effectuer votre virement vers le compte suivant:</p>
            <p><strong>Bénéficiaire:</strong> FMP</p>
            <p><strong>IBAN:</strong> FR76 XXXX XXXX XXXX XXXX XXXX XXX</p>
            <p><strong>BIC:</strong> XXXXXXXX</p>
            """
            
        html_content = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; }}
                .header {{ background-color: #4CAF50; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; }}
                .footer {{ text-align: center; padding: 20px; font-size: 12px; color: #777; }}
                table {{ width: 100%; border-collapse: collapse; }}
                th {{ text-align: left; padding: 10px; background-color: #f5f5f5; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Confirmation de commande</h1>
                </div>
                <div class="content">
                    <p>Bonjour {user.firstname},</p>
                    <p>Nous vous remercions pour votre commande #{order.order_number} passée le {order.created_at.strftime('%d/%m/%Y à %H:%M')}.</p>
                    
                    <h2>Détails de votre commande</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Article</th>
                                <th>Référence</th>
                                <th>Prix</th>
                                <th>Quantité</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items_html}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colspan="4" style="text-align: right; padding: 10px;"><strong>Sous-total HT:</strong></td>
                                <td style="padding: 10px;">{float(order.subtotal_ht)} €</td>
                            </tr>
                            <tr>
                                <td colspan="4" style="text-align: right; padding: 10px;"><strong>TVA (20%):</strong></td>
                                <td style="padding: 10px;">{float(order.tax)} €</td>
                            </tr>
                            <tr>
                                <td colspan="4" style="text-align: right; padding: 10px;"><strong>Frais de livraison:</strong></td>
                                <td style="padding: 10px;">{float(order.shipping)} €</td>
                            </tr>
                            <tr>
                                <td colspan="4" style="text-align: right; padding: 10px;"><strong>Total:</strong></td>
                                <td style="padding: 10px;"><strong>{float(order.total)} €</strong></td>
                            </tr>
                        </tfoot>
                    </table>
                    
                    <h2>Adresse de livraison</h2>
                    <div style="padding: 10px; background-color: #f9f9f9; border-radius: 5px;">
                        {address_html}
                    </div>
                    
                    <h2>Moyen de paiement</h2>
                    <p>{order.payment_method.capitalize()}</p>
                    {payment_info}
                    
                    <p>Vous pouvez suivre l'évolution de votre commande dans votre espace client.</p>
                    <p>Merci pour votre confiance !</p>
                    <p>L'équipe FMP</p>
                </div>
                <div class="footer">
                    <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
                    <p>© 2025 FMP - Tous droits réservés</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Envoi de l'email
        msg = Message(
            subject=subject,
            recipients=[user.email],
            html=html_content
        )
        mail.send(msg)
        
        logger.info(f"Email de confirmation envoyé pour la commande #{order.order_number}")
        
    except Exception as e:
        logger.error(f"Erreur lors de l'envoi de l'email de confirmation: {str(e)}")

# ============================================================================
#                         ROUTES DE GESTION DES COMMANDES
# ============================================================================

@orders_bp.route('', methods=['POST'])
@jwt_required()
def create_order():
    """
    Crée une nouvelle commande
    
    Attend un JSON avec:
        - cart: Les articles du panier
        - shipping_address: L'adresse de livraison
        - payment_method: La méthode de paiement
    
    Returns:
        JSON: Détails de la commande créée
    """
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'Utilisateur non trouvé'}), 404
        
        data = request.get_json()
        
        # Validation des données
        if not data or 'cart' not in data or 'shipping_address' not in data or 'payment_method' not in data:
            return jsonify({'error': 'Données incomplètes'}), 400
        
        # Création de la commande
        order = Order(
            user_id=current_user_id,
            status='PENDING',
            payment_method=data['payment_method']
        )
        
        # Ajout de l'adresse de livraison
        shipping_address = OrderAddress(
            order=order,
            firstname=data['shipping_address']['firstname'],
            lastname=data['shipping_address']['lastname'],
            company=data['shipping_address'].get('company', ''),
            address=data['shipping_address']['address'],
            address2=data['shipping_address'].get('address2', ''),
            postal_code=data['shipping_address']['postal_code'],
            city=data['shipping_address']['city'],
            country=data['shipping_address']['country'],
            phone=data['shipping_address']['phone']
        )
        
        # Calcul des totaux
        subtotal_ht = sum(item['price'] * item['quantity'] / 1.2 for item in data['cart'])
        tax = subtotal_ht * 0.2
        subtotal_ttc = subtotal_ht + tax
        
        # Frais de livraison
        shipping_cost = 5.90 if subtotal_ttc < 49 else 0
        
        total = subtotal_ttc + shipping_cost
        
        # Mise à jour des totaux de la commande
        order.subtotal_ht = subtotal_ht
        order.tax = tax
        order.shipping = shipping_cost
        order.total = total
        
        # Génération du numéro de commande
        order.order_number = generate_order_number()
        
        # Ajout des articles
        for item in data['cart']:
            order_item = OrderItem(
                order=order,
                product_id=item['id'],
                name=item['name'],
                reference=item['reference'],
                price=item['price'],
                quantity=item['quantity']
            )
            db.session.add(order_item)
        
        # Sauvegarde en base de données
        db.session.add(order)
        db.session.add(shipping_address)
        db.session.commit()
        
        # Envoi d'un email de confirmation
        send_order_confirmation_email(order)
        
        return jsonify({
            'id': order.id,
            'order_number': order.order_number,
            'created_at': order.created_at.isoformat(),
            'status': order.status,
            'subtotal_ht': float(order.subtotal_ht),
            'tax': float(order.tax),
            'shipping': float(order.shipping),
            'total': float(order.total),
            'items': [
                {
                    'id': item.id,
                    'name': item.name,
                    'reference': item.reference,
                    'price': float(item.price),
                    'quantity': item.quantity
                } for item in order.items
            ],
            'shipping_address': shipping_address.to_dict(),
            'payment_method': order.payment_method
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Erreur création commande: {str(e)}")
        return jsonify({'error': str(e)}), 500

@orders_bp.route('/<int:order_id>', methods=['GET'])
@jwt_required()
def get_order(order_id):
    """
    Récupère les détails d'une commande
    
    Args:
        order_id (int): ID de la commande
        
    Returns:
        JSON: Détails de la commande
    """
    try:
        current_user_id = get_jwt_identity()
        
        # Récupération de la commande
        order = Order.query.get(order_id)
        
        if not order:
            return jsonify({'error': 'Commande non trouvée'}), 404
            
        # Vérification que l'utilisateur est bien le propriétaire de la commande
        if order.user_id != current_user_id:
            return jsonify({'error': 'Accès non autorisé'}), 403
            
        return jsonify({
            'id': order.id,
            'order_number': order.order_number,
            'created_at': order.created_at.isoformat(),
            'status': order.status,
            'subtotal_ht': float(order.subtotal_ht),
            'tax': float(order.tax),
            'shipping': float(order.shipping),
            'total': float(order.total),
            'items': [
                {
                    'id': item.id,
                    'name': item.name,
                    'reference': item.reference,
                    'price': float(item.price),
                    'quantity': item.quantity
                } for item in order.items
            ],
            'shipping_address': order.shipping_address.to_dict(),
            'payment_method': order.payment_method
        }), 200
        
    except Exception as e:
        logger.error(f"Erreur récupération commande: {str(e)}")
        return jsonify({'error': str(e)}), 500

@orders_bp.route('/history', methods=['GET'])
@jwt_required()
def get_order_history():
    """
    Récupère l'historique des commandes de l'utilisateur
    
    Returns:
        JSON: Liste des commandes de l'utilisateur
    """
    try:
        current_user_id = get_jwt_identity()
        
        # Récupération des commandes de l'utilisateur
        orders = Order.query.filter_by(user_id=current_user_id).order_by(Order.created_at.desc()).all()
        
        return jsonify([
            {
                'id': order.id,
                'order_number': order.order_number,
                'created_at': order.created_at.isoformat(),
                'status': order.status,
                'total': float(order.total),
                'items_count': sum(item.quantity for item in order.items)
            } for order in orders
        ]), 200
        
    except Exception as e:
        logger.error(f"Erreur récupération historique commandes: {str(e)}")
        return jsonify({'error': str(e)}), 500

@orders_bp.route('/<int:order_id>/cancel', methods=['PUT'])
@jwt_required()
def cancel_order(order_id):
    """
    Annule une commande
    
    Args:
        order_id (int): ID de la commande à annuler
        
    Returns:
        JSON: Message de confirmation
    """
    try:
        current_user_id = get_jwt_identity()
        
        # Récupération de la commande
        order = Order.query.get(order_id)
        
        if not order:
            return jsonify({'error': 'Commande non trouvée'}), 404
            
        # Vérification que l'utilisateur est bien le propriétaire de la commande
        if order.user_id != current_user_id:
            return jsonify({'error': 'Accès non autorisé'}), 403
            
        # Vérification que la commande peut être annulée
        if order.status in ['SHIPPED', 'DELIVERED', 'CANCELLED']:
            return jsonify({'error': 'Cette commande ne peut plus être annulée'}), 400
            
        # Annulation de la commande
        order.status = 'CANCELLED'
        db.session.commit()
        
        return jsonify({
            'message': 'Commande annulée avec succès',
            'order_id': order.id
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Erreur annulation commande: {str(e)}")
        return jsonify({'error': str(e)}), 500

# ============================================================================
#                         ROUTES DE GESTION DES ADRESSES
# ============================================================================

@orders_bp.route('/addresses', methods=['GET'])
@jwt_required()
def get_addresses():
    """
    Récupère les adresses enregistrées de l'utilisateur
    
    Returns:
        JSON: Liste des adresses de l'utilisateur
    """
    try:
        current_user_id = get_jwt_identity()
        
        # Récupération des adresses de l'utilisateur
        addresses = Address.query.filter_by(user_id=current_user_id).all()
        
        return jsonify([address.to_dict() for address in addresses]), 200
        
    except Exception as e:
        logger.error(f"Erreur récupération adresses: {str(e)}")
        return jsonify({'error': str(e)}), 500

@orders_bp.route('/addresses', methods=['POST'])
@jwt_required()
def add_address():
    """
    Ajoute une nouvelle adresse pour l'utilisateur
    
    Returns:
        JSON: Adresse créée
    """
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # Validation des données
        required_fields = ['firstname', 'lastname', 'address', 'postal_code', 'city', 'country', 'phone']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Données incomplètes'}), 400
            
        # Création de l'adresse
        address = Address(
            user_id=current_user_id,
            firstname=data['firstname'],
            lastname=data['lastname'],
            company=data.get('company', ''),
            address=data['address'],
            address2=data.get('address2', ''),
            postal_code=data['postal_code'],
            city=data['city'],
            country=data['country'],
            phone=data['phone'],
            is_default=data.get('is_default', False)
        )
        
        # Si c'est l'adresse par défaut, mettre à jour les autres adresses
        if address.is_default:
            Address.query.filter_by(user_id=current_user_id, is_default=True).update({'is_default': False})
            
        db.session.add(address)
        db.session.commit()
        
        return jsonify(address.to_dict()), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Erreur ajout adresse: {str(e)}")
        return jsonify({'error': str(e)}), 500

@orders_bp.route('/addresses/<int:address_id>', methods=['PUT'])
@jwt_required()
def update_address(address_id):
    """
    Met à jour une adresse existante
    
    Args:
        address_id (int): ID de l'adresse à modifier
        
    Returns:
        JSON: Adresse mise à jour
    """
    try:
        current_user_id = get_jwt_identity()
        
        # Récupération de l'adresse
        address = Address.query.get(address_id)
        
        if not address:
            return jsonify({'error': 'Adresse non trouvée'}), 404
            
        # Vérification que l'utilisateur est bien le propriétaire de l'adresse
        if address.user_id != current_user_id:
            return jsonify({'error': 'Accès non autorisé'}), 403
            
        data = request.get_json()
        
        # Mise à jour des champs
        if 'firstname' in data:
            address.firstname = data['firstname']
        if 'lastname' in data:
            address.lastname = data['lastname']
        if 'company' in data:
            address.company = data['company']
        if 'address' in data:
            address.address = data['address']
        if 'address2' in data:
            address.address2 = data['address2']
        if 'postal_code' in data:
            address.postal_code = data['postal_code']
        if 'city' in data:
            address.city = data['city']
        if 'country' in data:
            address.country = data['country']
        if 'phone' in data:
            address.phone = data['phone']
            
        # Gestion de l'adresse par défaut
        if 'is_default' in data and data['is_default'] and not address.is_default:
            Address.query.filter_by(user_id=current_user_id, is_default=True).update({'is_default': False})
            address.is_default = True
            
        db.session.commit()
        
        return jsonify(address.to_dict()), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Erreur mise à jour adresse: {str(e)}")
        return jsonify({'error': str(e)}), 500

@orders_bp.route('/addresses/<int:address_id>', methods=['DELETE'])
@jwt_required()
def delete_address(address_id):
    """
    Supprime une adresse existante
    
    Args:
        address_id (int): ID de l'adresse à supprimer
        
    Returns:
        JSON: Message de confirmation
    """
    try:
        current_user_id = get_jwt_identity()
        
        # Récupération de l'adresse
        address = Address.query.get(address_id)
        
        if not address:
            return jsonify({'error': 'Adresse non trouvée'}), 404
            
        # Vérification que l'utilisateur est bien le propriétaire de l'adresse
        if address.user_id != current_user_id:
            return jsonify({'error': 'Accès non autorisé'}), 403
            
        # Suppression de l'adresse
        db.session.delete(address)
        db.session.commit()
        
        return jsonify({
            'message': 'Adresse supprimée avec succès'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Erreur suppression adresse: {str(e)}")
        return jsonify({'error': str(e)}), 500