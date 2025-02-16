// frontend/static/js/reset-password.js

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('reset-password-form');
    const togglePasswordBtn = document.querySelector('.toggle-password');
    const passwordInput = document.getElementById('password');
    const statusMessage = document.getElementById('status-message');

    // Récupération du token dans l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    // Vérification de la présence du token
    if (!token) {
        showStatus('error', 'Token de réinitialisation manquant');
        form.style.display = 'none';
        return;
    }

    // Affichage/masquage du mot de passe
    if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', function() {
            const type = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = type;
            this.querySelector('.eye-icon').textContent = 
                type === 'password' ? '👁️' : '👁️‍🗨️';
        });
    }

    // Validation en temps réel du mot de passe
    if (passwordInput) {
        passwordInput.addEventListener('input', function() {
            const strength = checkPasswordStrength(this.value);
            updatePasswordStrengthIndicator(strength);
        });
    }

    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();

            try {
                const password = this.password.value;
                const passwordConfirm = this['password-confirm'].value;

                // Validation des mots de passe
                if (password !== passwordConfirm) {
                    throw new Error('Les mots de passe ne correspondent pas');
                }

                // Vérification de la force du mot de passe
                const strength = checkPasswordStrength(password);
                if (strength.score < 3) {
                    throw new Error('Le mot de passe est trop faible');
                }

                // Envoi de la requête
                const response = await fetch('/api/auth/reset-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ 
                        token,
                        password 
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Une erreur est survenue');
                }

                // Affichage du succès
                showStatus('success', 
                    'Votre mot de passe a été réinitialisé. ' +
                    'Redirection vers la page de connexion...'
                );

                // Redirection après 3 secondes
                setTimeout(() => {
                    window.location.href = '/login.html';
                }, 3000);

            } catch (error) {
                showStatus('error', error.message);
            }
        });
    }
});

// Fonction de vérification de la force du mot de passe
function checkPasswordStrength(password) {
    // ... (même fonction que dans register.js)
}

// Fonction de mise à jour de l'indicateur
function updatePasswordStrengthIndicator(strength) {
    // ... (même fonction que dans register.js)
}

// Fonction d'affichage des messages
function showStatus(type, message) {
    // ... (même fonction que dans forgot-password.js)
}