// frontend/static/js/error-handler.js

import { notifications } from './notifications.js';
import { session } from './session.js';

/**
 * Gestionnaire d'erreurs global
 */
class ErrorHandler {
    constructor() {
        this.initialize();
    }

    /**
     * Initialise le gestionnaire d'erreurs
     */
    initialize() {
        // Capture des erreurs non gérées
        window.addEventListener('error', this.handleGlobalError.bind(this));
        window.addEventListener('unhandledrejection', this.handlePromiseError.bind(this));

        // Intercepte les erreurs réseau
        this.setupFetchInterceptor();
    }

    /**
     * Gère les erreurs JavaScript globales
     * @param {ErrorEvent} event - Événement d'erreur
     */
    handleGlobalError(event) {
        console.error('Erreur globale:', event.error);

        notifications.create({
            type: 'error',
            title: 'Erreur',
            message: 'Une erreur inattendue est survenue.',
            duration: 8000
        });

        // Empêche l'affichage de l'erreur dans la console
        event.preventDefault();
    }

    /**
     * Gère les rejets de promesses non gérés
     * @param {PromiseRejectionEvent} event - Événement de rejet
     */
    handlePromiseError(event) {
        console.error('Promesse rejetée:', event.reason);

        notifications.create({
            type: 'error',
            title: 'Erreur',
            message: 'Une erreur est survenue lors d\'une opération asynchrone.',
            duration: 8000
        });

        event.preventDefault();
    }

    /**
     * Configure l'intercepteur de requêtes fetch
     */
    setupFetchInterceptor() {
        const originalFetch = window.fetch;
        
        window.fetch = async (...args) => {
            try {
                const response = await originalFetch(...args);

                // Gestion des erreurs HTTP
                if (!response.ok) {
                    const data = await response.json().catch(() => ({}));
                    
                    switch (response.status) {
                        case 401:
                            // Problème d'authentification
                            if (!args[0].includes('/auth/')) {
                                session.handleLogout();
                            }
                            break;

                        case 403:
                            // Accès non autorisé
                            notifications.create({
                                type: 'error',
                                title: 'Accès refusé',
                                message: 'Vous n\'avez pas les droits nécessaires.'
                            });
                            break;

                        case 404:
                            // Ressource non trouvée
                            this.showErrorPage('404');
                            break;

                        case 500:
                            // Erreur serveur
                            notifications.create({
                                type: 'error',
                                title: 'Erreur serveur',
                                message: 'Une erreur est survenue, veuillez réessayer.'
                            });
                            break;

                        default:
                            // Autres erreurs
                            notifications.create({
                                type: 'error',
                                title: 'Erreur',
                                message: data.error || 'Une erreur est survenue.'
                            });
                    }

                    throw new Error(data.error || 'Erreur réseau');
                }

                return response;

            } catch (error) {
                if (!navigator.onLine) {
                    // Erreur de connexion
                    notifications.create({
                        type: 'error',
                        title: 'Erreur de connexion',
                        message: 'Vérifiez votre connexion internet.'
                    });
                }
                throw error;
            }
        };
    }

    /**
     * Affiche une page d'erreur
     * @param {string} type - Type d'erreur (404, 500, etc.)
     */
    showErrorPage(type) {
        // Sauvegarde l'URL actuelle pour le retour
        sessionStorage.setItem('lastUrl', window.location.href);
        
        // Redirection vers la page d'erreur
        window.location.href = `/errors/${type}.html`;
    }
}

// Export de l'instance unique
export const errorHandler = new ErrorHandler();