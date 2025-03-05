/**
 * Gestionnaire de panier d'achat
 * Script responsable de toutes les interactions et calculs liés au panier
 */

// Constantes
const FREE_SHIPPING_THRESHOLD = 49.0; // Seuil pour la livraison gratuite en euros
const SHIPPING_COST = 5.90; // Coût de la livraison standard en euros
const TVA_RATE = 0.20; // Taux de TVA (20%)

// Éléments DOM
const cartItemsContainer = document.getElementById('cart-items-container');
const cartCount = document.getElementById('cart-count');
const itemsCount = document.getElementById('items-count');
const subtotalHT = document.getElementById('subtotal-ht');
const taxAmount = document.getElementById('tax-amount');
const subtotalTTC = document.getElementById('subtotal-ttc');
const shippingCost = document.getElementById('shipping-cost');
const totalAmount = document.getElementById('total-amount');
const checkoutBtn = document.getElementById('checkout-btn');
const emptyCart = document.getElementById('empty-cart');
const confirmationModal = document.getElementById('confirmation-modal');
const confirmRemoveBtn = document.getElementById('confirm-remove');
const cancelRemoveBtn = document.getElementById('cancel-remove');
const shippingProgress = document.querySelector('.shipping-progress');
const progressBar = document.querySelector('.progress-bar');
const progressMessage = document.querySelector('.progress-message');
const alertContainer = document.getElementById('alert-container');

// Variables globales
let cartItems = [];
let itemToRemove = null;

/**
 * Initialisation du panier
 */
function initCart() {
    // Récupérer les articles du panier depuis le stockage local ou le serveur
    loadCartItems();
    
    // Ajouter les écouteurs d'événements
    addEventListeners();
    
    // Calculer et mettre à jour le panier
    updateCart();
}

/**
 * Charger les articles du panier
 */
function loadCartItems() {
    // Dans un environnement réel, on récupérerait les données du localStorage ou d'une API
    // Ici, nous utilisons les données déjà présentes dans le HTML pour la démonstration
    cartItems = Array.from(document.querySelectorAll('.cart-item')).map(item => {
        const id = item.dataset.id;
        const name = item.querySelector('.item-name').textContent;
        const price = parseFloat(item.querySelector('.quantity-input').dataset.price);
        const quantity = parseInt(item.querySelector('.quantity-input').value);
        const imageSrc = item.querySelector('.item-image img').src;
        
        return { id, name, price, quantity, imageSrc };
    });
}

/**
 * Ajouter tous les écouteurs d'événements nécessaires
 */
function addEventListeners() {
    // Boutons d'augmentation de quantité
    document.querySelectorAll('.increase-quantity').forEach(button => {
        button.addEventListener('click', function() {
            const input = this.parentElement.querySelector('.quantity-input');
            input.value = parseInt(input.value) + 1;
            updateItemQuantity(this.closest('.cart-item').dataset.id, parseInt(input.value));
        });
    });
    
    // Boutons de diminution de quantité
    document.querySelectorAll('.decrease-quantity').forEach(button => {
        button.addEventListener('click', function() {
            const input = this.parentElement.querySelector('.quantity-input');
            if (parseInt(input.value) > 1) {
                input.value = parseInt(input.value) - 1;
                updateItemQuantity(this.closest('.cart-item').dataset.id, parseInt(input.value));
            }
        });
    });
    
    // Champs de saisie de quantité
    document.querySelectorAll('.quantity-input').forEach(input => {
        input.addEventListener('change', function() {
            let value = parseInt(this.value);
            if (isNaN(value) || value < 1) {
                value = 1;
                this.value = 1;
            }
            updateItemQuantity(this.closest('.cart-item').dataset.id, value);
        });
    });
    
    // Boutons de suppression d'article
    document.querySelectorAll('.remove-item').forEach(button => {
        button.addEventListener('click', function() {
            const itemId = this.closest('.cart-item').dataset.id;
            showRemoveConfirmation(itemId);
        });
    });
    
    // Bouton de confirmation de suppression
    confirmRemoveBtn.addEventListener('click', function() {
        if (itemToRemove) {
            removeItem(itemToRemove);
            closeModal();
        }
    });
    
    // Bouton d'annulation de suppression
    cancelRemoveBtn.addEventListener('click', closeModal);
    
    // Fermeture du modal en cliquant à l'extérieur
    confirmationModal.addEventListener('click', function(event) {
        if (event.target === confirmationModal) {
            closeModal();
        }
    });
    
    // Boutons d'ajout au panier pour les suggestions
    document.querySelectorAll('.add-to-cart-btn').forEach(button => {
        button.addEventListener('click', function() {
            const card = this.closest('.suggestion-card');
            const productId = card.dataset.id;
            const productName = card.querySelector('h4').textContent;
            const productPrice = parseFloat(card.querySelector('p').textContent.replace('€', '').trim());
            const productImage = card.querySelector('img').src;
            
            addToCart({
                id: productId,
                name: productName,
                price: productPrice,
                quantity: 1,
                imageSrc: productImage
            });
        });
    });
    
    // Bouton de paiement
    checkoutBtn.addEventListener('click', function() {
        // Dans un environnement réel, rediriger vers la page de paiement
        alert('Redirection vers la page de paiement...');
    });
}

