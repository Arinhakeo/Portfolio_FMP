// frontend/static/js/profile.js

/**
 * Gestion de la page profil utilisateur
 */
document.addEventListener('DOMContentLoaded', function() {
    // Initialisation
    initializeTabs();
    loadUserProfile();
    setupFormListeners();
    loadOrderHistory();

    // Vérification de l'authentification
    if (!isAuthenticated()) {
        window.location.href = '/login.html';
        return;
    }
});

/**
 * Vérifie si l'utilisateur est authentifié
 * @returns {boolean} Statut d'authentification
 */
function isAuthenticated() {
    const token = localStorage.getItem('token');
    return !!token;
}

/**
 * Initialise la navigation par onglets
 */
function initializeTabs() {
    const tabLinks = document.querySelectorAll('.profile-nav a');
    const sections = document.querySelectorAll('.profile-section');

    tabLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Retrait des classes actives
            tabLinks.forEach(l => l.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            
            // Activation de l'onglet cliqué
            link.classList.add('active');
            const targetId = link.getAttribute('data-tab');
            document.getElementById(targetId).classList.add('active');
            
            // Mise à jour de l'URL
            history.pushState(null, '', `#${targetId}`);
        });
    });

    // Gestion du retour navigateur
    window.addEventListener('popstate', () => {
        const hash = window.location.hash.slice(1) || 'profile';
        const targetLink = document.querySelector(`[data-tab="${hash}"]`);
        if (targetLink) {
            targetLink.click();
        }
    });

    // Activation de l'onglet initial
    const initialHash = window.location.hash.slice(1) || 'profile';
    const initialLink = document.querySelector(`[data-tab="${initialHash}"]`);
    if (initialLink) {
        initialLink.click();
    }
}

/**
 * Charge les données du profil utilisateur
 */
async function loadUserProfile() {
    try {
        const response = await fetch('/api/auth/me', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Erreur de chargement du profil');
        }

        const userData = await response.json();
        
        // Remplissage du formulaire
        document.getElementById('firstname').value = userData.firstname;
        document.getElementById('lastname').value = userData.lastname;
        document.getElementById('email').value = userData.email;
        document.getElementById('phone').value = userData.phone || '';

        // Remplissage des préférences
        if (userData.preferences) {
            document.querySelector('[name="newsletter"]').checked = userData.preferences.newsletter;
            document.querySelector('[name="order_updates"]').checked = userData.preferences.order_updates;
            document.querySelector('[name="promo_updates"]').checked = userData.preferences.promo_updates;
        }

    } catch (error) {
        showError('Erreur lors du chargement du profil');
        console.error(error);
    }
}

/**
 * Configure les écouteurs d'événements des formulaires
 */
function setupFormListeners() {
    // Formulaire de profil
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileUpdate);
    }

    // Formulaire de mot de passe
    const passwordForm = document.getElementById('password-form');
    if (passwordForm) {
        passwordForm.addEventListener('submit', handlePasswordChange);
    }

    // Formulaire de préférences
    const preferencesForm = document.getElementById('preferences-form');
    if (preferencesForm) {
        preferencesForm.addEventListener('submit', handlePreferencesUpdate);
    }
}

/**
 * Gère la mise à jour du profil
 * @param {Event} e - Événement de soumission
 */
async function handleProfileUpdate(e) {
    e.preventDefault();

    try {
        const formData = {
            firstname: document.getElementById('firstname').value.trim(),
            lastname: document.getElementById('lastname').value.trim(),
            email: document.getElementById('email').value.trim(),
            phone: document.getElementById('phone').value.trim()
        };

        const response = await fetch('/api/auth/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            throw new Error('Erreur lors de la mise à jour du profil');
        }

        showSuccess('Profil mis à jour avec succès');

    } catch (error) {
        showError(error.message);
    }
}

/**
 * Gère le changement de mot de passe
 * @param {Event} e - Événement de soumission
 */
async function handlePasswordChange(e) {
    e.preventDefault();

    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    // Validation basique
    if (newPassword !== confirmPassword) {
        showError('Les mots de passe ne correspondent pas');
        return;
    }

    try {
        const response = await fetch('/api/auth/password', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                current_password: currentPassword,
                new_password: newPassword
            })
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Erreur lors du changement de mot de passe');
        }

        // Réinitialisation du formulaire
        e.target.reset();
        showSuccess('Mot de passe modifié avec succès');

    } catch (error) {
        showError(error.message);
    }
}

/**
 * Charge l'historique des commandes
 */
async function loadOrderHistory() {
    try {
        const response = await fetch('/api/orders/history', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Erreur de chargement des commandes');
        }

        const orders = await response.json();
        
        const ordersList = document.querySelector('.orders-list');
        const noOrdersMessage = document.querySelector('.no-orders-message');

        if (orders.length === 0) {
            noOrdersMessage.style.display = 'block';
            return;
        }

        // Génération des cartes de commande
        ordersList.innerHTML = orders.map(order => `
            <div class="order-card">
                <div class="order-header">
                    <div class="order-info">
                        <strong>Commande #${order.id}</strong>
                        <span>${new Date(order.created_at).toLocaleDateString()}</span>
                    </div>
                    <span class="order-status status-${order.status.toLowerCase()}">
                        ${getStatusLabel(order.status)}
                    </span>
                </div>
                <div class="order-total">
                    Total: ${order.total.toFixed(2)} €
                </div>
            </div>
        `).join('');

    } catch (error) {
        showError('Erreur lors du chargement des commandes');
        console.error(error);
    }
}

/**
 * Obtient le libellé d'un statut de commande
 * @param {string} status - Code du statut
 * @returns {string} Libellé du statut
 */
function getStatusLabel(status) {
    const labels = {
        'PENDING': 'En attente',
        'PROCESSING': 'En traitement',
        'SHIPPED': 'Expédiée',
        'DELIVERED': 'Livrée',
        'CANCELLED': 'Annulée'
    };
    return labels[status] || status;
}

/**
 * Affiche un message de succès
 * @param {string} message - Message à afficher
 */
function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    
    document.querySelector('.profile-content').prepend(successDiv);
    
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}

/**
 * Affiche un message d'erreur
 * @param {string} message - Message d'erreur
 */
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    document.querySelector('.profile-content').prepend(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 3000);
}