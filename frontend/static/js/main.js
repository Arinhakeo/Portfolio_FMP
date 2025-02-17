// frontend/static/js/main.js

import { session } from './session.js';
import { notifications } from './notifications.js';

// Configuration de l'API
const API_BASE_URL = 'http://localhost:5000/api';

/**
 * Gestionnaire principal du site
 * Gère la navigation, le panier, l'interface utilisateur et les interactions
 */
class MainManager {
    constructor() {
        // Initialisation des propriétés
        this.cartItems = [];
        this.currentPage = null;
        this.initialize();
    }

    /**
     * Initialisation des fonctionnalités communes
     */
    async initialize() {
        // Chargement initial des données
        this.loadCart();
        this.setupRouting();
        this.updateUserInterface();
        this.setupEventListeners();
        await this.loadCategories();
    }

    /**
     * Configuration du système de routage
     */
    setupRouting() {
        // Définition des routes
        this.routes = {
            '/': 'index.html',
            '/login': 'pages/login.html',
            '/register': 'pages/register.html',
            '/profile': 'pages/profile.html',
            '/cart': 'pages/cart.html',
            '/products': 'pages/products.html'
        };

        // Écouteur pour la navigation
        window.addEventListener('popstate', (event) => {
            event.preventDefault();
            this.handleRoute(window.location.pathname);
        });
    }

    /**
     * Gère le changement de route
     * @param {string} path - Chemin de la route
     */
    async handleRoute(path) {
        const route = this.routes[path];
        if (route) {
            try {
                await this.loadPage(route);
                history.pushState(null, '', path);
                this.initializePageContent(path);
            } catch (error) {
                console.error('Erreur de routage:', error);
                notifications.create({
                    type: 'error',
                    message: 'Erreur lors du chargement de la page'
                });
            }
        }
    }

    /**
     * Charge une page dans le conteneur principal
     * @param {string} pagePath - Chemin du fichier de la page
     */
    async loadPage(pagePath) {
        try {
            const response = await fetch(pagePath);
            if (!response.ok) throw new Error('Page non trouvée');
            
            const content = await response.text();
            const contentContainer = document.getElementById('content');
            if (contentContainer) {
                contentContainer.innerHTML = content;
            }
        } catch (error) {
            console.error('Erreur chargement page:', error);
            throw error;
        }
    }

    /**
     * Initialise le contenu spécifique à chaque page
     * @param {string} path - Chemin de la page actuelle
     */
    initializePageContent(path) {
        switch (path) {
            case '/':
                this.initializeHome();
                break;
            case '/products':
                this.initializeProducts();
                break;
            case '/cart':
                this.initializeCart();
                break;
            // Autres cas spécifiques...
        }
    }

    /**
     * Gestion du panier
     */
    loadCart() {
        const savedCart = localStorage.getItem('cart');
        if (savedCart) {
            try {
                this.cartItems = JSON.parse(savedCart);
                this.updateCartCount();
            } catch (error) {
                console.error('Erreur chargement panier:', error);
                this.cartItems = [];
            }
        }
    }

    /**
     * Met à jour l'affichage du nombre d'articles dans le panier
     */
    updateCartCount() {
        const count = this.cartItems.reduce((total, item) => total + item.quantity, 0);
        const total = this.cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        const cartCount = document.getElementById('cart-count');
        const cartTotal = document.getElementById('cart-total');
        
        if (cartCount) cartCount.textContent = count;
        if (cartTotal) cartTotal.textContent = `${total.toFixed(2)} €`;
    }

    /**
     * Mise à jour de l'interface utilisateur
     */
    updateUserInterface() {
        const isLoggedIn = session.isAuthenticated();
        const userData = session.getUserData();

        // Mise à jour des éléments de navigation
        this.updateNavigationElements(isLoggedIn);

        // Création du menu utilisateur si connecté
        if (isLoggedIn && userData) {
            this.createUserMenu(userData);
        }
    }

    /**
     * Met à jour les éléments de navigation
     * @param {boolean} isLoggedIn - État de connexion
     */
    updateNavigationElements(isLoggedIn) {
        const elements = {
            'login-link': !isLoggedIn,
            'register-link': !isLoggedIn,
            'user-menu': isLoggedIn,
            'cart-icon': true
        };

        Object.entries(elements).forEach(([id, show]) => {
            const element = document.getElementById(id);
            if (element) element.style.display = show ? 'block' : 'none';
        });
    }

