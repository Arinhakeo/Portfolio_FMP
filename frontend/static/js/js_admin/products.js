/**
 * products.js - Gestion de la liste des produits
 * 
 * Ce fichier gère l'interface de la page de liste des produits, 
 * incluant le chargement des données, les filtres, la pagination,
 * et les actions sur les produits (suppression, duplication, etc.).
 */

import { session } from '/static/js/session.js';

/**
 * Initialisation au chargement de la page
 * Exécuté automatiquement lorsque la page est entièrement chargée
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log("Page chargée, initialisation...");
    
    // Initialisation des écouteurs d'événements
    initEventListeners();
    
    try {
        // Chargement des données de référence et des produits
        await loadCategories();
        await loadBrands();
        await loadProducts();
    } catch (error) {
        console.error("Erreur lors de l'initialisation:", error);
        showNotification("Erreur lors du chargement initial", "error");
    }
});

/**
 * Initialise tous les écouteurs d'événements de la page
 * Configure les interactions utilisateur pour les filtres, pagination et actions
 */
function initEventListeners() {
    console.log("Initialisation des événements");
    
    // Formulaire de filtres - soumet les filtres pour actualiser les résultats
    const filtersForm = document.getElementById('filters-form');
    if (filtersForm) {
        filtersForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await loadProducts();
        });
        
        // Réinitialisation des filtres - efface tous les filtres
        filtersForm.addEventListener('reset', async (e) => {
            // Attendre que le formulaire soit réinitialisé
            setTimeout(async () => {
                await loadProducts();
            }, 0);
        });
    }
    
    // Tri et pagination - actualise les résultats selon les préférences de tri
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', async () => {
            await loadProducts();
        });
    }
    
    // Nombre de résultats par page - ajuste la pagination
    const perPageSelect = document.getElementById('per-page-select');
    if (perPageSelect) {
        perPageSelect.addEventListener('change', async () => {
            await loadProducts();
        });
    }
    
    // Sélection de tous les produits - case à cocher principale
    const selectAll = document.getElementById('select-all');
    if (selectAll) {
        selectAll.addEventListener('change', (e) => {
            const checkboxes = document.querySelectorAll('.product-checkbox');
            checkboxes.forEach(checkbox => {
                checkbox.checked = e.target.checked;
            });
            updateSelectedCount();
        });
    }
    
    // Action groupée - traite plusieurs produits simultanément
    const applyBulkAction = document.getElementById('apply-bulk-action');
    if (applyBulkAction) {
        applyBulkAction.addEventListener('click', () => {
            const bulkActionSelect = document.getElementById('bulk-action-select');
            if (!bulkActionSelect) return;
            
            const action = bulkActionSelect.value;
            if (!action) return;
            
            const selectedIds = getSelectedProductIds();
            if (selectedIds.length === 0) return;
            
            // Afficher le modal de confirmation
            showBulkActionConfirmation(action, selectedIds);
        });
    }
    
    // Déconnexion - gère la déconnexion depuis le menu admin
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            session.logout();
            window.location.href = '/pages/login.html';
        });
    }
    
    // Fermeture des modals en cliquant à l'extérieur
    window.addEventListener('click', (e) => {
        const deleteModal = document.getElementById('delete-modal');
        if (deleteModal && e.target === deleteModal) {
            deleteModal.style.display = 'none';
        }
        
        const bulkActionModal = document.getElementById('bulk-action-modal');
        if (bulkActionModal && e.target === bulkActionModal) {
            bulkActionModal.style.display = 'none';
        }
    });
}

/**
 * Affiche le modal de confirmation d'action groupée
 * Permet de confirmer une action avant de l'exécuter sur plusieurs produits
 * 
 * @param {string} action - Type d'action (activate, deactivate, delete)
 * @param {Array} selectedIds - IDs des produits sélectionnés
 */
