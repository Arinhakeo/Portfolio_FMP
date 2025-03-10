/**
 * product_editor.js - Gestion de l'édition et création de produits
 * 
 * Ce fichier gère toutes les interactions utilisateur pour la page d'édition de produits,
 * y compris le chargement des données, la validation du formulaire, la gestion des images,
 * et l'envoi des données au serveur.
 */

import { session } from '../session.js';

/**
 * Classe pour la gestion de l'édition et création de produits
 * Gère l'interface utilisateur et les interactions avec l'API
 */
class ProductEditor {
    /**
     * Initialise l'éditeur avec les valeurs par défaut
     */
    constructor() {
        // Configuration API
        this.apiUrl = '/api/products';
        
        // Données produit
        this.productId = null;
        this.productData = {
            name: '',
            sku: '',
            description: '',
            short_description: '',
            price: 0,
            stock_quantity: 0,
            min_stock_level: 5,
            category_id: null,
            brand_id: null,
            is_active: true,
            specifications: [],
            compatible_printers: [], // Nouveau: tableau des imprimantes compatibles
            attributes: {}           // Nouveau: attributs additionnels (couleur, capacité, etc.)
        };
        
        // Gestion des images
        this.imageFiles = [];
        
        // Indicateurs d'état
        this.isLoading = false;
    }

    /**
     * INITIALISATION
     * ==============
     */

    /**
     * Initialise l'éditeur de produits
     * Point d'entrée principal de la classe
     */
    async init() {
        try {
            console.log('Initialisation de l\'éditeur de produits');
            
            // Récupérer l'ID du produit depuis l'URL si présent
            const urlParams = new URLSearchParams(window.location.search);
            this.productId = urlParams.get('id');
            
            // Mettre à jour le titre de la page
            this.updatePageTitle();
            
            // Initialiser les éléments et les événements
            this.initUIElements();
            this.initEventListeners();
            
            // Charger les catégories et marques depuis l'API
            await this.loadCategories();
            await this.loadBrands();
            
            // Ajouter une première ligne de spécification
            this.addSpecificationRow();
            
            // Ajouter une première ligne d'imprimante compatible
            this.addCompatiblePrinterRow();
            
            // Charger les données du produit en cas d'édition
            if (this.productId) {
                await this.loadProductData();
            } else {
                this.generateDefaultSku();
            }
            
        } catch (error) {
            this.showNotification('Erreur d\'initialisation: ' + error.message, 'error');
            console.error('Erreur d\'initialisation:', error);
        }
    }

    /**
     * Met à jour le titre de la page selon le mode (création ou édition)
     */
    updatePageTitle() {
        const pageTitle = document.querySelector('.page-title');
        const pageDescription = document.querySelector('.form-description');
        
        if (pageTitle) {
            if (this.productId) {
                pageTitle.textContent = 'Modifier le produit';
                if (pageDescription) {
                    pageDescription.textContent = 'Modifiez les informations du produit.';
                }
            } else {
                pageTitle.textContent = 'Nouveau produit';
                if (pageDescription) {
                    pageDescription.textContent = 'Remplissez les informations pour créer un nouveau produit.';
                }
            }
        }
    }

    /**
     * Initialise les références aux éléments de l'interface
     * Récupère tous les éléments DOM nécessaires
     */
    initUIElements() {
        // Formulaire et champs principaux
        this.form = document.getElementById('product-form');
        this.nameInput = document.getElementById('name');
        this.skuInput = document.getElementById('sku');
        this.descriptionInput = document.getElementById('description');
        this.shortDescriptionInput = document.getElementById('short_description');
        this.priceInput = document.getElementById('price');
        this.stockQuantityInput = document.getElementById('stock_quantity');
        this.minStockLevelInput = document.getElementById('min_stock_level');
        this.categorySelect = document.getElementById('category_id');
        this.brandSelect = document.getElementById('brand_id');
        this.isActiveCheckbox = document.getElementById('is_active');
        
        // Attributs du produit
        this.colorSelect = document.getElementById('color');
        this.capacitySelect = document.getElementById('capacity');
        this.rendementInput = document.getElementById('rendement');
        this.referenceOEMInput = document.getElementById('reference_oem');
        
        // Gestion des images
        this.imageInput = document.getElementById('image');
        this.imagePreview = document.getElementById('image-preview');
        this.imagePreviewImg = document.getElementById('preview-img');
        this.removeImageBtn = document.getElementById('remove-image-btn');
        this.imagesContainer = document.getElementById('product-images');
        
        // Gestion des spécifications
        this.specificationsContainer = document.getElementById('specifications-container');
        this.addSpecButton = document.getElementById('add-specification');
        
        // Gestion des imprimantes compatibles
        this.compatiblePrintersContainer = document.getElementById('compatible-printers-container');
        this.addCompatiblePrinterButton = document.getElementById('add-compatible-printer');
        
        // Bouton de sauvegarde
        this.saveButton = document.getElementById('save-product-button');
    }