/**
 * Mettre à jour la quantité d'un article
 */
function updateItemQuantity(itemId, newQuantity) {
    // Mettre à jour l'article dans le tableau
    const itemIndex = cartItems.findIndex(item => item.id === itemId);
    if (itemIndex !== -1) {
        cartItems[itemIndex].quantity = newQuantity;
        
        // Mettre à jour le prix total de l'article dans l'interface
        const itemElement = document.querySelector(`.cart-item[data-id="${itemId}"]`);
        const unitPrice = cartItems[itemIndex].price;
        const totalPrice = (unitPrice * newQuantity).toFixed(2);
        
        itemElement.querySelector('.total-price').textContent = `${totalPrice} €`;
        
        // Recalculer les totaux
        updateCart();
    }
}

/**
 * Afficher la confirmation de suppression
 */
function showRemoveConfirmation(itemId) {
    itemToRemove = itemId;
    confirmationModal.style.display = 'flex';
}

/**
 * Fermer le modal
 */
function closeModal() {
    confirmationModal.style.display = 'none';
    itemToRemove = null;
}

/**
 * Supprimer un article du panier
 */
function removeItem(itemId) {
    // Supprimer l'article du tableau
    cartItems = cartItems.filter(item => item.id !== itemId);
    
    // Supprimer l'élément de l'interface
    const itemElement = document.querySelector(`.cart-item[data-id="${itemId}"]`);
    if (itemElement) {
        itemElement.remove();
    }
    
    // Afficher message si panier vide
    if (cartItems.length === 0) {
        emptyCart.style.display = 'block';
        checkoutBtn.disabled = true;
    }
    
    // Recalculer les totaux
    updateCart();
    
    // Afficher une notification de suppression
    showAlert('L\'article a été supprimé de votre panier.', 'info');
}

/**
 * Ajouter un article au panier
 */
function addToCart(item) {
    // Vérifier si l'article existe déjà dans le panier
    const existingItem = cartItems.find(cartItem => cartItem.id === item.id);
    
    if (existingItem) {
        // Mettre à jour la quantité si l'article existe déjà
        const newQuantity = existingItem.quantity + item.quantity;
        updateItemQuantity(item.id, newQuantity);
        
        // Mettre à jour l'input de quantité dans l'interface
        const itemElement = document.querySelector(`.cart-item[data-id="${item.id}"]`);
        if (itemElement) {
            itemElement.querySelector('.quantity-input').value = newQuantity;
        }
    } else {
        // Ajouter le nouvel article au tableau
        cartItems.push(item);
        
        // Créer l'élément d'interface pour le nouvel article
        const itemElement = createCartItemElement(item);
        
        // Ajouter l'élément au conteneur
        // Si le panier était vide, cacher le message "panier vide"
        if (cartItems.length === 1) {
            emptyCart.style.display = 'none';
            checkoutBtn.disabled = false;
        }
        
        cartItemsContainer.appendChild(itemElement);
        
        // Ajouter les écouteurs d'événements pour le nouvel élément
        const newItem = cartItemsContainer.lastElementChild;
        
        newItem.querySelector('.increase-quantity').addEventListener('click', function() {
            const input = this.parentElement.querySelector('.quantity-input');
            input.value = parseInt(input.value) + 1;
            updateItemQuantity(item.id, parseInt(input.value));
        });
        
        newItem.querySelector('.decrease-quantity').addEventListener('click', function() {
            const input = this.parentElement.querySelector('.quantity-input');
            if (parseInt(input.value) > 1) {
                input.value = parseInt(input.value) - 1;
                updateItemQuantity(item.id, parseInt(input.value));
            }
        });
        
        newItem.querySelector('.quantity-input').addEventListener('change', function() {
            let value = parseInt(this.value);
            if (isNaN(value) || value < 1) {
                value = 1;
                this.value = 1;
            }
            updateItemQuantity(item.id, value);
        });
        
        newItem.querySelector('.remove-item').addEventListener('click', function() {
            showRemoveConfirmation(item.id);
        });
    }
    
    // Recalculer les totaux
    updateCart();
    
    // Afficher une notification d'ajout
    showAlert(`"${item.name}" a été ajouté à votre panier.`, 'success');
}

/**
 * Créer un élément d'interface pour un article du panier
 */