function showBulkActionConfirmation(action, selectedIds) {
    const modal = document.getElementById('bulk-action-modal');
    if (!modal) return;
    
    const message = document.getElementById('bulk-action-message');
    if (!message) return;
    
    let actionText = '';
    switch (action) {
        case 'activate': actionText = 'activer'; break;
        case 'deactivate': actionText = 'désactiver'; break;
        case 'delete': actionText = 'supprimer'; break;
    }
    
    message.textContent = `Êtes-vous sûr de vouloir ${actionText} les ${selectedIds.length} produits sélectionnés ?`;
    modal.style.display = 'flex';
    
    // Confirmation de l'action groupée
    const confirmButton = document.getElementById('confirm-bulk-action');
    if (confirmButton) {
        confirmButton.onclick = async () => {
            await performBulkAction(action, selectedIds);
            modal.style.display = 'none';
        };
    }
    
    // Annulation de l'action
    const cancelButton = document.getElementById('cancel-bulk-action');
    if (cancelButton) {
        cancelButton.onclick = () => {
            modal.style.display = 'none';
        };
    }
    
    // Bouton de fermeture du modal
    const closeButton = modal.querySelector('.modal-close');
    if (closeButton) {
        closeButton.onclick = () => {
            modal.style.display = 'none';
        };
    }
}

/**
 * Charge les catégories depuis l'API
 * Remplit le filtre de catégories avec les données récupérées
 * 
 * @returns {Promise<boolean>} Succès du chargement
 */
async function loadCategories() {
    console.log("Chargement des catégories...");
    try {
        const response = await fetch('/api/products/categories');
        
        if (!response.ok) {
            throw new Error(`Erreur lors du chargement des catégories: ${response.status} ${response.statusText}`);
        }
        
        const categories = await response.json();
        console.log("Catégories reçues:", categories);
        
        const select = document.getElementById('category-filter');
        if (!select) {
            console.error("Sélecteur de catégories non trouvé");
            return false;
        }
        
        // Garder l'option par défaut
        const defaultOption = select.options[0];
        select.innerHTML = '';
        select.appendChild(defaultOption);
        
        // Grouper les catégories
        const groups = {
            'Recyclés': [],
            'Originaux': [],
            'Compatibles': []
        };
        
        categories.forEach(category => {
            if (category.name.includes('Recyclés')) {
                groups['Recyclés'].push(category);
            } else if (category.name.includes('Origines')) {
                groups['Originaux'].push(category);
            } else if (category.name.includes('Compatibles')) {
                groups['Compatibles'].push(category);
            }
        });
        
        // Ajouter les groupes et options
        Object.entries(groups).forEach(([groupName, groupCategories]) => {
            if (groupCategories.length > 0) {
                const optgroup = document.createElement('optgroup');
                optgroup.label = groupName;
                
                groupCategories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = category.name;
                    optgroup.appendChild(option);
                });
                
                select.appendChild(optgroup);
            }
        });
        
        console.log("Catégories chargées avec succès");
        return true;
    } catch (error) {
        console.error('Erreur lors du chargement des catégories:', error);
        
        // Fallback aux catégories par défaut
        resetCategoriesSelect();
        
        showNotification('Erreur lors du chargement des catégories: ' + error.message, 'error');
        return false;
    }
}

/**
 * Réinitialise le select des catégories avec des valeurs par défaut
 * Utilisé en cas d'échec du chargement depuis l'API
 */
function resetCategoriesSelect() {
    console.log("Réinitialisation du sélecteur de catégories");
    const select = document.getElementById('category-filter');
    if (!select) return;
    
    select.innerHTML = `
        <option value="">Toutes les catégories</option>
        <optgroup label="Recyclés">
            <option value="1">Recyclés - Encre</option>
            <option value="2">Recyclés - Toner</option>
        </optgroup>
        <optgroup label="Originaux">
            <option value="3">Origines - Encre</option>
            <option value="4">Origines - Toner</option>
        </optgroup>
        <optgroup label="Compatibles">
            <option value="5">Compatibles - Encre</option>
            <option value="6">Compatibles - Toner</option>
        </optgroup>
    `;
}

/**
 * Charge les marques depuis l'API
 * Remplit le filtre de marques avec les données récupérées
 * 
 * @returns {Promise<boolean>} Succès du chargement
 */
async function loadBrands() {
    console.log("Chargement des marques...");
    try {
        const response = await fetch('/api/products/brands');
        
        if (!response.ok) {
            throw new Error(`Erreur lors du chargement des marques: ${response.status} ${response.statusText}`);
        }
        
        const brands = await response.json();
        console.log("Marques reçues:", brands);
        
        const select = document.getElementById('brand-filter');
        if (!select) {
            console.error("Sélecteur de marques non trouvé");
            return false;
        }
        
        // Garder l'option par défaut
        const defaultOption = select.options[0];
        select.innerHTML = '';
        select.appendChild(defaultOption);
        
        // Ajouter les marques
        brands.forEach(brand => {
            const option = document.createElement('option');
            option.value = brand.id;
            option.textContent = brand.name;
            select.appendChild(option);
        });
        
        console.log("Marques chargées avec succès");
        return true;
    } catch (error) {
        console.error('Erreur lors du chargement des marques:', error);
        
        // Fallback aux marques par défaut
        resetBrandsSelect();
        
        showNotification('Erreur lors du chargement des marques: ' + error.message, 'error');
        return false;
    }
}

