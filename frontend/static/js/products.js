// ==================== //
// === Importations === //
// ==================== //
import { notifications } from './notifications.js';

// ==================== //
// === Initialisation === //
// ==================== //
document.addEventListener('DOMContentLoaded', () => {
    const manager = new ProductsManager();
    manager.initialize();
});

/**
 * Gestionnaire de la page produits
 */
class ProductsManager {
    constructor() {
        // État initial
        this.brandsContainer = document.getElementById('brands-container'); // Conteneur des marques
        this.productsContainer = document.getElementById('products-list'); // Conteneur des produits
        this.products = []; // Liste des produits
        this.filteredProducts = []; // Liste des produits filtrés
        this.currentPage = 1; // Page actuelle
        this.itemsPerPage = 12; // Nombre d'éléments par page
        this.filters = {
            price: { min: null, max: null }, // Filtres de prix
            brands: [], // Filtres de marques
            categories: [], // Filtres de catégories
            inStock: false, // Filtre de stock
        };
        this.currentView = 'grid'; // Vue actuelle (grille ou liste)
        this.currentSort = 'popularity'; // Tri actuel
    }

    // ==================== //
    // === Initialisation === //
    // ==================== //
    async initialize() {
        try {
            await Promise.all([this.loadBrands(), this.loadProducts()]); // Charge les marques et produits
            this.setupEventListeners(); // Configure les écouteurs d'événements
            this.checkUrlParams(); // Vérifie les paramètres d'URL
        } catch (error) {
            console.error('Erreur initialisation:', error);
            notifications.show('Erreur lors du chargement des données', 'error');
        }
    }

    // ==================== //
    // === Chargement des Données === //
    // ==================== //

