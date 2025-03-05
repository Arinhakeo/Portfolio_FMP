// static/js/js_admin/products.js

import { session } from '../session.js';
import { config } from '../config.js';

/**
 * Classe de gestion des produits pour l'interface d'administration
 */
class ProductManager {
    constructor() {
        this.apiUrl = `${config.apiBaseUrl}/products`;
        this.products = [];
        this.categories = [];
        this.brands = [];
        this.currentPage = 1;
        this.totalPages = 0;
        this.itemsPerPage = 25;
        this.selectedProducts = new Set();
        this.filters = {
            search: '',
            category: '',
            brand: '',
            stock: '',
            minPrice: null,
            maxPrice: null,
            activeOnly: false
        };
        this.sort = 'name-asc';
    }

    /**
     * Initialise le gestionnaire de produits
     */
    async init() {
        try {
            console.log('Initialisation du gestionnaire de produits...');
            
            // Vérification de l'authentification
            this.checkAuthentication();
            
            // Initialisation des éléments de l'interface
            this.initDOMElements();
            
            // Configuration des écouteurs d'événements
            this.setupEventListeners();
            
            // Chargement des produits
            await this.loadProducts();
            
            console.log('Gestionnaire de produits initialisé avec succès');
        } catch (error) {
            console.error('Erreur lors de l\'initialisation du gestionnaire de produits:', error);
            this.showNotification('Une erreur est survenue lors du chargement des produits.', 'error');
        }
    }

    /**
     * Vérifie l'authentification de l'utilisateur
     */
    checkAuthentication() {
        const userData = session.getUserData();
        
        if (!session.isAuthenticated()) {
            window.location.href = '/login';
            throw new Error('Utilisateur non authentifié');
        }
        
        if (!userData?.is_admin) {
            window.location.href = '/';
            throw new Error('Accès non autorisé - droits administrateur requis');
        }
    }

    /**
     * Initialise les références aux éléments DOM
     */
    initDOMElements() {
        // Éléments de formulaire
        this.filtersForm = document.getElementById('filters-form');
        this.searchInput = document.getElementById('search-input');
        this.categoryFilter = document.getElementById('category-filter');
        this.brandFilter = document.getElementById('brand-filter');
        this.stockFilter = document.getElementById('stock-filter');
        this.minPriceInput = document.getElementById('min-price');
        this.maxPriceInput = document.getElementById('max-price');
        this.activeOnlyCheckbox = document.getElementById('active-only');
        
        // Éléments de tri et pagination
        this.sortSelect = document.getElementById('sort-select');
        this.perPageSelect = document.getElementById('per-page-select');
        this.paginationContainer = document.querySelector('.pagination');
        
        // Éléments du tableau
        this.productsTableBody = document.getElementById('products-table-body');
        this.selectAllCheckbox = document.getElementById('select-all');
        this.resultsCountElement = document.getElementById('results-count');
        
        // Éléments d'actions groupées
        this.selectedCountElement = document.getElementById('selected-count');
        this.bulkActionSelect = document.getElementById('bulk-action-select');
        this.applyBulkActionButton = document.getElementById('apply-bulk-action');
        
        // Modals
        this.deleteModal = document.getElementById('delete-modal');
        this.confirmDeleteButton = document.getElementById('confirm-delete');
        this.cancelDeleteButton = document.getElementById('cancel-delete');
        this.bulkActionModal = document.getElementById('bulk-action-modal');
        this.bulkActionMessage = document.getElementById('bulk-action-message');
        this.confirmBulkActionButton = document.getElementById('confirm-bulk-action');
        this.cancelBulkActionButton = document.getElementById('cancel-bulk-action');
    }

