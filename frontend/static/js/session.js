// ============================================================================
//                         SESSION MANAGER
// ============================================================================

/**
 * @fileoverview Gestionnaire complet de session utilisateur
 * Gère l'authentification, les tokens, et les événements de session
 */

// ============================================================================
//                         CONFIGURATION
// ============================================================================

const STORAGE_KEYS = {
    TOKEN: 'token',           // Changé pour correspondre à ce qui est utilisé dans profile.js
    REFRESH_TOKEN: 'refresh_token',
    USER_DATA: 'user'         // Changé pour correspondre à ce qui est utilisé dans profile.js
};

const AUTH_CONFIG = {
    REFRESH_INTERVAL: 45 * 60 * 1000, // 45 minutes
    API_ENDPOINTS: {
        REFRESH: '/api/auth/refresh',
        LOGOUT: '/api/auth/logout'
    }
};

// ============================================================================
//                         CLASSE PRINCIPALE
// ============================================================================

class SessionManager {
    /**
     * Initialise le gestionnaire de session
     * @constructor
     */
    constructor() {
        // Clés de stockage
        this.tokenKey = STORAGE_KEYS.TOKEN;
        this.refreshTokenKey = STORAGE_KEYS.REFRESH_TOKEN;
        this.userDataKey = STORAGE_KEYS.USER_DATA;

        // État
        this.refreshInterval = null;
        this.originalFetch = window.fetch;
        this.authenticated = false;
        this.userData = null;
        this.listeners = [];

        // Initialisation
        this.initialize();
        console.log('SessionManager initialisé');
    }