    /**
     * Charge les produits depuis l'API
     */
    async loadProducts() {
        try {
            const response = await fetch('/api/products');
            if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);
            const data = await response.json();
            this.products = data;
            this.applyFilters(); // Applique les filtres après le chargement
        } catch (error) {
            console.error('Erreur chargement produits:', error);
            notifications.show('Erreur lors du chargement des produits', 'error');
        }
    }

    /**
     * Charge les marques depuis l'API
     */
    async loadBrands() {
        try {
            const response = await fetch('/api/products/brands');
            if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);
            const brands = await response.json();
            if (!Array.isArray(brands)) throw new Error('Les marques ne sont pas un tableau');
            if (this.brandsContainer) {
                this.brandsContainer.innerHTML = brands.map(brand => `
                    <option value="${brand.id}">${brand.name}</option>
                `).join('');
            }
        } catch (error) {
            console.error('Erreur chargement marques:', error);
            notifications.show('Erreur lors du chargement des marques', 'error');
        }
    }

    // ==================== //
    // === Filtres === //
    // ==================== //

    /**
     * Applique tous les filtres actifs
     */
    applyFilters() {
        this.showLoader(); // Affiche le loader
        this.filteredProducts = [...this.products]; // Réinitialise les produits filtrés

        // Filtre par prix
        if (this.filters.price.min !== null) {
            this.filteredProducts = this.filteredProducts.filter(
                product => product.price >= this.filters.price.min
            );
        }
        if (this.filters.price.max !== null) {
            this.filteredProducts = this.filteredProducts.filter(
                product => product.price <= this.filters.price.max
            );
        }

        // Filtre par marques
        if (this.filters.brands.length > 0) {
            this.filteredProducts = this.filteredProducts.filter(
                product => this.filters.brands.includes(product.brand_id)
            );
        }

        // Filtre par catégories
        if (this.filters.categories.length > 0) {
            this.filteredProducts = this.filteredProducts.filter(
                product => this.filters.categories.includes(product.category_id)
            );
        }

        // Filtre par stock
        if (this.filters.inStock) {
            this.filteredProducts = this.filteredProducts.filter(
                product => product.stock_quantity > 0
            );
        }

        this.sortProducts(); // Trie les produits
        this.updateDisplay(); // Met à jour l'affichage
        this.updateActiveFilters(); // Met à jour les filtres actifs
        this.updateUrl(); // Met à jour l'URL
        this.hideLoader(); // Cache le loader
    }

    // ==================== //
    // === Tri des Produits === //
    // ==================== //

    /**
     * Trie les produits selon le critère actuel
     */
    sortProducts() {
        switch (this.currentSort) {
            case 'price_asc':
                this.filteredProducts.sort((a, b) => a.price - b.price);
                break;
            case 'price_desc':
                this.filteredProducts.sort((a, b) => b.price - a.price);
                break;
            case 'name_asc':
                this.filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'name_desc':
                this.filteredProducts.sort((a, b) => b.name.localeCompare(a.name));
                break;
            default: // Tri par popularité par défaut
                this.filteredProducts.sort((a, b) => b.sales - a.sales);
        }
    }

    // ==================== //
    // === Affichage des Produits === //
    // ==================== //

    /**
     * Met à jour l'affichage des produits
     */
    updateDisplay() {
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        const pageProducts = this.filteredProducts.slice(start, end);

        if (pageProducts.length > 0) {
            this.productsContainer.innerHTML = pageProducts.map(product => this.createProductCard(product)).join('');
            document.getElementById('no-products').style.display = 'none';
        } else {
            this.productsContainer.innerHTML = '';
            document.getElementById('no-products').style.display = 'block';
        }

        this.updatePagination(); // Met à jour la pagination
    }

    /**
     * Crée une carte produit
     */
    createProductCard(product) {
        return `
            <div class="product-card">
                <div class="product-image">
                    <img src="${product.images[0]?.url || '/static/images/no-image.png'}" alt="${product.name}">
                    <div class="product-badges">
                        ${product.is_new ? '<span class="badge new-badge">Nouveau</span>' : ''}
                        ${product.discount > 0 ? `<span class="badge sale-badge">-${product.discount}%</span>` : ''}
                    </div>
                </div>
                <div class="product-info">
                    <h3 class="product-name"><a href="product.html?id=${product.id}">${product.name}</a></h3>
                    <p class="product-brand">${product.brand.name}</p>
                    <div class="product-price">
                        ${product.discount > 0 ? `
                            <span class="current-price">${(product.price * (1 - product.discount / 100)).toFixed(2)} €</span>
                            <span class="original-price">${product.price.toFixed(2)} €</span>
                        ` : `
                            <span class="current-price">${product.price.toFixed(2)} €</span>
                        `}
                    </div>
                    <p class="product-stock">
                        ${product.stock_quantity <= 0 ? '<span class="out-of-stock">Rupture de stock</span>' :
                          product.stock_quantity <= 5 ? `<span class="low-stock">Plus que ${product.stock_quantity} en stock</span>` :
                          '<span class="in-stock">En stock</span>'}
                    </p>
                    <button class="add-to-cart-btn" ${product.stock_quantity <= 0 ? 'disabled' : ''}>
                        ${product.stock_quantity > 0 ? 'Ajouter au panier' : 'Indisponible'}
                    </button>
                </div>
            </div>
        `;
    }

    // ==================== //
    // === Pagination === //
    // ==================== //

    /**
     * Met à jour la pagination
     */
    updatePagination() {
        const totalPages = Math.ceil(this.filteredProducts.length / this.itemsPerPage);
        const container = document.getElementById('pagination');
        if (totalPages <= 1) {
            container.style.display = 'none';
            return;
        }

        let html = `
            <button ${this.currentPage === 1 ? 'disabled' : ''} onclick="productsManager.changePage(${this.currentPage - 1})">
                Précédent
            </button>
        `;

        for (let i = 1; i <= totalPages; i++) {
            html += `
                <button ${i === this.currentPage ? 'class="active"' : ''} onclick="productsManager.changePage(${i})">
                    ${i}
                </button>
            `;
        }

        html += `
            <button ${this.currentPage === totalPages ? 'disabled' : ''} onclick="productsManager.changePage(${this.currentPage + 1})">
                Suivant
            </button>
        `;

        container.innerHTML = html;
        container.style.display = 'flex';
    }

    /**
     * Change de page
     */
    changePage(page) {
        this.currentPage = page;
        this.updateDisplay();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // ==================== //
    // === Gestion des Événements === //
    // ==================== //

    /**
     * Configure les écouteurs d'événements
     */
    setupEventListeners() {
        document.getElementById('min-price').addEventListener('change', (e) => {
            this.filters.price.min = e.target.value ? Number(e.target.value) : null;
            this.applyFilters();
        });

        document.getElementById('max-price').addEventListener('change', (e) => {
            this.filters.price.max = e.target.value ? Number(e.target.value) : null;
            this.applyFilters();
        });
    }
}

// Initialisation
const productsManager = new ProductsManager();
window.productsManager = productsManager; // Rend l'instance accessible globalement