/**
 * Réinitialise le select des marques avec des valeurs par défaut
 * Utilisé en cas d'échec du chargement depuis l'API
 */
function resetBrandsSelect() {
    console.log("Réinitialisation du sélecteur de marques");
    const select = document.getElementById('brand-filter');
    if (!select) return;
    
    select.innerHTML = `
        <option value="">Toutes les marques</option>
        <option value="1">HP</option>
        <option value="2">Canon</option>
        <option value="3">Epson</option>
        <option value="4">Brother</option>
        <option value="5">Lexmark</option>
        <option value="6">Samsung</option>
        <option value="7">Kyocera</option>
        <option value="8">Xerox</option>
        <option value="9">Ricoh</option>
    `;
}

/**
 * Récupère en toute sécurité une valeur imbriquée dans un objet
 * Évite les erreurs avec les propriétés qui pourraient être nulles
 *
 * @param {Object} obj - Objet à interroger
 * @param {string} path - Chemin de propriété (e.g. 'category.name')
 * @returns {*} Valeur trouvée ou undefined
 */
function getNestedPropertyValue(obj, path) {
    if (!obj || !path) return undefined;
    
    const properties = path.split('.');
    let value = obj;
    
    for (const prop of properties) {
        if (value === null || value === undefined) return undefined;
        value = value[prop];
    }
    
    return value;
}

/**
 * Charge les produits depuis l'API
 * @param {number} page - Numéro de page à charger
 * @returns {Promise<void>}
 */
