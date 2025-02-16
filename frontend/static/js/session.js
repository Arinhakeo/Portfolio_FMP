// frontend/static/js/session.js

/**
 * Gestionnaire de session utilisateur
 * Gère l'authentification et les tokens
 */
class SessionManager {
    constructor() {
        this.tokenKey = 'auth_token';
        this.refreshTokenKey = 'refresh_token';
        this.userKey = 'user_data';
        this.refreshInterval = null;
        this.initialize();
    }

    /**
     * Initialise le gestionnaire de session
     */
    initialize() {
        // Vérifie si un token existe
        if (this.isAuthenticated()) {
            this.setupTokenRefresh();
            this.setupRequestInterceptors();
        }

        // Écoute les événements de stockage (pour la synchronisation multi-onglets)
        window.addEventListener('storage', (event) => {
            if (event.key === this.tokenKey) {
                // Token modifié dans un autre onglet
                if (!event.newValue) {
                    this.handleLogout();
                }
            }
        });
    }

    /**
     * Vérifie si l'utilisateur est authentifié
     * @returns {boolean} Statut d'authentification
     */
    isAuthenticated() {
        const token = localStorage.getItem(this.tokenKey);
        return !!token && !this.isTokenExpired(token);
    }

    /**
     * Vérifie si un token est expiré
     * @param {string} token - Token JWT à vérifier
     * @returns {boolean} True si le token est expiré
     */
    isTokenExpired(token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.exp * 1000 < Date.now();
        } catch (error) {
            return true;
        }
    }

    /**
     * Configure le rafraîchissement automatique du token
     */
    setupTokenRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        // Rafraîchit le token toutes les 45 minutes
        this.refreshInterval = setInterval(() => {
            this.refreshToken();
        }, 45 * 60 * 1000);
    }

    /**
     * Configure les intercepteurs de requêtes
     */
    setupRequestInterceptors() {
        // Intercepte toutes les requêtes fetch
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const [resource, config] = args;

            // Ajoute le token aux headers si nécessaire
            if (this.isAuthenticated()) {
                config.headers = {
                    ...config.headers,
                    'Authorization': `Bearer ${this.getToken()}`
                };
            }

            try {
                const response = await originalFetch(resource, config);

                // Gestion des erreurs d'authentification
                if (response.status === 401) {
                    // Tentative de rafraîchissement du token
                    const success = await this.refreshToken();
                    if (success) {
                        // Réessaie la requête avec le nouveau token
                        config.headers['Authorization'] = `Bearer ${this.getToken()}`;
                        return originalFetch(resource, config);
                    } else {
                        // Déconnexion si le rafraîchissement échoue
                        this.handleLogout();
                    }
                }

                return response;
            } catch (error) {
                throw error;
            }
        };
    }

    /**
     * Rafraîchit le token d'accès
     * @returns {Promise<boolean>} Succès du rafraîchissement
     */
    async refreshToken() {
        try {
            const refreshToken = localStorage.getItem(this.refreshTokenKey);
            if (!refreshToken) {
                return false;
            }

            const response = await fetch('/api/auth/refresh', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${refreshToken}`
                }
            });

            if (!response.ok) {
                throw new Error('Échec du rafraîchissement du token');
            }

            const data = await response.json();
            this.setToken(data.token);
            return true;

        } catch (error) {
            console.error('Erreur lors du rafraîchissement du token:', error);
            return false;
        }
    }

    /**
     * Gère la connexion de l'utilisateur
     * @param {Object} data - Données de connexion (token et utilisateur)
     */
    handleLogin(data) {
        this.setToken(data.token);
        this.setRefreshToken(data.refresh_token);
        this.setUserData(data.user);
        this.setupTokenRefresh();
        this.setupRequestInterceptors();

        // Événement personnalisé pour la connexion
        window.dispatchEvent(new CustomEvent('userLogin', {
            detail: data.user
        }));
    }

    /**
     * Gère la déconnexion de l'utilisateur
     */
    async handleLogout() {
        try {
            // Appel API de déconnexion
            if (this.isAuthenticated()) {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.getToken()}`
                    }
                });
            }
        } catch (error) {
            console.error('Erreur lors de la déconnexion:', error);
        } finally {
            // Nettoyage local
            this.clearSession();
        }
    }

    /**
     * Nettoie les données de session
     */
    clearSession() {
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.refreshTokenKey);
        localStorage.removeItem(this.userKey);

        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        // Événement personnalisé pour la déconnexion
        window.dispatchEvent(new CustomEvent('userLogout'));

        // Redirection vers la page de connexion
        window.location.href = '/login.html';
    }

    // Getters et Setters
    getToken() {
        return localStorage.getItem(this.tokenKey);
    }

    setToken(token) {
        localStorage.setItem(this.tokenKey, token);
    }

    setRefreshToken(token) {
        localStorage.setItem(this.refreshTokenKey, token);
    }

    getUserData() {
        const data = localStorage.getItem(this.userKey);
        return data ? JSON.parse(data) : null;
    }

    setUserData(data) {
        localStorage.setItem(this.userKey, JSON.stringify(data));
    }
}

// Export de l'instance unique
export const session = new SessionManager();