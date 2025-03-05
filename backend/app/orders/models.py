# ============================================================================
#                         MODÈLES DE DONNÉES POUR COMMANDES
# ============================================================================

from app import db
from datetime import datetime

# ============================================================================
#                         MODÈLE ADRESSE
# ============================================================================

class Address(db.Model):
    __tablename__ = 'addresses'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    firstname = db.Column(db.String(50), nullable=False)
    lastname = db.Column(db.String(50), nullable=False)
    company = db.Column(db.String(100))
    address = db.Column(db.String(255), nullable=False)
    address2 = db.Column(db.String(255))
    postal_code = db.Column(db.String(20), nullable=False)
    city = db.Column(db.String(100), nullable=False)
    country = db.Column(db.String(2), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    
    is_default = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    user = db.relationship('app.models.user.User', back_populates='addresses')
    
    def to_dict(self):
        return {
            'id': self.id,
            'firstname': self.firstname,
            'lastname': self.lastname,
            'company': self.company,
            'address': self.address,
            'address2': self.address2,
            'postal_code': self.postal_code,
            'city': self.city,
            'country': self.country,
            'phone': self.phone,
            'is_default': self.is_default
        }


# ============================================================================
#                         MODÈLE COMMANDE ET ARTICLES
# ============================================================================

class Order(db.Model):
    __tablename__ = 'orders'
    
    id = db.Column(db.Integer, primary_key=True)
    order_number = db.Column(db.String(20), unique=True, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    status = db.Column(db.String(20), nullable=False)
    payment_method = db.Column(db.String(20), nullable=False)
    payment_status = db.Column(db.String(20), default='PENDING')
    
    subtotal_ht = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    tax = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    shipping = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    total = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = db.relationship('app.models.user.User', back_populates='orders')
    items = db.relationship('OrderItem', back_populates='order', cascade='all, delete-orphan')
    shipping_address = db.relationship('OrderAddress', uselist=False, back_populates='order', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Order {self.order_number}>'

class OrderItem(db.Model):
    __tablename__ = 'order_items'
    
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    
    name = db.Column(db.String(255), nullable=False)
    reference = db.Column(db.String(50), nullable=False)
    price = db.Column(db.Numeric(10, 2), nullable=False)
    quantity = db.Column(db.Integer, nullable=False, default=1)
    
    order = db.relationship('Order', back_populates='items')
    product = db.relationship('Product')
    
    def __repr__(self):
        return f'<OrderItem {self.name}>'

class OrderAddress(db.Model):
    __tablename__ = 'order_addresses'
    
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)
    
    firstname = db.Column(db.String(50), nullable=False)
    lastname = db.Column(db.String(50), nullable=False)
    company = db.Column(db.String(100))
    address = db.Column(db.String(255), nullable=False)
    address2 = db.Column(db.String(255))
    postal_code = db.Column(db.String(20), nullable=False)
    city = db.Column(db.String(100), nullable=False)
    country = db.Column(db.String(2), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    
    order = db.relationship('Order', back_populates='shipping_address')
    
    def to_dict(self):
        return {
            'firstname': self.firstname,
            'lastname': self.lastname,
            'company': self.company,
            'address': self.address,
            'address2': self.address2,
            'postal_code': self.postal_code,
            'city': self.city,
            'country': self.country,
            'phone': self.phone
        }