async function loadProducts(page = 1) {
    console.log("Chargement des produits...");
    try {
        const tableBody = document.getElementById('products-table-body');
        if (!tableBody) {
            console.error("Conteneur des produits non trouvé");
            return;
        }
        
        // Afficher l'indicateur de chargement
        tableBody.innerHTML = `
            <tr id="loading-row">
                <td colspan="10" class="loading-cell">
                    <div class="loading-spinner"></div>
                    <p>Chargement des produits...</p>
                </td>
            </tr>
        `;
        
        // Construire l'URL avec les filtres
        const searchInput = document.getElementById('search-input')?.value || '';
        const categoryFilter = document.getElementById('category-filter')?.value || '';
        const brandFilter = document.getElementById('brand-filter')?.value || '';
        const stockFilter = document.getElementById('stock-filter')?.value || '';
        const minPrice = document.getElementById('min-price')?.value || '';
        const maxPrice = document.getElementById('max-price')?.value || '';
        const activeOnly = document.getElementById('active-only')?.checked || false;
        const sortBy = document.getElementById('sort-select')?.value || 'name-asc';
        const perPage = document.getElementById('per-page-select')?.value || '25';
        
        let url = `/api/products/?page=${page}&per_page=${perPage}`;
        if (searchInput) url += `&search=${encodeURIComponent(searchInput)}`;
        if (categoryFilter) url += `&category_id=${categoryFilter}`;
        if (brandFilter) url += `&brand_id=${brandFilter}`;
        if (stockFilter) url += `&stock=${stockFilter}`;
        if (minPrice) url += `&min_price=${minPrice}`;
        if (maxPrice) url += `&max_price=${maxPrice}`;
        if (activeOnly) url += `&active=1`;
        if (sortBy) url += `&sort=${sortBy}`;
        
        console.log("URL de requête produits:", url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Erreur lors du chargement des produits: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log("Données produits reçues:", data);
        
        // Pour le débogage, examiner la structure du premier produit si disponible
        if (data.items && data.items.length > 0) {
            console.log("Structure du premier produit:", JSON.stringify(data.items[0], null, 2));
            console.log("Category du premier produit:", data.items[0].category);
            console.log("Brand du premier produit:", data.items[0].brand);
        }
        
        // Adapter au format de l'API
        const products = data.items || [];
        const total = data.total || 0;
        const currentPage = data.page || 1;
        const lastPage = data.pages || 1;
        
        // Mettre à jour le compteur de résultats
        const resultsCount = document.getElementById('results-count');
        if (resultsCount) {
            resultsCount.textContent = total;
        }
        
        // Afficher les produits
        if (products.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="10" class="no-results">
                        <p>Aucun produit trouvé</p>
                    </td>
                </tr>
            `;
        } else {
            tableBody.innerHTML = '';
            
            products.forEach(product => {
                // Sécurité pour éviter les erreurs
                const stockQuantity = product.stock_quantity || 0;
                const minStockLevel = product.min_stock_level || 5;
                
                const stockClass = stockQuantity > minStockLevel ? 'in-stock' :
                               stockQuantity > 0 ? 'low-stock' :
                               'out-of-stock';
                               
                const statusClass = product.is_active ? 'active' : 'inactive';
                const statusText = product.is_active ? 'Actif' : 'Inactif';
                
                // Version améliorée pour extraire les noms de catégorie et marque
                const categoryName = getNestedPropertyValue(product, 'category.name') ||
                                  getNestedPropertyValue(product, 'category_name') ||
                                  'Non catégorisé';
                
                const brandName = getNestedPropertyValue(product, 'brand.name') ||
                               getNestedPropertyValue(product, 'brand_name') ||
                               'Sans marque';
                
                // Image placeholder
                const placeholderPath = '/static/images/products/placeholder.jpg';
                let imageUrl;

                if (product.images && product.images.length > 0) {
                    // Utiliser la première image du produit
                    imageUrl = product.images[0].url;
                } else if (product.image_url) {
                    // Utiliser l'URL de l'image si disponible
                    imageUrl = product.image_url;
                } else {
                    // Utiliser le placeholder uniquement si aucune image n'est disponible
                    imageUrl = placeholderPath;
                }

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>
                        <label class="checkbox-container">
                            <input type="checkbox" class="product-checkbox" value="${product.id}">
                            <span class="checkmark"></span>
                        </label>
                    </td>
                    <td class="image-cell">
                        <div class="product-thumbnail">
                            <img src="${imageUrl}" alt="${product.name || 'Produit'}" onerror="this.src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAABmJLR0QA/wD/AP+gvaeTAAAB70lEQVR4nO3doW4UQRSG4XeJQBCMIQiMa4JDkwZHHQ9QLPE8BLyAPIUmQYEhQYEiCMIljZ2QS9gEMXvOzM73Sbbnx+zMtydn9+zZSZIkSZIkSZIkSZIkSZKkkVzr8SaHh4dbwCPgDrAFXO/xvjVcAGfAMfABeH1ycvK99xvdGCDCa+ApsNn7/R7IP8A+8DIi3vV6k673gySP4g1OB7Cn/Oi55m7XIUnuAweEs8UJsB0Rv3r9cNKDcJV9asDMJoTNXm9O4kFjlbj0UuCxQJJVPw84FoTu9DQIJRmEkoS7rMsZ67KWcmyQSgapZJBKBqlkkEoGqWSQSgapZJBKBqlkkEoGqWSQSgapZJBKBqlkkEoGqWSQSgapZJBKBqlkkEoGqWSQSgapZJBKBqlkkEoGqWSQSgapZJBKBqlkkEoGqWSQSgapZJBKBqlkkEoGqTQW5Gzp/RkLQqfmQXqJiM/AdJ3XrGLu7Oz0q5Y28lDWDsfAbfyD9kvAXkQ87HXT3X7YJIvZHe8ZYHb9zG7uvtNz+uGN0y/JJvAIOABOge2a6YeLnM+PRcT5OtZzP8hnALNb84vWdR+QJEmSJEmSJEmSJEmSJElaT/8BRvAPS2qSZhMAAAAASUVORK5CYII='">
                        </div>
                    </td>
                    <td class="name-cell">
                        <div class="product-name">${product.name || 'Sans nom'}</div>
                    </td>
                    <td>${product.sku || 'N/A'}</td>
                    <td>${categoryName}</td>
                    <td>${brandName}</td>
                    <td>${typeof product.price === 'number' ? product.price.toFixed(2) : '0.00'} €</td>
                    <td class="stock-cell">
                        <span class="stock-badge ${stockClass}">${stockQuantity}</span>
                    </td>
                    <td>
                        <span class="status-badge ${statusClass}">${statusText}</span>
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
                
                tableBody.appendChild(row);
            });
            
            // Ajouter les écouteurs pour les checkboxes
            document.querySelectorAll('.product-checkbox').forEach(checkbox => {
                checkbox.addEventListener('change', updateSelectedCount);
            });
            
            // Ajouter les écouteurs pour les actions
            document.querySelectorAll('.delete-product').forEach(button => {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    showDeleteConfirmation(button.dataset.id);
                });
            });
            
            document.querySelectorAll('.duplicate-product').forEach(button => {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    duplicateProduct(button.dataset.id);
                });
            });
        }
        
        // Générer la pagination
        generatePagination(currentPage, lastPage);
        
        console.log("Produits chargés avec succès");
    } catch (error) {
        console.error('Erreur lors du chargement des produits:', error);
        
        const tableBody = document.getElementById('products-table-body');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="10" class="error">
                        <p>Erreur lors du chargement des produits: ${error.message}</p>
                    </td>
                </tr>
            `;
        }
        
        showNotification('Erreur lors du chargement des produits: ' + error.message, 'error');
    }
}

/**
 * Génère la pagination
 * @param {number} currentPage - Page actuelle
 * @param {number} lastPage - Dernière page
 */
function generatePagination(currentPage, lastPage) {
    const container = document.getElementById('pagination-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Si aucune page, ne pas afficher de pagination
    if (lastPage <= 1) return;
    
    // Bouton précédent
    const prevButton = document.createElement('button');
    prevButton.className = 'btn-pagination';
    prevButton.disabled = currentPage === 1;
    prevButton.innerHTML = '<span class="icon-chevron-left"></span>';
    prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            loadProducts(currentPage - 1);
        }
    });
    container.appendChild(prevButton);
    
    // Première page
    if (currentPage > 3) {
        const firstButton = document.createElement('button');
        firstButton.className = 'btn-pagination';
        firstButton.textContent = '1';
        firstButton.addEventListener('click', () => loadProducts(1));
        container.appendChild(firstButton);
        
        if (currentPage > 4) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'pagination-ellipsis';
            ellipsis.textContent = '...';
            container.appendChild(ellipsis);
        }
    }
    
    // Pages autour de la page courante
    for (let i = Math.max(1, currentPage - 2); i <= Math.min(lastPage, currentPage + 2); i++) {
        const button = document.createElement('button');
        button.className = 'btn-pagination';
        if (i === currentPage) button.classList.add('active');
        button.textContent = i;
        button.addEventListener('click', () => {
            if (i !== currentPage) {
                loadProducts(i);
            }
        });
        container.appendChild(button);
    }
    
    // Dernière page
    if (currentPage < lastPage - 2) {
        if (currentPage < lastPage - 3) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'pagination-ellipsis';
            ellipsis.textContent = '...';
            container.appendChild(ellipsis);
        }
        
        const lastButton = document.createElement('button');
        lastButton.className = 'btn-pagination';
        lastButton.textContent = lastPage;
        lastButton.addEventListener('click', () => loadProducts(lastPage));
        container.appendChild(lastButton);
    }
    
    // Bouton suivant
    const nextButton = document.createElement('button');
    nextButton.className = 'btn-pagination';
    nextButton.disabled = currentPage === lastPage;
    nextButton.innerHTML = '<span class="icon-chevron-right"></span>';
    nextButton.addEventListener('click', () => {
        if (currentPage < lastPage) {
            loadProducts(currentPage + 1);
        }
    });
    container.appendChild(nextButton);
}

