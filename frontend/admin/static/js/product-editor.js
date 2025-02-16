// frontend/admin/static/js/product-editor.js

import { session } from '../../../static/js/session.js';
import { notifications } from '../../../static/js/notifications.js';

class ProductEditor {
    constructor() {
        this.productId = null;
        this.images = [];
        this.specifications = [];
        this.isNewProduct = true;
        
        this.initialize();
    }

    async initialize() {
        // Vérification si on est en mode édition
        const urlParams = new URLSearchParams(window.location.search);
        this.productId = urlParams.get('id');
        this.isNewProduct = !this.productId;

        // Mise à jour du titre
        document.getElementById('page-title').textContent = 
            this.isNewProduct ? 'Nouveau Produit' : 'Modifier Produit';

        // Chargement des données nécessaires
        await Promise.all([
            this.loadCategories(),
            this.loadBrands()
        ]);

        // Si en mode édition, charger le produit
        if (!this.isNewProduct) {
            await this.loadProduct();
        }

        // Initialisation des écouteurs d'événements
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Gestion du formulaire
        const form = document.getElementById('product-form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveProduct();
        });

        // Validation du SKU
        const skuInput = document.getElementById('sku');
        skuInput.addEventListener('blur', () => this.validateSku(skuInput.value));

        // Validation du prix
        const priceInput = document.getElementById('price');
        priceInput.addEventListener('input', () => {
            priceInput.value = parseFloat(priceInput.value).toFixed(2);
        });
    }

    async loadCategories() {
        try {
            const response = await fetch('/api/products/categories');
            const categories = await response.json();
            
            const select = document.getElementById('category_id');
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
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
            
            const select = document.getElementById('brand_id');
            brands.forEach(brand => {
                const option = document.createElement('option');
                option.value = brand.id;
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

    async loadProduct() {
        try {
            const response = await fetch(`/api/products/${this.productId}`);
            if (!response.ok) throw new Error('Produit non trouvé');
            
            const product = await response.json();
            
            // Remplissage du formulaire
            this.fillForm(product);
            
            // Chargement des images
            this.loadImages(product.images);
            
            // Chargement des spécifications
            this.loadSpecifications(product.specifications);
            
        } catch (error) {
            console.error('Erreur chargement produit:', error);
            notifications.create({
                type: 'error',
                title: 'Erreur',
                message: 'Impossible de charger le produit'
            });
        }
    }

    fillForm(product) {
        // Remplissage des champs simples
        const fields = [
            'sku', 'name', 'price', 'stock_quantity', 'min_stock_level',
            'short_description', 'description'
        ];
        
        fields.forEach(field => {
            const input = document.getElementById(field);
            if (input) input.value = product[field] || '';
        });

        // Sélection des listes déroulantes
        document.getElementById('category_id').value = product.category_id;
        document.getElementById('brand_id').value = product.brand_id;

        // Case à cocher
        document.getElementById('is_active').checked = product.is_active;
    }

    loadImages(images) {
        this.images = images;
        this.renderImages();
    }

    loadSpecifications(specifications) {
        this.specifications = specifications;
        this.renderSpecifications();
    }

    renderImages() {
        const container = document.getElementById('product-images');
        container.innerHTML = this.images.map((image, index) => `
            <div class="image-item" data-index="${index}">
                <img src="${image.url}" alt="Image produit">
                <div class="image-actions">
                    ${image.is_primary ? `
                        <span class="primary-badge">Principal</span>
                    ` : `
                        <button 
                            type="button" 
                            onclick="productEditor.setPrimaryImage(${index})"
                            title="Définir comme image principale"
                        >
                            <i class="icon star-icon"></i>
                        </button>
                    `}
                    <button 
                        type="button" 
                        onclick="productEditor.removeImage(${index})"
                        title="Supprimer l'image"
                    >
                        <i class="icon delete-icon"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    renderSpecifications() {
        const container = document.getElementById('specifications-list');
        container.innerHTML = this.specifications.map((spec, index) => {
            const template = document.getElementById('specification-template');
            const clone = template.content.cloneNode(true);
            
            clone.querySelector('.spec-name').value = spec.name;
            clone.querySelector('.spec-value').value = spec.value;
            clone.querySelector('.spec-unit').value = spec.unit || '';
            clone.querySelector('.specification-item').dataset.index = index;
            
            return clone.children[0].outerHTML;
        }).join('');
    }

    async validateSku(sku) {
        if (!sku) return false;

        try {
            const response = await fetch(`/api/products/validate-sku/${sku}`);
            const data = await response.json();
            
            if (!data.valid) {
                notifications.create({
                    type: 'warning',
                    title: 'SKU invalide',
                    message: 'Cette référence existe déjà'
                });
                return false;
            }
            
            return true;
            
        } catch (error) {
            console.error('Erreur validation SKU:', error);
            return false;
        }
    }

    handleImageDrop(event) {
        event.preventDefault();
        
        const files = event.dataTransfer.files;
        this.uploadImages(files);
        
        event.target.classList.remove('dragover');
    }

    handleDragOver(event) {
        event.preventDefault();
        event.target.classList.add('dragover');
    }

    handleDragLeave(event) {
        event.preventDefault();
        event.target.classList.remove('dragover');
    }

    handleImageSelect(event) {
        const files = event.target.files;
        this.uploadImages(files);
    }

    async uploadImages(files) {
        for (let file of files) {
            if (!file.type.startsWith('image/')) {
                notifications.create({
                    type: 'error',
                    title: 'Type de fichier invalide',
                    message: 'Seules les images sont acceptées'
                });
                continue;
            }

            try {
                const formData = new FormData();
                formData.append('image', file);

                const response = await fetch(`/api/products/${this.productId}/images`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session.getToken()}`
                    },
                    body: formData
                });

                if (!response.ok) throw new Error('Erreur upload image');

                const data = await response.json();
                this.images.push(data.image);
                this.renderImages();

            } catch (error) {
                console.error('Erreur upload:', error);
                notifications.create({
                    type: 'error',
                    title: 'Erreur',
                    message: 'Impossible d\'uploader l\'image'
                });
            }
        }
    }

    setPrimaryImage(index) {
        this.images.forEach((img, i) => {
            img.is_primary = (i === index);
        });
        this.renderImages();
    }

    removeImage(index) {
        this.images.splice(index, 1);
        this.renderImages();
    }

    addSpecification() {
        const template = document.getElementById('specification-template');
        const container = document.getElementById('specifications-list');
        container.appendChild(template.content.cloneNode(true));
    }

    removeSpecification(button) {
        const item = button.closest('.specification-item');
        item.remove();
    }

    getFormData() {
        const form = document.getElementById('product-form');
        const formData = new FormData(form);
        
        // Conversion en objet
        const data = {
            specifications: this.getSpecifications(),
            images: this.images,
            is_active: formData.get('is_active') === 'on'
        };
        
        // Ajout des autres champs
        for (let [key, value] of formData.entries()) {
            if (key !== 'is_active') {
                data[key] = value;
            }
        }
        
        return data;
    }

    getSpecifications() {
        const specs = [];
        const items = document.querySelectorAll('.specification-item');
        
        items.forEach((item, index) => {
            const name = item.querySelector('.spec-name').value;
            const value = item.querySelector('.spec-value').value;
            
            if (name && value) {
                specs.push({
                    name,
                    value,
                    unit: item.querySelector('.spec-unit').value,
                    position: index
                });
            }
        });
        
        return specs;
    }

    async saveProduct() {
        try {
            const data = this.getFormData();
            
            // Validation
            if (!this.validateForm(data)) return;
            
            const url = this.isNewProduct ? 
                '/api/products' : 
                `/api/products/${this.productId}`;
                
            const method = this.isNewProduct ? 'POST' : 'PUT';
            
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.getToken()}`
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) throw new Error('Erreur sauvegarde produit');

            notifications.create({
                type: 'success',
                title: 'Succès',
                message: `Produit ${this.isNewProduct ? 'créé' : 'modifié'} avec succès`
            });

            // Redirection vers la liste
            setTimeout(() => {
                window.location.href = './index.html';
            }, 1500);

        } catch (error) {
            console.error('Erreur sauvegarde:', error);
            notifications.create({
                type: 'error',
                title: 'Erreur',
                message: 'Impossible de sauvegarder le produit'
            });
        }
    }

    validateForm(data) {
        // Validation des champs requis
        const requiredFields = ['sku', 'name', 'price', 'category_id', 'brand_id'];
        for (let field of requiredFields) {
            if (!data[field]) {
                notifications.create({
                    type: 'error',
                    title: 'Champs manquants',
                    message: 'Veuillez remplir tous les champs obligatoires'
                });
                return false;
            }
        }

        // Validation du prix
        if (data.price <= 0) {
            notifications.create({
                type: 'error',
                title: 'Prix invalide',
                message: 'Le prix doit être supérieur à 0'
            });
            return false;
        }

        // Validation des stocks
        if (data.stock_quantity < 0) {
            notifications.create({
                type: 'error',
                title: 'Stock invalide',
                message: 'La quantité en stock ne peut pas être négative'
            });
            return false;
        }

        return true;
    }
}

// Initialisation
const productEditor = new ProductEditor();
// Rendre l'instance accessible globalement
window.productEditor = productEditor;