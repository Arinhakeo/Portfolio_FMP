// frontend/static/js/auth.js

/**
 * Gestion du formulaire de connexion
 */
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            try {
                // Récupération des données du formulaire
                const formData = {
                    email: this.email.value.trim(),
                    password: this.password.value
                };
                
                // Validation basique
                if (!validateForm(formData)) {
                    return;
                }
                
                // Appel à l'API
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });
                
                const data = await response.json();
                
                if (!response.ok) {
                    throw new Error(data.error || 'Erreur de connexion');
                }
                
                // Stockage du token
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                
                // Redirection
                window.location.href = '/';
                
            } catch (error) {
                showError(error.message);
            }
        });
    }
});

/**
 * Valide les données du formulaire
 * @param {Object} formData - Données du formulaire
 * @returns {boolean} - Validité du formulaire
 */
function validateForm(formData) {
    // Validation de l'email
    if (!formData.email) {
        showError('L\'email est requis');
        return false;
    }
    
    if (!isValidEmail(formData.email)) {
        showError('Email invalide');
        return false;
    }
    
    // Validation du mot de passe
    if (!formData.password) {
        showError('Le mot de passe est requis');
        return false;
    }
    
    return true;
}

/**
 * Valide le format de l'email
 * @param {string} email - Email à valider
 * @returns {boolean} - Validité de l'email
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Affiche un message d'erreur
 * @param {string} message - Message d'erreur à afficher
 */
function showError(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    
    // Cache le message après 3 secondes
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 3000);
}