/**
 * Mettre à jour le compteur de produits sélectionnés
 */
function updateSelectedCount() {
    const checkboxes = document.querySelectorAll('.product-checkbox:checked');
    const count = checkboxes ? checkboxes.length : 0;
    
    const selectedCount = document.getElementById('selected-count');
    if (selectedCount) {
        selectedCount.textContent = count;
    }
    
    const applyBulkAction = document.getElementById('apply-bulk-action');
    if (applyBulkAction) {
        applyBulkAction.disabled = count === 0;
    }
}

/**
 * Obtenir les IDs des produits sélectionnés
 * @returns {Array<string>} Liste des IDs
 */
function getSelectedProductIds() {
    const checkboxes = document.querySelectorAll('.product-checkbox:checked');
    return Array.from(checkboxes).map(checkbox => checkbox.value);
}

/**
 * Affiche le modal de confirmation de suppression
 * @param {string} productId - ID du produit à supprimer
 */
function showDeleteConfirmation(productId) {
    const modal = document.getElementById('delete-modal');
    if (!modal) return;
    
    modal.style.display = 'flex';
    
    const confirmButton = document.getElementById('confirm-delete');
    if (confirmButton) {
        confirmButton.onclick = async () => {
            await deleteProduct(productId);
            modal.style.display = 'none';
        };
    }
    
    const cancelButton = document.getElementById('cancel-delete');
    if (cancelButton) {
        cancelButton.onclick = () => {
            modal.style.display = 'none';
        };
    }
    
    const closeButton = modal.querySelector('.modal-close');
    if (closeButton) {
        closeButton.onclick = () => {
            modal.style.display = 'none';
        };
    }
}