    /**
     * Crée le menu utilisateur
     * @param {Object} userData - Données de l'utilisateur
     */
    createUserMenu(userData) {
        const userNav = document.querySelector('.user-nav');
        if (userNav) {
            userNav.innerHTML = `
                <div class="user-menu">
                    <button class="user-menu-btn">
                        <i class="icon user-icon"></i>
                        ${userData.firstname}
                    </button>
                    <div class="user-menu-dropdown">
                        <a href="/profile" data-path="/profile">Mon Profil</a>
                        <a href="/orders" data-path="/orders">Mes Commandes</a>
                        <a href="/addresses" data-path="/addresses">Mes Adresses</a>
                        <button class="logout-btn">Déconnexion</button>
                    </div>
                </div>
            `;

            // Gestionnaire de déconnexion
            userNav.querySelector('.logout-btn').addEventListener('click', () => this.handleLogout());
        }
    }

    /**
     * Charge les catégories pour le menu
     */
    async loadCategories() {
        try {
            const response = await fetch(`${API_BASE_URL}/products/categories`);
            if (!response.ok) throw new Error('Erreur chargement catégories');

            const categories = await response.json();
            const menu = document.getElementById('category-menu');
            
            if (menu) {
                menu.innerHTML = categories.map(category => `
                    <li>
                        <a href="/products?category=${category.slug}" 
                           data-path="/products"
                           data-category="${category.slug}">
                            ${category.name}
                        </a>
                    </li>
                `).join('');
            }
        } catch (error) {
            console.error('Erreur chargement catégories:', error);
            notifications.create({
                type: 'error',
                message: 'Impossible de charger les catégories'
            });
        }
    }

    /**
     * Configuration des écouteurs d'événements
     */
    setupEventListeners() {
        // Navigation
        document.addEventListener('click', (e) => {
            if (e.target.matches('a[data-path]')) {
                e.preventDefault();
                const path = e.target.getAttribute('data-path');
                this.handleRoute(path);
            }
        });

        // Recherche
        this.setupSearchForm();
        
        // Newsletter
        this.setupNewsletterForm();
    }

    /**
     * Configuration du formulaire de recherche
     */
    setupSearchForm() {
        const searchForm = document.querySelector('.search-bar form');
        if (searchForm) {
            searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const query = document.getElementById('search-input').value.trim();
                if (query) {
                    this.handleRoute(`/products?search=${encodeURIComponent(query)}`);
                }
            });
        }
    }

    /**
     * Configuration du formulaire de newsletter
     */
    setupNewsletterForm() {
        const newsletterForm = document.getElementById('newsletter-form');
        if (newsletterForm) {
            newsletterForm.addEventListener('submit', this.handleNewsletterSignup.bind(this));
        }
    }

    /**
     * Gestion de l'inscription à la newsletter
     * @param {Event} e - Événement de soumission du formulaire
     */
    async handleNewsletterSignup(e) {
        e.preventDefault();
        
        const email = e.target.querySelector('input[type="email"]').value;
        
        try {
            const response = await fetch(`${API_BASE_URL}/newsletter/subscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });

            if (!response.ok) throw new Error('Erreur inscription newsletter');

            notifications.create({
                type: 'success',
                title: 'Merci !',
                message: 'Vous êtes inscrit à notre newsletter'
            });

            e.target.reset();
        } catch (error) {
            notifications.create({
                type: 'error',
                title: 'Erreur',
                message: 'Impossible de vous inscrire à la newsletter'
            });
        }
    }

    /**
     * Gestion de la déconnexion
     */
    async handleLogout() {
        try {
            await session.handleLogout();
            this.updateUserInterface();
            this.handleRoute('/');
            notifications.create({
                type: 'success',
                message: 'Vous êtes déconnecté'
            });
        } catch (error) {
            console.error('Erreur lors de la déconnexion:', error);
            notifications.create({
                type: 'error',
                message: 'Erreur lors de la déconnexion'
            });
        }
    }
}

// Initialisation et export
const mainManager = new MainManager();
window.mainManager = mainManager;

export default mainManager;