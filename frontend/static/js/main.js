// ============================================================================
//                         GESTIONNAIRE PRINCIPAL
// ============================================================================

/**
 * @fileoverview Gestionnaire principal de l'application
 * @requires SessionManager from './session.js'
 * @requires Notifications from './notifications.js'
 */

import { session } from './session.js';
import { notifications } from './notifications.js';

// ============================================================================
//                         CONFIGURATION
// ============================================================================

const APP_CONFIG = {
    API_BASE_URL: 'http://localhost:5000/api',
    ROUTES: {
        HOME: '/',
        LOGIN: '/login',
        REGISTER: '/register',
        PROFILE: '/profile',
        CART: '/cart'
    },
    SELECTORS: {
        AUTH_CONTAINER: '#auth-container',
        USER_NAV: '#user-nav',
        CART_COUNT: '#cart-count',
        CART_TOTAL: '#cart-total',
        SEARCH_FORM: '.search-bar form',
        CATEGORY_MENU: '#category-menu',
        FEATURED_CATEGORIES: '#featured-categories'
    }
};

// ============================================================================
//                         CLASSE PRINCIPALE
// ============================================================================

class MainManager {
    /**
     * @constructor
     */
    constructor() {
        // Initialisation des propriétés
        this.cartItems = [];
        this.categories = [];
        this.currentPage = null;

        // Configuration des écouteurs globaux
        this.setupGlobalListeners();
        
        // Initialisation
        this.initialize();
        console.log('MainManager initialisé');
    }

    /**
     * Configure les écouteurs globaux
     * @private
     */
    setupGlobalListeners() {
            // Écouteurs d'authentification avec plus de détails dans les logs
    window.addEventListener('auth:login', (e) => {
        console.log('Événement auth:login reçu avec données:', e.detail);
        this.updateUserInterface();
    });
    
    window.addEventListener('auth:logout', () => {
        console.log('Événement auth:logout reçu');
        this.updateUserInterface();
    });

        // Écouteur de navigation
        window.addEventListener('popstate', (e) => {
            e.preventDefault();
            this.handleRoute(window.location.pathname);
        });
    }

    /**
     * Initialise l'application
     * @private
     */
    async initialize() {
        try {
            // Vérification immédiate de l'authentification au démarrage
            this.updateUserInterface();
            
            await Promise.all([
                this.loadCart(),
                this.loadCategories()
            ]);

            this.setupEventListeners();
            
            console.log('Application initialisée avec succès');
        } catch (error) {
            console.error('Erreur initialisation:', error);
        }
    }

    /**
     * Charge les catégories depuis l'API
     * @private
     */
    async loadCategories() {
        try {
            const response = await fetch(`${APP_CONFIG.API_BASE_URL}/products/categories`);
            if (!response.ok) {
                throw new Error('Échec du chargement des catégories');
            }
            this.categories = await response.json();
            console.log('Catégories chargées:', this.categories);
            
            // Afficher les catégories
            const categoryMenu = document.querySelector(APP_CONFIG.SELECTORS.CATEGORY_MENU);
            if (categoryMenu && this.categories.length) {
                categoryMenu.innerHTML = this.categories.map(category => `
                    <li>
                        <a href="/products?category=${category.slug}" data-category="${category.id}">
                            ${category.name}
                        </a>
                    </li>
                `).join('');
            }
        } catch (error) {
            console.error('Erreur chargement catégories:', error);
            this.categories = [];
        }
    }

    // ============================================================================
    //                         INTERFACE UTILISATEUR
    // ============================================================================

    /**
     * Met à jour l'interface utilisateur
     * @private
     */
    updateUserInterface() {
        try {
            const isLoggedIn = session.isAuthenticated();
            const userData = session.getUserData();
            
            // Éléments d'authentification
            const authContainer = document.getElementById('auth-container');
            const userNav = document.getElementById('user-nav');
            
            console.log('Mise à jour interface :', isLoggedIn, userData);
            
            if (isLoggedIn && userData) {
                // Utilisateur connecté
                if (authContainer) authContainer.style.display = 'none';
                if (userNav) {
                    userNav.style.display = 'flex';
                    // Mettre à jour le nom d'utilisateur s'il y a un élément pour ça
                    const usernameElement = userNav.querySelector('.username');
                    if (usernameElement) {
                        usernameElement.textContent = userData.firstname;
                    }
                }
            } else {
                // Utilisateur non connecté
                if (authContainer) authContainer.style.display = 'flex';
                if (userNav) userNav.style.display = 'none';
            }
        } catch (error) {
            console.error('Erreur mise à jour interface:', error);
        }
    }

