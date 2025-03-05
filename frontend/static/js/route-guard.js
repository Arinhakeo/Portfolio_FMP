// ============================================================================
//                      ROUTE GUARD - PROTECTEUR DE ROUTES
// ============================================================================
/**
 * Ce fichier gère la protection des routes de l'application
 * Il vérifie les autorisations d'accès aux pages, notamment admin
 * @module route-guard
 */

import { session } from './session.js';
import { notifications } from './notifications.js';

/**
 * Vérifie l'authentification au chargement d'une page admin
 * Redirige vers la page de connexion si l'utilisateur n'est pas authentifié
 * ou n'a pas les droits admin
 */
document.addEventListener('DOMContentLoaded', function() {
    // Vérifie si on est sur une page d'administration
    if (window.location.pathname.startsWith('/admin/')) {
        console.log('Vérification des droits administrateur...');
        
        // Récupère les données d'authentification du localStorage
        const token = localStorage.getItem('token');
        // Récupérer les informations utilisateur via l'API de session plutôt que directement
        const userData = session.getUserData();
        
        // Si pas de token ou pas d'utilisateur avec droits admin
        if (!token || !userData || !userData.is_admin) {
            console.log('Accès non autorisé: redirection vers login');
            
            // Enregistre l'URL actuelle pour rediriger après connexion
            const currentUrl = encodeURIComponent(window.location.pathname);
            window.location.href = '/pages/login.html?redirect=' + currentUrl;
            return;
        }
        
        // Si l'utilisateur est authentifié, configure l'intercepteur de requêtes
        setupRequestInterceptor(token);
        console.log('Accès admin autorisé');
    }
});

/**
 * Configure un intercepteur pour ajouter automatiquement le token 
 * d'authentification à toutes les requêtes API
 * @param {string} token - Token JWT d'authentification
 */
function setupRequestInterceptor(token) {
    // Sauvegarde de la fonction fetch originale
    const originalFetch = window.fetch;
    
    // Remplace la fonction fetch par une version qui ajoute le token
    window.fetch = function(...args) {
        const [resource, config = {}] = args;
        
        // Ajout du token d'authentification dans les en-têtes
        const newConfig = { 
            ...config,
            headers: {
                ...config.headers || {},
                'Authorization': `Bearer ${token}`
            }
        };
        
        // Appel de la fonction fetch originale avec les nouveaux paramètres
        return originalFetch.apply(this, [resource, newConfig]);
    };
}

/**
 * Fonction exportée pour protéger les routes dans d'autres modules
 * Vérifie les conditions d'accès et redirige si nécessaire
 * 
 * @param {Object} options - Options de protection
 * @param {boolean} [options.requireAuth=true] - Si l'authentification est requise
 * @param {boolean} [options.requireAdmin=false] - Si les droits admin sont requis
 * @returns {boolean} - true si l'accès est autorisé, false sinon
 */
export function guardRoute({ requireAuth = true, requireAdmin = false } = {}) {
    console.log(`Vérification d'accès - Auth: ${requireAuth}, Admin: ${requireAdmin}`);
    
    // Vérifie l'authentification si nécessaire
    if (requireAuth && !session.isAuthenticated()) {
        console.log('Authentification requise mais non trouvée');
        
        // Affiche une notification d'erreur
        notifications.create({
            type: 'warning',
            title: 'Accès refusé',
            message: 'Veuillez vous connecter pour accéder à cette page.'
        });
        
        // Sauvegarde la page demandée pour la redirection après connexion
        sessionStorage.setItem('redirectUrl', window.location.href);
        window.location.href = '/pages/login.html';
        return false;
    }

    // Vérifie les droits admin si nécessaire
    if (requireAdmin) {
        const userData = session.getUserData();
        
        if (!userData || !userData.is_admin) {
            console.log('Droits administrateur requis mais non trouvés');
            
            // Affiche une notification d'erreur
            notifications.create({
                type: 'error',
                title: 'Accès refusé',
                message: 'Vous n\'avez pas les droits administrateur nécessaires.'
            });
            
            window.location.href = '/';
            return false;
        }
    }
    
    // Si toutes les vérifications sont passées
    console.log('Accès autorisé');
    return true;
}

/**
 * Récupère et traite les paramètres de l'URL, notamment pour les redirections
 * @returns {Object} - Les paramètres de l'URL sous forme d'objet
 */
export function getUrlParams() {
    const params = {};
    const queryString = window.location.search.substring(1);
    
    if (queryString) {
        const pairs = queryString.split('&');
        for (const pair of pairs) {
            const [key, value] = pair.split('=');
            params[decodeURIComponent(key)] = decodeURIComponent(value || '');
        }
    }
    
    return params;
}

// Export des fonctions utilitaires
export default {
    guardRoute,
    getUrlParams
};