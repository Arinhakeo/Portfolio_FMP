// frontend/static/js/init.js

import { session } from './session.js';

export function initializeApp() {
    const isLoggedIn = session.isAuthenticated();
    const userData = session.getUserData();

    // Au lieu d'appeler auth.updateUIForAnonymousUser
    if (!isLoggedIn) {
        // Déclencher l'événement pour que main.js mette à jour l'interface
        window.dispatchEvent(new Event('auth:logout'));
    } else {
        // Déclencher l'événement de connexion
        window.dispatchEvent(new CustomEvent('auth:login', {
            detail: userData
        }));
    }
}