    /**
     * Configure les écouteurs d'événements
     */
    setupEventListeners() {
        // Formulaire de filtres
        this.filtersForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateFilters();
            this.loadProducts();
        });
        
        this.filtersForm.addEventListener('reset', (e) => {
            // Attendre que les champs soient réinitialisés
            setTimeout(() => {
                this.resetFilters();
                this.loadProducts();
            }, 0);
        });
        
        // Tri et pagination
        this.sortSelect.addEventListener('change', () => {
            this.sort = this.sortSelect.value;
            this.loadProducts();
        });
        
        this.perPageSelect.addEventListener('change', () => {
            this.itemsPerPage = parseInt(this.perPageSelect.value);
            this.currentPage = 1; // Retour à la première page
            this.loadProducts();
        });
        
        // Sélection des produits
        this.selectAllCheckbox.addEventListener('change', () => {
            const isChecked = this.selectAllCheckbox.checked;
            const checkboxes = document.querySelectorAll('.product-checkbox');
            
            checkboxes.forEach(checkbox => {
                checkbox.checked = isChecked;
                const productId = checkbox.value;
                
                if (isChecked) {
                    this.selectedProducts.add(productId);
                } else {
                    this.selectedProducts.delete(productId);
                }
            });
            
            this.updateSelectedCount();
        });
        
        // Actions groupées
        this.bulkActionSelect.addEventListener('change', () => {
            this.applyBulkActionButton.disabled = !this.bulkActionSelect.value || this.selectedProducts.size === 0;
        });
        
        this.applyBulkActionButton.addEventListener('click', () => {
            if (this.selectedProducts.size === 0 || !this.bulkActionSelect.value) return;
            
            const action = this.bulkActionSelect.value;
            let message = '';
            
            switch (action) {
                case 'activate':
                    message = `Êtes-vous sûr de vouloir activer les ${this.selectedProducts.size} produits sélectionnés ?`;
                    break;
                case 'deactivate':
                    message = `Êtes-vous sûr de vouloir désactiver les ${this.selectedProducts.size} produits sélectionnés ?`;
                    break;
                case 'delete':
                    message = `Êtes-vous sûr de vouloir supprimer les ${this.selectedProducts.size} produits sélectionnés ? Cette action est irréversible.`;
                    break;
            }
            
            this.bulkActionMessage.textContent = message;
            this.showModal(this.bulkActionModal);
        });
        
        this.confirmBulkActionButton.addEventListener('click', () => {
            this.executeBulkAction();
            this.hideModal(this.bulkActionModal);
        });
        
        this.cancelBulkActionButton.addEventListener('click', () => {
            this.hideModal(this.bulkActionModal);
        });
        
        // Actions de confirmation de suppression
        this.confirmDeleteButton.addEventListener('click', () => {
            const productId = this.confirmDeleteButton.dataset.productId;
            if (productId) {
                this.deleteProduct(productId);
            }
            this.hideModal(this.deleteModal);
        });
        
        this.cancelDeleteButton.addEventListener('click', () => {
            this.hideModal(this.deleteModal);
        });
        
        // Fermeture des modals par le X
        document.querySelectorAll('.modal-close').forEach(button => {
            button.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                this.hideModal(modal);
            });
        });
        
        // Événement de déconnexion
        const logoutLink = document.getElementById('logout-link');
        if (logoutLink) {
            logoutLink.addEventListener('click', (e) => {
                e.preventDefault();
                session.logout();
                window.location.href = '/login';
            });
        }
        
        // Délégation d'événements pour les actions sur les produits
        document.addEventListener('click', (e) => {
            // Bouton de suppression
            if (e.target.closest('.delete-product')) {
                e.preventDefault();
                const button = e.target.closest('.delete-product');
                const productId = button.dataset.id;
                this.showDeleteConfirmation(productId);
            }
            
            // Bouton de duplication
            if (e.target.closest('.duplicate-product')) {
                e.preventDefault();
                const button = e.target.closest('.duplicate-product');
                const productId = button.dataset.id;
                this.duplicateProduct(productId);
            }
            
            // Pagination
            if (e.target.closest('.btn-pagination') && !e.target.closest('.btn-pagination').disabled) {
                const button = e.target.closest('.btn-pagination');
                
                if (button.classList.contains('active')) return;
                
                if (button.textContent.includes('chevron-left')) {
                    this.currentPage--;
                } else if (button.textContent.includes('chevron-right')) {
                    this.currentPage++;
                } else {
                    this.currentPage = parseInt(button.textContent);
                }
                
                this.loadProducts();
            }
        });
        
        // Écouter les changements de sélection de produits
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('product-checkbox')) {
                const checkbox = e.target;
                const productId = checkbox.value;
                
                if (checkbox.checked) {
                    this.selectedProducts.add(productId);
                } else {
                    this.selectedProducts.delete(productId);
                    this.selectAllCheckbox.checked = false;
                }
                
                this.updateSelectedCount();
            }
        });
    }

    /**
     * Charge les produits depuis l'API
     */
    async loadProducts() {
        try {
            // Dans un environnement réel, utiliser une requête API
            // Pour la démo, on utilise des données fictives
            
            // Simuler un temps de chargement
            this.showLoadingState();
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // En production, vous feriez une requête comme celle-ci:
            // const queryParams = new URLSearchParams({
            //     page: this.currentPage,
            //     limit: this.itemsPerPage,
            //     sort: this.sort,
            //     ...this.filters
            // });
            // 
            // const response = await fetch(`${this.apiUrl}?${queryParams}`, {
            //     headers: {
            //         'Authorization': `Bearer ${session.getToken()}`
            //     }
            // });
            // 
            // if (!response.ok) {
            //     throw new Error(`Erreur HTTP: ${response.status}`);
            // }
            // 
            // const data = await response.json();
            // this.products = data.items;
            // this.totalPages = data.pages;
            
            // Données de démonstration
            this.products = this.getMockProducts();
            this.totalPages = 10;
            
            // Appliquer les filtres manuellement dans la démo
            this.filterProducts();
            
            // Afficher les produits
            this.renderProducts();
            this.renderPagination();
            
            // Mise à jour du compte de résultats
            this.updateResultsCount();
            
            // Masquer l'état de chargement
            this.hideLoadingState();
        } catch (error) {
            console.error('Erreur lors du chargement des produits:', error);
            this.showNotification('Une erreur est survenue lors du chargement des produits.', 'error');
            this.hideLoadingState();
        }
    }

    /**
     * Affiche l'état de chargement
     */
    showLoadingState() {
        if (this.productsTableBody) {
            this.productsTableBody.classList.add('loading');
            
            // Ajouter une animation de chargement
            const loadingRow = document.createElement('tr');
            loadingRow.className = 'loading-row';
            loadingRow.innerHTML = `
                <td colspan="10" class="loading-cell">
                    <div class="loading-spinner"></div>
                    <p>Chargement des produits...</p>
                </td>
            `;
            
            this.productsTableBody.innerHTML = '';
            this.productsTableBody.appendChild(loadingRow);
        }
    }

    /**
     * Masque l'état de chargement
     */
    hideLoadingState() {
        if (this.productsTableBody) {
            this.productsTableBody.classList.remove('loading');
            
            // Supprimer l'animation de chargement
            const loadingRow = this.productsTableBody.querySelector('.loading-row');
            if (loadingRow) {
                loadingRow.remove();
            }
        }
    }

    /**
     * Met à jour les filtres à partir des champs du formulaire
     */
    updateFilters() {
        this.filters = {
            search: this.searchInput?.value || '',
            category: this.categoryFilter?.value || '',
            brand: this.brandFilter?.value || '',
            stock: this.stockFilter?.value || '',
            minPrice: this.minPriceInput?.value ? parseFloat(this.minPriceInput.value) : null,
            maxPrice: this.maxPriceInput?.value ? parseFloat(this.maxPriceInput.value) : null,
            activeOnly: this.activeOnlyCheckbox?.checked || false
        };
        
        this.currentPage = 1; // Retour à la première page lors du filtrage
    }

    /**
     * Réinitialise les filtres
     */
    resetFilters() {
        this.filters = {
            search: '',
            category: '',
            brand: '',
            stock: '',
            minPrice: null,
            maxPrice: null,
            activeOnly: false
        };
        
        // Réinitialiser les champs de formulaire (au cas où)
        if (this.searchInput) this.searchInput.value = '';
        if (this.categoryFilter) this.categoryFilter.value = '';
        if (this.brandFilter) this.brandFilter.value = '';
        if (this.stockFilter) this.stockFilter.value = '';
        if (this.minPriceInput) this.minPriceInput.value = '';
        if (this.maxPriceInput) this.maxPriceInput.value = '';
        if (this.activeOnlyCheckbox) this.activeOnlyCheckbox.checked = false;
        
        this.currentPage = 1;
    }

    /**
     * Applique les filtres aux produits (pour la démo)
     */
    filterProducts() {
        if (!this.filters) return;
        
        this.products = this.products.filter(product => {
            // Filtre par recherche (nom ou SKU)
            if (this.filters.search && !product.name.toLowerCase().includes(this.filters.search.toLowerCase()) && 
                !product.sku.toLowerCase().includes(this.filters.search.toLowerCase())) {
                return false;
            }
            
            // Filtre par catégorie
            if (this.filters.category && product.category !== this.filters.category) {
                return false;
            }
            
            // Filtre par marque
            if (this.filters.brand && product.brand !== this.filters.brand) {
                return false;
            }
            
            // Filtre par stock
            if (this.filters.stock) {
                if (this.filters.stock === 'in-stock' && product.stock <= 0) {
                    return false;
                } else if (this.filters.stock === 'low-stock' && (product.stock > 5 || product.stock <= 0)) {
                    return false;
                } else if (this.filters.stock === 'out-of-stock' && product.stock > 0) {
                    return false;
                }
            }
            
            // Filtre par prix minimum
            if (this.filters.minPrice !== null && product.price < this.filters.minPrice) {
                return false;
            }
            
            // Filtre par prix maximum
            if (this.filters.maxPrice !== null && product.price > this.filters.maxPrice) {
                return false;
            }
            
            // Filtre par statut (actif uniquement)
            if (this.filters.activeOnly && !product.active) {
                return false;
            }
            
            return true;
        });
        
        // Tri des produits
        this.sortProducts();
    }

    /**
     * Trie les produits selon le critère sélectionné
     */
    sortProducts() {
        if (!this.sort || !this.products) return;
        
        const [field, direction] = this.sort.split('-');
        const isAsc = direction === 'asc';
        
        this.products.sort((a, b) => {
            let valueA, valueB;
            
            switch (field) {
                case 'name':
                    valueA = a.name.toLowerCase();
                    valueB = b.name.toLowerCase();
                    break;
                case 'price':
                    valueA = a.price;
                    valueB = b.price;
                    break;
                case 'stock':
                    valueA = a.stock;
                    valueB = b.stock;
                    break;
                case 'date':
                    valueA = new Date(a.createdAt);
                    valueB = new Date(b.createdAt);
                    break;
                default:
                    return 0;
            }
            
            if (valueA < valueB) return isAsc ? -1 : 1;
            if (valueA > valueB) return isAsc ? 1 : -1;
            return 0;
        });
    }

    /**
     * Affiche les produits dans le tableau
     */
    renderProducts() {
        if (!this.productsTableBody) return;
        
        // Vider le tableau
        this.productsTableBody.innerHTML = '';
        
        if (this.products.length === 0) {
            const noResultsRow = document.createElement('tr');
            noResultsRow.innerHTML = `
                <td colspan="10" class="no-results">
                    <p>Aucun produit trouvé</p>
                </td>
            `;
            this.productsTableBody.appendChild(noResultsRow);
            return;
        }
        
        // Créer les lignes du tableau
        this.products.forEach(product => {
            const row = document.createElement('tr');
            
            // Couleur de statut de stock
            let stockClass = 'in-stock';
            if (product.stock <= 0) {
                stockClass = 'out-of-stock';
            } else if (product.stock <= 5) {
                stockClass = 'low-stock';
            }
            
            // Création de la ligne de produit
            row.innerHTML = `
                <td>
                    <label class="checkbox-container">
                        <input type="checkbox" class="product-checkbox" value="${product.id}" ${this.selectedProducts.has(product.id.toString()) ? 'checked' : ''}>
                        <span class="checkmark"></span>
                    </label>
                </td>
                <td class="image-cell">
                    <div class="product-thumbnail">
                        <img src="${product.image || '/static/images/placeholder.png'}" alt="${product.name}">
                    </div>
                </td>
                <td class="name-cell">
                    <div class="product-name">${product.name}</div>
                </td>
                <td>${product.sku}</td>
                <td>${product.category}</td>
                <td>${product.brand}</td>
                <td>${product.price.toFixed(2)} €</td>
                <td class="stock-cell">
                    <span class="stock-badge ${stockClass}">${product.stock}</span>
                </td>
                <td>
                    <span class="status-badge ${product.active ? 'active' : 'inactive'}">${product.active ? 'Actif' : 'Inactif'}</span>
                </td>
                <td class="actions-cell">
                    <div class="actions-dropdown">
                        <button class="btn-actions">Actions</button>
                        <div class="dropdown-content">
                            <a href="/admin/pages/products/edit.html?id=${product.id}" class="dropdown-item">
                                <span class="icon-edit"></span> Modifier
                            </a>
                            <a href="#" class="dropdown-item duplicate-product" data-id="${product.id}">
                                <span class="icon-duplicate"></span> Dupliquer
                            </a>
                            <a href="#" class="dropdown-item delete-product" data-id="${product.id}">
                                <span class="icon-delete"></span> Supprimer
                            </a>
                        </div>
                    </div>
                </td>
            `;
            
            this.productsTableBody.appendChild(row);
        });
    }

    /**
     * Affiche la pagination
     */
    renderPagination() {
        if (!this.paginationContainer) return;
        
        const totalPages = this.totalPages;
        if (totalPages <= 0) return;
        
        // Vider le conteneur
        this.paginationContainer.innerHTML = '';
        
        // Bouton précédent
        const prevButton = document.createElement('button');
        prevButton.className = `btn-pagination ${this.currentPage <= 1 ? 'disabled' : ''}`;
        prevButton.innerHTML = `<span class="icon-chevron-left">&lt;</span>`;
        prevButton.disabled = this.currentPage <= 1;
        this.paginationContainer.appendChild(prevButton);
        
        // Déterminer quelles pages afficher
        let startPage = Math.max(1, this.currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);
        
        // Ajuster si nécessaire
        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }
        
        // Boutons de page
        for (let i = startPage; i <= endPage; i++) {
            const pageButton = document.createElement('button');
            pageButton.className = `btn-pagination ${i === this.currentPage ? 'active' : ''}`;
            pageButton.textContent = i.toString();
            this.paginationContainer.appendChild(pageButton);
        }
        
        // Ellipsis
        if (endPage < totalPages) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'pagination-ellipsis';
            ellipsis.textContent = '...';
            this.paginationContainer.appendChild(ellipsis);
            
            // Dernière page
            const lastPageButton = document.createElement('button');
            lastPageButton.className = 'btn-pagination';
            lastPageButton.textContent = totalPages.toString();
            this.paginationContainer.appendChild(lastPageButton);
        }
        
        // Bouton suivant
        const nextButton = document.createElement('button');
        nextButton.className = `btn-pagination ${this.currentPage >= totalPages ? 'disabled' : ''}`;
        nextButton.innerHTML = `<span class="icon-chevron-right">&gt;</span>`;
        nextButton.disabled = this.currentPage >= totalPages;
        this.paginationContainer.appendChild(nextButton);
    }

    /**
     * Met à jour le compteur de résultats
     */
    updateResultsCount() {
        if (this.resultsCountElement) {
            this.resultsCountElement.textContent = this.products.length.toString();
        }
    }

    /**
     * Met à jour le compteur de produits sélectionnés
     */
    updateSelectedCount() {
        if (this.selectedCountElement) {
            this.selectedCountElement.textContent = this.selectedProducts.size.toString();
        }
        
        // Activer/désactiver le bouton d'action groupée
        if (this.applyBulkActionButton) {
            this.applyBulkActionButton.disabled = this.selectedProducts.size === 0 || !this.bulkActionSelect.value;
        }
    }

    /**
     * Affiche la confirmation de suppression
     */
    showDeleteConfirmation(productId) {
        const product = this.products.find(p => p.id == productId);
        
        if (!product) return;
        
        // Mettre à jour le texte du modal
        const modalBody = this.deleteModal.querySelector('.modal-body p');
        if (modalBody) {
            modalBody.textContent = `Êtes-vous sûr de vouloir supprimer le produit "${product.name}" ? Cette action est irréversible.`;
        }
        
        // Ajouter l'ID au bouton de confirmation
        this.confirmDeleteButton.dataset.productId = productId;
        
        // Afficher le modal
        this.showModal(this.deleteModal);
    }

    /**
     * Exécute l'action de suppression d'un produit
     */
    async deleteProduct(productId) {
        try {
            // En production, vous feriez une requête DELETE à l'API
            // const response = await fetch(`${this.apiUrl}/${productId}`, {
            //     method: 'DELETE',
            //     headers: {
            //         'Authorization': `Bearer ${session.getToken()}`
            //     }
            // });
            
            // if (!response.ok) {
            //     throw new Error(`Erreur HTTP: ${response.status}`);
            // }
            
            // Pour la démo, on simule un temps de traitement
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Supprimer le produit de la liste
            this.products = this.products.filter(p => p.id != productId);
            
            // Supprimer l'ID des sélections
            this.selectedProducts.delete(productId.toString());
            this.updateSelectedCount();
            
            // Mettre à jour l'affichage
            this.renderProducts();
            this.updateResultsCount();
            
            this.showNotification('Produit supprimé avec succès', 'success');
        } catch (error) {
            console.error('Erreur lors de la suppression du produit:', error);
            this.showNotification('Une erreur est survenue lors de la suppression du produit.', 'error');
        }
    }

    /**
     * Exécute l'action de duplication d'un produit
     */
    async duplicateProduct(productId) {
        try {
            const product = this.products.find(p => p.id == productId);
            
            if (!product) {
                throw new Error('Produit non trouvé');
            }
            
            // En production, vous feriez une requête POST à l'API
            // const response = await fetch(`${this.apiUrl}/duplicate/${productId}`, {
            //     method: 'POST',
            //     headers: {
            //         'Authorization': `Bearer ${session.getToken()}`
            //     }
            // });
            
            // if (!response.ok) {
            //     throw new Error(`Erreur HTTP: ${response.status}`);
            // }
            
            // Pour la démo, on simule un temps de traitement
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Simuler l'ajout d'un nouveau produit dupliqué
            const newId = Date.now();
            const duplicatedProduct = {
                ...product,
                id: newId,
                name: `${product.name} (copie)`,
                sku: `${product.sku}-COPY`,
                stock: product.stock,
                active: false
            };
            
            // Ajouter le produit dupliqué à la liste
            this.products.unshift(duplicatedProduct);
            
            // Mettre à jour l'affichage
            this.renderProducts();
            this.updateResultsCount();
            
            this.showNotification('Produit dupliqué avec succès', 'success');
        } catch (error) {
            console.error('Erreur lors de la duplication du produit:', error);
            this.showNotification('Une erreur est survenue lors de la duplication du produit.', 'error');
        }
    }

    /**
     * Exécute l'action groupée sélectionnée
     */
    async executeBulkAction() {
        if (this.selectedProducts.size === 0 || !this.bulkActionSelect.value) return;
        
        const action = this.bulkActionSelect.value;
        const productIds = Array.from(this.selectedProducts);
        
        try {
            // En production, vous feriez une requête à l'API
            // const response = await fetch(`${this.apiUrl}/bulk-action`, {
            //     method: 'POST',
            //     headers: {
            //         'Authorization': `Bearer ${session.getToken()}`,
            //         'Content-Type': 'application/json'
            //     },
            //     body: JSON.stringify({
            //         action: action,
            //         productIds: productIds
            //     })
            // });
            
            // if (!response.ok) {
            //     throw new Error(`Erreur HTTP: ${response.status}`);
            // }
            
            // Pour la démo, on simule un temps de traitement
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Simuler les actions sur les produits
            if (action === 'activate' || action === 'deactivate') {
                this.products = this.products.map(product => {
                    if (productIds.includes(product.id.toString())) {
                        return {
                            ...product,
                            active: action === 'activate'
                        };
                    }
                    return product;
                });
            } else if (action === 'delete') {
                this.products = this.products.filter(product => !productIds.includes(product.id.toString()));
                this.selectedProducts.clear();
            }
            
            // Réinitialiser la sélection
            this.bulkActionSelect.value = '';
            this.selectAllCheckbox.checked = false;
            this.updateSelectedCount();
            
            // Mettre à jour l'affichage
            this.renderProducts();
            this.updateResultsCount();
            
            const actionText = {
                'activate': 'activés',
                'deactivate': 'désactivés',
                'delete': 'supprimés'
            };
            
            this.showNotification(`${productIds.length} produits ont été ${actionText[action]} avec succès`, 'success');
        } catch (error) {
            console.error('Erreur lors de l\'exécution de l\'action groupée:', error);
            this.showNotification('Une erreur est survenue lors de l\'exécution de l\'action groupée.', 'error');
        }
    }

    /**
     * Affiche un modal
     */
    showModal(modal) {
        if (modal) {
            modal.style.display = 'flex';
            document.body.classList.add('modal-open');
        }
    }

    /**
     * Cache un modal
     */
    hideModal(modal) {
        if (modal) {
            modal.style.display = 'none';
            document.body.classList.remove('modal-open');
        }
    }

    /**
     * Affiche une notification
     */
    showNotification(message, type = 'info') {
        // Créer l'élément de notification
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background-color: ${type === 'error' ? 'var(--error-color)' : type === 'success' ? 'var(--secondary-color)' : 'var(--primary-color)'};
            color: white;
            border-radius: var(--border-radius);
            box-shadow: var(--shadow);
            z-index: 9999;
            opacity: 0;
            transform: translateY(-10px);
            transition: opacity 0.3s, transform 0.3s;
        `;
        
        // Ajouter au DOM
        document.body.appendChild(notification);
        
        // Afficher avec animation
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        }, 10);
        
        // Masquer après un délai
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-10px)';
            
            // Supprimer du DOM après la transition
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 5000);
    }

    /**
     * Génère des données fictives pour la démonstration
     */
    getMockProducts() {
        const categories = [
            'Recyclés - Encre', 'Recyclés - Toner',
            'Origines - Encre', 'Origines - Toner',
            'Compatibles - Encre', 'Compatibles - Toner'
        ];
        
        const brands = ['HP', 'Canon', 'Epson', 'Brother', 'Lexmark', 'Samsung', 'Kyocera', 'Xerox', 'Ricoh'];
        
        const products = [
            { id: 1, name: 'Cartouche HP 305XL Noir', sku: 'HP305XL-BK', category: 'Origines - Encre', brand: 'HP', price: 19.95, stock: 12, active: true, image: '/static/images/products/hp-305xl-black.jpg', createdAt: '2023-01-15T10:30:00' },
            { id: 2, name: 'Cartouche Canon PG-545XL Noir', sku: 'CAN-PG545XL', category: 'Origines - Encre', brand: 'Canon', price: 17.95, stock: 3, active: true, image: '/static/images/products/canon-pg545xl.jpg', createdAt: '2023-01-20T14:15:00' },
            { id: 3, name: 'Cartouche HP 305 Couleur', sku: 'HP305-COL', category: 'Origines - Encre', brand: 'HP', price: 16.95, stock: 0, active: false, image: '/static/images/products/hp-305-color.jpg', createdAt: '2023-01-25T09:45:00' },
            { id: 4, name: 'Toner Brother TN-2420', sku: 'BRO-TN2420', category: 'Origines - Toner', brand: 'Brother', price: 59.90, stock: 7, active: true, image: '/static/images/products/brother-tn2420.jpg', createdAt: '2023-02-05T11:20:00' },
            { id: 5, name: 'Toner HP 305A Noir', sku: 'HP305A-BK', category: 'Origines - Toner', brand: 'HP', price: 79.90, stock: 5, active: true, image: '/static/images/products/hp-305a-black.jpg', createdAt: '2023-02-10T16:30:00' },
            { id: 6, name: 'Cartouche Epson 502XL Cyan', sku: 'EPS-502XL-C', category: 'Origines - Encre', brand: 'Epson', price: 15.50, stock: 9, active: true, image: '/static/images/products/epson-502xl-cyan.jpg', createdAt: '2023-02-15T13:10:00' },
            { id: 7, name: 'Cartouche Canon CL-546 Couleur', sku: 'CAN-CL546', category: 'Origines - Encre', brand: 'Canon', price: 21.90, stock: 4, active: true, image: '/static/images/products/canon-cl546.jpg', createdAt: '2023-02-20T10:45:00' },
            { id: 8, name: 'Toner Lexmark B222', sku: 'LEX-B222', category: 'Origines - Toner', brand: 'Lexmark', price: 89.00, stock: 2, active: true, image: '/static/images/products/lexmark-b222.jpg', createdAt: '2023-02-25T15:20:00' }
        ];
        
        return products;
    }
}

// Initialisation du gestionnaire de produits
document.addEventListener('DOMContentLoaded', () => {
    const productManager = new ProductManager();
    productManager.init();
    
    // Exposer l'instance pour le débogage
    window.productManager = productManager;
});

export default ProductManager;