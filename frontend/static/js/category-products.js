/**
 * category-products.js
 * Gère le chargement, l'affichage et les interactions des produits pour les pages de catégories
 * Fonctionnalités:
 * - Chargement dynamique des produits selon la catégorie
 * - Affichage moderne des cartes de produits
 * - Filtres par type (encre/toner)
 * - Système de favoris
 * - Ajout au panier direct
 * - Modal de détail de produit
 */

// Exécuter le code lorsque le DOM est entièrement chargé
document.addEventListener('DOMContentLoaded', function () {
    // Déterminer quelle page de catégorie est affichée en analysant l'URL
    const currentPath = window.location.pathname;

    // Configuration par défaut de la page
    let pageConfig = {
        title: 'Nos Produits',
        categoryIds: [],
        description: ''
    };

    // Définir les configurations selon la page
    if (currentPath.includes('products-ecolo.html')) {
        pageConfig = {
            title: 'Cartouches Remanufacturées',
            categoryIds: [1, 2], // IDs pour produits écologiques
            description: 'Écologiques, économiques et compatibles avec toutes les marques.'
        };
    } else if (currentPath.includes('products-compatible.html')) {
        pageConfig = {
            title: 'Cartouches Compatibles',
            categoryIds: [5, 6], // IDs pour produits compatibles
            description: 'Une alternative économique avec des performances équivalentes aux cartouches d\'origine.'
        };
    } else if (currentPath.includes('products-origines.html')) {
        pageConfig = {
            title: 'Cartouches d\'Origine',
            categoryIds: [3, 4], // IDs pour produits d'origine
            description: 'Les cartouches originales des fabricants pour une qualité optimale.'
        };
    }

    // Mettre à jour le titre et la description de la page
    updatePageHeader(pageConfig.title, pageConfig.description);

    // Charger les produits si des catégories sont définies
    if (pageConfig.categoryIds.length > 0) {
        loadProductsByCategories(pageConfig.categoryIds);
    }

    // Initialiser les boutons de filtre
    initializeFilters();

    // Mettre à jour le compteur du panier au chargement
    updateCartCount();
});

/**
 * Met à jour l'en-tête de la page avec le titre et la description
 * @param {string} title - Le titre à afficher
 * @param {string} description - La description à afficher
 */
function updatePageHeader(title, description) {
    const pageTitle = document.querySelector('.page-header h1');
    const pageDescription = document.querySelector('.page-header p');

    if (pageTitle) pageTitle.textContent = title;
    if (pageDescription) pageDescription.textContent = description;
}

/**
 * Charge les produits des catégories spécifiées via l'API
 * @param {Array} categoryIds - Tableau des IDs de catégories à charger
 */
async function loadProductsByCategories(categoryIds) {
    const productsContainer = document.getElementById('products-container');
    if (!productsContainer) {
        console.error("Conteneur de produits non trouvé");
        return;
    }

    // Afficher indicateur de chargement
    productsContainer.innerHTML = `
        <div class="loading-indicator">
            <div class="loader"></div>
            <p>Chargement des produits...</p>
        </div>
    `;

    try {
        let allProducts = [];

        // Charger les produits pour chaque catégorie en parallèle
        const promises = categoryIds.map(categoryId => 
            fetch(`/api/products/?category_id=${categoryId}&per_page=50`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Erreur HTTP: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.items && data.items.length > 0) {
                        console.log(`Chargé ${data.items.length} produits pour la catégorie ${categoryId}`);
                        return data.items;
                    }
                    return [];
                })
                .catch(err => {
                    console.error(`Erreur pour la catégorie ${categoryId}:`, err);
                    return [];
                })
        );

        // Attendre que toutes les requêtes soient terminées
        const results = await Promise.all(promises);
        
        // Fusionner tous les produits dans un seul tableau
        allProducts = results.flat();

        // Afficher les produits
        displayProducts(allProducts, productsContainer);

        // Ajouter les filtres Encre/Toner si des produits sont trouvés
        if (allProducts.length > 0) {
            setupTypeFilters(allProducts);
        }
    } catch (error) {
        console.error("Erreur lors du chargement des produits:", error);
        productsContainer.innerHTML = `
            <div class="no-products-message">
                <p>Une erreur est survenue lors du chargement des produits.</p>
                <button class="btn btn-primary retry-button">Réessayer</button>
            </div>
        `;
        
        // Ajouter un écouteur pour réessayer
        const retryButton = productsContainer.querySelector('.retry-button');
        if (retryButton) {
            retryButton.addEventListener('click', () => loadProductsByCategories(categoryIds));
        }
    }
}

/**
 * Affiche les produits dans le conteneur avec un design moderne
 * @param {Array} products - Tableau des produits à afficher
 * @param {HTMLElement} container - Élément DOM où afficher les produits
 */