    /**
     * Initialise le système de session
     * @private
     */
    initialize() {
        if (this.isAuthenticated()) {
            console.log('Session existante détectée');
            this.setupTokenRefresh();
            this.setupRequestInterceptors();
            
            // Mettre à jour l'état interne
            this.authenticated = true;
            this.userData = this.getUserData();
            
            // Notifier l'application de l'état d'authentification
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('auth:login', {
                    detail: this.getUserData()
                }));
            }, 100);
        }
        this.setupStorageEventListener();
    }

    // ============================================================================
    //                         GESTION DES ÉVÉNEMENTS
    // ============================================================================

    /**
     * Ajoute un écouteur d'événements de session
     * @param {Function} listener Fonction de callback
     * @public
     */
    addListener(listener) {
        if (typeof listener === 'function') {
            this.listeners.push(listener);
        }
    }

    /**
     * Supprime un écouteur d'événements
     * @param {Function} listener Fonction à supprimer
     * @public
     */
    removeListener(listener) {
        this.listeners = this.listeners.filter(l => l !== listener);
    }

    /**
     * Notifie tous les écouteurs d'un changement de session
     * @private
     */
    notifyListeners() {
        const sessionState = {
            authenticated: this.authenticated,
            userData: this.userData
        };
        
        this.listeners.forEach(listener => {
            try {
                listener(sessionState);
            } catch (error) {
                console.error('Erreur dans un écouteur de session:', error);
            }
        });
        
        // Également déclencher un événement global
        window.dispatchEvent(new CustomEvent('auth:update', {
            detail: sessionState
        }));
    }

    // ============================================================================
    //                         GESTION DE L'AUTHENTIFICATION
    // ============================================================================

    /**
     * Vérifie si l'utilisateur est authentifié
     * @returns {boolean} État de l'authentification
     * @public
     */
    isAuthenticated() {
        const token = this.getToken();
        const userData = this.getUserData();
        return !!token && !!userData;
    }

    /**
     * Gère le processus de connexion
     * @param {Object} data Données de connexion
     * @public
     */
    handleLogin(data) {
        this.setToken(data.token);
        if (data.refresh_token) {
            this.setRefreshToken(data.refresh_token);
        }
        this.setUserData(data.user);

        // Configuration du système
        this.setupTokenRefresh();
        this.setupRequestInterceptors();

        // Notification du système
        window.dispatchEvent(new CustomEvent('auth:login', {
            detail: data.user
        }));

        console.log('Connexion réussie:', data.user.email);
    }

    /**
     * Gère le processus de déconnexion
     * @public
     */
    async handleLogout() {
        try {
            if (this.isAuthenticated()) {
                await this.originalFetch(AUTH_CONFIG.API_ENDPOINTS.LOGOUT, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.getToken()}`
                    }
                });
            }
        } catch (error) {
            console.error('Erreur déconnexion:', error);
        } finally {
            this.clearSession();
        }
    }

    /**
     * Nettoie la session actuelle
     * @private
     */
    clearSession() {
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.refreshTokenKey);
        localStorage.removeItem(this.userDataKey);

        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        // Mettre à jour l'état interne
        this.authenticated = false;
        this.userData = null;
        
        // Notifier les écouteurs
        this.notifyListeners();
        
        window.dispatchEvent(new Event('auth:logout'));
        console.log('Session terminée');
    }

    // ============================================================================
    //                         GESTION DES TOKENS
    // ============================================================================

    /**
     * Vérifie si un token est expiré
     * @param {string} token Token JWT
     * @returns {boolean}
     * @private
     */
    isTokenExpired(token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.exp * 1000 < Date.now();
        } catch (error) {
            console.error('Erreur vérification token:', error);
            return true;
        }
    }

    /**
     * Configure le rafraîchissement automatique du token
     * @private
     */
    setupTokenRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        this.refreshInterval = setInterval(() => {
            this.refreshToken();
        }, AUTH_CONFIG.REFRESH_INTERVAL);
    }

    /**
     * Rafraîchit le token d'accès
     * @returns {Promise<boolean>}
     * @private
     */
    async refreshToken() {
        try {
            const refreshToken = this.getRefreshToken();
            if (!refreshToken) return false;

            const response = await this.originalFetch(AUTH_CONFIG.API_ENDPOINTS.REFRESH, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${refreshToken}`
                }
            });

            if (!response.ok) throw new Error('Échec rafraîchissement token');

            const data = await response.json();
            this.setToken(data.token);
            return true;

        } catch (error) {
            console.error('Erreur rafraîchissement token:', error);
            return false;
        }
    }

    // ============================================================================
    //                         INTERCEPTEURS DE REQUÊTES
    // ============================================================================

    /**
     * Configure les intercepteurs de requêtes HTTP
     * @private
     */
    setupRequestInterceptors() {
        const originalFetch = window.fetch;
        const self = this;
        
        window.fetch = async function(...args) {
            const [resource, config = {}] = args;
            const newConfig = { ...config };
    
            if (self.isAuthenticated()) {
                newConfig.headers = {
                    ...newConfig.headers || {},
                    'Authorization': `Bearer ${self.getToken()}`
                };
            }
    
            try {
                // Utiliser 'this' original pour fetch
                return await originalFetch.apply(this, [resource, newConfig]);
            } catch (error) {
                throw error;
            }
        };
    }

    // ============================================================================
    //                         GESTION DU STOCKAGE
    // ============================================================================

    /**
     * Configure la synchronisation multi-onglets
     * @private
     */
    setupStorageEventListener() {
        window.addEventListener('storage', (event) => {
            if (event.key === this.tokenKey && !event.newValue) {
                this.handleLogout();
            }
        });
    }

    /**
     * Récupère le token d'accès
     * @returns {string|null}
     * @public
     */
    getToken() {
        return localStorage.getItem(this.tokenKey);
    }

    /**
     * Définit le token d'accès
     * @param {string} token
     * @private
     */
    setToken(token) {
        localStorage.setItem(this.tokenKey, token);
    }

    /**
     * Récupère le token de rafraîchissement
     * @returns {string|null}
     * @private
     */
    getRefreshToken() {
        return localStorage.getItem(this.refreshTokenKey);
    }

    /**
     * Définit le token de rafraîchissement
     * @param {string} token
     * @private
     */
    setRefreshToken(token) {
        localStorage.setItem(this.refreshTokenKey, token);
    }

    /**
     * Récupère les données utilisateur
     * @returns {Object|null}
     * @public
     */
    getUserData() {
        try {
            const data = localStorage.getItem(this.userDataKey);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Erreur lecture données utilisateur:', error);
            return null;
        }
    }

    /**
     * Définit les données utilisateur
     * @param {Object} userData
     * @private
     */
    setUserData(userData) {
        try {
            // Stockage des données utilisateur
            localStorage.setItem(this.userDataKey, JSON.stringify(userData));
            
            // Mise à jour de l'état interne
            this.authenticated = true;
            this.userData = userData;
            
            // Notification des écouteurs
            this.notifyListeners();
            
            console.log('Données utilisateur stockées avec succès');
        } catch (error) {
            console.error('Erreur lors du stockage des données utilisateur:', error);
        }
    }
}
//=============================================================================
//                         EXPORT
// ============================================================================

export const session = new SessionManager();
export default session;