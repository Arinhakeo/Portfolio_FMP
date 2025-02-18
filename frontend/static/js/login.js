// frontend/static/js/login.js
import { session } from './session.js';
import { notifications } from './notifications.js';

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const credentials = {
                email: this.email.value,
                password: this.password.value
            };

            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(credentials)
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error);
                }

                // Sauvegarder le token et les infos utilisateur
                localStorage.setItem('jwt_token', data.token);
                localStorage.setItem('user_info', JSON.stringify(data.user));

                // Redirection basée sur le rôle
                if (data.user.is_admin) {
                    window.location.href = '/admin/pages/products/index.html'; // Interface admin
                } else {
                    window.location.href = '/'; // Page d'accueil normale
                }

            } catch (error) {
                const errorMessage = document.getElementById('error-message');
                if (errorMessage) {
                    errorMessage.textContent = error.message;
                    errorMessage.style.display = 'block';
                }
            }
        });
    }
});