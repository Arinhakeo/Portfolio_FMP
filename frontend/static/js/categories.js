// frontend/admin/static/js/categories.js

import { session } from '../../../static/js/session.js';
import { notifications } from '../../../static/js/notifications.js';

class CategoriesManager {
    constructor() {
        this.categories = [];
        this.currentCategory = null;
        this.initialize();
    }

    async initialize() {
        await this.loadCategories();
        this.renderCategoriesTree();
        this.setupEventListeners();
    }

    async loadCategories() {
        try {
            const response = await fetch('/api/products/categories');
            const data = await response.json();
            this.categories = this.organizeCategories(data);
        } catch (error) {
            console.error('Erreur chargement catégories:', error);
            notifications.create({
                type: 'error',
                title: 'Erreur',
                message: 'Impossible de charger les catégories'
            });
        }
    }

    organizeCategories(categories) {
        // Création de la structure arborescente
        const categoryMap = {};
        const rootCategories = [];

        // Première passe : création du mapping
        categories.forEach(category => {
            categoryMap[category.id] = {
                ...category,
                children: []
            };
        });

        // Deuxième passe : organisation de l'arbre
        categories.forEach(category => {
            if (category.parent_id) {
                categoryMap[category.parent_id].children.push(categoryMap[category.id]);
            } else {
                rootCategories.push(categoryMap[category.id]);
            }
        });

        return rootCategories;
    }

    renderCategoriesTree() {
        const container = document.getElementById('categories-tree');
        container.innerHTML = this.buildCategoryHTML(this.categories);
        
        // Mise à jour du select des parents
        this.updateParentSelect();
    }

    buildCategoryHTML(categories, level = 0) {
        return categories.map(category => {
            const template = document.getElementById('category-item-template');
            const clone = template.content.cloneNode(true);
            
            // Configuration de l'élément
            const item = clone.querySelector('.category-item');
            item.dataset.id = category.id;
            item.style.marginLeft = `${level * 20}px`;
            
            // Nom de la catégorie
            item.querySelector('.category-name').textContent = category.name;
            
            // Bouton d'expansion
            const expandBtn = item.querySelector('.expand-btn');
            if (category.children.length === 0) {
                expandBtn.style.visibility = 'hidden';
            } else {
                expandBtn.addEventListener('click', () => {
                    item.classList.toggle('expanded');
                });
            }
            
            // Sous-catégories
            if (category.children.length > 0) {
                item.querySelector('.subcategories').innerHTML = 
                    this.buildCategoryHTML(category.children, level + 1);
            }
            
            // Actions
            item.querySelector('.edit-btn').addEventListener('click', () => {
                this.editCategory(category);
            });
            
            item.querySelector('.delete-btn').addEventListener('click', () => {
                this.deleteCategory(category);
            });
            
            return item.outerHTML;
            
        }).join('');
    }

    updateParentSelect() {
        const select = document.getElementById('parent_id');
        select.innerHTML = '<option value="">Aucune (catégorie principale)</option>';
        
        const addOptions = (categories, level = 0) => {
            categories.forEach(category => {
                // Ne pas ajouter la catégorie en cours d'édition
                if (this.currentCategory && category.id === this.currentCategory.id) {
                    return;
                }
                
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = '  '.repeat(level) + category.name;
                select.appendChild(option);
                
                if (category.children.length > 0) {
                    addOptions(category.children, level + 1);
                }
            });
        };
        
        addOptions(this.categories);
    }

    showCreateModal() {
        this.currentCategory = null;
        document.getElementById('modal-title').textContent = 'Nouvelle Catégorie';
        document.getElementById('category-form').reset();
        document.getElementById('current-image').style.display = 'none';
        document.getElementById('category-modal').classList.add('show');
    }

    editCategory(category) {
        this.currentCategory = category;
        document.getElementById('modal-title').textContent = 'Modifier la Catégorie';
        
        // Remplissage du formulaire
        document.getElementById('name').value = category.name;
        document.getElementById('description').value = category.description || '';
        document.getElementById('parent_id').value = category.parent_id || '';
        
        // Affichage de l'image actuelle
        if (category.image_url) {
            const imgContainer = document.getElementById('current-image');
            imgContainer.style.display = 'block';
            imgContainer.querySelector('img').src = category.image_url;
        }
        
        document.getElementById('category-modal').classList.add('show');
    }

    async deleteCategory(category) {
        if (!confirm(`Êtes-vous sûr de vouloir supprimer la catégorie "${category.name}" ?`)) {
            return;
        }

        try {
            const response = await fetch(`/api/products/categories/${category.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${session.getToken()}`
                }
            });

            if (!response.ok) throw new Error('Erreur suppression catégorie');

            notifications.create({
                type: 'success',
                title: 'Succès',
                message: 'Catégorie supprimée avec succès'
            });

            await this.loadCategories();
            this.renderCategoriesTree();

        } catch (error) {
            console.error('Erreur suppression:', error);
            notifications.create({
                type: 'error',
                title: 'Erreur',
                message: 'Impossible de supprimer la catégorie'
            });
        }
    }

    async saveCategory() {
        try {
            const form = document.getElementById('category-form');
            const formData = new FormData(form);
            
            // Ajout de l'ID si en mode édition
            if (this.currentCategory) {
                formData.append('id', this.currentCategory.id);
            }
            
            const response = await fetch(
                this.currentCategory ? 
                    `/api/products/categories/${this.currentCategory.id}` : 
                    '/api/products/categories',
                {
                    method: this.currentCategory ? 'PUT' : 'POST',
                    headers: {
                        'Authorization': `Bearer ${session.getToken()}`
                    },
                    body: formData
                }
            );

            if (!response.ok) throw new Error('Erreur sauvegarde catégorie');

            notifications.create({
                type: 'success',
                title: 'Succès',
                message: `Catégorie ${this.currentCategory ? 'modifiée' : 'créée'} avec succès`
            });

            this.hideModal();
            await this.loadCategories();
            this.renderCategoriesTree();

        } catch (error) {
            console.error('Erreur sauvegarde:', error);
            notifications.create({
                type: 'error',
                title: 'Erreur',
                message: 'Impossible de sauvegarder la catégorie'
            });
        }
    }

    removeImage() {
        if (this.currentCategory) {
            document.getElementById('current-image').style.display = 'none';
            // L'image sera supprimée lors de la sauvegarde
        }
    }

    hideModal() {
        document.getElementById('category-modal').classList.remove('show');
        this.currentCategory = null;
    }

    setupEventListeners() {
        // Fermeture du modal sur clic en dehors
        document.getElementById('category-modal').addEventListener('click', (e) => {
            if (e.target.id === 'category-modal') {
                this.hideModal();
            }
        });
    }
}

// Initialisation
const categoriesManager = new CategoriesManager();
// Rendre l'instance accessible globalement
window.categoriesManager = categoriesManager;