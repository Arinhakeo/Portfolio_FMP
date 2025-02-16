// frontend/static/js/main.js

import { session } from './session.js';
import { notifications } from './notifications.js';

/**
 * Gestionnaire principal du site
 */
class MainManager {
    constructor() {
        this.cartItems = [];
        this.initialize();
    }

    /**
     * Initialisation des fonctionnalités communes
     */
    async initialize() {
        // Chargement du panier
        this.loadCart();
        
        // Mise à jour de l'interface utilisateur
        this.updateUserInterface();
        
        // Mise en place des écouteurs d'événements
        this.setupEventListeners();
        
        // Chargement du menu des catégories
        await this.loadCategories();
    }

    /**
     * Charge le panier depuis le localStorage
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
     * Met à jour l'interface selon l'état de connexion
     */
    updateUserInterface() {
        const isLoggedIn = session.isAuthenticated();
        const userData = session.getUserData();

        // Mise à jour des liens de connexion/inscription
        document.getElementById('login-link').style.display = 
            isLoggedIn ? 'none' : 'block';
        document.getElementById('register-link').style.display = 
            isLoggedIn ? 'none' : 'block';

        // Si connecté, ajouter le menu utilisateur
        if (isLoggedIn) {
            this.createUserMenu(userData);
        }
    }

    /**
     * Crée le menu utilisateur
     */
    createUserMenu(userData) {
        const userNav = document.querySelector('.user-nav');
        userNav.innerHTML = `
            <div class="user-menu">
                <button class="user-menu-btn">
                    <i class="icon user-icon"></i>
                    ${userData.firstname}
                </button>
                <div class="user-menu-dropdown">
                    <a href="account/profile.html">Mon Profil</a>
                    <a href="account/orders.html">Mes Commandes</a>
                    <a href="account/addresses.html">Mes Adresses</a>
                    <button onclick="mainManager.handleLogout()">
                        Déconnexion
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Charge les catégories pour le menu
     */
    async loadCategories() {
        try {
            const response = await fetch('/api/products/categories');
            const categories = await response.json();
            
            const menu = document.getElementById('category-menu');
            menu.innerHTML = categories.map(category => `
                <li>
                    <a href="products.html?category=${category.slug}">
                        ${category.name}
                    </a>
                </li>
            `).join('');
            
        } catch (error) {
            console.error('Erreur chargement catégories:', error);
        }
    }

    /**
     * Met en place les écouteurs d'événements
     */
    setupEventListeners() {
        // Formulaire de recherche
        const searchForm = document.querySelector('.search-bar form');
        if (searchForm) {
            searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const query = document.getElementById('search-input').value.trim();
                if (query) {
                    window.location.href = `search.html?q=${encodeURIComponent(query)}`;
                }
            });
        }

        // Newsletter
        const newsletterForm = document.getElementById('newsletter-form');
        if (newsletterForm) {
            newsletterForm.addEventListener('submit', this.handleNewsletterSignup.bind(this));
        }
    }

    /**
     * Gère l'inscription à la newsletter
     */
    async handleNewsletterSignup(e) {
        e.preventDefault();
        
        const email = e.target.querySelector('input[type="email"]').value;
        
        try {
            const response = await fetch('/api/newsletter/subscribe', {
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
     * Met à jour le compteur du panier
     */
    updateCartCount() {
        const count = this.cartItems.reduce((total, item) => total + item.quantity, 0);
        const total = this.cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        document.getElementById('cart-count').textContent = count;
        document.getElementById('cart-total').textContent = `${total.toFixed(2)} €`;
    }

    /**
     * Gère la déconnexion
     */
    async handleLogout() {
        await session.handleLogout();
        window.location.href = '/';
    }
}

// Initialisation
const mainManager = new MainManager();
// Rendre l'instance accessible globalement
window.mainManager = mainManager;