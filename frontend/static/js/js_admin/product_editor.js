// static/js/js_admin/product_editor.js

import { session } from '../session.js';
import { config } from '../config.js';

/**
 * Classe pour la gestion de l'édition et création de produits
 */
class ProductEditor {
    constructor() {
        this.apiUrl = `${config.apiBaseUrl}/api/products`;
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
            specifications: []
        };
        this.imageFiles = [];
    }

    /**
     * Initialise l'éditeur de produits
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
            
            // Ajouter une première ligne de spécification
            this.addSpecificationRow();
            
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
        
        // Gestion des images
        this.imageInput = document.getElementById('image');
        this.imagePreview = document.getElementById('image-preview');
        this.imagePreviewImg = document.getElementById('preview-img');
        this.removeImageBtn = document.getElementById('remove-image-btn');
        this.imagesContainer = document.getElementById('product-images');
        
        console.log('Éléments de gestion d\'images:');
        console.log('- imageInput:', this.imageInput);
        console.log('- imagePreview:', this.imagePreview);
        console.log('- imagePreviewImg:', this.imagePreviewImg);
        console.log('- removeImageBtn:', this.removeImageBtn);
        console.log('- imagesContainer:', this.imagesContainer);
        
        // Gestion des spécifications
        this.specificationsContainer = document.getElementById('specifications-container');
        this.addSpecButton = document.getElementById('add-specification');
        
        // Bouton de sauvegarde
        this.saveButton = document.getElementById('save-product-button');
    }

    /**
     * Initialise les écouteurs d'événements
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
        const logoutLink = document.getElementById('logout-link');
        if (logoutLink) {
            logoutLink.addEventListener('click', (e) => {
                e.preventDefault();
                session.logout();
                window.location.href = './index.';
            });
        }
    }

    /**
     * Charge les données d'un produit existant
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
        } catch (error) {
            console.error('Erreur de chargement du produit:', error);
            this.showNotification(`Erreur de chargement du produit: ${error.message}`, 'error');
        }
    }

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
        if (this.categorySelect) this.categorySelect.value = this.productData.category_id || '';
        if (this.brandSelect) this.brandSelect.value = this.productData.brand_id || '';
        if (this.isActiveCheckbox) {
            this.isActiveCheckbox.checked = this.productData.is_active !== false;
            const statusText = document.getElementById('status-text');
            if (statusText) {
                statusText.textContent = this.isActiveCheckbox.checked ? 'Actif' : 'Inactif';
            }
        }
        
        // Images et spécifications
        if (this.productData.images && this.productData.images.length > 0) {
            this.displayProductImages();
        }
        
        if (this.productData.specifications && this.productData.specifications.length > 0) {
            this.displaySpecifications();
        }
    }

    /**
     * Affiche les images du produit
     */
    displayProductImages() {
        if (!this.imagesContainer || !this.productData.images) return;
        
        this.imagesContainer.innerHTML = '';
        
        for (const image of this.productData.images) {
            const imageElement = document.createElement('div');
            imageElement.className = 'product-image-item';
            imageElement.dataset.id = image.id;
            
            imageElement.innerHTML = `
                <img src="${image.url}" alt="${image.alt || this.productData.name}">
                <div class="image-actions">
                    <label class="primary-checkbox">
                        <input type="radio" name="primary_image" value="${image.id}" ${image.is_primary ? 'checked' : ''}>
                        Image principale
                    </label>
                    <button type="button" class="btn btn-danger btn-remove-image">Supprimer</button>
                </div>
            `;
            
            const removeButton = imageElement.querySelector('.btn-remove-image');
            if (removeButton) {
                removeButton.addEventListener('click', () => this.removeProductImage(image.id));
            }
            
            const primaryCheckbox = imageElement.querySelector('input[name="primary_image"]');
            if (primaryCheckbox) {
                primaryCheckbox.addEventListener('change', () => this.setPrimaryImage(image.id));
            }
            
            this.imagesContainer.appendChild(imageElement);
        }
    }

    /**
     * Affiche les spécifications du produit
     */
    displaySpecifications() {
        if (!this.specificationsContainer || !this.productData.specifications) return;
        
        this.specificationsContainer.innerHTML = '';
        
        for (const spec of this.productData.specifications) {
            this.addSpecificationRow(spec);
        }
    }

    /**
     * Ajoute une ligne de spécification
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
     * Gère la sélection d'images
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
            console.log('imagePreview:', this.imagePreview);
            console.log('imagePreviewImg:', this.imagePreviewImg);
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
     */
    async removeProductImage(imageId) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette image ?')) {
            return;
        }
        
        try {
            const response = await fetch(`${this.apiUrl}/${this.productId}/images/${imageId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${session.getToken()}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
            }
            
            // Mettre à jour les données et l'interface
            this.productData.images = this.productData.images.filter(image => image.id !== imageId);
            
            const imageElement = document.querySelector(`.product-image-item[data-id="${imageId}"]`);
            if (imageElement) {
                imageElement.remove();
            }
            
            this.showNotification('Image supprimée avec succès', 'success');
        } catch (error) {
            console.error('Erreur de suppression de l\'image:', error);
            this.showNotification(`Erreur de suppression: ${error.message}`, 'error');
        }
    }

    /**
     * Définit une image comme image principale
     */
    async setPrimaryImage(imageId) {
        try {
            const response = await fetch(`${this.apiUrl}/${this.productId}/images/${imageId}/primary`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${session.getToken()}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
            }
            
            // Mettre à jour les données
            this.productData.images.forEach(image => {
                image.is_primary = image.id === imageId;
            });
            
            this.showNotification('Image principale définie avec succès', 'success');
        } catch (error) {
            console.error('Erreur de définition de l\'image principale:', error);
            this.showNotification(`Erreur: ${error.message}`, 'error');
        }
    }

    /**
     * Génère un SKU par défaut pour un nouveau produit
     */
    generateDefaultSku() {
        if (!this.skuInput || this.skuInput.value) return;
        
        const date = new Date();
        const timestamp = date.getTime().toString().slice(-6);
        this.skuInput.value = `PROD-${timestamp}`;
    }

    /**
     * Génère un SKU basé sur le nom, la marque et la catégorie
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
     */
    getCategoryCode(categoryId) {
        const categoryMap = {
            '1': 'RIE', // Recyclés - Encre
            '2': 'RIT', // Recyclés - Toner
            '3': 'OIE', // Origines - Encre
            '4': 'OIT', // Origines - Toner
            '5': 'CIE', // Compatibles - Encre
            '6': 'CIT'  // Compatibles - Toner
        };
        
        return categoryMap[categoryId] || 'XXX';
    }
    
    /**
     * Obtient le code produit pour le SKU
     */
    getProductCode(name) {
        return name.split(/\s+/)
            .filter(word => word.length > 1)
            .slice(0, 3)
            .map(word => word.charAt(0).toUpperCase())
            .join('');
    }

    /**
     * Collecte les données du formulaire
     */
    collectFormData() {
        const formData = {
            name: this.nameInput?.value || '',
            sku: this.skuInput?.value || '',
            description: this.descriptionInput?.value || '',
            short_description: this.shortDescriptionInput?.value || '',
            price: parseFloat(this.priceInput?.value || 0),
            stock_quantity: parseInt(this.stockQuantityInput?.value || 0),
            min_stock_level: parseInt(this.minStockLevelInput?.value || 5),
            category_id: parseInt(this.categorySelect?.value || 0),
            brand_id: parseInt(this.brandSelect?.value || 0),
            is_active: this.isActiveCheckbox?.checked !== false,
            specifications: this.collectSpecifications()
        };
        
        return formData;
    }

    /**
     * Collecte les spécifications du formulaire
     */
    collectSpecifications() {
        if (!this.specificationsContainer) return [];
        
        const specifications = [];
        const rows = this.specificationsContainer.querySelectorAll('.specification-row');
        
        for (const row of rows) {
            const nameInput = row.querySelector('.spec-name');
            const valueInput = row.querySelector('.spec-value');
            const unitInput = row.querySelector('.spec-unit');
            
            if (!nameInput || !valueInput) continue;
            
            const name = nameInput.value.trim();
            const value = valueInput.value.trim();
            
            // Ignorer les lignes vides
            if (!name || !value) continue;
            
            specifications.push({
                name,
                value,
                unit: unitInput ? unitInput.value.trim() : ''
            });
        }
        
        return specifications;
    }

    /**
     * Valide les données du formulaire
     */
    validateFormData(formData) {
        const errors = [];
        
        if (!formData.name) errors.push('Le nom du produit est obligatoire');
        if (!formData.sku) errors.push('Le SKU du produit est obligatoire');
        if (!formData.category_id) errors.push('La catégorie est obligatoire');
        if (!formData.brand_id) errors.push('La marque est obligatoire');
        if (formData.price <= 0) errors.push('Le prix doit être supérieur à 0');
        
        return errors;
    }
    
    /**
     * Sauvegarde le produit
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
            
            // Envoi des données au serveur
            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${session.getToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            // Récupérer la réponse texte pour le débogage
            const responseText = await response.text();
            console.log('Réponse brute:', responseText);
            
            // Analyser la réponse JSON
            let result;
            try {
                result = JSON.parse(responseText);
            } catch (e) {
                throw new Error(`Réponse invalide du serveur: ${responseText}`);
            }
            
            // Vérification de la réponse
            if (!response.ok) {
                throw new Error(result.error || `Erreur HTTP ${response.status}: ${response.statusText}`);
            }
            
            // Récupérer l'ID du produit si c'est une création
            if (!this.productId && result.id) {
                this.productId = result.id;
                console.log(`Nouveau produit créé avec l'ID: ${this.productId}`);
            }
            
            // Upload des images si nécessaire
            if (this.imageFiles.length > 0 && this.productId) {
                console.log(`Upload des images pour le produit ${this.productId}`);
                const uploadResult = await this.uploadProductImages();
                if (!uploadResult) {
                    throw new Error("Échec de l'upload des images");
                }
            }
            
            this.showNotification('Produit sauvegardé avec succès', 'success');
            
            // Redirection vers la liste des produits après un délai
            setTimeout(() => {
                window.location.href = '/admin/pages/products/index.html';
            }, 1500);
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
     */
    async uploadProductImages() {
        try {
            console.log(`Tentative d'upload de ${this.imageFiles.length} images`);
            
            if (!this.productId) {
                console.error('ID du produit manquant pour l\'upload d\'images');
                return false;
            }
            
            for (const file of this.imageFiles) {
                console.log(`Upload de l'image: ${file.name}, taille: ${file.size} bytes`);
                
                const formData = new FormData();
                formData.append('image', file);
                formData.append('alt', this.nameInput?.value || 'Image produit');
                
                console.log(`Envoi à ${this.apiUrl}/${this.productId}/images`);
                
                const response = await fetch(`${this.apiUrl}/${this.productId}/images`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session.getToken()}`
                    },
                    body: formData
                });
                
                const responseText = await response.text();
                console.log('Réponse brute:', responseText);
                
                let responseData;
                try {
                    responseData = JSON.parse(responseText);
                } catch (e) {
                    console.warn('Réponse non-JSON:', responseText);
                }
                
                if (!response.ok) {
                    throw new Error(`Erreur HTTP ${response.status}: ${responseData?.error || response.statusText}`);
                }
                
                console.log('Image uploadée avec succès:', responseData);
            }
            
            return true;
        } catch (error) {
            console.error('Erreur d\'upload des images:', error);
            this.showNotification(`Erreur d'upload: ${error.message}`, 'error');
            return false;
        }
    }
    
    /**
     * Affiche une notification
     */
    showNotification(message, type = 'info') {
        // Supprimer les notifications existantes
        const existingNotifications = document.querySelectorAll('.notification');
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
        
        // Ajouter au DOM
        document.body.appendChild(notification);
        
        // Supprimer après 5 secondes (sauf si c'est une notification de chargement)
        if (type !== 'info') {
            setTimeout(() => {
                notification.remove();
            }, 5000);
        }
    }
}

// Initialisation lors du chargement du document
document.addEventListener('DOMContentLoaded', () => {
    const productEditor = new ProductEditor();
    productEditor.init();
    
    // Exposer l'instance pour le débogage
    window.productEditor = productEditor;
});

export default ProductEditor;