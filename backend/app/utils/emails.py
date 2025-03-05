# app/utils/emails.py
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import current_app, render_template
import secrets
from datetime import datetime, timedelta
from app.models.user import User
from app import db

def generate_verification_token():
    """Génère un token de vérification aléatoire."""
    return secrets.token_hex(32)

def send_verification_email(user):
    """
    Envoie un email de vérification à l'utilisateur.
    
    Args:
        user: L'instance utilisateur à vérifier
        
    Returns:
        bool: True si l'email a été envoyé avec succès, False sinon
    """
    # Générer un token de vérification
    token = generate_verification_token()
    
    # Définir l'expiration (24h)
    expires = datetime.utcnow() + timedelta(hours=24)
    
    # Enregistrer en base de données
    user.verification_token = token
    user.verification_token_expires = expires
    db.session.commit()
    
    # Configuration email
    msg = MIMEMultipart()
    msg['Subject'] = 'Vérification de votre compte FMP'
    msg['From'] = current_app.config['MAIL_USERNAME']
    msg['To'] = user.email
    
    # URL de vérification
    verification_url = f"{current_app.config['SITE_URL']}/verify-email?token={token}"
    
    # Corps du message
    html = render_template('emails/verification.html', 
                          user=user, 
                          verification_url=verification_url)
    
    msg.attach(MIMEText(html, 'html'))
    
    try:
        # Connexion au serveur SMTP
        server = smtplib.SMTP(current_app.config['MAIL_SERVER'], current_app.config['MAIL_PORT'])
        server.starttls()
        server.login(current_app.config['MAIL_USERNAME'], current_app.config['MAIL_PASSWORD'])
        
        # Envoi du message
        server.send_message(msg)
        server.quit()
        
        return True
    except Exception as e:
        current_app.logger.error(f"Erreur lors de l'envoi de l'email: {str(e)}")
        return False

def verify_email_token(token):
    """
    Vérifie un token de vérification d'email.
    
    Args:
        token: Le token à vérifier
        
    Returns:
        User or None: L'utilisateur si le token est valide, None sinon
    """
    user = User.query.filter_by(verification_token=token).first()
    
    if not user:
        return None
    
    # Vérifier l'expiration du token
    if user.verification_token_expires < datetime.utcnow():
        return None
    
    # Marquer l'utilisateur comme vérifié
    user.is_verified = True
    user.verification_token = None
    user.verification_token_expires = None
    db.session.commit()
    
    return user