// static/js/search-results.js
document.addEventListener('DOMContentLoaded', function() {
    // Récupérer la requête de recherche depuis l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q');
    
    // Afficher la requête
    const queryDisplay = document.getElementById('search-query-display');
    if (queryDisplay) {
        queryDisplay.textContent = query || '';
    }
    
    // Si pas de requête, ne rien faire
    if (!query) {
        showNoResults();
        return;
    }
    
    // Rechercher
    searchProducts(query);
});

async function searchProducts(query) {
    try {
        const response = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`);
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Afficher les résultats
        displayResults(data.results, data.count);
        
    } catch (error) {
        console.error('Erreur lors de la recherche:', error);
        showError();
    }
}

function displayResults(products, count) {
    const resultsContainer = document.getElementById('search-results');
    const resultsCount = document.getElementById('results-count');
    
    if (!products || products.length === 0) {
        showNoResults();
        return;
    }
    
    // Afficher le nombre de résultats
    if (resultsCount) {
        resultsCount.textContent = `${count} produit${count > 1 ? 's' : ''} trouvé${count > 1 ? 's' : ''}`;
    }
    
    // Vider le conteneur
    resultsContainer.innerHTML = '';
    
    // Ajouter chaque produit
    products.forEach(product => {
        const productCard = createProductCard(product);
        resultsContainer.appendChild(productCard);
    });
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    // Définir l'URL de l'image principale
    const imageUrl = product.images && product.images.length > 0 
        ? product.images.find(img => img.is_primary)?.url || product.images[0].url
        : '/static/images/no-image.jpg';
    
    card.innerHTML = `
        <a href="/pages/product.html?id=${product.id}" class="product-link">
            <div class="product-image">
                <img src="${imageUrl}" alt="${product.name}">
            </div>
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-sku">Réf: ${product.sku}</p>
                <div class="product-price">${product.price.toFixed(2)} €</div>
                <div class="product-stock ${product.stock_quantity > 0 ? 'in-stock' : 'out-of-stock'}">
                    ${product.stock_quantity > 0 ? 'En stock' : 'Rupture de stock'}
                </div>
            </div>
        </a>
        <div class="product-actions">
            <button class="btn-add-to-cart" data-product-id="${product.id}">
                Ajouter au panier
            </button>
        </div>
    `;
    
    // Ajouter l'écouteur pour le bouton d'ajout au panier
    const addToCartBtn = card.querySelector('.btn-add-to-cart');
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // Logique d'ajout au panier
            // À implémenter selon votre système de panier
        });
    }
    
    return card;
}

function showNoResults() {
    const resultsContainer = document.getElementById('search-results');
    const noResults = document.getElementById('no-results');
    const resultsCount = document.getElementById('results-count');
    
    if (resultsContainer) resultsContainer.style.display = 'none';
    if (noResults) noResults.style.display = 'block';
    if (resultsCount) resultsCount.textContent = '0 produit trouvé';
}

function showError() {
    const resultsContainer = document.getElementById('search-results');
    if (resultsContainer) {
        resultsContainer.innerHTML = `
            <div class="error-message">
                <p>Une erreur est survenue lors de la recherche.</p>
                <p>Veuillez réessayer ultérieurement.</p>
            </div>
        `;
    }
}