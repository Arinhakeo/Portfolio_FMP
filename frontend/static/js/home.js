// frontend/static/js/home.js

/**
 * Gestionnaire de la page d'accueil
 */
class HomeManager {
    constructor() {
        this.currentSlide = 0;
        this.autoPlayInterval = null;
        this.initialize();
    }

    /**
     * Initialisation des fonctionnalités de la page d'accueil
     */
    async initialize() {
        // Initialisation du slider
        this.initializeSlider();
        
        // Chargement des données
        await Promise.all([
            this.loadFeaturedCategories(),
            this.loadFeaturedProducts(),
            this.loadBrands()
        ]);
    }

    /**
     * Initialise le slider principal
     */
    initializeSlider() {
        // Gestion des contrôles du slider
        const prevBtn = document.querySelector('.slider-controls .prev-btn');
        const nextBtn = document.querySelector('.slider-controls .next-btn');
        
        prevBtn.addEventListener('click', () => this.changeSlide(-1));
        nextBtn.addEventListener('click', () => this.changeSlide(1));
        
        // Démarrage de l'autoplay
        this.startAutoPlay();
        
        // Pause de l'autoplay au survol
        const slider = document.querySelector('.hero-slider');
        slider.addEventListener('mouseenter', () => this.stopAutoPlay());
        slider.addEventListener('mouseleave', () => this.startAutoPlay());
    }

    /**
     * Change la slide active
     */
    changeSlide(direction) {
        const slides = document.querySelectorAll('.slide');
        
        // Retrait de la classe active
        slides[this.currentSlide].classList.remove('active');
        
        // Calcul de la nouvelle slide
        this.currentSlide = (this.currentSlide + direction + slides.length) % slides.length;
        
        // Activation de la nouvelle slide
        slides[this.currentSlide].classList.add('active');
    }

    /**
     * Démarre l'autoplay du slider
     */
    startAutoPlay() {
        this.autoPlayInterval = setInterval(() => {
            this.changeSlide(1);
        }, 5000);
    }

    /**
     * Arrête l'autoplay du slider
     */
    stopAutoPlay() {
        if (this.autoPlayInterval) {
            clearInterval(this.autoPlayInterval);
            this.autoPlayInterval = null;
        }
    }

    /**
     * Charge les catégories mises en avant
     */
    async loadFeaturedCategories() {
        try {
            const response = await fetch('/api/products/categories/featured');
            const categories = await response.json();
            
            const container = document.getElementById('featured-categories');
            container.innerHTML = categories.map(category => `
                <a href="products.html?category=${category.slug}" class="category-card">
                    <div class="category-image">
                        <img src="${category.image_url}" alt="${category.name}">
                    </div>
                    <div class="category-info">
                        <h3>${category.name}</h3>
                        <p>${category.description}</p>
                    </div>
                </a>
            `).join('');
            
        } catch (error) {
            console.error('Erreur chargement catégories:', error);
        }
    }

    /**
     * Charge les produits mis en avant
     */
    async loadFeaturedProducts() {
        try {
            const response = await fetch('/api/products/featured');
            const products = await response.json();
            
            const container = document.getElementById('featured-products');
            container.innerHTML = products.map(product => `
                <div class="product-card">
                    <div class="product-image">
                        <img src="${product.images[0]?.url}" alt="${product.name}">
                    </div>
                    <div class="product-info">
                        <h3>${product.name}</h3>
                        <p class="product-brand">${product.brand.name}</p>
                        <p class="product-price">${product.price.toFixed(2)} €</p>
                    </div>
                    <button 
                        class="add-to-cart-btn"
                        onclick="mainManager.addToCart(${product.id})"
                    >
                        Ajouter au panier
                    </button>
                </div>
            `).join('');
            
        } catch (error) {
            console.error('Erreur chargement produits:', error);
        }
    }

    /**
     * Charge les marques partenaires
     */
    async loadBrands() {
        try {
            const response = await fetch('/api/products/brands');
            const brands = await response.json();
            
            const container = document.getElementById('brands-slider');
            container.innerHTML = brands.map(brand => `
                <div class="brand-item">
                    <img src="${brand.logo_url}" alt="${brand.name}">
                </div>
            `).join('');
            
        } catch (error) {
            console.error('Erreur chargement marques:', error);
        }
    }
}

// Initialisation
const homeManager = new HomeManager();
// Rendre l'instance accessible globalement
window.homeManager = homeManager;