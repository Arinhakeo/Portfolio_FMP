// static/js/checkout.js
document.addEventListener('DOMContentLoaded', function() {
    // Initialisation
    initCheckout();
    loadSavedAddresses();
    updateCheckoutSummary();
    
    // Écouteurs d'événements pour la navigation entre les étapes
    document.getElementById('address-form').addEventListener('submit', function(e) {
        e.preventDefault();
        if (validateAddressForm()) {
            saveAddressIfRequested();
            goToStep('payment');
        }
    });
    
    document.getElementById('payment-form').addEventListener('submit', function(e) {
        e.preventDefault();
        if (validatePaymentForm()) {
            processOrder();
        }
    });
    
    document.getElementById('back-to-cart').addEventListener('click', function() {
        window.location.href = '/pages/cart.html';
    });
    
    document.getElementById('back-to-address').addEventListener('click', function() {
        goToStep('address');
    });
    
    // Écouteurs pour les méthodes de paiement
    const paymentMethods = document.querySelectorAll('input[name="payment_method"]');
    paymentMethods.forEach(method => {
        method.addEventListener('change', togglePaymentDetails);
    });
    
    // Pré-remplir le formulaire avec les infos utilisateur si disponibles
    prefillUserInfo();
});

// Initialiser le processus de commande
function initCheckout() {
    // Vérifier si le panier existe et n'est pas vide
    const cart = getCart();
    if (!cart || cart.length === 0) {
        // Rediriger vers le panier si vide
        window.location.href = '/pages/cart.html';
        return;
    }
    
    // Initialiser à la première étape
    goToStep('address');
}

// Changer d'étape dans le processus de commande
function goToStep(stepName) {
    // Masquer toutes les étapes
    const steps = document.querySelectorAll('.checkout-step');
    steps.forEach(step => {
        step.classList.remove('active');
    });
    
    // Afficher l'étape demandée
    document.getElementById(`${stepName}-step`).classList.add('active');
    
    // Mettre à jour l'indication de progression
    updateProgressIndicator(stepName);
}

// Mettre à jour l'indicateur de progression
function updateProgressIndicator(currentStep) {
    const progressSteps = document.querySelectorAll('.progress-step');
    let active = true;
    
    progressSteps.forEach(step => {
        step.classList.remove('active');
        if (step.dataset.step === currentStep || active) {
            step.classList.add('active');
        }
        if (step.dataset.step === currentStep) {
            active = false;
        }
    });
}

// Charger les adresses enregistrées de l'utilisateur
function loadSavedAddresses() {
    // Vérifier si l'utilisateur est connecté
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return;
    
    // Simuler le chargement des adresses depuis l'API (à remplacer par un appel API réel)
    // Dans une implémentation réelle, vous feriez un appel à une API pour obtenir les adresses
    fetchWithAuth('/api/auth/addresses')
        .then(response => {
            if (!response.ok) throw new Error('Erreur de chargement des adresses');
            return response.json();
        })
        .then(addresses => {
            renderSavedAddresses(addresses);
        })
        .catch(error => {
            console.error('Erreur:', error);
            // En cas d'erreur, on continue sans afficher d'adresses
        });
}

// Afficher les adresses enregistrées
function renderSavedAddresses(addresses) {
    const container = document.getElementById('addresses-list');
    const noAddressesMsg = document.getElementById('no-addresses-message');
    
    // Masquer le message "aucune adresse" s'il y a des adresses
    if (addresses && addresses.length > 0) {
        noAddressesMsg.style.display = 'none';
        
        // Afficher chaque adresse
        addresses.forEach(address => {
            const addressCard = document.createElement('div');
            addressCard.className = 'address-card';
            addressCard.dataset.addressId = address.id;
            
            addressCard.innerHTML = `
                <div class="address-content">
                    <p><strong>${address.firstname} ${address.lastname}</strong></p>
                    <p>${address.address}</p>
                    ${address.address2 ? `<p>${address.address2}</p>` : ''}
                    <p>${address.postal_code} ${address.city}</p>
                    <p>${getCountryName(address.country)}</p>
                </div>
                <div class="address-actions">
                    <button class="btn-edit-address" data-address-id="${address.id}">Modifier</button>
                </div>
            `;
            
            // Ajouter un écouteur pour sélectionner cette adresse
            addressCard.addEventListener('click', function() {
                selectAddress(address);
            });
            
            container.appendChild(addressCard);
        });
    } else {
        noAddressesMsg.style.display = 'block';
    }
}

