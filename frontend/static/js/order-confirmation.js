// static/js/order-confirmation.js
document.addEventListener('DOMContentLoaded', function() {
    // Récupérer l'ID de commande depuis l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('id');
    
    if (orderId) {
        loadOrderDetails(orderId);
    } else {
        // Rediriger vers la page d'accueil si pas d'ID de commande
        window.location.href = '/';
    }
});

// Charger les détails de la commande
function loadOrderDetails(orderId) {
    fetchWithAuth(`/api/orders/${orderId}`)
        .then(response => {
            if (!response.ok) throw new Error('Commande non trouvée');
            return response.json();
        })
        .then(order => {
            displayOrderDetails(order);
        })
        .catch(error => {
            console.error('Erreur:', error);
            alert('Impossible de charger les détails de la commande');
            window.location.href = '/';
        });
}

// Afficher les détails de la commande
function displayOrderDetails(order) {
    // Informations générales
    document.getElementById('order-number').textContent = order.order_number;
    document.getElementById('order-date').textContent = formatDate(order.created_at);
    
    // Adresse de livraison
    const shippingAddressEl = document.getElementById('shipping-address');
    shippingAddressEl.innerHTML = formatAddress(order.shipping_address);
    
    // Méthode de paiement
    const paymentMethodEl = document.getElementById('payment-method');
    paymentMethodEl.innerHTML = formatPaymentMethod(order.payment_method);
    
    // Articles commandés
    const itemsListEl = document.getElementById('order-items-list');
    itemsListEl.innerHTML = '';
    
    order.items.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div class="item-name">${item.name}</div>
            </td>
            <td>${item.reference}</td>
            <td>${item.price.toFixed(2)} €</td>
            <td>${item.quantity}</td>
            <td>${(item.price * item.quantity).toFixed(2)} €</td>
        `;
        itemsListEl.appendChild(row);
    });
    
    // Totaux
    const totalsEl = document.getElementById('order-totals');
    totalsEl.innerHTML = `
        <tr>
            <td colspan="4" class="text-right">Sous-total HT:</td>
            <td>${order.subtotal_ht.toFixed(2)} €</td>
        </tr>
        <tr>
            <td colspan="4" class="text-right">TVA (20%):</td>
            <td>${order.tax.toFixed(2)} €</td>
        </tr>
        <tr>
            <td colspan="4" class="text-right">Frais de livraison:</td>
            <td>${order.shipping.toFixed(2)} €</td>
        </tr>
        <tr class="total-row">
            <td colspan="4" class="text-right">Total:</td>
            <td>${order.total.toFixed(2)} €</td>
        </tr>
    `;
}

// Formater une adresse pour l'affichage
function formatAddress(address) {
    return `
        <p><strong>${address.firstname} ${address.lastname}</strong></p>
        ${address.company ? `<p>${address.company}</p>` : ''}
        <p>${address.address}</p>
        ${address.address2 ? `<p>${address.address2}</p>` : ''}
        <p>${address.postal_code} ${address.city}</p>
        <p>${getCountryName(address.country)}</p>
        <p>Tél: ${address.phone}</p>
    `;
}

// Formater la méthode de paiement pour l'affichage
function formatPaymentMethod(method) {
    switch (method) {
        case 'card':
            return '<p>Carte bancaire</p><p>Transaction traitée le ' + formatDate(new Date()) + '</p>';
        case 'transfer':
            return `
                <p>Virement bancaire</p>
                <p>Veuillez effectuer votre virement vers le compte suivant:</p>
                <p><strong>Bénéficiaire:</strong> FMP</p>
                <p><strong>IBAN:</strong> FR76 XXXX XXXX XXXX XXXX XXXX XXX</p>
                <p><strong>BIC:</strong> XXXXXXXX</p>
                <p><strong>Référence:</strong> Commande #${document.getElementById('order-number').textContent}</p>
            `;
        default:
            return `<p>${method}</p>`;
    }
}

// Formater une date pour l'affichage
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Obtenir le nom d'un pays à partir de son code
function getCountryName(countryCode) {
    const countries = {
        'FR': 'France',
        'BE': 'Belgique',
        'CH': 'Suisse',
        'LU': 'Luxembourg'
    };
    return countries[countryCode] || countryCode;
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