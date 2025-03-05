// frontend/static/js/auth.js
// ============================================================================
//                      SYSTÈME D'AUTHENTIFICATION
// ============================================================================

/**
 * @fileoverview Gestion complète de l'authentification et des sessions
 * @requires SessionManager from './session.js'
 * @requires Notifications from './notifications.js'
 */

import { session } from './session.js';
import { notifications } from './notifications.js';

// ============================================================================
//                      CONSTANTES ET CONFIGURATION
// ============================================================================

const API_URL = 'http://localhost:5000/api';
const AUTH_ENDPOINTS = {
    LOGIN: `${API_URL}/auth/login`,
    LOGOUT: `${API_URL}/auth/logout`,
    REFRESH: `${API_URL}/auth/refresh`
};

// ============================================================================
//                      CLASSE PRINCIPALE
// ============================================================================

class Auth {
    /**
     * Constructeur de la classe Auth
     * Initialise le système d'authentification
     */
    constructor() {
        // Initialisation des propriétés
        this.currentUser = null;
        this.isInitialized = false;

        // Démarrage du système
        this.initialize();
    }

    // ============================================================================
    //                      MÉTHODES D'INITIALISATION
    // ============================================================================

    /**
     * Configure le système d'authentification
     * @private
     */
    initialize() {
        window.addEventListener('DOMContentLoaded', () => {
            console.log("Initialisation du système d'authentification...");
            this.setupFormListeners();
            this.checkAuthStatus();
            
            // Écouter les changements de stockage pour la synchronisation multi-onglets
            window.addEventListener('storage', this.handleStorageChange.bind(this));
            
            this.isInitialized = true;
        });
    }

    /**
     * Configure les écouteurs d'événements
     * @private
     */
    setupFormListeners() {
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', this.handleLogin.bind(this));
            console.log('Formulaire de connexion initialisé');
        }
    }

    // ============================================================================
    //                      GESTION DE L'AUTHENTIFICATION
    // ============================================================================

    /**
     * Gère la tentative de connexion
     * @param {Event} e - Événement de soumission du formulaire
     * @private
     */
    async handleLogin(e) {
        e.preventDefault();
        
        const formData = {
            email: document.getElementById('email').value.trim(),
            password: document.getElementById('password').value
        };

        if (!this.validateForm(formData)) return;

        try {
            const response = await fetch(AUTH_ENDPOINTS.LOGIN, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();
            console.log('Réponse login:', data);

            if (response.ok) {
                await this.handleSuccessfulLogin(data);
            } else {
                throw new Error(data.error || 'Erreur de connexion');
            }
        } catch (error) {
            console.error('Erreur de connexion:', error);
            this.showError(error.message);
        }
    }

    /**
     * Traite une connexion réussie
     * @param {Object} data - Données de connexion du serveur
     * @private
     */
/**
 * Traite une connexion réussie
 * @param {Object} data - Données de connexion du serveur
 * @private
 */
async handleSuccessfulLogin(data) {
    try {
        // Stocker les données
        session.handleLogin({
            token: data.token,
            refresh_token: data.refresh_token,
            user: data.user
        });

        // Notification
        notifications.create({
            type: 'success',
            message: 'Connexion réussie'
        });

        // Event personnalisé
        window.dispatchEvent(new CustomEvent('auth:login', {
            detail: data.user
        }));

        // Redirection avec délai
        setTimeout(() => {
            // Vérifier si l'utilisateur est admin
            if (data.user && data.user.is_admin === true) {
                console.log("Utilisateur admin - redirection vers dashboard", data.user);
                window.location.href = '/admin/dashboard.html';
            } else {
                console.log("Utilisateur standard - redirection vers profil");
                window.location.href = '/pages/profile.html';
            }
        }, 100);
    } catch (error) {
        console.error('Erreur login:', error);
        this.showError('Erreur lors de la connexion');
    }
}

    // ============================================================================
    //                      GESTION DE L'INTERFACE
    // ============================================================================

    /**
     * Vérifie et met à jour le statut d'authentification
     * @public
     */
    checkAuthStatus() {
        try {
            const isAuthenticated = session.isAuthenticated();
            const userData = session.getUserData();
    
            if (isAuthenticated && userData) {
                console.log("Utilisateur authentifié:", userData);
                window.dispatchEvent(new CustomEvent('auth:login', {
                    detail: userData
                }));
                return true;
            } else {
                console.log("Utilisateur non authentifié");
                window.dispatchEvent(new Event('auth:logout'));
                return false;
            }
        } catch (error) {
            console.error('Erreur vérification statut:', error);
            window.dispatchEvent(new Event('auth:logout'));
            return false;
        }
    }
    /**
     * Met à jour l'interface pour un utilisateur connecté
     * @param {Object} userData - Données de l'utilisateur
     * @private
     */
    updateUIForAuthenticatedUser(userData) {
        const authContainer = document.getElementById('auth-container');
        if (!authContainer) return;

        authContainer.innerHTML = `
            <div class="user-menu">
                <a href="/profile" class="user-profile-link">
                    <i class="icon user-icon"></i>
                    Mon compte
                </a>
            </div>
        `;

        // Mise à jour des éléments spécifiques admin
        if (userData.is_admin) {
            const adminMenu = document.querySelector('.admin-menu');
            if (adminMenu) adminMenu.style.display = 'block';
        }
    }

    // ============================================================================
    //                      UTILITAIRES ET VALIDATIONS
    // ============================================================================

    /**
     * Valide le formulaire de connexion
     * @param {Object} formData - Données du formulaire
     * @returns {boolean} Validité du formulaire
     * @private
     */
    validateForm(formData) {
        if (!formData.email || !formData.password) {
            this.showError('Tous les champs sont requis');
            return false;
        }
        
        if (!this.isValidEmail(formData.email)) {
            this.showError('Format d\'email invalide');
            return false;
        }
        
        return true;
    }

    /**
     * Vérifie la validité d'un email
     * @param {string} email - Email à vérifier
     * @returns {boolean} Validité de l'email
     * @private
     */
    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    /**
     * Affiche un message d'erreur
     * @param {string} message - Message à afficher
     * @private
     */
    showError(message) {
        const errorElement = document.getElementById('error-message');
        if (!errorElement) return;

        errorElement.textContent = message;
        errorElement.style.display = 'block';
        
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 3000);
    }

    /**
     * Gère les changements dans le localStorage
     * @param {StorageEvent} event - Événement de stockage
     * @private
     */
    handleStorageChange(event) {
        if (event.key === 'token' || event.key === 'userData') {
            this.checkAuthStatus();
        }
    }
}

// accès Token 

function setupAxiosInterceptors() {
    // Intercepter toutes les requêtes fetch
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
        const [resource, config = {}] = args;
        
        // Récupérer le token
        const token = localStorage.getItem('token');
        
        // Configurer les en-têtes si un token existe
        if (token) {
            config.headers = {
                ...config.headers || {},
                'Authorization': `Bearer ${token}`
            };
        }
        
        // Effectuer la requête
        return originalFetch(resource, config);
    };
}

// Appelez cette fonction lors de l'initialisation
setupAxiosInterceptors();
// ============================================================================
//                      EXPORTATION
// ============================================================================

// Création de l'instance unique
const auth = new Auth();

// Export par défaut
export default auth;