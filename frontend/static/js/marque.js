// Slider
let currentSlide = 0;
const sliderTrack = document.getElementById('slider-track');

function renderSlider(products) {
    sliderTrack.innerHTML = products.map(product => `
        <div class="slider-item">
            <img src="${product.image}" alt="${product.name}">
            <h3>${product.name}</h3>
            <p class="price">${product.price} €</p>
        </div>
    `).join('');
}

document.querySelector('.slider-prev').addEventListener('click', () => {
    currentSlide = (currentSlide > 0) ? currentSlide - 1 : sliderItems.length - 1;
    updateSlider();
});

document.querySelector('.slider-next').addEventListener('click', () => {
    currentSlide = (currentSlide < sliderItems.length - 1) ? currentSlide + 1 : 0;
    updateSlider();
});

function updateSlider() {
    const offset = -currentSlide * 100;
    sliderTrack.style.transform = `translateX(${offset}%)`;
}

// Filtres
const filterButtons = document.querySelectorAll('.filter-button');
const modalFilters = document.querySelectorAll('.modal-filter');
const filterModal = document.getElementById('filter-modal');
const closeModal = document.querySelector('.close-modal');
const productGrid = document.getElementById('product-grid');

let currentCategory = 'all';
let currentType = 'all';

filterButtons.forEach(button => {
    button.addEventListener('click', () => {
        currentCategory = button.getAttribute('data-category');
        filterModal.style.display = 'flex'; // Ouvrir la fenêtre modale
    });
});

modalFilters.forEach(button => {
    button.addEventListener('click', () => {
        currentType = button.getAttribute('data-type');
        filterModal.style.display = 'none'; // Fermer la fenêtre modale
        filterProducts();
    });
});

closeModal.addEventListener('click', () => {
    filterModal.style.display = 'none';
});

// Filtrer les produits
function filterProducts() {
    const filteredProducts = products.filter(product => {
        return (currentCategory === 'all' || product.category === currentCategory) &&
               (currentType === 'all' || product.type === currentType);
    });
    renderProducts(filteredProducts);
}

// Afficher les produits
function renderProducts(products) {
    productGrid.innerHTML = products.map(product => `
        <div class="product-card">
            <img src="${product.image}" alt="${product.name}">
            <h3>${product.name}</h3>
            <p class="price">${product.price} €</p>
            <button onclick="addToCart(${product.id})">Ajouter au panier</button>
        </div>
    `).join('');
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    // Ici, vous pouvez charger vos produits depuis une API ou une base de données
    const products = []; // Remplacez par vos produits
    renderSlider(products.slice(0, 5)); // Afficher 5 produits dans le slider
    renderProducts(products); // Afficher tous les produits dans la grille
});