// frontend/static/js/route-guard.js

import { session } from './session.js';
import { notifications } from './notifications.js';

/**
 * Protège une page contre les accès non autorisés
 * @param {Object} options - Options de protection
 * @param {boolean} options.requireAuth - Authentification requise
 * @param {boolean} options.requireAdmin - Droits admin requis
 */
export function guardRoute({ requireAuth = true, requireAdmin = false } = {}) {
    // Vérifie l'authentification si nécessaire
    if (requireAuth && !session.isAuthenticated()) {
        notifications.create({
            type: 'warning',
            title: 'Accès refusé',
            message: 'Veuillez vous connecter pour accéder à cette page.'
        });
        
        // Sauvegarde la page demandée pour la redirection après connexion
        sessionStorage.setItem('redirectUrl', window.location.href);
        window.location.href = '/login.html';
        return;
    }

    // Vérifie les droits admin si nécessaire
    if (requireAdmin) {
        const userData = session.getUserData();
        if (!userData?.is_admin) {
            notifications.create({
                type: 'error',
                title: 'Accès refusé',
                message: 'Vous n\'avez pas les droits nécessaires.'
            });
            window.location.href = '/';
            return;
        }
    }
}