// Sélectionner une adresse existante
function selectAddress(address) {
    // Marquer visuellement l'adresse comme sélectionnée
    const addressCards = document.querySelectorAll('.address-card');
    addressCards.forEach(card => {
        card.classList.remove('selected');
        if (card.dataset.addressId == address.id) {
            card.classList.add('selected');
        }
    });
    
    // Pré-remplir le formulaire avec l'adresse sélectionnée
    document.getElementById('firstname').value = address.firstname;
    document.getElementById('lastname').value = address.lastname;
    document.getElementById('company').value = address.company || '';
    document.getElementById('address').value = address.address;
    document.getElementById('address2').value = address.address2 || '';
    document.getElementById('postal_code').value = address.postal_code;
    document.getElementById('city').value = address.city;
    document.getElementById('country').value = address.country;
    document.getElementById('phone').value = address.phone;
    
    // Décocher la case "sauvegarder" puisque c'est une adresse existante
    document.getElementById('save_address').checked = false;
}

// Obtenir le nom complet d'un pays à partir de son code
function getCountryName(countryCode) {
    const countries = {
        'FR': 'France',
        'BE': 'Belgique',
        'CH': 'Suisse',
        'LU': 'Luxembourg'
    };
    return countries[countryCode] || countryCode;
}

// Pré-remplir avec les informations de l'utilisateur
function prefillUserInfo() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return;
    
    // Pré-remplir les champs nom et prénom si disponibles
    if (user.firstname) document.getElementById('firstname').value = user.firstname;
    if (user.lastname) document.getElementById('lastname').value = user.lastname;
    
    // Si l'utilisateur a une adresse par défaut, on pourrait la pré-sélectionner ici
}

// Valider le formulaire d'adresse
function validateAddressForm() {
    const form = document.getElementById('address-form');
    return form.checkValidity();
}

// Sauvegarder l'adresse si demandé
function saveAddressIfRequested() {
    const saveAddress = document.getElementById('save_address').checked;
    if (!saveAddress) return;
    
    // Récupérer les données du formulaire
    const addressData = {
        firstname: document.getElementById('firstname').value,
        lastname: document.getElementById('lastname').value,
        company: document.getElementById('company').value,
        address: document.getElementById('address').value,
        address2: document.getElementById('address2').value,
        postal_code: document.getElementById('postal_code').value,
        city: document.getElementById('city').value,
        country: document.getElementById('country').value,
        phone: document.getElementById('phone').value
    };
    
    // Enregistrer l'adresse via l'API
    fetchWithAuth('/api/auth/addresses', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(addressData)
    })
    .then(response => {
        if (!response.ok) throw new Error('Erreur lors de l\'enregistrement de l\'adresse');
        return response.json();
    })
    .then(data => {
        console.log('Adresse enregistrée:', data);
    })
    .catch(error => {
        console.error('Erreur:', error);
        // Continuer malgré l'erreur pour ne pas bloquer le processus de commande
    });
}

// Afficher les détails du moyen de paiement sélectionné
function togglePaymentDetails() {
    const paymentMethods = document.querySelectorAll('.payment-method');
    paymentMethods.forEach(method => {
        const radio = method.querySelector('input[type="radio"]');
        const details = method.querySelector('.payment-details');
        if (radio.checked) {
            details.style.display = 'block';
        } else {
            details.style.display = 'none';
        }
    });
}

// Valider le formulaire de paiement
function validatePaymentForm() {
    const selectedMethod = document.querySelector('input[name="payment_method"]:checked').value;
    
    if (selectedMethod === 'card') {
        // Valider les champs de carte bancaire
        const cardNumber = document.getElementById('card-number').value.trim();
        const cardExpiry = document.getElementById('card-expiry').value.trim();
        const cardCvc = document.getElementById('card-cvc').value.trim();
        
        // Validation basique (à renforcer en production)
        if (!cardNumber || !cardExpiry || !cardCvc) {
            alert('Veuillez remplir tous les champs de carte bancaire');
            return false;
        }
    }
    
    return true;
}

