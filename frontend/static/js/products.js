// frontend/static/js/products.js

import { notifications } from './notifications.js';

/**
 * Gestionnaire de la page produits
 */
class ProductsManager {
    constructor() {
        // État initial
        this.products = [];
        this.filteredProducts = [];
        this.currentPage = 1;
        this.itemsPerPage = 12;
        this.filters = {
            price: {
                min: null,
                max: null
            },
            brands: [],
            categories: [],
            inStock: false
        };
        this.currentView = 'grid';
        this.currentSort = 'popularity';
        
        // Initialisation
        this.initialize();
    }

    /**
     * Initialisation de la page
     */
    async initialize() {
        try {
            // Chargement des données nécessaires
            await Promise.all([
                this.loadProducts(),
                this.loadBrands(),
                this.loadCategories()
            ]);

            // Mise en place des écouteurs d'événements
            this.setupEventListeners();

            // Vérification des paramètres d'URL
            this.checkUrlParams();

            // Application des filtres initiaux
            this.applyFilters();

        } catch (error) {
            console.error('Erreur initialisation:', error);
            notifications.create({
                type: 'error',
                title: 'Erreur',
                message: 'Impossible de charger les produits'
            });
        }
    }

    /**
     * Charge les produits depuis l'API
     */
    async loadProducts() {
        const response = await fetch('/api/products');
        this.products = await response.json();
        this.filteredProducts = [...this.products];
    }

    /**
     * Charge les marques depuis l'API
     */
    async loadBrands() {
        const response = await fetch('/api/products/brands');
        const brands = await response.json();
        
        const container = document.getElementById('brands-list');
        container.innerHTML = brands.map(brand => `
            <label class="checkbox-label">
                <input 
                    type="checkbox" 
                    name="brand" 
                    value="${brand.id}"
                    onchange="productsManager.handleBrandFilter(this)"
                >
                ${brand.name}
            </label>
        `).join('');
    }

    /**
     * Charge les catégories depuis l'API
     */
    async loadCategories() {
        const response = await fetch('/api/products/categories');
        const categories = await response.json();
        
        const container = document.getElementById('categories-list');
        container.innerHTML = categories.map(category => `
            <label class="checkbox-label">
                <input 
                    type="checkbox" 
                    name="category" 
                    value="${category.id}"
                    onchange="productsManager.handleCategoryFilter(this)"
                >
                ${category.name}
            </label>
        `).join('');
    }

    /**
     * Vérifie les paramètres d'URL pour les filtres initiaux
     */
    checkUrlParams() {
        const params = new URLSearchParams(window.location.search);
        
        // Catégorie
        const category = params.get('category');
        if (category) {
            const checkbox = document.querySelector(`input[name="category"][value="${category}"]`);
            if (checkbox) {
                checkbox.checked = true;
                this.handleCategoryFilter(checkbox);
            }
        }
        
        // Prix
        const minPrice = params.get('min_price');
        const maxPrice = params.get('max_price');
        if (minPrice) document.getElementById('min-price').value = minPrice;
        if (maxPrice) document.getElementById('max-price').value = maxPrice;
        
        // Vue
        const view = params.get('view');
        if (view) this.changeView(view);
        
        // Tri
        const sort = params.get('sort');
        if (sort) {
            document.getElementById('sort-select').value = sort;
            this.currentSort = sort;
        }
    }

    /**
     * Met en place les écouteurs d'événements
     */
    setupEventListeners() {
        // Prix minimum
        document.getElementById('min-price').addEventListener('change', (e) => {
            this.filters.price.min = e.target.value ? Number(e.target.value) : null;
            this.applyFilters();
        });
        
        // Prix maximum
        document.getElementById('max-price').addEventListener('change', (e) => {
            this.filters.price.max = e.target.value ? Number(e.target.value) : null;
            this.applyFilters();
        });
    }

