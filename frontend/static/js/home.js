// ===========================================================================
//                              Gestionnaire de la Page d'Accueil
// ===========================================================================

class HomeManager {
    constructor() {
        this.currentSlide = 0; // Slide actuelle du slider
        this.autoPlayInterval = null; // Intervalle pour l'autoplay
        this.initialize(); // Initialisation de la page
    }

    // ===========================================================================
    //                              Initialisation
    // ===========================================================================

    /**
     * Initialisation des fonctionnalités de la page d'accueil
     */
    async initialize() {
        // Initialisation du slider
        this.initializeSlider();

        // Chargement des données
        await Promise.all([
            this.loadFeaturedCategories(), // Catégories mises en avant
            this.loadFeaturedProducts(),   // Produits mis en avant
            this.loadBrands()              // Marques partenaires
        ]);
    }

    // ===========================================================================
    //                              Gestion du Slider
    // ===========================================================================

    /**
     * Initialise le slider principal
     */
    initializeSlider() {
        // Gestion des contrôles du slider
        const prevBtn = document.querySelector('.slider-controls .prev-btn');
        const nextBtn = document.querySelector('.slider-controls .next-btn');
        
        // Événements pour les boutons précédent et suivant
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
     * @param {number} direction - Direction de la navigation (-1 pour précédent, 1 pour suivant)
     */
    changeSlide(direction) {
        const slides = document.querySelectorAll('.slide');
        
        // Retrait de la classe active de la slide actuelle
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
            this.changeSlide(1); // Change de slide toutes les 5 secondes
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

    // ===========================================================================
    //                              Chargement des Données
    // ===========================================================================

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
                        onclick="homeManager.addToCart(${product.id})"
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

    // ===========================================================================
    //                              Fonctions Supplémentaires
    // ===========================================================================

    /**
     * Ajoute un produit au panier
     * @param {number} productId - ID du produit à ajouter
     */
    addToCart(productId) {
        console.log(`Produit ${productId} ajouté au panier`);
        // Ajoutez ici la logique pour ajouter un produit au panier
    }
}
    // ===========================================================================
    //                              Fonctions slide
    // ===========================================================================

document.addEventListener('DOMContentLoaded', function () {
    const slides = document.querySelectorAll('.slide');
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    let currentSlide = 0;

    // Affiche la slide active
    function showSlide(index) {
        slides.forEach((slide, i) => {
            slide.classList.remove('active');
            if (i === index) {
                slide.classList.add('active');
            }
        });
    }

    // Slide précédente
    prevBtn.addEventListener('click', () => {
        currentSlide = (currentSlide > 0) ? currentSlide - 1 : slides.length - 1;
        showSlide(currentSlide);
    });

    // Slide suivante
    nextBtn.addEventListener('click', () => {
        currentSlide = (currentSlide < slides.length - 1) ? currentSlide + 1 : 0;
        showSlide(currentSlide);
    });

    // Affiche la première slide au chargement
    showSlide(currentSlide);
});

// ===========================================================================
//                              Initialisation
// ===========================================================================

// Crée une instance de HomeManager
const homeManager = new HomeManager();

// Rendre l'instance accessible globalement
window.homeManager = homeManager;