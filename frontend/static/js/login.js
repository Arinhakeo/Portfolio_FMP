// ============================================================================
//                         GESTIONNAIRE DE CONNEXION
// ============================================================================

import { session } from './session.js';
import { notifications } from './notifications.js';

class LoginManager {
    constructor() {
        this.form = document.getElementById('login-form');
        this.errorDisplay = document.getElementById('error-message');
        this.initialize();
    }

    initialize() {
        if (this.form) {
            this.form.addEventListener('submit', this.handleLogin.bind(this));
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const formData = {
            email: this.form.email.value.trim(),
            password: this.form.password.value
        };

        try {
            const response = await fetch('http://localhost:5000/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                // Sauvegarder la session
                session.handleLogin({
                    token: data.token,
                    user: data.user
                });

                // Notification de succès
                notifications.create({
                    type: 'success',
                    message: 'Connexion réussie'
                });

                // Redirection
                window.location.href = '/';
            } else {
                this.showError(data.error || 'Erreur de connexion');
            }
        } catch (error) {
            console.error('Erreur de connexion:', error);
            this.showError('Erreur de connexion au serveur');
        }
    }

    showError(message) {
        if (this.errorDisplay) {
            this.errorDisplay.textContent = message;
            this.errorDisplay.style.display = 'block';
        }
    }
}

// Initialisation
const loginManager = new LoginManager();