/**
* Supprime un produit
* @param {string} productId - ID du produit à supprimer
* @returns {Promise<boolean>} Succès de l'opération
*/
async function deleteProduct(productId) {
    console.log("Suppression du produit:", productId);
    try {
        const token = session.getToken();
        
        if (!token) {
            throw new Error("Non authentifié");
        }
        
        const response = await fetch(`/api/products/${productId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`Erreur lors de la suppression: ${response.status} ${response.statusText}`);
        }
        
        console.log("Produit supprimé avec succès");
        showNotification('Produit supprimé avec succès', 'success');
        await loadProducts();
        return true;
    } catch (error) {
        console.error('Erreur lors de la suppression du produit:', error);
        showNotification('Erreur lors de la suppression: ' + error.message, 'error');
        return false;
    }
 }
 
 /**
 * Duplique un produit
 * @param {string} productId - ID du produit à dupliquer
 * @returns {Promise<boolean>} Succès de l'opération
 */
 async function duplicateProduct(productId) {
    console.log("Duplication du produit:", productId);
    try {
        const token = session.getToken();
        
        if (!token) {
            throw new Error("Non authentifié");
        }
        
        const response = await fetch(`/api/products/${productId}/duplicate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`Erreur lors de la duplication: ${response.status} ${response.statusText}`);
        }
        
        console.log("Produit dupliqué avec succès");
        showNotification('Produit dupliqué avec succès', 'success');
        await loadProducts();
        return true;
    } catch (error) {
        console.error('Erreur lors de la duplication du produit:', error);
        showNotification('Erreur lors de la duplication: ' + error.message, 'error');
        return false;
    }
 }
 
 /**
 * Effectue une action groupée sur plusieurs produits
 * @param {string} action - Type d'action (activate, deactivate, delete)
 * @param {Array<string>} productIds - Liste des IDs de produits
 * @returns {Promise<boolean>} Succès de l'opération
 */
 async function performBulkAction(action, productIds) {
    console.log(`Action groupée ${action} sur les produits:`, productIds);
    try {
        const token = session.getToken();
        
        if (!token) {
            throw new Error("Non authentifié");
        }
        
        const endpoint = `/api/products/bulk-${action}`;
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ productIds })
        });
        
        if (!response.ok) {
            throw new Error(`Erreur lors de l'action groupée: ${response.status} ${response.statusText}`);
        }
        
        let message = '';
        switch (action) {
            case 'activate': message = 'Produits activés avec succès'; break;
            case 'deactivate': message = 'Produits désactivés avec succès'; break;
            case 'delete': message = 'Produits supprimés avec succès'; break;
        }
        
        console.log(message);
        showNotification(message, 'success');
        await loadProducts();
        
        // Décocher la case "Tout sélectionner"
        const selectAll = document.getElementById('select-all');
        if (selectAll) {
            selectAll.checked = false;
        }
        
        updateSelectedCount();
        return true;
    } catch (error) {
        console.error('Erreur lors de l\'action groupée:', error);
        showNotification(`Erreur lors de l'action groupée: ${error.message}`, 'error');
        return false;
    }
 }
 
 /**
 * Affiche une notification à l'utilisateur
 * @param {string} message - Message à afficher
 * @param {string} type - Type de notification (success, error, info)
 */
 function showNotification(message, type = 'info') {
    console.log(`Notification (${type}): ${message}`);
    
    // Créer une nouvelle notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Supprimer les notifications existantes
    document.querySelectorAll('.notification').forEach(notif => {
        notif.remove();
    });
    
    // Ajouter la notification au document
    document.body.appendChild(notification);
    
    // Supprimer la notification après 3 secondes
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        notification.style.transition = 'opacity 0.5s, transform 0.5s';
        
        setTimeout(() => {
            if (document.body.contains(notification)) {
                notification.remove();
            }
        }, 500);
    }, 3000);
 }