    /**
     * Applique tous les filtres actifs
     */
    applyFilters() {
        this.showLoader();
        
        // Réinitialisation
        this.filteredProducts = [...this.products];
        
        // Prix
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
        
        // Marques
        if (this.filters.brands.length > 0) {
            this.filteredProducts = this.filteredProducts.filter(
                product => this.filters.brands.includes(product.brand_id)
            );
        }
        
        // Catégories
        if (this.filters.categories.length > 0) {
            this.filteredProducts = this.filteredProducts.filter(
                product => this.filters.categories.includes(product.category_id)
            );
        }
        
        // Stock
        if (this.filters.inStock) {
            this.filteredProducts = this.filteredProducts.filter(
                product => product.stock_quantity > 0
            );
        }
        
        // Tri
        this.sortProducts();
        
        // Mise à jour de l'affichage
        this.currentPage = 1;
        this.updateDisplay();
        this.updateActiveFilters();
        this.updateUrl();
    }

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
            default: // popularity
                this.filteredProducts.sort((a, b) => b.sales - a.sales);
        }
    }

    /**
     * Met à jour l'affichage des produits
     */
    updateDisplay() {
        const container = document.getElementById('products-container');
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        const pageProducts = this.filteredProducts.slice(start, end);
        
        // Affichage des produits
        if (pageProducts.length > 0) {
            container.innerHTML = pageProducts.map(product => this.createProductCard(product)).join('');
            document.getElementById('no-products').style.display = 'none';
        } else {
            container.innerHTML = '';
            document.getElementById('no-products').style.display = 'block';
        }
        
        // Mise à jour de la pagination
        this.updatePagination();
        
        this.hideLoader();
    }

    /**
     * Crée une carte produit
     */
    createProductCard(product) {
        const template = document.getElementById('product-card-template');
        const clone = template.content.cloneNode(true);
        
        // Image
        const img = clone.querySelector('.product-image img');
        img.src = product.images[0]?.url || '/static/images/no-image.png';
        img.alt = product.name;
        
        // Badges
        const badges = clone.querySelector('.product-badges');
        if (product.is_new) {
            badges.innerHTML += '<span class="badge new-badge">Nouveau</span>';
        }
        if (product.discount > 0) {
            badges.innerHTML += '<span class="badge sale-badge">-${product.discount}%</span>';
        }
        
        // Informations
        clone.querySelector('.product-name a').textContent = product.name;
        clone.querySelector('.product-name a').href = `product.html?id=${product.id}`;
        clone.querySelector('.product-brand').textContent = product.brand.name;
        
        // Prix
        const priceElement = clone.querySelector('.product-price');
        if (product.discount > 0) {
            const originalPrice = product.price;
            const discountedPrice = originalPrice * (1 - product.discount / 100);
            priceElement.innerHTML = `
                <span class="current-price">${discountedPrice.toFixed(2)} €</span>
                <span class="original-price">${originalPrice.toFixed(2)} €</span>
                <span class="discount-tag">-${product.discount}%</span>
            `;
        } else {
            priceElement.innerHTML = `
                <span class="current-price">${product.price.toFixed(2)} €</span>
            `;
        }
        
        // Stock
        const stockElement = clone.querySelector('.product-stock');
        if (product.stock_quantity <= 0) {
            stockElement.innerHTML = '<span class="out-of-stock">Rupture de stock</span>';
        } else if (product.stock_quantity <= 5) {
            stockElement.innerHTML = `<span class="low-stock">Plus que ${product.stock_quantity} en stock</span>`;
        } else {
            stockElement.innerHTML = '<span class="in-stock">En stock</span>';
        }
        
        // Action
        const addToCartBtn = clone.querySelector('.add-to-cart-btn');
        if (product.stock_quantity > 0) {
            addToCartBtn.textContent = 'Ajouter au panier';
            addToCartBtn.onclick = () => mainManager.addToCart(product);
        } else {
            addToCartBtn.textContent = 'Indisponible';
            addToCartBtn.disabled = true;
        }
        
        return clone;
    }

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
            <button 
                ${this.currentPage === 1 ? 'disabled' : ''}
                onclick="productsManager.changePage(${this.currentPage - 1})"
            >
                Précédent
            </button>
        `;
        
        for (let i = 1; i <= totalPages; i++) {
            if (
                i === 1 || 
                i === totalPages || 
                (i >= this.currentPage - 2 && i <= this.currentPage + 2)
            ) {
                html += `
                    <button 
                        class="${i === this.currentPage ? 'active' : ''}"
                        onclick="productsManager.changePage(${i})"
                    >
                        ${i}
                    </button>
                `;
            } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                html += '<span class="pagination-dots">...</span>';
            }
        }
        
        html += `
            <button 
                ${this.currentPage === totalPages ? 'disabled' : ''}
                onclick="productsManager.changePage(${this.currentPage + 1})"
            >
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
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    /**
     * Met à jour les filtres actifs
     */
    updateActiveFilters() {
        const container = document.getElementById('active-filters');
        let html = '';
        
        // Prix
        if (this.filters.price.min !== null || this.filters.price.max !== null) {
            html += `
                <div class="filter-tag">
                    Prix : ${this.filters.price.min || 0}€ - ${this.filters.price.max || '∞'}€
                    <button onclick="productsManager.clearPriceFilter()">×</button>
                </div>
            `;
        }
        
        // Marques
        this.filters.brands.forEach(brandId => {
            const brand = document.querySelector(`input[value="${brandId}"]`).parentNode.textContent.trim();
            html += `
                <div class="filter-tag">
                    ${brand}
                    <button onclick="productsManager.removeBrandFilter(${brandId})">×</button>
                </div>
            `;
        });
        
        // Catégories
        this.filters.categories.forEach(categoryId => {
            const category = document.querySelector(`input[value="${categoryId}"]`).parentNode.textContent.trim();
            html += `
                <div class="filter-tag">
                    ${category}
                    <button onclick="productsManager.removeCategoryFilter(${categoryId})">×</button>
                </div>
            `;
        });
        
        // Stock
        if (this.filters.inStock) {
            html += `
                <div class="filter-tag">
                    En stock uniquement
                    <button onclick="productsManager.toggleInStock(false)">×</button>
                </div>
            `;
        }
        
        container.innerHTML = html;
        container.style.display = html ? 'flex' : 'none';
    }

    /**
     * Met à jour l'URL avec les filtres actifs
     */
    updateUrl() {
        const params = new URLSearchParams();
        
        if (this.filters.price.min !== null) {
            params.set('min_price', this.filters.price.min);
        }
        if (this.filters.price.max !== null) {
            params.set('max_price', this.filters.price.max);
        }
        
        if (this.filters.brands.length > 0) {
            params.set('brands', this.filters.brands.join(','));
        }
        
        if (this.filters.categories.length > 0) {
            params.set('categories', this.filters.categories.join(','));
        }
        
        if (this.filters.inStock) {
            params.set('in_stock', 'true');
        }
        
        params.set('view', this.currentView);
        params.set('sort', this.currentSort);
        
        // Mise à jour de l'URL sans recharger la page
        window.history.replaceState(
            {},
            '',
            `${window.location.pathname}?${params.toString()}`
        );
    }

    /**
     * Change le mode d'affichage (grille/liste)
     */
    changeView(view) {
        this.currentView = view;
        
        // Mise à jour des boutons
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        // Mise à jour de la grille
        document.getElementById('products-container').dataset.view = view;
        
        // Mise à jour de l'URL
        this.updateUrl();
    }

    /**
     * Change le tri des produits
     */
    changeSort(sort) {
        this.currentSort = sort;
        this.sortProducts();
        this.updateDisplay();
        this.updateUrl();
    }

    /**
     * Gère les filtres de marque
     */
    handleBrandFilter(checkbox) {
        const brandId = Number(checkbox.value);
        
        if (checkbox.checked) {
            this.filters.brands.push(brandId);
        } else {
            this.filters.brands = this.filters.brands.filter(id => id !== brandId);
        }
        
        this.applyFilters();
    }

    /**
     * Gère les filtres de catégorie
     */
    handleCategoryFilter(checkbox) {
        const categoryId = Number(checkbox.value);
        
        if (checkbox.checked) {
            this.filters.categories.push(categoryId);
        } else {
            this.filters.categories = this.filters.categories.filter(
                id => id !== categoryId
            );
        }
        
        this.applyFilters();
    }

    /**
     * Active/désactive le filtre "en stock"
     */
    toggleInStock(checked) {
        this.filters.inStock = checked;
        document.getElementById('in-stock-only').checked = checked;
        this.applyFilters();
    }

    /**
     * Supprime le filtre de prix
     */
    clearPriceFilter() {
        this.filters.price.min = null;
        this.filters.price.max = null;
        document.getElementById('min-price').value = '';
        document.getElementById('max-price').value = '';
        this.applyFilters();
    }

    /**
     * Supprime un filtre de marque
     */
    removeBrandFilter(brandId) {
        const checkbox = document.querySelector(`input[value="${brandId}"]`);
        if (checkbox) checkbox.checked = false;
        this.filters.brands = this.filters.brands.filter(id => id !== brandId);
        this.applyFilters();
    }

    /**
     * Supprime un filtre de catégorie
     */
    removeCategoryFilter(categoryId) {
        const checkbox = document.querySelector(`input[value="${categoryId}"]`);
        if (checkbox) checkbox.checked = false;
        this.filters.categories = this.filters.categories.filter(
            id => id !== categoryId
        );
        this.applyFilters();
    }

    /**
     * Réinitialise tous les filtres
     */
    clearFilters() {
        // Réinitialisation des états
        this.filters = {
            price: {
                min: null,
                max: null
            },
            brands: [],
            categories: [],
            inStock: false
        };
        
        // Réinitialisation des éléments du DOM
        document.querySelectorAll('input[type="checkbox"]').forEach(
            checkbox => checkbox.checked = false
        );
        document.getElementById('min-price').value = '';
        document.getElementById('max-price').value = '';
        
        // Application des filtres
        this.applyFilters();
    }

    /**
     * Affiche le loader
     */
    showLoader() {
        document.getElementById('products-loader').style.display = 'block';
        document.getElementById('products-container').style.opacity = '0.5';
    }

    /**
     * Cache le loader
     */
    hideLoader() {
        document.getElementById('products-loader').style.display = 'none';
        document.getElementById('products-container').style.opacity = '1';
    }
}

// Initialisation
const productsManager = new ProductsManager();
// Rendre l'instance accessible globalement
window.productsManager = productsManager;