function createCartItemElement(item) {
    const totalPrice = (item.price * item.quantity).toFixed(2);
    
    const itemElement = document.createElement('div');
    itemElement.className = 'cart-item';
    itemElement.dataset.id = item.id;
    
    itemElement.innerHTML = `
        <div class="item-image">
            <img src="${item.imageSrc}" alt="${item.name}">
        </div>
        <div class="item-details">
            <h3 class="item-name">${item.name}</h3>
            <p class="item-reference">Réf: ${item.id}</p>
            <div class="item-quantity">
                <button class="decrease-quantity">-</button>
                <input type="number" min="1" value="${item.quantity}" class="quantity-input" data-price="${item.price}">
                <button class="increase-quantity">+</button>
            </div>
        </div>
        <div class="item-price">
            <p class="unit-price">${item.price.toFixed(2)} € l'unité</p>
            <p class="total-price">${totalPrice} €</p>
            <button class="remove-item">Supprimer</button>
        </div>
    `;
    
    return itemElement;
}

/**
 * Mettre à jour tous les calculs et affichages du panier
 */
function updateCart() {
    // Calculer le nombre total d'articles
    const totalItems = cartItems.reduce((total, item) => total + item.quantity, 0);
    
    // Calculer le sous-total HT
    const subtotalHTValue = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    
    // Calculer la TVA
    const taxValue = subtotalHTValue * TVA_RATE;
    
    // Calculer le sous-total TTC
    const subtotalTTCValue = subtotalHTValue + taxValue;
    
    // Déterminer les frais de livraison
    const shippingValue = subtotalTTCValue >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
    
    // Calculer le total
    const totalValue = subtotalTTCValue + shippingValue;
    
    // Mettre à jour les compteurs d'articles
    cartCount.textContent = totalItems;
    itemsCount.textContent = totalItems;
    
    // Mettre à jour les montants dans le récapitulatif
    subtotalHT.textContent = `${subtotalHTValue.toFixed(2)} €`;
    taxAmount.textContent = `${taxValue.toFixed(2)} €`;
    subtotalTTC.textContent = `${subtotalTTCValue.toFixed(2)} €`;
    shippingCost.textContent = `${shippingValue.toFixed(2)} €`;
    totalAmount.textContent = `${totalValue.toFixed(2)} €`;
    
    // Mettre à jour le total dans l'en-tête
    document.getElementById('cart-total').textContent = `${totalValue.toFixed(2)} €`;
    
    // Mettre à jour la barre de progression pour la livraison gratuite
    updateShippingProgress(subtotalTTCValue);
    
    // Mettre à jour le localStorage (dans un environnement réel)
    saveCartToStorage();
}

/**
 * Mettre à jour la barre de progression pour la livraison gratuite
 */
function updateShippingProgress(subtotalTTC) {
    // Si le panier est vide, cacher la barre de progression
    if (cartItems.length === 0) {
        shippingProgress.style.display = 'none';
        return;
    }
    
    shippingProgress.style.display = 'block';
    
    if (subtotalTTC >= FREE_SHIPPING_THRESHOLD) {
        // Livraison gratuite atteinte
        progressBar.style.width = '100%';
        progressMessage.innerHTML = '<strong>Félicitations !</strong> Votre commande bénéficie de la livraison gratuite.';
        shippingProgress.style.backgroundColor = '#d4edda';
        shippingProgress.style.borderColor = '#c3e6cb';
    } else {
        // Calcul du pourcentage de progression
        const progress = (subtotalTTC / FREE_SHIPPING_THRESHOLD) * 100;
        const remaining = FREE_SHIPPING_THRESHOLD - subtotalTTC;
        
        progressBar.style.width = `${progress}%`;
        progressMessage.innerHTML = `<strong>Plus que ${remaining.toFixed(2)} €</strong> d'achat pour bénéficier de la livraison gratuite !`;
        shippingProgress.style.backgroundColor = '#f0f7ff';
        shippingProgress.style.borderColor = '#cce5ff';
    }
}

/**
 * Sauvegarder le panier dans le localStorage
 */
function saveCartToStorage() {
    // Dans un environnement réel, on sauvegarderait dans le localStorage
    // localStorage.setItem('cart', JSON.stringify(cartItems));
    
    // On pourrait également envoyer les données à un serveur via une API
}

/**
 * Afficher une notification temporaire
 */
function showAlert(message, type = 'success') {
    // Créer l'élément d'alerte
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    
    const iconSrc = type === 'success' 
        ? '/static/images/icones/check.png' 
        : '/static/images/icones/info.png';
    
    alert.innerHTML = `
        <img src="${iconSrc}" alt="${type}">
        <div>${message}</div>
    `;
    
    // Ajouter l'alerte au conteneur
    alertContainer.appendChild(alert);
    
    // Supprimer l'alerte après 3 secondes
    setTimeout(() => {
        alert.style.opacity = '0';
        alert.style.transform = 'translateY(-10px)';
        alert.style.transition = 'opacity 0.5s, transform 0.5s';
        
        setTimeout(() => {
            alert.remove();
        }, 500);
    }, 3000);
}

// Initialiser le panier au chargement de la page
document.addEventListener('DOMContentLoaded', initCart);