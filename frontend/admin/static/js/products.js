// frontend/admin/static/js/products.js

import { session } from '../../../static/js/session.js';
import { notifications } from '../../../static/js/notifications.js';

class ProductsManager {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.filters = {
            search: '',
            category: '',
            brand: '',
            stock: ''
        };
        
        this.initialize();
    }

    async initialize() {
        // Chargement des données initiales
        await this.loadCategories();
        await this.loadBrands();
        await this.loadProducts();
        
        // Mise en place des écouteurs d'événements
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Recherche
        const searchInput = document.getElementById('search-input');
        searchInput.addEventListener('input', this.debounce(() => {
            this.filters.search = searchInput.value;
            this.currentPage = 1;
            this.loadProducts();
        }, 300));

        // Filtres
        const filters = ['category', 'brand', 'stock'];
        filters.forEach(filter => {
            const element = document.getElementById(`${filter}-filter`);
            element.addEventListener('change', () => {
                this.filters[filter] = element.value;
                this.currentPage = 1;
                this.loadProducts();
            });
        });
    }

    async loadCategories() {
        try {
            const response = await fetch('/api/products/categories');
            const categories = await response.json();
            
            const select = document.getElementById('category-filter');
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.slug;
                option.textContent = category.name;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Erreur chargement catégories:', error);
            notifications.create({
                type: 'error',
                title: 'Erreur',
                message: 'Impossible de charger les catégories'
            });
        }
    }

    async loadBrands() {
        try {
            const response = await fetch('/api/products/brands');
            const brands = await response.json();
            
            const select = document.getElementById('brand-filter');
            brands.forEach(brand => {
                const option = document.createElement('option');
                option.value = brand.slug;
                option.textContent = brand.name;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Erreur chargement marques:', error);
            notifications.create({
                type: 'error',
                title: 'Erreur',
                message: 'Impossible de charger les marques'
            });
        }
    }

    async loadProducts() {
        try {
            // Construction de l'URL avec les filtres
            const queryParams = new URLSearchParams({
                page: this.currentPage,
                limit: this.itemsPerPage,
                ...this.filters
            });

            const response = await fetch(`/api/products?${queryParams}`);
            const data = await response.json();
            
            this.renderProducts(data.items);
            this.renderPagination(data);
            
        } catch (error) {
            console.error('Erreur chargement produits:', error);
            notifications.create({
                type: 'error',
                title: 'Erreur',
                message: 'Impossible de charger les produits'
            });
        }
    }

    renderProducts(products) {
        const tbody = document.getElementById('products-table-body');
        tbody.innerHTML = products.map(product => `
            <tr>
                <td>
                    <img
                        src="${product.images[0]?.url || '/static/images/no-image.png'}" 
                        alt="${product.name}"
                        class="product-thumbnail"
                    >
                </td>
                <td>${product.sku}</td>
                <td>${product.name}</td>
                <td>${product.category.name}</td>
                <td>${product.brand.name}</td>
                <td>${product.price.toFixed(2)} €</td>
                <td>
                    <span class="stock-badge ${this.getStockClass(product.stock_quantity)}">
                        ${product.stock_quantity}
                    </span>
                </td>
                <td>
                    <span class="status-badge ${product.is_active ? 'active' : 'inactive'}">
                        ${product.is_active ? 'Actif' : 'Inactif'}
                    </span>
                </td>
                <td class="actions">
                    <button
                        class="btn btn-icon"
                        onclick="window.location.href='./edit.html?id=${product.id}'"
                        title="Modifier"
                    >
                        <i class="icon edit-icon"></i>
                    </button>
                    <button
                        class="btn btn-icon"
                        onclick="productsManager.toggleProductStatus(${product.id})"
                        title="${product.is_active ? 'Désactiver' : 'Activer'}"
                    >
                        <i class="icon ${product.is_active ? 'disable-icon' : 'enable-icon'}"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    renderPagination(data) {
        const pagination = document.getElementById('pagination');
        const totalPages = Math.ceil(data.total / this.itemsPerPage);
        
        // Création des boutons de pagination
        let html = '';
        
        // Bouton précédent
        html += `
            <button
                class="pagination-btn"
                ${this.currentPage === 1 ? 'disabled' : ''}
                onclick="productsManager.goToPage(${this.currentPage - 1})"
            >
                Précédent
            </button>
        `;
        
        // Pages
        for (let i = 1; i <= totalPages; i++) {
            if (
                i === 1 ||
                i === totalPages ||
                (i >= this.currentPage - 2 && i <= this.currentPage + 2)
            ) {
                html += `
                    <button
                        class="pagination-btn ${i === this.currentPage ? 'active' : ''}"
                        onclick="productsManager.goToPage(${i})"
                    >
                        ${i}
                    </button>
                `;
            } else if (
                i === this.currentPage - 3 ||
                i === this.currentPage + 3
            ) {
                html += '<span class="pagination-ellipsis">...</span>';
            }
        }
        
        // Bouton suivant
        html += `
            <button
                class="pagination-btn"
                ${this.currentPage === totalPages ? 'disabled' : ''}
                onclick="productsManager.goToPage(${this.currentPage + 1})"
            >
                Suivant
            </button>
        `;
        
        pagination.innerHTML = html;
    }

    async toggleProductStatus(productId) {
        try {
            const response = await fetch(`/api/products/${productId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.getToken()}`
                },
                body: JSON.stringify({
                    is_active: !document.querySelector(`tr[data-id="${productId}"]`).classList.contains('active')
                })
            });

            if (!response.ok) {
                throw new Error('Erreur lors de la modification du statut');
            }

            // Rechargement des produits
            await this.loadProducts();
            
            notifications.create({
                type: 'success',
                title: 'Succès',
                message: 'Statut du produit modifié'
            });

        } catch (error) {
            console.error('Erreur modification statut:', error);
            notifications.create({
                type: 'error',
                title: 'Erreur',
                message: error.message
            });
        }
    }

    getStockClass(quantity) {
        if (quantity <= 0) return 'out-of-stock';
        if (quantity <= 5) return 'low-stock';
        return 'in-stock';
    }

    goToPage(page) {
        this.currentPage = page;
        this.loadProducts();
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Initialisation
const productsManager = new ProductsManager();
// Rendre l'instance accessible globalement
window.productsManager = productsManager;
