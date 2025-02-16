// frontend/admin/static/js/brands.js

import { session } from '../../../static/js/session.js';
import { notifications } from '../../../static/js/notifications.js';

class BrandsManager {
    constructor() {
        this.brands = [];
        this.currentBrand = null;
        this.initialize();
    }

    async initialize() {
        await this.loadBrands();
        this.renderBrands();
        this.setupEventListeners();
    }

    async loadBrands() {
        try {
            const response = await fetch('/api/products/brands');
            this.brands = await response.json();
        } catch (error) {
            console.error('Erreur chargement marques:', error);
            notifications.create({
                type: 'error',
                title: 'Erreur',
                message: 'Impossible de charger les marques'
            });
        }
    }

    renderBrands() {
        const container = document.getElementById('brands-grid');
        container.innerHTML = this.brands.map(brand => {
            const template = document.getElementById('brand-card-template');
            const clone = template.content.cloneNode(true);
            
            // Configuration de la carte
            const card = clone.querySelector('.brand-card');
            card.dataset.id = brand.id;
            
            // Logo
            const logo = card.querySelector('.brand-logo img');
            logo.src = brand.logo_url || '/static/images/no-logo.png';
            logo.alt = `Logo ${brand.name}`;
            
            // Informations
            card.querySelector('.brand-name').textContent = brand.name;
            card.querySelector('.brand-description').textContent = 
                brand.description || 'Aucune description';
            
            // Site web
            const websiteLink = card.querySelector('.brand-website');
            if (brand.website) {
                websiteLink.href = brand.website;
            } else {
                websiteLink.style.display = 'none';
            }
            
            // Actions
            card.querySelector('.edit-btn').addEventListener('click', () => {
                this.editBrand(brand);
            });
            
            card.querySelector('.delete-btn').addEventListener('click', () => {
                this.deleteBrand(brand);
            });
            
            return clone;
            
        }).join('');
    }

    showCreateModal() {
        this.currentBrand = null;
        document.getElementById('modal-title').textContent = 'Nouvelle Marque';
        document.getElementById('brand-form').reset();
        document.getElementById('current-logo').style.display = 'none';
        document.getElementById('brand-modal').classList.add('show');
    }

    editBrand(brand) {
        this.currentBrand = brand;
        document.getElementById('modal-title').textContent = 'Modifier la Marque';
        
        // Remplissage du formulaire
        document.getElementById('name').value = brand.name;
        document.getElementById('description').value = brand.description || '';
        document.getElementById('website').value = brand.website || '';
        
        // Affichage du logo actuel
        if (brand.logo_url) {
            const logoContainer = document.getElementById('current-logo');
            logoContainer.style.display = 'block';
            logoContainer.querySelector('img').src = brand.logo_url;
        }
        
        document.getElementById('brand-modal').classList.add('show');
    }

    async deleteBrand(brand) {
        if (!confirm(`Êtes-vous sûr de vouloir supprimer la marque "${brand.name}" ?`)) {
            return;
        }

        try {
            const response = await fetch(`/api/products/brands/${brand.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${session.getToken()}`
                }
            });

            if (!response.ok) throw new Error('Erreur suppression marque');

            notifications.create({
                type: 'success',
                title: 'Succès',
                message: 'Marque supprimée avec succès'
            });

            await this.loadBrands();
            this.renderBrands();

        } catch (error) {
            console.error('Erreur suppression:', error);
            notifications.create({
                type: 'error',
                title: 'Erreur',
                message: 'Impossible de supprimer la marque'
            });
        }
    }

    async saveBrand() {
        try {
            const form = document.getElementById('brand-form');
            const formData = new FormData(form);
            
            // Ajout de l'ID si en mode édition
            if (this.currentBrand) {
                formData.append('id', this.currentBrand.id);
            }
            
            const response = await fetch(
                this.currentBrand ? 
                    `/api/products/brands/${this.currentBrand.id}` : 
                    '/api/products/brands',
                {
                    method: this.currentBrand ? 'PUT' : 'POST',
                    headers: {
                        'Authorization': `Bearer ${session.getToken()}`
                    },
                    body: formData
                }
            );

            if (!response.ok) throw new Error('Erreur sauvegarde marque');

            notifications.create({
                type: 'success',
                title: 'Succès',
                message: `Marque ${this.currentBrand ? 'modifiée' : 'créée'} avec succès`
            });

            this.hideModal();
            await this.loadBrands();
            this.renderBrands();

        } catch (error) {
            console.error('Erreur sauvegarde:', error);
            notifications.create({
                type: 'error',
                title: 'Erreur',
                message: 'Impossible de sauvegarder la marque'
            });
        }
    }

    removeLogo() {
        if (this.currentBrand) {
            document.getElementById('current-logo').style.display = 'none';
            // Le logo sera supprimé lors de la sauvegarde
        }
    }

    hideModal() {
        document.getElementById('brand-modal').classList.remove('show');
        this.currentBrand = null;
    }

    setupEventListeners() {
        // Fermeture du modal sur clic en dehors
        document.getElementById('brand-modal').addEventListener('click', (e) => {
            if (e.target.id === 'brand-modal') {
                this.hideModal();
            }
        });
    }
}

// Initialisation
const brandsManager = new BrandsManager();
// Rendre l'instance accessible globalement
window.brandsManager = brandsManager;