    /**
     * Génère le HTML pour un utilisateur connecté
     * @param {Object} userData - Données utilisateur
     * @returns {string} HTML
     * @private
     */
    getAuthenticatedUserHTML(userData) {
        return `
            <div class="user-menu">
                <a href="/profile" class="profile-link">
                    <i class="icon user-icon"></i>
                    <span>Mon compte (${userData.firstname})</span>
                </a>
                <div class="user-dropdown">
                    <a href="/profile">Mon Profil</a>
                    <a href="/orders">Mes Commandes</a>
                    <button class="logout-btn" onclick="mainManager.handleLogout()">
                        Déconnexion
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Génère le HTML pour un utilisateur non connecté
     * @returns {string} HTML
     * @private
     */
    getAnonymousUserHTML() {
        return `
            <a href="/login" id="login-link">
                <i class="icon user-icon"></i>
                <span>Connexion</span>
            </a>
            <a href="/register" id="register-link">
                <span>Inscription</span>
            </a>
        `;
    }

    // ============================================================================
    //                         GESTION DU PANIER
    // ============================================================================

    /**
     * Charge le panier depuis le stockage local
     * @private
     */
    loadCart() {
        try {
            const savedCart = localStorage.getItem('cart');
            this.cartItems = savedCart ? JSON.parse(savedCart) : [];
            this.updateCartCount();
        } catch (error) {
            console.error('Erreur chargement panier:', error);
            this.cartItems = [];
        }
    }

    /**
     * Met à jour l'affichage du panier
     * @private
     */
    updateCartCount() {
        try {
            const count = this.cartItems.reduce((total, item) => total + (item.quantity || 0), 0);
            const total = this.cartItems.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0);
            
            const cartCount = document.querySelector(APP_CONFIG.SELECTORS.CART_COUNT);
            const cartTotal = document.querySelector(APP_CONFIG.SELECTORS.CART_TOTAL);
            
            if (cartCount) cartCount.textContent = count;
            if (cartTotal) cartTotal.textContent = `${total.toFixed(2)} €`;
        } catch (error) {
            console.error('Erreur mise à jour panier:', error);
        }
    }

    // ============================================================================
    //                         ÉVÉNEMENTS ET FORMULAIRES
    // ============================================================================

    /**
     * Configure les écouteurs d'événements
     * @private
     */
    setupEventListeners() {
        // Bouton de déconnexion
        const logoutButton = document.getElementById('logout-button');
        if (logoutButton) {
            logoutButton.addEventListener('click', () => this.handleLogout());
        }
        
        this.setupSearchForm();
        this.setupNewsletterForm();
    }

    /**
     * Configure le formulaire de recherche
     * @private
     */
    setupSearchForm() {
        const searchForm = document.querySelector(APP_CONFIG.SELECTORS.SEARCH_FORM);
        if (searchForm) {
            searchForm.addEventListener('submit', this.handleSearch.bind(this));
        }
    }

    /**
     * Configure le formulaire de newsletter
     * @private
     */
    setupNewsletterForm() {
        const newsletterForm = document.getElementById('newsletter-form');
        if (newsletterForm) {
            newsletterForm.addEventListener('submit', this.handleNewsletterSignup.bind(this));
        }
    }

    /**
     * Gère la recherche
     * @param {Event} e - Événement submit
     * @private
     */
    handleSearch(e) {
        e.preventDefault();
        const query = e.target.querySelector('input').value.trim();
        if (query) {
            window.location.href = `/products?search=${encodeURIComponent(query)}`;
        }
    }

    /**
     * Gère l'inscription à la newsletter
     * @param {Event} e - Événement submit
     * @private
     */
    async handleNewsletterSignup(e) {
        e.preventDefault();
        
        const email = e.target.querySelector('input[type="email"]').value;
        
        try {
            // Simuler une souscription réussie (à remplacer par un appel API)
            notifications.create({
                type: 'success',
                title: 'Merci !',
                message: 'Vous êtes inscrit à notre newsletter'
            });

            e.target.reset();
        } catch (error) {
            console.error('Erreur newsletter:', error);
            notifications.create({
                type: 'error',
                title: 'Erreur',
                message: 'Impossible de vous inscrire à la newsletter'
            });
        }
    }

    /**
     * Gère les changements de route
     * @param {string} path - Chemin demandé
     * @private
     */
    handleRoute(path) {
        console.log('Navigation vers:', path);
        // Logique de routage si nécessaire
    }

    // ============================================================================
    //                         DÉCONNEXION
    // ============================================================================

    /**
     * Gère la déconnexion
     * @public
     */
    async handleLogout() {
        try {
            // Appel de la déconnexion via le SessionManager
            await session.handleLogout();
    
            // Mise à jour de l'interface utilisateur
            this.updateUserInterface();
    
            // Redirection vers la page d'accueil
            window.location.href = '/';
    
            // Notification de succès
            notifications.create({
                type: 'success',
                message: 'Vous êtes déconnecté'
            });
        } catch (error) {
            console.error('Erreur déconnexion:', error);
        }
    }
}

// ============================================================================
//                         INITIALISATION
// ============================================================================

const mainManager = new MainManager();
window.mainManager = mainManager;

export default mainManager;