function displayProducts(products, container) {
    if (!products || products.length === 0) {
        container.innerHTML = `
            <div class="no-products-message">
                <p>Aucun produit trouvé dans cette catégorie.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = '';

    // Récupérer les favoris actuels depuis le localStorage
    const favorites = JSON.parse(localStorage.getItem('favorites')) || [];

    // Créer une carte moderne pour chaque produit
    products.forEach(product => {
        // Déterminer le type de produit (encre ou toner)
        const isInk = determineProductType(product) === 'ink';
        const badgeClass = isInk ? 'badge-ink' : 'badge-toner';
        const badgeText = isInk ? 'Encre' : 'Toner';

        // Trouver l'image du produit avec fallback
        let imageUrl = '/static/images/products/placeholder.jpg';
        if (product.images && product.images.length > 0 && product.images[0].url) {
            imageUrl = product.images[0].url;
        }

        // Formater le prix
        const price = typeof product.price === 'number' ? product.price.toFixed(2) : '0.00';
        
        // Déterminer la disponibilité
        const stockQuantity = product.stock_quantity || 0;
        const minStockLevel = product.min_stock_level || 5;
        let availabilityHTML = '';
        let availabilityClass = '';
        
        if (stockQuantity > minStockLevel) {
            // Bien en stock
            availabilityHTML = 'En stock';
            availabilityClass = 'available';
        } else if (stockQuantity > 0) {
            // Stock limité
            availabilityHTML = 'Stock limité';
            availabilityClass = 'limited';
        } else {
            // Rupture de stock
            availabilityHTML = 'Rupture de stock';
            availabilityClass = 'unavailable';
        }
        
        // Vérifier si produit est déjà en favoris
        const isFavorite = favorites.includes(product.id);
        const favoriteClass = isFavorite ? 'active' : '';

        // Créer l'élément du produit avec nouveau design
        const productElement = document.createElement('div');
        productElement.className = `product-card ${isInk ? 'type-ink' : 'type-toner'}`;
        productElement.innerHTML = `
            <div class="product-image">
                <img src="${imageUrl}" alt="${product.name || 'Produit'}" 
                     onerror="this.src='/static/images/products/placeholder.jpg'">
                <span class="product-type-badge ${badgeClass}">${badgeText}</span>
                
                <!-- Actions rapides (favoris) -->
                <div class="product-quick-actions">
                    <button class="quick-action-btn favorite ${favoriteClass}" data-product-id="${product.id}" 
                            title="${isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" 
                                  fill="${isFavorite ? '#e74c3c' : 'none'}" />
                        </svg>
                    </button>
                </div>
            </div>
            <div class="product-info">
                <h3 class="product-name">${product.name || 'Produit sans nom'}</h3>
                <p class="product-short-description">${product.short_description || 'Aucune description disponible'}</p>
                
                <div class="product-meta">
                    <div class="product-price">${price} €</div>
                    <div class="product-availability-card ${availabilityClass}">${availabilityHTML}</div>
                </div>
                
                <div class="product-actions">
                    <button class="btn btn-primary btn-cart" data-product-id="${product.id}">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor">
                            <path d="M9 20a1 1 0 100-2 1 1 0 000 2z" fill="white" />
                            <path d="M19 20a1 1 0 100-2 1 1 0 000 2z" fill="white" />
                            <path d="M3 3h2l2 14h11" stroke="white" stroke-width="2" stroke-linecap="round" />
                            <path d="M7 7h14l-1 9H8" stroke="white" stroke-width="2" stroke-linecap="round" />
                        </svg>
                        Ajouter au panier
                    </button>
                    <button class="btn btn-secondary btn-view view-product-btn" data-product-id="${product.id}">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M2 12s3-9 10-9 10 9 10 9-3 9-10 9-10-9-10-9z" />
                        </svg>
                        Voir
                    </button>
                </div>
            </div>
        `;

        container.appendChild(productElement);
    });
    
    // Ajouter les écouteurs d'événements pour les boutons
    initializeProductButtons();
}

/**
 * Initialise tous les boutons et actions pour les produits
 */
function initializeProductButtons() {
    // Écouteurs pour le bouton "Voir le produit"
    document.querySelectorAll('.view-product-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const productId = this.getAttribute('data-product-id');
            openProductModal(productId);
        });
    });
    
    // Écouteurs pour le bouton "Ajouter au panier"
    document.querySelectorAll('.btn-cart').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const productId = this.getAttribute('data-product-id');
            addToCartDirectly(productId, 1); // Ajouter 1 unité par défaut
        });
    });
    
    // Écouteurs pour le bouton "Favoris"
    document.querySelectorAll('.quick-action-btn.favorite').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation(); // Empêche la propagation au parent
            const productId = this.getAttribute('data-product-id');
            toggleFavorite(productId, this);
        });
    });
}

/**
 * Détermine le type de produit (encre ou toner) à partir de ses données
 * @param {Object} product - Objet produit à analyser
 * @returns {string} - 'ink' pour encre ou 'toner' pour toner
 */
function determineProductType(product) {
    // Vérifier d'abord la catégorie
    if (product.category && product.category.name) {
        const categoryName = product.category.name.toLowerCase();
        if (categoryName.includes('encre')) return 'ink';
        if (categoryName.includes('toner')) return 'toner';
    }

    // Vérifier ensuite le nom du produit
    const productName = (product.name || '').toLowerCase();
    if (productName.includes('encre') || productName.includes('ink')) return 'ink';
    if (productName.includes('toner') || productName.includes('laser')) return 'toner';

    // Vérifier les spécifications
    if (product.specifications && Array.isArray(product.specifications)) {
        const specs = product.specifications;
        for (const spec of specs) {
            const specName = (spec.name || '').toLowerCase();
            const specValue = (spec.value || '').toLowerCase();

            if (specName.includes('type') || specName.includes('technologie')) {
                if (specValue.includes('encre') || specValue.includes('ink')) return 'ink';
                if (specValue.includes('toner') || specValue.includes('laser')) return 'toner';
            }
        }
    }

    // Par défaut, considérer comme encre
    return 'ink';
}

/**
 * Configure les filtres par type (Encre/Toner)
 * @param {Array} products - Liste des produits pour déterminer les filtres disponibles
 */
function setupTypeFilters(products) {
    // Vérifier si les deux types sont présents
    const hasInk = products.some(p => determineProductType(p) === 'ink');
    const hasToner = products.some(p => determineProductType(p) === 'toner');

    // Si un seul type est présent, pas besoin de filtres
    if ((!hasInk || !hasToner) && products.length > 0) {
        console.log("Un seul type de produit présent, pas de filtres nécessaires");
        return;
    }

    // Créer ou récupérer le conteneur de filtres
    let filtersContainer = document.querySelector('.category-filters');
    if (!filtersContainer) {
        filtersContainer = document.createElement('div');
        filtersContainer.className = 'category-filters';
        const pageHeader = document.querySelector('.page-header');
        if (pageHeader) {
            pageHeader.insertAdjacentElement('afterend', filtersContainer);
        } else {
            const productsContainer = document.getElementById('products-container');
            if (productsContainer) {
                productsContainer.insertAdjacentElement('beforebegin', filtersContainer);
            } else {
                console.error("Impossible de trouver un endroit pour insérer les filtres");
                return;
            }
        }
    }

    // Définir le contenu HTML des filtres
    filtersContainer.innerHTML = `
        <button class="filter-button active" data-filter="all">Tous les produits</button>
        ${hasInk ? '<button class="filter-button" data-filter="ink">Encre</button>' : ''}
        ${hasToner ? '<button class="filter-button" data-filter="toner">Toner</button>' : ''}
    `;

    // Ajouter les écouteurs d'événements
    const filterButtons = filtersContainer.querySelectorAll('.filter-button');
    filterButtons.forEach(button => {
        button.addEventListener('click', function () {
            // Activer le bouton cliqué
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');

            // Filtrer les produits
            const filterValue = this.getAttribute('data-filter');
            filterProductsByType(filterValue);
        });
    });
}

/**
 * Filtre les produits affichés par type (Encre/Toner)
 * @param {string} filterValue - Valeur du filtre ('all', 'ink' ou 'toner')
 */
function filterProductsByType(filterValue) {
    const productCards = document.querySelectorAll('.product-card');

    productCards.forEach(card => {
        if (filterValue === 'all') {
            card.style.display = 'block';
        } else if (filterValue === 'ink' && card.classList.contains('type-ink')) {
            card.style.display = 'block';
        } else if (filterValue === 'toner' && card.classList.contains('type-toner')) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });

    // Vérifier si des produits sont visibles après le filtrage
    const visibleProducts = Array.from(productCards).filter(card => card.style.display === 'block');
    const productsContainer = document.getElementById('products-container');

    if (visibleProducts.length === 0 && productsContainer) {
        // Aucun produit visible, afficher un message
        const noProductsMessage = document.createElement('div');
        noProductsMessage.className = 'no-products-message';
        noProductsMessage.innerHTML = `<p>Aucun produit de type "${filterValue === 'ink' ? 'Encre' : 'Toner'}" trouvé.</p>`;

        // Supprimer les messages précédents
        const oldMessages = productsContainer.querySelectorAll('.no-products-message');
        oldMessages.forEach(msg => msg.remove());

        productsContainer.appendChild(noProductsMessage);
    } else {
        // Des produits sont visibles, supprimer les éventuels messages
        const oldMessages = document.querySelectorAll('.no-products-message');
        oldMessages.forEach(msg => msg.remove());
    }
}

/**
 * Ouvre la modale et charge les détails du produit
 * @param {string} productId - ID du produit à afficher
 */
function openProductModal(productId) {
    // Afficher la modale
    const modal = document.getElementById('product-modal');
    if (!modal) return;
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden'; // Empêcher le défilement de la page
    
    // Afficher le chargement
    document.getElementById('modal-loading').style.display = 'block';
    document.getElementById('modal-product-content').style.display = 'none';
    document.getElementById('modal-error-message').style.display = 'none';
    
    // Charger les détails du produit
    loadProductDetailsForModal(productId);
    
    // Ajouter un écouteur pour fermer la modale
    const closeBtn = modal.querySelector('.modal-close-btn');
    const overlay = modal.querySelector('.modal-overlay');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeProductModal);
    }
    
    if (overlay) {
        overlay.addEventListener('click', closeProductModal);
    }
    
    // Initialiser les onglets
    initModalTabs();
    
    // Initialiser les contrôles de quantité
    initModalQuantityControls();

    // Ajouter un écouteur pour la touche Echap
    document.addEventListener('keydown', handleModalEscapeKey);
}

/**
 * Gère l'appui sur la touche Échap pour fermer la modale
 * @param {KeyboardEvent} event - Événement clavier
 */
function handleModalEscapeKey(event) {
    if (event.key === 'Escape') {
        closeProductModal();
    }
}

/**
 * Ferme la modale de produit
 */
function closeProductModal() {
    const modal = document.getElementById('product-modal');
    if (!modal) return;
    
    modal.style.display = 'none';
    document.body.style.overflow = ''; // Restaurer le défilement de la page
    
    // Retirer l'écouteur de la touche Echap
    document.removeEventListener('keydown', handleModalEscapeKey);
}

/**
 * Charge les détails du produit pour la modale via l'API
 * @param {string} productId - ID du produit à charger
 */
async function loadProductDetailsForModal(productId) {
    try {
        const response = await fetch(`/api/products/${productId}`);
        
        if (!response.ok) {
            throw new Error(`Erreur ${response.status}: ${response.statusText}`);
        }
        
        const product = await response.json();
        console.log("Détails du produit pour modale:", product);
        
        // Afficher les détails du produit dans la modale
        displayModalProductDetails(product);
        
    } catch (error) {
        console.error("Erreur lors du chargement du produit:", error);
        showModalError("Impossible de charger les détails du produit");
    }
}

/**
 * Affiche les détails du produit dans la modale
 * @param {Object} product - Données du produit à afficher
 */
function displayModalProductDetails(product) {
    // Cacher l'indicateur de chargement
    document.getElementById('modal-loading').style.display = 'none';
    
    // Afficher le contenu du produit
    document.getElementById('modal-product-content').style.display = 'block';
    
    // Mettre à jour les éléments de base
    document.getElementById('modal-product-title').textContent = product.name;
    document.getElementById('modal-product-sku').textContent = product.sku || 'N/A';
    document.getElementById('modal-product-price').textContent = (product.price || 0).toFixed(2);
    document.getElementById('modal-product-short-desc').textContent = product.short_description || 'Aucune description courte disponible';
    
    // Afficher l'image principale
    if (product.images && product.images.length > 0) {
        const mainImage = document.getElementById('modal-product-main-image');
        mainImage.src = product.images[0].url;
        mainImage.alt = product.name;
        
        // Afficher les vignettes si plusieurs images
        if (product.images.length > 1) {
            const thumbnailsContainer = document.getElementById('modal-product-thumbnails');
            thumbnailsContainer.innerHTML = '';
            
            product.images.forEach((image, index) => {
                const thumbnail = document.createElement('div');
                thumbnail.className = `product-thumbnail ${index === 0 ? 'active' : ''}`;
                thumbnail.innerHTML = `<img src="${image.url}" alt="${product.name} - Vue ${index + 1}">`;
                
                thumbnail.addEventListener('click', function() {
                    // Mettre à jour l'image principale
                    mainImage.src = image.url;
                    
                    // Mettre à jour la vignette active
                    document.querySelectorAll('.product-thumbnail').forEach(thumb => thumb.classList.remove('active'));
                    this.classList.add('active');
                });
                
                thumbnailsContainer.appendChild(thumbnail);
            });
        }
    }
    
    // Afficher la disponibilité
    displayModalAvailability(product);
    
    // Afficher les spécifications principales
    displayModalSpecifications(product);
    
    // Afficher la description complète
    document.getElementById('modal-product-description').innerHTML = product.description || 'Aucune description disponible';
    
    // Extraire et afficher les imprimantes compatibles depuis la description
    extractModalPrinterCompatibility(product.description || '');
    
    // Créer le tableau des spécifications complètes
    createModalSpecificationsTable(product);
    
    // Stocker l'ID du produit pour l'ajout au panier
    document.getElementById('modal-add-to-cart').setAttribute('data-product-id', product.id);

    // Vérifier si le produit est déjà dans les favoris
    const favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    const isFavorite = favorites.includes(product.id);
    
    // Ajouter un bouton de favoris dans la modal
    const actionsContainer = document.querySelector('.modal-container .product-actions');
    if (actionsContainer) {
        // Vérifier si le bouton existe déjà
        let favoriteBtn = actionsContainer.querySelector('.modal-favorite-btn');
        if (!favoriteBtn) {
            favoriteBtn = document.createElement('button');
            favoriteBtn.className = `btn modal-favorite-btn ${isFavorite ? 'active' : ''}`;
            favoriteBtn.innerHTML = `
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" 
                          fill="${isFavorite ? '#e74c3c' : 'none'}" />
                </svg>
                ${isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            `;
            
            favoriteBtn.setAttribute('data-product-id', product.id);
            favoriteBtn.addEventListener('click', function() {
                const productId = this.getAttribute('data-product-id');
                toggleFavorite(productId, this);
                
                // Mettre à jour le texte du bouton
                const newIsFavorite = this.classList.contains('active');
                this.innerHTML = `
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" 
                              fill="${newIsFavorite ? '#e74c3c' : 'none'}" />
                    </svg>
                    ${newIsFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                `;
            });
            
            actionsContainer.appendChild(favoriteBtn);
        }
    }
}

/**
 * Initialise les onglets de la modale
 */
function initModalTabs() {
    const tabButtons = document.querySelectorAll('.product-modal .tab-btn');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Désactiver tous les onglets
            tabButtons.forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.product-modal .tab-pane').forEach(pane => pane.classList.remove('active'));
            
            // Activer l'onglet cliqué
            this.classList.add('active');
            const tabId = `modal-tab-${this.dataset.tab}`;
            document.getElementById(tabId).classList.add('active');
        });
    });
}

/**
 * Initialise les contrôles de quantité de la modale
 */
function initModalQuantityControls() {
    const quantityInput = document.getElementById('modal-product-quantity');
    const decreaseBtn = document.getElementById('modal-decrease-quantity');
    const increaseBtn = document.getElementById('modal-increase-quantity');
    const addToCartBtn = document.getElementById('modal-add-to-cart');
    
    if (quantityInput) {
        // Assurer que seuls les nombres sont saisis
        quantityInput.addEventListener('input', function() {
            this.value = this.value.replace(/[^0-9]/g, '');
            if (this.value === '' || parseInt(this.value) < 1) {
                this.value = '1';
            }
        });
    }
    
    if (decreaseBtn) {
        decreaseBtn.addEventListener('click', function() {
            let currentValue = parseInt(quantityInput.value);
            if (currentValue > 1) {
                quantityInput.value = currentValue - 1;
            }
        });
    }
    
    if (increaseBtn) {
        increaseBtn.addEventListener('click', function() {
            let currentValue = parseInt(quantityInput.value);
            quantityInput.value = currentValue + 1;
        });
    }
    
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', function() {
            const productId = this.getAttribute('data-product-id');
            const quantity = parseInt(quantityInput.value);
            addToCartFromModal(productId, quantity);
        });
    }
}

/**
 * Affiche l'état de disponibilité du produit dans la modale
 * @param {Object} product - Produit à analyser
 */
function displayModalAvailability(product) {
    const stockQuantity = product.stock_quantity || 0;
    const minStockLevel = product.min_stock_level || 5;
    const availabilityContainer = document.getElementById('modal-product-availability');
    
    if (!availabilityContainer) return;
    
    let availabilityHTML = '';
    let availabilityClass = '';
    
    if (stockQuantity > minStockLevel) {
        // Bien en stock
        availabilityHTML = `<span class="availability-status in-stock">En stock</span>`;
        availabilityClass = 'available';
    } else if (stockQuantity > 0) {
        // Stock limité
        availabilityHTML = `<span class="availability-status limited-stock">Stock limité</span>`;
        availabilityClass = 'limited';
    } else {
        // Rupture de stock
        availabilityHTML = `<span class="availability-status out-of-stock">Rupture de stock</span>`;
        availabilityClass = 'unavailable';
    }
    
    availabilityContainer.innerHTML = availabilityHTML;
    availabilityContainer.className = `product-availability ${availabilityClass}`;
}

/**
 * Affiche les spécifications principales du produit dans la modale
 * @param {Object} product - Produit à analyser
 */
function displayModalSpecifications(product) {
    const specsContainer = document.getElementById('modal-product-specifications');
    
    if (!specsContainer) return;
    
    specsContainer.innerHTML = '';
    
    // Récupérer les spécifications utiles
    const specs = [];
    
    // Ajouter le type de produit
    const productType = determineProductType(product);
    specs.push({
        name: 'Type',
        value: productType === 'ink' ? 'Cartouche d\'encre' : 'Toner'
    });
    
    // Ajouter la marque
    if (product.brand) {
        specs.push({
            name: 'Marque',
            value: product.brand.name || 'Non spécifiée'
        });
    }
    
    // Ajouter la couleur si disponible
    if (product.specifications && Array.isArray(product.specifications)) {
        const colorSpec = product.specifications.find(spec => 
            (spec.name || '').toLowerCase().includes('couleur') || 
            (spec.name || '').toLowerCase().includes('color')
        );
        
        if (colorSpec) {
            specs.push({
                name: 'Couleur',
                value: colorSpec.value || 'Non spécifiée'
            });
        }
    }
    
    // Ajouter le rendement si disponible
    if (product.specifications && Array.isArray(product.specifications)) {
        const yieldSpec = product.specifications.find(spec => 
            (spec.name || '').toLowerCase().includes('rendement') || 
            (spec.name || '').toLowerCase().includes('yield') ||
            (spec.name || '').toLowerCase().includes('pages')
        );
        
        if (yieldSpec) {
            specs.push({
                name: 'Rendement',
                value: yieldSpec.value || 'Non spécifié'
            });
        }
    }
    
    // Créer les éléments HTML pour chaque spécification
    specs.forEach(spec => {
        const dt = document.createElement('dt');
        dt.textContent = spec.name;
        
        const dd = document.createElement('dd');
        dd.textContent = spec.value;
        
        specsContainer.appendChild(dt);
        specsContainer.appendChild(dd);
    });
}

/**
 * Extrait les informations de compatibilité des imprimantes depuis la description
 * @param {string} description - Description du produit
 */
function extractModalPrinterCompatibility(description) {
    const compatibilityContainer = document.getElementById('modal-printer-compatibility');
    
    if (!compatibilityContainer) return;
    
    // Rechercher les sections de compatibilité dans la description
    const compatibilityRegex = /compatible(?:s)? (?:avec|pour)(.*?)(?:\.|$)/i;
    const match = description.match(compatibilityRegex);
    
    if (match && match[1]) {
        // Extraire la liste des imprimantes
        const printersList = match[1].trim();
        
        // Divisez en modèles individuels (en supposant qu'ils sont séparés par des virgules ou des points-virgules)
        const printers = printersList.split(/[,;]/).map(p => p.trim()).filter(p => p.length > 0);
        
        if (printers.length > 0) {
            // Créer une liste HTML
            compatibilityContainer.innerHTML = '';
            const ul = document.createElement('ul');
            
            printers.forEach(printer => {
                const li = document.createElement('li');
                li.textContent = printer;
                ul.appendChild(li);
            });
            
            compatibilityContainer.appendChild(ul);
            return;
        }
    }
    
    // Si aucune information de compatibilité n'a été trouvée ou traitée
    compatibilityContainer.innerHTML = '<p>Informations de compatibilité non disponibles.</p>';
}

/**
 * Crée le tableau des spécifications complètes du produit
 * @param {Object} product - Produit à analyser
 */
function createModalSpecificationsTable(product) {
    const tableContainer = document.getElementById('modal-full-specifications');
    
    if (!tableContainer) return;
    
    // Préparer les données pour le tableau
    const specs = [];
    
    // Ajouter les informations de base
    specs.push({ name: 'Référence', value: product.sku || 'Non spécifiée' });
    specs.push({ name: 'Type de produit', value: determineProductType(product) === 'ink' ? 'Cartouche d\'encre' : 'Toner' });
    
    if (product.brand) {
        specs.push({ name: 'Marque', value: product.brand.name || 'Non spécifiée' });
    }
    
    // Ajouter toutes les spécifications disponibles
    if (product.specifications && Array.isArray(product.specifications)) {
        product.specifications.forEach(spec => {
            if (spec.name && spec.value) {
                specs.push({
                    name: spec.name,
                    value: spec.value
                });
            }
        });
    }
    
    // Créer le tableau HTML
    tableContainer.innerHTML = '';
    
    if (specs.length === 0) {
        tableContainer.innerHTML = '<p>Aucune spécification technique disponible.</p>';
        return;
    }
    
    const table = document.createElement('table');
    table.className = 'specifications-table';
    
    // Créer l'en-tête du tableau
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    const thName = document.createElement('th');
    thName.textContent = 'Caractéristique';
    
    const thValue = document.createElement('th');
    thValue.textContent = 'Valeur';
    
    headerRow.appendChild(thName);
    headerRow.appendChild(thValue);
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Créer le corps du tableau
    const tbody = document.createElement('tbody');
    
    specs.forEach(spec => {
        const row = document.createElement('tr');
        
        const tdName = document.createElement('td');
        tdName.textContent = spec.name;
        
        const tdValue = document.createElement('td');
        tdValue.textContent = spec.value;
        
        row.appendChild(tdName);
        row.appendChild(tdValue);
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    tableContainer.appendChild(table);
}

/**
 * Ajoute le produit au panier depuis la modale
 * @param {string} productId - ID du produit à ajouter
 * @param {number} quantity - Quantité à ajouter
 */
function addToCartFromModal(productId, quantity) {
    if (!productId) {
        showNotification("Impossible d'ajouter au panier: produit invalide", 'error');
        return;
    }
    
    // Récupérer le panier actuel du localStorage
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    // Récupérer les informations du produit depuis la modale
    const name = document.getElementById('modal-product-title').textContent;
    const price = parseFloat(document.getElementById('modal-product-price').textContent);
    const image = document.getElementById('modal-product-main-image').src;
    
    // Vérifier si le produit est déjà dans le panier
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        // Mettre à jour la quantité
        existingItem.quantity += quantity;
    } else {
        // Ajouter le produit au panier
        cart.push({ 
            id: productId, 
            name, 
            price, 
            quantity, 
            image 
        });
    }
    
    // Enregistrer le panier mis à jour
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // Mettre à jour le compteur du panier
    updateCartCount();
    
    // Afficher une notification
    showNotification('Produit ajouté au panier avec succès', 'success');
    
    // Fermer la modale
    closeProductModal();
}

/**
 * Ajoute directement un produit au panier sans ouvrir la modal
 * @param {string} productId - ID du produit à ajouter
 * @param {number} quantity - Quantité à ajouter
 */
function addToCartDirectly(productId, quantity) {
    if (!productId) {
        showNotification("Impossible d'ajouter au panier: produit invalide", 'error');
        return;
    }
    
    // Trouver les détails du produit dans les cartes affichées
    const productCard = document.querySelector(`.product-card .btn-cart[data-product-id="${productId}"]`).closest('.product-card');
    if (!productCard) {
        showNotification("Impossible de trouver le produit", 'error');
        return;
    }
    
    const name = productCard.querySelector('.product-name').textContent;
    const priceElement = productCard.querySelector('.product-price');
    const priceText = priceElement.textContent.replace('€', '').trim();
    const price = parseFloat(priceText);
    const image = productCard.querySelector('.product-image img').src;
    
    // Récupérer le panier actuel
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    // Vérifier si le produit est déjà dans le panier
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        // Mettre à jour la quantité
        existingItem.quantity += quantity;
    } else {
        // Ajouter le produit au panier
        cart.push({ 
            id: productId, 
            name, 
            price, 
            quantity, 
            image 
        });
    }
    
    // Enregistrer le panier mis à jour
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // Mettre à jour le compteur du panier
    updateCartCount();
    
    // Effet visuel pour indiquer l'ajout au panier
    animateAddToCart(productCard);
    
    // Afficher une notification
    showNotification('Produit ajouté au panier avec succès', 'success');
}

/**
 * Animation pour l'ajout au panier
 * @param {HTMLElement} productCard - Élément DOM de la carte produit
 */
function animateAddToCart(productCard) {
    // Ajouter une classe pour l'animation
    productCard.classList.add('added-to-cart');
    
    // Retirer la classe après l'animation
    setTimeout(() => {
        productCard.classList.remove('added-to-cart');
    }, 700);
}

/**
 * Active/désactive un produit dans les favoris
 * @param {string} productId - ID du produit
 * @param {HTMLElement} buttonElement - Élément DOM du bouton favoris
 */
function toggleFavorite(productId, buttonElement) {
    // Récupérer les favoris actuels
    let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    
    // Vérifier si le produit est déjà en favoris
    const index = favorites.indexOf(productId);
    
    if (index !== -1) {
        // Retirer des favoris
        favorites.splice(index, 1);
        buttonElement.classList.remove('active');
        buttonElement.setAttribute('title', 'Ajouter aux favoris');
        showNotification('Produit retiré des favoris', 'info');
    } else {
        // Ajouter aux favoris
        favorites.push(productId);
        buttonElement.classList.add('active');
        buttonElement.setAttribute('title', 'Retirer des favoris');
        showNotification('Produit ajouté aux favoris', 'success');
    }
    
    // Mettre à jour les favoris
    localStorage.setItem('favorites', JSON.stringify(favorites));
    
    // Si l'utilisateur est connecté, synchroniser avec le serveur
    const isLoggedIn = document.getElementById('user-nav') && 
                      document.getElementById('user-nav').style.display !== 'none';
                      
    if (isLoggedIn) {
        synchronizeFavorites(favorites);
    }
    
    // Mettre à jour tous les boutons de favoris pour ce produit
    updateAllFavoriteButtons(productId, index === -1);
}

/**
 * Met à jour tous les boutons favoris pour un produit spécifique
 * @param {string} productId - ID du produit
 * @param {boolean} isFavorite - État favori (true=favori, false=non-favori)
 */
function updateAllFavoriteButtons(productId, isFavorite) {
    // Mettre à jour les boutons dans les cartes
    document.querySelectorAll(`.quick-action-btn.favorite[data-product-id="${productId}"]`).forEach(button => {
        if (isFavorite) {
            button.classList.add('active');
            button.setAttribute('title', 'Retirer des favoris');
        } else {
            button.classList.remove('active');
            button.setAttribute('title', 'Ajouter aux favoris');
        }
        
        // Mettre à jour le SVG
        const svgPath = button.querySelector('path');
        if (svgPath) {
            svgPath.setAttribute('fill', isFavorite ? '#e74c3c' : 'none');
        }
    });
    
    // Mettre à jour le bouton dans la modal si elle est ouverte
    const modalFavoriteBtn = document.querySelector(`.modal-favorite-btn[data-product-id="${productId}"]`);
    if (modalFavoriteBtn) {
        if (isFavorite) {
            modalFavoriteBtn.classList.add('active');
            modalFavoriteBtn.textContent = 'Retirer des favoris';
        } else {
            modalFavoriteBtn.classList.remove('active');
            modalFavoriteBtn.textContent = 'Ajouter aux favoris';
        }
        
        // Mettre à jour le SVG
        const svgPath = modalFavoriteBtn.querySelector('path');
        if (svgPath) {
            svgPath.setAttribute('fill', isFavorite ? '#e74c3c' : 'none');
        }
    }
}

/**
 * Synchronise les favoris avec le serveur pour les utilisateurs connectés
 * @param {Array} favorites - Liste des IDs de produits favoris
 */
function synchronizeFavorites(favorites) {
    // Cette fonction pourrait envoyer une requête au serveur pour sauvegarder les favoris
    // de l'utilisateur connecté dans la base de données
    console.log('Synchronisation des favoris avec le serveur:', favorites);
    
    // Exemple de code pour envoyer au serveur (à implémenter avec votre API)
    /*
    fetch('/api/user/favorites', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ favorites }),
    })
    .then(response => response.json())
    .then(data => {
        console.log('Favoris synchronisés avec succès');
    })
    .catch(error => {
        console.error('Erreur lors de la synchronisation des favoris:', error);
    });
    */
}

/**
 * Affiche un message d'erreur dans la modale
 * @param {string} message - Message d'erreur à afficher
 */
function showModalError(message) {
    // Cacher l'indicateur de chargement
    document.getElementById('modal-loading').style.display = 'none';
    
    // Afficher le message d'erreur
    const errorContainer = document.getElementById('modal-error-message');
    errorContainer.style.display = 'block';
    
    const errorMessage = errorContainer.querySelector('p');
    if (errorMessage) {
        errorMessage.textContent = message || "Désolé, nous n'avons pas pu charger les informations du produit.";
    }
}

/**
 * Affiche une notification à l'utilisateur
 * @param {string} message - Message à afficher
 * @param {string} type - Type de notification ('success', 'error', 'info')
 */
function showNotification(message, type = 'info') {
    // Vérifier si une notification existe déjà
    let notification = document.querySelector('.notification');
    
    // Créer la notification si elle n'existe pas
    if (!notification) {
        notification = document.createElement('div');
        notification.className = 'notification';
        document.body.appendChild(notification);
    }
    
    // Définir le type et le message
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Afficher la notification
    notification.style.display = 'block';
    
    // Faire disparaître la notification après 3 secondes
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            notification.style.display = 'none';
            notification.style.opacity = '1';
        }, 500);
    }, 3000);
}

/**
 * Met à jour le compteur d'articles dans le panier
 */
function updateCartCount() {
    const cartCountElement = document.getElementById('cart-count');
    if (!cartCountElement) return;
    
    // Récupérer le panier du localStorage
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    // Calculer le nombre total d'articles
    const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
    
    // Mettre à jour le compteur
    cartCountElement.textContent = totalItems.toString();
    
    // Mettre à jour le total si l'élément existe
    const cartTotalElement = document.getElementById('cart-total');
    if (cartTotalElement) {
        const totalPrice = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
        cartTotalElement.textContent = `${totalPrice.toFixed(2)} €`;
    }
}

/**
 * Initialise les filtres de la page
 */
function initializeFilters() {
    // Cette fonction est appelée au chargement de la page
    // Les filtres seront configurés dynamiquement une fois les produits chargés
    console.log("Initialisation des filtres...");
}

// Mettre à jour le compteur du panier au chargement initial de la page
document.addEventListener('DOMContentLoaded', function() {
    updateCartCount();
});