// Traiter la commande
function processOrder() {
    // Récupérer les informations de la commande
    const cart = getCart();
    const paymentMethod = document.querySelector('input[name="payment_method"]:checked').value;
    
    // Créer l'objet de commande
    const orderData = {
        cart: cart,
        shipping_address: {
            firstname: document.getElementById('firstname').value,
            lastname: document.getElementById('lastname').value,
            company: document.getElementById('company').value,
            address: document.getElementById('address').value,
            address2: document.getElementById('address2').value,
            postal_code: document.getElementById('postal_code').value,
            city: document.getElementById('city').value,
            country: document.getElementById('country').value,
            phone: document.getElementById('phone').value
        },
        payment_method: paymentMethod,
        // Ajouter les détails de paiement si nécessaire
        payment_details: paymentMethod === 'card' ? {
            // Dans une application réelle, ne pas envoyer ces données directement
            // Utiliser un service de paiement sécurisé comme Stripe
            card_number: document.getElementById('card-number').value,
            card_expiry: document.getElementById('card-expiry').value,
            card_cvc: document.getElementById('card-cvc').value
        } : {}
    };
    
    // Envoyer la commande au serveur
    fetchWithAuth('/api/orders', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
    })
    .then(response => {
        if (!response.ok) throw new Error('Erreur lors de la création de la commande');
        return response.json();
    })
    .then(data => {
        // Enregistrer les informations de commande et afficher la confirmation
        displayOrderConfirmation(data);
        // Vider le panier
        clearCart();
    })
    .catch(error => {
        console.error('Erreur:', error);
        alert('Une erreur est survenue lors de la validation de votre commande. Veuillez réessayer.');
    });
}

// Afficher la confirmation de commande
function displayOrderConfirmation(orderData) {
    // Passer à l'étape de confirmation
    goToStep('confirmation');
    
    // Afficher les détails de la commande
    document.getElementById('order-number').textContent = orderData.order_number || 'N/A';
    
    const user = JSON.parse(localStorage.getItem('user'));
    document.getElementById('customer-email').textContent = user ? user.email : 'votre adresse email';
    
    // Afficher le récapitulatif de la commande
    const orderDetailsContainer = document.getElementById('order-details');
    orderDetailsContainer.innerHTML = '';
    
    // Ajouter les articles
    orderData.items.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'order-item';
        itemElement.innerHTML = `
            <p><strong>${item.name}</strong> x${item.quantity} - ${(item.price * item.quantity).toFixed(2)} €</p>
        `;
        orderDetailsContainer.appendChild(itemElement);
    });
    
    // Ajouter les totaux
    const totalsElement = document.createElement('div');
    totalsElement.className = 'order-totals';
    totalsElement.innerHTML = `
        <p>Sous-total: ${orderData.subtotal.toFixed(2)} €</p>
        <p>Frais de livraison: ${orderData.shipping.toFixed(2)} €</p>
        <p><strong>Total: ${orderData.total.toFixed(2)} €</strong></p>
    `;
    orderDetailsContainer.appendChild(totalsElement);
}

// Mettre à jour le résumé de commande dans la sidebar
function updateCheckoutSummary() {
    const cart = getCart();
    const container = document.getElementById('checkout-cart-summary');
    
    let html = '';
    
    // Ajouter chaque article
    cart.forEach(item => {
        html += `
            <div class="cart-item">
                <div class="item-image">
                    <img src="${item.image}" alt="${item.name}">
                </div>
                <div class="item-details">
                    <h4>${item.name}</h4>
                    <div class="item-quantity">Qté: ${item.quantity}</div>
                </div>
                <div class="item-price">
                    ${(item.price * item.quantity).toFixed(2)} €
                </div>
            </div>
        `;
    });
    
    // Calculer les totaux
    const subtotalHT = cart.reduce((sum, item) => sum + (item.price * item.quantity / 1.2), 0);
    const tax = subtotalHT * 0.2;
    const subtotalTTC = subtotalHT + tax;
    
    // Calculer les frais de livraison
    let shippingCost = 0;
    if (subtotalTTC < 49) {
        shippingCost = 5.90;
    }
    
    const total = subtotalTTC + shippingCost;
    
    // Ajouter le récapitulatif
    html += `
        <div class="summary-details">
            <div class="summary-row">
                <span>Sous-total HT:</span>
                <span>${subtotalHT.toFixed(2)} €</span>
            </div>
            <div class="summary-row">
                <span>TVA (20%):</span>
                <span>${tax.toFixed(2)} €</span>
            </div>
            <div class="summary-row">
                <span>Sous-total TTC:</span>
                <span>${subtotalTTC.toFixed(2)} €</span>
            </div>
            <div class="summary-row">
                <span>Frais de livraison:</span>
                <span>${shippingCost.toFixed(2)} €</span>
            </div>
            <div class="summary-row total-row">
                <span>Total:</span>
                <span>${total.toFixed(2)} €</span>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

// Utilitaire pour les requêtes authentifiées
async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('token');
    
    const headers = {
        ...options.headers || {}
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    return fetch(url, {
        ...options,
        headers
    });
}

// Récupérer le panier depuis localStorage
function getCart() {
    return JSON.parse(localStorage.getItem('cart') || '[]');
}

// Vider le panier après la commande
function clearCart() {
    localStorage.removeItem('cart');
}