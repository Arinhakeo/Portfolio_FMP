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
    // Récupérer les articles du panier depuis le stockage local
    loadCartItems();
    
    // Ajouter les écouteurs d'événements
    addEventListeners();
    
    // Calculer et mettre à jour le panier
    updateCart();
}

/**
 * Charger les articles du panier depuis le localStorage
 */
function loadCartItems() {
    // Récupérer les données du localStorage
    const storedCart = localStorage.getItem('cart');
    
    if (storedCart) {
        try {
            cartItems = JSON.parse(storedCart);
            
            // Vider le contenu existant du panier (supprime les articles fictifs)
            while (cartItemsContainer.firstChild) {
                if (cartItemsContainer.firstChild.id === 'empty-cart' || 
                    cartItemsContainer.firstChild.tagName === 'TEMPLATE') {
                    break; // Ne pas supprimer le message de panier vide ou le template
                }
                cartItemsContainer.removeChild(cartItemsContainer.firstChild);
            }
            
            // Ajouter les articles chargés du localStorage
            cartItems.forEach(item => {
                const itemElement = createCartItemElement(item);
                // Insérer avant le message "panier vide"
                cartItemsContainer.insertBefore(itemElement, emptyCart);
            });
            
        } catch (error) {
            console.error('Erreur lors du chargement du panier:', error);
            cartItems = [];
        }
    } else {
        cartItems = [];
    }
    
    // Afficher ou masquer le message "panier vide"
    emptyCart.style.display = cartItems.length === 0 ? 'block' : 'none';
    
    // Activer/désactiver le bouton de paiement
    checkoutBtn.disabled = cartItems.length === 0;
}

/**
 * Ajouter tous les écouteurs d'événements nécessaires
 */
function addEventListeners() {
    // Délégation d'événements pour les boutons d'augmentation de quantité
    cartItemsContainer.addEventListener('click', function(event) {
        if (event.target.classList.contains('increase-quantity')) {
            const input = event.target.parentElement.querySelector('.quantity-input');
            input.value = parseInt(input.value) + 1;
            updateItemQuantity(event.target.closest('.cart-item').dataset.id, parseInt(input.value));
        }
        
        if (event.target.classList.contains('decrease-quantity')) {
            const input = event.target.parentElement.querySelector('.quantity-input');
            if (parseInt(input.value) > 1) {
                input.value = parseInt(input.value) - 1;
                updateItemQuantity(event.target.closest('.cart-item').dataset.id, parseInt(input.value));
            }
        }
        
        if (event.target.classList.contains('remove-item')) {
            const itemId = event.target.closest('.cart-item').dataset.id;
            showRemoveConfirmation(itemId);
        }
    });
    
    // Délégation d'événements pour les champs de saisie de quantité
    cartItemsContainer.addEventListener('change', function(event) {
        if (event.target.classList.contains('quantity-input')) {
            let value = parseInt(event.target.value);
            if (isNaN(value) || value < 1) {
                value = 1;
                event.target.value = 1;
            }
            updateItemQuantity(event.target.closest('.cart-item').dataset.id, value);
        }
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
    const suggestionsContainer = document.getElementById('suggestions-container');
    if (suggestionsContainer) {
        suggestionsContainer.addEventListener('click', function(event) {
            if (event.target.classList.contains('add-to-cart-btn')) {
                const card = event.target.closest('.suggestion-card');
                if (card) {
                    const productId = card.dataset.id;
                    const productName = card.querySelector('h4').textContent;
                    const productPrice = parseFloat(card.querySelector('p').textContent.replace('€', '').trim());
                    const productImage = card.querySelector('img').src;
                    
                    addToCart({
                        id: productId,
                        name: productName,
                        price: productPrice,
                        quantity: 1,
                        image: productImage
                    });
                }
            }
        });
    }
    
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
        if (itemElement) {
            const unitPrice = cartItems[itemIndex].price;
            const totalPrice = (unitPrice * newQuantity).toFixed(2);
            
            itemElement.querySelector('.total-price').textContent = `${totalPrice} €`;
        }
        
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
    
    // Mettre à jour le localStorage
    saveCartToStorage();
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
        
        // Si le panier était vide, cacher le message "panier vide"
        if (cartItems.length === 1) {
            emptyCart.style.display = 'none';
            checkoutBtn.disabled = false;
        }
        
        // Ajouter l'élément avant le message "panier vide"
        cartItemsContainer.insertBefore(itemElement, emptyCart);
    }
    
    // Recalculer les totaux
    updateCart();
    
    // Afficher une notification d'ajout
    showAlert(`"${item.name}" a été ajouté à votre panier.`, 'success');
    
    // Mettre à jour le localStorage
    saveCartToStorage();
}

/**
 * Créer un élément d'interface pour un article du panier
 */
function createCartItemElement(item) {
    const totalPrice = (item.price * item.quantity).toFixed(2);
    
    const itemElement = document.createElement('div');
    itemElement.className = 'cart-item';
    itemElement.dataset.id = item.id;
    
    // Utiliser la propriété 'image' ou 'imageSrc' selon ce qui est disponible
    const imageSrc = item.image || item.imageSrc || '/static/images/products/placeholder.jpg';
    
    itemElement.innerHTML = `
        <div class="item-image">
            <img src="${imageSrc}" alt="${item.name}">
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
    if (cartCount) cartCount.textContent = totalItems;
    if (itemsCount) itemsCount.textContent = totalItems;
    
    // Mettre à jour les montants dans le récapitulatif
    if (subtotalHT) subtotalHT.textContent = `${subtotalHTValue.toFixed(2)} €`;
    if (taxAmount) taxAmount.textContent = `${taxValue.toFixed(2)} €`;
    if (subtotalTTC) subtotalTTC.textContent = `${subtotalTTCValue.toFixed(2)} €`;
    if (shippingCost) shippingCost.textContent = `${shippingValue.toFixed(2)} €`;
    if (totalAmount) totalAmount.textContent = `${totalValue.toFixed(2)} €`;
    
    // Mettre à jour le total dans l'en-tête
    const cartTotalElement = document.getElementById('cart-total');
    if (cartTotalElement) {
        cartTotalElement.textContent = `${totalValue.toFixed(2)} €`;
    }
    
    // Mettre à jour la barre de progression pour la livraison gratuite
    updateShippingProgress(subtotalTTCValue);
}

/**
 * Mettre à jour la barre de progression pour la livraison gratuite
 */
function updateShippingProgress(subtotalTTC) {
    // Si le panier est vide, cacher la barre de progression
    if (!shippingProgress || !progressBar || !progressMessage) return;
    
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
    localStorage.setItem('cart', JSON.stringify(cartItems));
}

/**
 * Afficher une notification temporaire
 */
function showAlert(message, type = 'success') {
    if (!alertContainer) return;
    
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