    /**
     * Initialise les écouteurs d'événements
     * Configure tous les gestionnaires d'événements pour l'interface
     */
    initEventListeners() {
        // Soumission du formulaire
        if (this.form) {
            this.form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveProduct();
            });
        }
        
        // Gestion des images
        if (this.imageInput) {
            this.imageInput.addEventListener('change', (e) => this.handleImageSelection(e));
        }
        
        if (this.removeImageBtn) {
            this.removeImageBtn.addEventListener('click', () => this.removeImage());
        }
        
        // Gestion des spécifications
        if (this.addSpecButton) {
            this.addSpecButton.addEventListener('click', () => this.addSpecificationRow());
        }
        
        // Gestion des imprimantes compatibles
        if (this.addCompatiblePrinterButton) {
            this.addCompatiblePrinterButton.addEventListener('click', () => this.addCompatiblePrinterRow());
        }
        
        // Génération automatique de SKU
        if (this.nameInput) {
            this.nameInput.addEventListener('blur', () => this.generateSku());
        }
        
        if (this.brandSelect) {
            this.brandSelect.addEventListener('change', () => this.generateSku());
        }
        
        if (this.categorySelect) {
            this.categorySelect.addEventListener('change', () => this.generateSku());
        }
        
        // Mise à jour du texte de statut
        if (this.isActiveCheckbox) {
            const statusText = document.getElementById('status-text');
            this.isActiveCheckbox.addEventListener('change', () => {
                if (statusText) {
                    statusText.textContent = this.isActiveCheckbox.checked ? 'Actif' : 'Inactif';
                }
            });
        }
        
        // Déconnexion
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                session.logout();
                window.location.href = '/pages/login.html';
            });
        }
    }

    /**
     * CHARGEMENT DES DONNÉES
     * =====================
     */
    
    /**
     * Charge les catégories depuis l'API
     * @returns {Promise<boolean>} Succès du chargement
     */
    async loadCategories() {
        try {
            console.log("Chargement des catégories...");
            
            // Envoi de la requête à l'API
            const response = await fetch(`${this.apiUrl}/categories`);
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
            }
            
            const categories = await response.json();
            console.log("Catégories reçues:", categories);
            
            if (!this.categorySelect) {
                throw new Error("Sélecteur de catégories non trouvé");
            }
            
            // S'assurer que le select est visible et correctement stylisé
            this.categorySelect.style.display = 'block';
            this.categorySelect.style.width = '100%';
            this.categorySelect.style.height = 'auto';
            
            // Garder l'option par défaut
            const defaultOption = this.categorySelect.options[0];
            this.categorySelect.innerHTML = '';
            this.categorySelect.appendChild(defaultOption);
            
            // Si pas de catégories, utiliser des valeurs par défaut
            if (!categories || categories.length === 0) {
                this.resetCategoriesSelect();
                return true;
            }
            
            // Grouper les catégories par type
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
                    
                    this.categorySelect.appendChild(optgroup);
                }
            });
            
            // Si aucune catégorie n'a été ajoutée, utiliser des valeurs par défaut
            if (this.categorySelect.options.length <= 1) {
                this.resetCategoriesSelect();
            }
            
            console.log("Catégories chargées avec succès");
            return true;
            
        } catch (error) {
            console.error('Erreur lors du chargement des catégories:', error);
            
            // Fallback aux catégories par défaut
            this.resetCategoriesSelect();
            
            this.showNotification('Erreur lors du chargement des catégories', 'error');
            return false;
        }
    }
    
    /**
     * Réinitialise le sélecteur de catégories avec des valeurs par défaut
     */
    resetCategoriesSelect() {
        if (!this.categorySelect) return;
        
        // S'assurer que le select est visible et correctement stylisé
        this.categorySelect.style.display = 'block';
        this.categorySelect.style.width = '100%';
        this.categorySelect.style.height = 'auto';
        
        this.categorySelect.innerHTML = `
            <option value="">Sélectionnez une catégorie</option>
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
        
        console.log("Catégories réinitialisées avec des valeurs par défaut");
    }
    
    /**
     * Charge les marques depuis l'API
     * @returns {Promise<boolean>} Succès du chargement
     */
    async loadBrands() {
        try {
            console.log("Chargement des marques...");
            
            // Envoi de la requête à l'API
            const response = await fetch(`${this.apiUrl}/brands`);
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
            }
            
            const brands = await response.json();
            console.log("Marques reçues:", brands);
            
            if (!this.brandSelect) {
                throw new Error("Sélecteur de marques non trouvé");
            }
            
            // S'assurer que le select est visible et correctement stylisé
            this.brandSelect.style.display = 'block';
            this.brandSelect.style.width = '100%';
            this.brandSelect.style.height = 'auto';
            
            // Garder l'option par défaut
            const defaultOption = this.brandSelect.options[0];
            this.brandSelect.innerHTML = '';
            this.brandSelect.appendChild(defaultOption);
            
            // Si pas de marques, utiliser des valeurs par défaut
            if (!brands || brands.length === 0) {
                this.resetBrandsSelect();
                return true;
            }
            
            // Ajouter les marques
            brands.forEach(brand => {
                const option = document.createElement('option');
                option.value = brand.id;
                option.textContent = brand.name;
                this.brandSelect.appendChild(option);
            });
            
            // Si aucune marque n'a été ajoutée, utiliser des valeurs par défaut
            if (this.brandSelect.options.length <= 1) {
                this.resetBrandsSelect();
            }
            
            console.log("Marques chargées avec succès");
            return true;
            
        } catch (error) {
            console.error('Erreur lors du chargement des marques:', error);
            
            // Fallback aux marques par défaut
            this.resetBrandsSelect();
            
            this.showNotification('Erreur lors du chargement des marques', 'error');
            return false;
        }
    }
    
    /**
     * Réinitialise le sélecteur de marques avec des valeurs par défaut
     */
    resetBrandsSelect() {
        if (!this.brandSelect) return;
        
        // S'assurer que le select est visible et correctement stylisé
        this.brandSelect.style.display = 'block';
        this.brandSelect.style.width = '100%';
        this.brandSelect.style.height = 'auto';
        
        this.brandSelect.innerHTML = `
            <option value="">Sélectionnez une marque</option>
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
        
        console.log("Marques réinitialisées avec des valeurs par défaut");
    }

    /**
     * Charge les données d'un produit existant
     * @returns {Promise<boolean>} Succès du chargement
     */
    async loadProductData() {
        try {
            console.log(`Chargement des données du produit ${this.productId}`);
            
            const response = await fetch(`${this.apiUrl}/${this.productId}`, {
                headers: {
                    'Authorization': `Bearer ${session.getToken()}`
                }
            });
        
            if (!response.ok) {
                throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
            }
            
            this.productData = await response.json();
            console.log('Données du produit chargées:', this.productData);
            
            // Remplir les champs du formulaire
            this.populateFormFields();
            return true;
        } catch (error) {
            console.error('Erreur de chargement du produit:', error);
            this.showNotification(`Erreur de chargement du produit: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * GESTION DU FORMULAIRE
     * ====================
     */

    /**
     * Remplit les champs du formulaire avec les données du produit
     */
    populateFormFields() {
        // Champs de base
        if (this.nameInput) this.nameInput.value = this.productData.name || '';
        if (this.skuInput) this.skuInput.value = this.productData.sku || '';
        if (this.descriptionInput) this.descriptionInput.value = this.productData.description || '';
        if (this.shortDescriptionInput) this.shortDescriptionInput.value = this.productData.short_description || '';
        if (this.priceInput) this.priceInput.value = this.productData.price || 0;
        if (this.stockQuantityInput) this.stockQuantityInput.value = this.productData.stock_quantity || 0;
        if (this.minStockLevelInput) this.minStockLevelInput.value = this.productData.min_stock_level || 5;
        
        // Attributs du produit
        if (this.colorSelect && this.productData.attributes) 
            this.colorSelect.value = this.productData.attributes.color || '';
        if (this.capacitySelect && this.productData.attributes) 
            this.capacitySelect.value = this.productData.attributes.capacity || '';
        if (this.rendementInput && this.productData.attributes) 
            this.rendementInput.value = this.productData.attributes.rendement || '';
        if (this.referenceOEMInput && this.productData.attributes) 
            this.referenceOEMInput.value = this.productData.attributes.reference_oem || '';
        
        if (this.categorySelect) {
            console.log("Définition de category_id:", this.productData.category_id);
            this.categorySelect.value = this.productData.category_id !== null &&
                                       this.productData.category_id !== undefined ?
                                       String(this.productData.category_id) : '';}
        if (this.brandSelect) {
            console.log("Définition de brand_id:", this.productData.brand_id);
            this.brandSelect.value = this.productData.brand_id !== null &&
                                   this.productData.brand_id !== undefined ?
                                   String(this.productData.brand_id) : '';}
        if (this.isActiveCheckbox) {
            this.isActiveCheckbox.checked = this.productData.is_active !== false;
            const statusText = document.getElementById('status-text');
            if (statusText) {
                statusText.textContent = this.isActiveCheckbox.checked ? 'Actif' : 'Inactif';
            }
        }
        
        // Images
        if (this.productData.images && this.productData.images.length > 0) {
            this.displayProductImages();
        }
        
        // Spécifications
        if (this.productData.specifications && this.productData.specifications.length > 0) {
            // Vider le conteneur de spécifications
            if (this.specificationsContainer) {
                this.specificationsContainer.innerHTML = '';
            }
            this.displaySpecifications();
        }
        
        // Imprimantes compatibles
        if (this.productData.compatible_printers && this.productData.compatible_printers.length > 0) {
            // Vider le conteneur d'imprimantes compatibles
            if (this.compatiblePrintersContainer) {
                this.compatiblePrintersContainer.innerHTML = '';
            }
            this.displayCompatiblePrinters();
        }
    }

    /**
     * Affiche les images du produit
     * Crée les éléments HTML pour chaque image avec les contrôles
     */
    displayProductImages() {
        if (!this.imagesContainer || !this.productData.images) return;
        
        this.imagesContainer.innerHTML = '';
        
        this.productData.images.forEach(image => {
            const imageElement = document.createElement('div');
            imageElement.className = 'product-image-item';
            imageElement.dataset.id = image.id;
            
            // Image placeholder encodée en base64 (petit carré gris)
            const placeholderImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAABmJLR0QA/wD/AP+gvaeTAAAB70lEQVR4nO3doW4UQRSG4XeJQBCMIQiMa4JDkwZHHQ9QLPE8BLyAPIUmQYEhQYEiCMIljZ2QS9gEMXvOzM73Sbbnx+zMtydn9+zZSZIkSZIkSZIkSZIkSZKkkVzr8SaHh4dbwCPgDrAFXO/xvjVcAGfAMfABeH1ycvK99xvdGCDCa+ApsNn7/R7IP8A+8DIi3vV6k673gySP4g1OB7Cn/Oi55m7XIUnuAweEs8UJsB0Rv3r9cNKDcJV9asDMJoTNXm9O4kFjlbj0UuCxQJJVPw84FoTu9DQIJRmEkoS7rMsZ67KWcmyQSgapZJBKBqlkkEoGqWSQSgapZJBKBqlkkEoGqWSQSgapZJBKBqlkkEoGqWSQSgapZJBKBqlkkEoGqWSQSgapZJBKBqlkkEoGqWSQSgapZJBKBqlkkEoGqWSQSgapZJBKBqlkkEoGqTQW5Gzp/RkLQqfmQXqJiM/AdJ3XrGLu7Oz0q5Y28lDWDsfAbfyD9kvAXkQ87HXT3X7YJIvZHe8ZYHb9zG7uvtNz+uGN0y/JJvAIOABOge2a6YeLnM+PRcT5OtZzP8hnALNb84vWdR+QJEmSJEmSJEmSJEmSJElaT/8BRvAPS2qSZhMAAAAASUVORK5CYII=';
            
            // Créer l'élément image avec gestion d'erreur
            const imgElement = document.createElement('img');
            imgElement.alt = image.alt || this.productData.name || 'Image produit';
            imgElement.src = image.url;
            imgElement.onerror = function() {
                // Utiliser une image par défaut en cas d'erreur
                this.src = placeholderImage;
                console.log(`Image non trouvée: ${image.url}, utilisation de l'image par défaut`);
            };
            
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'image-actions';
            
            // Checkbox pour l'image principale
            const labelElement = document.createElement('label');
            labelElement.className = 'primary-checkbox';
            
            const radioElement = document.createElement('input');
            radioElement.type = 'radio';
            radioElement.name = 'primary_image';
            radioElement.value = image.id;
            if (image.is_primary) {
                radioElement.checked = true;
            }
            
            radioElement.addEventListener('change', () => {
                if (radioElement.checked) {
                    this.setPrimaryImage(image.id);
                }
            });
            
            labelElement.appendChild(radioElement);
            labelElement.appendChild(document.createTextNode(' Image principale'));
            
            // Bouton de suppression
            const removeButton = document.createElement('button');
            removeButton.type = 'button';
            removeButton.className = 'btn btn-danger btn-remove-image';
            removeButton.textContent = 'Supprimer';
            
            removeButton.addEventListener('click', () => {
                this.removeProductImage(image.id);
            });
            
            // Assembler les éléments
            actionsDiv.appendChild(labelElement);
            actionsDiv.appendChild(removeButton);
            
            imageElement.appendChild(imgElement);
            imageElement.appendChild(actionsDiv);
            
            this.imagesContainer.appendChild(imageElement);
        });
    }

    /**
     * Affiche les spécifications du produit
     * Crée les lignes de formulaire pour chaque spécification
     */
    displaySpecifications() {
        if (!this.specificationsContainer || !this.productData.specifications) return;
        
        for (const spec of this.productData.specifications) {
            this.addSpecificationRow(spec);
        }
    }

    /**
     * Ajoute une ligne de spécification au formulaire
     * @param {Object} spec - Spécification à ajouter (optionnel)
     */
    addSpecificationRow(spec = null) {
        if (!this.specificationsContainer) return;
        
        const row = document.createElement('div');
        row.className = 'specification-row';
        
        row.innerHTML = `
            <div class="form-group">
                <input type="text" class="form-control spec-name" placeholder="Nom" value="${spec ? spec.name || '' : ''}">
            </div>
            <div class="form-group">
                <input type="text" class="form-control spec-value" placeholder="Valeur" value="${spec ? spec.value || '' : ''}">
            </div>
            <div class="form-group">
                <input type="text" class="form-control spec-unit" placeholder="Unité (optionnel)" value="${spec ? spec.unit || '' : ''}">
            </div>
            <button type="button" class="btn btn-danger btn-remove-spec">Supprimer</button>
        `;
        
        // Ajouter l'écouteur pour supprimer la ligne
        const removeButton = row.querySelector('.btn-remove-spec');
        if (removeButton) {
            removeButton.addEventListener('click', () => row.remove());
        }
        this.specificationsContainer.appendChild(row);
    }
    
    /**
     * Affiche les imprimantes compatibles
     * Crée les lignes de formulaire pour chaque imprimante compatible
     */
    displayCompatiblePrinters() {
        if (!this.compatiblePrintersContainer || !this.productData.compatible_printers) return;
        
        for (const printer of this.productData.compatible_printers) {
            this.addCompatiblePrinterRow(printer);
        }
    }
    
    /**
     * Ajoute une ligne d'imprimante compatible au formulaire
     * @param {Object} printer - Imprimante à ajouter (optionnel)
     */
    
    addCompatiblePrinterRow(printer = null) {
        if (!this.compatiblePrintersContainer) return;
        
        const row = document.createElement('div');
        row.className = 'printer-row';
        
        row.innerHTML = `
            <div class="form-group">
                <input type="text" class="form-control printer-brand" placeholder="Marque" value="${printer ? printer.brand || '' : ''}">
            </div>
            <div class="form-group">
                <input type="text" class="form-control printer-model" placeholder="Modèle" value="${printer ? printer.model || '' : ''}">
            </div>
            <button type="button" class="btn btn-danger btn-remove-printer">Supprimer</button>
        `;
        
        // Ajouter l'écouteur pour supprimer la ligne
        const removeButton = row.querySelector('.btn-remove-printer');
        if (removeButton) {
            removeButton.addEventListener('click', () => row.remove());
        }
        
        this.compatiblePrintersContainer.appendChild(row);
    }

    /**
     * GESTION DES IMAGES
     * =================
     */
    
    /**
     * Gère la sélection d'images depuis l'input file
     * @param {Event} event - Événement de changement de l'input file
     */
    handleImageSelection(event) {
        const files = event.target.files;
        
        if (!files || files.length === 0) {
            console.log('Aucun fichier sélectionné');
            return;
        }
        
        console.log('Fichier sélectionné:', files[0].name);
        
        const file = files[0];
        this.imageFiles = [file];
        
        // Vérification des éléments DOM
        if (!this.imagePreview || !this.imagePreviewImg) {
            console.error('Éléments DOM manquants pour la prévisualisation');
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = (e) => {
            console.log('Image chargée en base64');
            this.imagePreviewImg.src = e.target.result;
            this.imagePreview.style.display = 'block';
        };
        
        reader.onerror = (error) => {
            console.error('Erreur de lecture du fichier:', error);
            this.showNotification('Erreur de lecture du fichier', 'error');
        };
        
        reader.readAsDataURL(file);
    }

    /**
     * Supprime l'image sélectionnée de la prévisualisation
     */
    removeImage() {
        if (this.imagePreview) this.imagePreview.style.display = 'none';
        if (this.imagePreviewImg) this.imagePreviewImg.src = '';
        if (this.imageInput) this.imageInput.value = '';
        this.imageFiles = [];
    }

    /**
     * Supprime une image du produit
     * @param {number} imageId - ID de l'image à supprimer
     * @returns {Promise<boolean>} Succès de la suppression
     */
    async removeProductImage(imageId) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette image ?')) {
            return false;
        }
        
        try {
            const token = session.getToken();
            if (!token) {
                throw new Error('Non authentifié');
            }
            
            const response = await fetch(`${this.apiUrl}/images/${imageId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
            }
            
            // Mettre à jour les données et l'interface
            if (this.productData.images) {
                this.productData.images = this.productData.images.filter(image => image.id !== imageId);
            }
            
            const imageElement = document.querySelector(`.product-image-item[data-id="${imageId}"]`);
            if (imageElement) {
                imageElement.remove();
            }
            
            this.showNotification('Image supprimée avec succès', 'success');
            return true;
        } catch (error) {
            console.error('Erreur de suppression de l\'image:', error);
            this.showNotification(`Erreur de suppression: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * Définit une image comme image principale du produit
     * @param {number} imageId - ID de l'image à définir comme principale
     * @returns {Promise<boolean>} Succès de l'opération
     */
    async setPrimaryImage(imageId) {
        try {
            const token = session.getToken();
            if (!token) {
                throw new Error('Non authentifié');
            }
            
            const response = await fetch(`${this.apiUrl}/${this.productId}/images/${imageId}/primary`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
            }
            
            // Mettre à jour les données
            if (this.productData.images) {
                this.productData.images.forEach(image => {
                    image.is_primary = image.id === imageId;
                });
            }
            
            this.showNotification('Image principale définie', 'success');
            return true;
        } catch (error) {
            console.error('Erreur de définition de l\'image principale:', error);
            this.showNotification(`Erreur: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * GESTION DU SKU
     * =============
     */
    
    /**
     * Génère un SKU par défaut pour un nouveau produit
     * Utilise un timestamp pour garantir l'unicité
     */
    generateDefaultSku() {
        if (!this.skuInput || this.skuInput.value) return;
        
        const date = new Date();
        const timestamp = date.getTime().toString().slice(-6);
        this.skuInput.value = `PROD-${timestamp}`;
    }

    /**
     * Génère un SKU basé sur le nom, la marque et la catégorie
     * Format: [CODE_MARQUE]-[CODE_CATÉGORIE]-[CODE_PRODUIT][RANDOM]
     */
    generateSku() {
        if (!this.skuInput || !this.nameInput || !this.brandSelect || !this.categorySelect) return;
        
        const name = this.nameInput.value.trim();
        const brandId = this.brandSelect.value;
        const categoryId = this.categorySelect.value;
        
        if (!name || !brandId || !categoryId) return;
        
        // Création du SKU formaté
        const brandCode = this.getBrandCode(brandId);
        const categoryCode = this.getCategoryCode(categoryId);
        const productCode = this.getProductCode(name);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        
        this.skuInput.value = `${brandCode}-${categoryCode}-${productCode}${random}`;
    }
    
    /**
     * Obtient le code de marque pour le SKU
     * @param {string} brandId - ID de la marque
     * @returns {string} Code de la marque
     */
    getBrandCode(brandId) {
        const brandMap = {
            '1': 'HP',
            '2': 'CAN',
            '3': 'EPS',
            '4': 'BRO',
            '5': 'LEX',
            '6': 'SAM',
            '7': 'KYO',
            '8': 'XER',
            '9': 'RIC'
        };
        
        return brandMap[brandId] || 'XXX';
    }
    
    /**
     * Obtient le code de catégorie pour le SKU
     * @param {string} categoryId - ID de la catégorie
     * @returns {string} Code de la catégorie
     */
    getCategoryCode(categoryId) {
        const categoryMap = {
            '1': 'REFINK', // Recyclés - Encre
            '2': 'REFTN', // Recyclés - Toner
            '3': 'OEMINK', // Origines - Encre
            '4': 'OEMTN', // Origines - Toner
            '5': 'COMINK', // Compatibles - Encre
            '6': 'COMTN'  // Compatibles - Toner
        };
        
        return categoryMap[categoryId] || 'XXX';
    }
    
    /**
     * Obtient le code produit pour le SKU
     * Utilise les premières lettres des mots significatifs
     * @param {string} name - Nom du produit
     * @returns {string} Code du produit
     */
    getProductCode(name) {
        return name.split(/\s+/)
            .filter(word => word.length > 1)
            .slice(0, 3)
            .map(word => word.charAt(0).toUpperCase())
            .join('');
    }

    /**
     * SAUVEGARDE DU PRODUIT
     * ====================
     */

    /**
     * Collecte les données du formulaire
     * @returns {Object} Données du produit formatées
     */
    collectFormData() {
        const formData = {
            name: this.nameInput?.value?.trim() || '',
            sku: this.skuInput?.value?.trim() || '',
            description: this.descriptionInput?.value?.trim() || '',
            short_description: this.shortDescriptionInput?.value?.trim() || '',
            price: parseFloat(this.priceInput?.value || 0),
            stock_quantity: parseInt(this.stockQuantityInput?.value || 0, 10),
            min_stock_level: parseInt(this.minStockLevelInput?.value || 5, 10),
            // Assurez-vous de convertir explicitement en nombre
            category_id: this.categorySelect && this.categorySelect.value ? parseInt(this.categorySelect.value, 10) : null,
            brand_id: this.brandSelect && this.brandSelect.value ? parseInt(this.brandSelect.value, 10) : null,
            is_active: this.isActiveCheckbox?.checked !== false,
            specifications: this.collectSpecifications(),
            compatible_printers: this.collectCompatiblePrinters(),
            attributes: this.collectAttributes()
        };
        
        console.log("FormData collecté:", formData);
        console.log("Category select value:", this.categorySelect?.value);
        console.log("Brand select value:", this.brandSelect?.value);
        console.log("Type de category_id:", typeof formData.category_id);
        console.log("Valeur de category_id:", formData.category_id);
        console.log("Type de brand_id:", typeof formData.brand_id);
        console.log("Valeur de brand_id:", formData.brand_id);
        
        return formData;
    }

    /**
     * Collecte les spécifications du formulaire
     * @returns {Array} Liste des spécifications
     */
    collectSpecifications() {
        if (!this.specificationsContainer) return [];
        
        const specifications = [];
        const rows = this.specificationsContainer.querySelectorAll('.specification-row');
        
        rows.forEach(row => {
            const nameInput = row.querySelector('.spec-name');
            const valueInput = row.querySelector('.spec-value');
            const unitInput = row.querySelector('.spec-unit');
            
            if (!nameInput || !valueInput) return;
            
            const name = nameInput.value.trim();
            const value = valueInput.value.trim();
            
            // Ignorer les lignes vides
            if (!name || !value) return;
            
            specifications.push({
                name,
                value,
                unit: unitInput ? unitInput.value.trim() : ''
            });
        });
        
        return specifications;
    }
    
    /**
     * Collecte les imprimantes compatibles du formulaire
     * @returns {Array} Liste des imprimantes compatibles
     */
    collectCompatiblePrinters() {
        if (!this.compatiblePrintersContainer) return [];
        
        const printers = [];
        const rows = this.compatiblePrintersContainer.querySelectorAll('.printer-row');
        
        rows.forEach(row => {
            const brandInput = row.querySelector('.printer-brand');
            const modelInput = row.querySelector('.printer-model');
            
            if (!brandInput || !modelInput) return;
            
            const brand = brandInput.value.trim();
            const model = modelInput.value.trim();
            
            // Ignorer les lignes vides
            if (!brand || !model) return;
            
            printers.push({
                brand,
                model
            });
        });
        
        return printers;
    }
    
    /**
     * Collecte les attributs du produit
     * @returns {Object} Attributs du produit
     */
    collectAttributes() {
        const attributes = {};
        
        // Couleur
        if (this.colorSelect && this.colorSelect.value) {
            attributes.color = this.colorSelect.value;
        }
        
        // Capacité
        if (this.capacitySelect && this.capacitySelect.value) {
            attributes.capacity = this.capacitySelect.value;
        }
        
        // Rendement
        if (this.rendementInput && this.rendementInput.value.trim()) {
            attributes.rendement = this.rendementInput.value.trim();
        }
        
        // Référence OEM
        if (this.referenceOEMInput && this.referenceOEMInput.value.trim()) {
            attributes.reference_oem = this.referenceOEMInput.value.trim();
        }
        
        return attributes;
    }

    /**
     * Valide les données du formulaire
     * @param {Object} formData - Données à valider
     * @returns {Array} Liste des erreurs de validation
     */
    validateFormData(formData) {
        const errors = [];
        
        // Validation des champs obligatoires
        if (!formData.name) errors.push('Le nom du produit est obligatoire');
        if (!formData.sku) errors.push('Le SKU du produit est obligatoire');
        if (!formData.category_id) errors.push('La catégorie est obligatoire');
        if (!formData.brand_id) errors.push('La marque est obligatoire');
        
        // Validation des valeurs numériques
        if (isNaN(formData.price) || formData.price <= 0)
            errors.push('Le prix doit être un nombre supérieur à 0');
        
        if (isNaN(formData.stock_quantity) || formData.stock_quantity < 0)
            errors.push('La quantité en stock doit être un nombre positif ou nul');
        
        if (isNaN(formData.min_stock_level) || formData.min_stock_level < 0)
            errors.push('Le niveau minimum de stock doit être un nombre positif ou nul');
        
        return errors;
    }
    
    /**
     * Sauvegarde le produit dans la base de données
     * Gère à la fois la création et la modification
     */
    async saveProduct() {
        try {
            console.log('Tentative de sauvegarde du produit');
            
            // Désactiver le bouton pour éviter les soumissions multiples
            if (this.saveButton) {
                this.saveButton.disabled = true;
                this.saveButton.textContent = "Enregistrement...";
            }
            
            // Collecte et validation des données
            const formData = this.collectFormData();

            console.log('Données collectées:', formData);
            console.log('Type de category_id:', typeof formData.category_id);
            console.log('Valeur de category_id:', formData.category_id);
            console.log('Type de brand_id:', typeof formData.brand_id);
            console.log('Valeur de brand_id:', formData.brand_id);

            const errors = this.validateFormData(formData);
            if (errors.length > 0) {
                this.showNotification(errors.join('<br>'), 'error');
                console.error('Erreurs de validation:', errors);
                
                // Réactiver le bouton
                if (this.saveButton) {
                    this.saveButton.disabled = false;
                    this.saveButton.textContent = "Enregistrer";
                }
                return;
            }
            
            // Afficher l'indicateur de chargement
            this.showNotification('Sauvegarde en cours...', 'info');
            
            // Déterminer s'il s'agit d'un ajout ou d'une modification
            const method = this.productId ? 'PUT' : 'POST';
            const url = this.productId ? `${this.apiUrl}/${this.productId}` : this.apiUrl;
            
            console.log(`Envoi de la requête ${method} vers ${url}`);
            
            // Récupérer le token d'authentification
            const token = session.getToken();
            if (!token) {
                throw new Error('Non authentifié. Veuillez vous connecter.');
            }
            
            // Envoi des données au serveur
            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            // Tenter de récupérer la réponse JSON
            let result;
            try {
                const responseText = await response.text();
                console.log('Réponse brute:', responseText);
                
                if (responseText) {
                    result = JSON.parse(responseText);
                }
            } catch (e) {
                console.error('Erreur de parsing JSON:', e);
            }
            
            // Vérification de la réponse
            if (!response.ok) {
                const errorMessage = result?.error || `Erreur HTTP ${response.status}: ${response.statusText}`;
                throw new Error(errorMessage);
            }
            
            // Récupérer l'ID du produit si c'est une création
            if (!this.productId && result?.product?.id) {
                this.productId = result.product.id;
                console.log(`Nouveau produit créé avec l'ID: ${this.productId}`);
            }
            
            // Upload des images si nécessaire
            if (this.imageFiles.length > 0 && this.productId) {
                console.log(`Upload des images pour le produit ${this.productId}`);
                const uploadResult = await this.uploadProductImages();
                if (!uploadResult) {
                    console.warn("L'upload des images a échoué ou été partiellement réussi");
                }
            }
            
            // Notification de succès
            this.showNotification('Produit sauvegardé avec succès', 'success');
            
            // Redirection vers la liste des produits après un délai
            setTimeout(() => {
                window.location.href = '/admin/pages/products/index.html';
            }, 2000);
        } catch (error) {
            console.error('Erreur de sauvegarde du produit:', error);
            this.showNotification(`Erreur: ${error.message}`, 'error');
        } finally {
            // Toujours réactiver le bouton
            if (this.saveButton) {
                this.saveButton.disabled = false;
                this.saveButton.textContent = "Enregistrer";
            }
        }
    }

    /**
     * Upload les images du produit
     * @returns {Promise<boolean>} Succès de l'upload
     */
    async uploadProductImages() {
        try {
            console.log(`Tentative d'upload de ${this.imageFiles.length} images`);
            
            if (!this.productId) {
                console.error('ID du produit manquant pour l\'upload d\'images');
                return false;
            }
            
            const token = session.getToken();
            if (!token) {
                throw new Error('Non authentifié');
            }
            
            let successCount = 0;
            
            for (const file of this.imageFiles) {
                console.log(`Upload de l'image: ${file.name}, taille: ${file.size} bytes`);
                
                // Vérifier le type et la taille du fichier
                if (!this.isValidImageFile(file)) {
                    console.warn(`Fichier invalide: ${file.name}`);
                    continue;
                }
                
                const formData = new FormData();
                formData.append('image', file);
                formData.append('alt', this.nameInput?.value || 'Image produit');
                formData.append('is_primary', successCount === 0 ? 'true' : 'false'); // Premier fichier en image principale
                
                const uploadUrl = `${this.apiUrl}/${this.productId}/images`;
                console.log(`Envoi à ${uploadUrl}`);
                
                try {
                    const response = await fetch(uploadUrl, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        },
                        body: formData
                    });
                    
                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error(`Erreur d'upload: ${errorText}`);
                        continue;
                    }
                    
                    const result = await response.json();
                    console.log('Image uploadée avec succès:', result);
                    successCount++;
                } catch (uploadError) {
                    console.error(`Erreur lors de l'upload de ${file.name}:`, uploadError);
                }
            }
            
            console.log(`${successCount}/${this.imageFiles.length} images uploadées avec succès`);
            return successCount > 0;
        } catch (error) {
            console.error('Erreur d\'upload des images:', error);
            this.showNotification(`Erreur d'upload: ${error.message}`, 'error');
            return false;
        }
    }
    
    /**
     * Vérifie si un fichier est une image valide
     * @param {File} file - Fichier à vérifier
     * @returns {boolean} Validité du fichier
     */
    isValidImageFile(file) {
        // Types MIME acceptés
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        
        // Taille maximale (5 Mo)
        const maxSize = 5 * 1024 * 1024;
        
        if (!validTypes.includes(file.type)) {
            this.showNotification(`Type de fichier non supporté: ${file.type}`, 'error');
            return false;
        }
        
        if (file.size > maxSize) {
            this.showNotification(`Fichier trop volumineux (max: 5 Mo): ${Math.round(file.size / 1024 / 1024 * 10) / 10} Mo`, 'error');
            return false;
        }
        
        return true;
    }

    /**
     * UTILITAIRES
     * ==========
     */
    
    /**
     * Affiche une notification à l'utilisateur
     * @param {string} message - Message à afficher
     * @param {string} type - Type de notification (success, error, info)
     */
    showNotification(message, type = 'info') {
        // Supprimer les notifications existantes du même type
        const existingNotifications = document.querySelectorAll(`.notification.${type}`);
        existingNotifications.forEach(notification => notification.remove());
        
        // Créer l'élément de notification
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = message;
        
        // Styles de la notification
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.padding = '15px 20px';
        notification.style.borderRadius = '4px';
        notification.style.backgroundColor = type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3';
        notification.style.color = 'white';
        notification.style.zIndex = '9999';
        notification.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        notification.style.maxWidth = '80%';
        notification.style.wordBreak = 'break-word';
        
        // Ajouter au DOM
        document.body.appendChild(notification);
        
        // Supprimer après un délai (sauf si c'est une notification de chargement)
        if (type !== 'info' || message !== 'Sauvegarde en cours...') {
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    notification.style.opacity = '0';
                    notification.style.transform = 'translateX(100%)';
                    notification.style.transition = 'opacity 0.5s, transform 0.5s';
                    
                    setTimeout(() => {
                        if (document.body.contains(notification)) {
                            notification.remove();
                        }
                    }, 500);
                }
            }, 5000);
        }
        
        return notification;
    }
}

// Initialisation lors du chargement du document
document.addEventListener('DOMContentLoaded', () => {
    // Créer et initialiser l'éditeur de produits
    const productEditor = new ProductEditor();
    productEditor.init().catch(error => {
        console.error('Erreur lors de l\'initialisation de l\'éditeur de produits:', error);
    });
});

export default ProductEditor;