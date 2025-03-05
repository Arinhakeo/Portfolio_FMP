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
            if (!response.ok) throw new Error('Erreur de chargement des marques');
            this.brands = await response.json();
        } catch (error) {
            console.error('Erreur:', error);
            notifications.create({
                type: 'error',
                title: 'Erreur',
                message: 'Impossible de charger les marques'
            });
        }
    }

    renderBrands() {
        const container = document.getElementById('brands-grid');
        if (!container) return;

        container.innerHTML = this.brands.map(brand => `
            <div class="brand-card" data-id="${brand.id}">
                <div class="brand-logo">
                    <img src="${brand.logo_url || '/static/images/no-logo.png'}" alt="${brand.name}">
                </div>
                <div class="brand-info">
                    <h3 class="brand-name">${brand.name}</h3>
                    <p class="brand-description">${brand.description || 'Aucune description'}</p>
                    ${brand.website ? `
                        <a href="${brand.website}" class="brand-website" target="_blank">
                            <i class="icon link-icon"></i>
                            Visiter le site
                        </a>
                    ` : ''}
                </div>
                <div class="brand-actions">
                    <button class="btn btn-icon edit-btn" title="Modifier">
                        <i class="icon edit-icon"></i>
                    </button>
                    <button class="btn btn-icon delete-btn" title="Supprimer">
                        <i class="icon delete-icon"></i>
                    </button>
                </div>
            </div>
        `).join('');

        // Ajouter les écouteurs d'événements
        document.querySelectorAll('.edit-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const brandId = e.target.closest('.brand-card').dataset.id;
                const brand = this.brands.find(b => b.id == brandId);
                this.editBrand(brand);
            });
        });

        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const brandId = e.target.closest('.brand-card').dataset.id;
                const brand = this.brands.find(b => b.id == brandId);
                this.deleteBrand(brand);
            });
        });
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
        document.getElementById('name').value = brand.name;
        document.getElementById('description').value = brand.description || '';
        document.getElementById('website').value = brand.website || '';

        const logoContainer = document.getElementById('current-logo');
        if (brand.logo_url) {
            logoContainer.style.display = 'block';
            logoContainer.querySelector('img').src = brand.logo_url;
        } else {
            logoContainer.style.display = 'none';
        }

        document.getElementById('brand-modal').classList.add('show');
    }

    async deleteBrand(brand) {
        if (!confirm(`Êtes-vous sûr de vouloir supprimer la marque "${brand.name}" ?`)) return;

        try {
            const response = await fetch(`/api/products/brands/${brand.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${session.getToken()}`
                }
            });

            if (!response.ok) throw new Error('Erreur de suppression');

            notifications.create({
                type: 'success',
                title: 'Succès',
                message: 'Marque supprimée avec succès'
            });

            await this.loadBrands();
            this.renderBrands();
        } catch (error) {
            console.error('Erreur:', error);
            notifications.create({
                type: 'error',
                title: 'Erreur',
                message: 'Impossible de supprimer la marque'
            });
        }
    }

    async saveBrand() {
        const formData = new FormData(document.getElementById('brand-form'));
        if (this.currentBrand) formData.append('id', this.currentBrand.id);

        try {
            const response = await fetch(
                this.currentBrand ? `/api/products/brands/${this.currentBrand.id}` : '/api/products/brands',
                {
                    method: this.currentBrand ? 'PUT' : 'POST',
                    headers: {
                        'Authorization': `Bearer ${session.getToken()}`
                    },
                    body: formData
                }
            );

            if (!response.ok) throw new Error('Erreur de sauvegarde');

            notifications.create({
                type: 'success',
                title: 'Succès',
                message: `Marque ${this.currentBrand ? 'modifiée' : 'créée'} avec succès`
            });

            this.hideModal();
            await this.loadBrands();
            this.renderBrands();
        } catch (error) {
            console.error('Erreur:', error);
            notifications.create({
                type: 'error',
                title: 'Erreur',
                message: 'Impossible de sauvegarder la marque'
            });
        }
    }

    hideModal() {
        document.getElementById('brand-modal').classList.remove('show');
        this.currentBrand = null;
    }

    setupEventListeners() {
        document.getElementById('brand-modal').addEventListener('click', (e) => {
            if (e.target.id === 'brand-modal') this.hideModal();
        });
    }
}

// Initialisation
const brandsManager = new BrandsManager();
window.brandsManager = brandsManager;