/**
 * product-detail.js
 * Script pour la page de détail produit
 */

document.addEventListener('DOMContentLoaded', function() {
    // Récupérer l'ID du produit depuis l'URL
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');
    
    if (!productId) {
        showError("Identifiant de produit manquant");
        return;
    }
    
    // Initialiser les onglets
    initTabs();
    
    // Charger les détails du produit
    loadProductDetails(productId);
    
    // Initialiser les contrôles de quantité
    initQuantityControls();
});

/**
 * Initialise les onglets d'information
 */
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Désactiver tous les onglets
            tabButtons.forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
            
            // Activer l'onglet cliqué
            this.classList.add('active');
            const tabId = `tab-${this.dataset.tab}`;
            document.getElementById(tabId).classList.add('active');
        });
    });
}

/**
 * Initialise les contrôles de quantité (+/-)
 */
function initQuantityControls() {
    const quantityInput = document.getElementById('product-quantity');
    const decreaseBtn = document.getElementById('decrease-quantity');
    const increaseBtn = document.getElementById('increase-quantity');
    const addToCartBtn = document.getElementById('add-to-cart');
    
    if (decreaseBtn) {
        decreaseBtn.addEventListener('click', function() {
            let currentValue = parseInt(quantityInput.value);
            if (currentValue > 1) {
                quantityInput.value = currentValue - 1;
            }
        });
    }
    
    if (increaseBtn) {
        increaseBtn.addEventListener('click', function() {
            let currentValue = parseInt(quantityInput.value);
            quantityInput.value = currentValue + 1;
        });
    }
    
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', function() {
            const quantity = parseInt(quantityInput.value);
            addToCart(quantity);
        });
    }
}

/**
 * Charge les détails du produit depuis l'API
 */
async function loadProductDetails(productId) {
    try {
        const response = await fetch(`/api/products/${productId}`);
        
        if (!response.ok) {
            throw new Error(`Erreur ${response.status}: ${response.statusText}`);
        }
        
        const product = await response.json();
        console.log("Détails du produit:", product);
        
        // Afficher les détails du produit
        displayProductDetails(product);
        
    } catch (error) {
        console.error("Erreur lors du chargement du produit:", error);
        showError("Impossible de charger les détails du produit");
    }
}

/**
 * Affiche les détails du produit dans la page
 */
function displayProductDetails(product) {
    // Cacher l'indicateur de chargement
    document.getElementById('loading-indicator').style.display = 'none';
    
    // Afficher le contenu du produit
    document.getElementById('product-content').style.display = 'block';
    
    // Mettre à jour le titre de la page
    document.title = `${product.name} | FMP`;
    
    // Mettre à jour les éléments de base
    document.getElementById('product-title').textContent = product.name;
    document.getElementById('product-sku').textContent = product.sku;
    document.getElementById('product-price').textContent = product.price.toFixed(2);
    document.getElementById('product-short-desc').textContent = product.short_description || 'Aucune description courte disponible';
    document.getElementById('product-name-breadcrumb').textContent = product.name;
    
    // Mettre à jour le fil d'Ariane avec la catégorie
    if (product.category) {
        const categoryLink = document.getElementById('product-category-link');
        
        if (product.category.name.includes('Recyclés')) {
            categoryLink.innerHTML = `<a href="/pages/products/products-ecolo.html">Cartouches Remanufacturées</a>`;
        } else if (product.category.name.includes('Compatibles')) {
            categoryLink.innerHTML = `<a href="/pages/products/products-compatible.html">Cartouches Compatibles</a>`;
        } else if (product.category.name.includes('Origines')) {
            categoryLink.innerHTML = `<a href="/pages/products/products-origines.html">Cartouches d'Origine</a>`;
        } else {
            categoryLink.textContent = product.category.name;
        }
    }
    
    // Afficher l'image principale
    if (product.images && product.images.length > 0) {
        const mainImage = document.getElementById('product-main-image');
        mainImage.src = product.images[0].url;
        mainImage.alt = product.name;
        
        // Afficher les vignettes si plusieurs images
        if (product.images.length > 1) {
            const thumbnailsContainer = document.getElementById('product-thumbnails');
            thumbnailsContainer.innerHTML = '';
            
            product.images.forEach((image, index) => {
                const thumbnail = document.createElement('div');
                thumbnail.className = `product-thumbnail ${index === 0 ? 'active' : ''}`;
                thumbnail.innerHTML = `<img src="${image.url}" alt="${product.name} - Vue ${index + 1}">`;
                
                thumbnail.addEventListener('click', function() {
                    // Mettre à jour l'image principale
                    mainImage.src = image.url;
                    
                    // Mettre à jour la vignette active
                    document.querySelectorAll('.product-thumbnail').forEach(thumb => thumb.classList.remove('active'));
                    this.classList.add('active');
                });
                
                thumbnailsContainer.appendChild(thumbnail);
            });
        }
    }
    
    // Afficher la disponibilité
    displayAvailability(product);
    
    // Afficher les spécifications principales
    displaySpecifications(product);
    
    // Afficher la description complète
    document.getElementById('product-description').innerHTML = product.description || 'Aucune description disponible';
    
    // Extraire et afficher les imprimantes compatibles depuis la description
    extractPrinterCompatibility(product.description);
    
    // Créer le tableau des spécifications complètes
    createSpecificationsTable(product);
}

/**
 * Affiche l'état de disponibilité du produit
 */
function displayAvailability(product) {
    const stockQuantity = product.stock_quantity || 0;
    const minStockLevel = product.min_stock_level || 5;
    const availabilityContainer = document.getElementById('product-availability');
    
    let availabilityText = '';
    let indicatorClass = '';
    
    if (stockQuantity > minStockLevel) {
        availabilityText = 'En stock';
        indicatorClass = 'in-stock';
    } else if (stockQuantity > 0) {
        availabilityText = 'Stock limité';
        indicatorClass = 'low-stock';
    } else {
        availabilityText = 'Rupture de stock';
        indicatorClass = 'out-of-stock';
    }
    
    availabilityContainer.innerHTML = `
        <span class="availability-indicator ${indicatorClass}"></span>
        <span class="availability-text">${availabilityText}</span>
    `;
}

/**
 * Affiche les spécifications principales du produit
 */
function displaySpecifications(product) {
    const specificationsContainer = document.getElementById('product-specifications');
    specificationsContainer.innerHTML = '';
    
    // Si le produit a des spécifications formelles
    if (product.specifications && product.specifications.length > 0) {
        // Définir les spécifications principales à afficher
        const keySpecs = ['Type', 'Couleur', 'Technologie', 'Rendement', 'Capacité', 'Format'];
        
        // Filtrer les spécifications importantes
        const importantSpecs = product.specifications.filter(spec => 
            keySpecs.some(key => spec.name.toLowerCase().includes(key.toLowerCase()))
        );
        
        // Afficher les spécifications importantes
        importantSpecs.forEach(spec => {
            specificationsContainer.innerHTML += `
                <dt>${spec.name}</dt>
                <dd>${spec.value}${spec.unit ? ' ' + spec.unit : ''}</dd>
            `;
        });
        
        // Si aucune spécification importante n'a été trouvée, afficher les 4 premières
        if (importantSpecs.length === 0) {
            product.specifications.slice(0, 4).forEach(spec => {
                specificationsContainer.innerHTML += `
                    <dt>${spec.name}</dt>
                    <dd>${spec.value}${spec.unit ? ' ' + spec.unit : ''}</dd>
                `;
            });
        }
    } else {
        // Extraire des informations à partir de la description courte
        const shortDesc = product.short_description || '';
        
        // Déterminer le type de produit (encre ou toner)
        let productType = 'Cartouche';
        if (shortDesc.toLowerCase().includes('toner') || 
            (product.category && product.category.name.toLowerCase().includes('toner'))) {
            productType += ' Toner';
        } else {
            productType += ' d\'encre';
        }
        
        // Déterminer la couleur
        let color = 'Non spécifié';
        if (shortDesc.toLowerCase().includes('noir')) color = 'Noir';
        else if (shortDesc.toLowerCase().includes('cyan')) color = 'Cyan';
        else if (shortDesc.toLowerCase().includes('magenta')) color = 'Magenta';
        else if (shortDesc.toLowerCase().includes('jaune')) color = 'Jaune';
        else if (shortDesc.toLowerCase().includes('couleur')) color = 'Couleur';
        
        // Ajouter les spécifications de base
        specificationsContainer.innerHTML = `
            <dt>Type</dt>
            <dd>${productType}</dd>
            <dt>Marque</dt>
            <dd>${product.brand ? product.brand.name : 'Non spécifié'}</dd>
            <dt>Couleur</dt>
            <dd>${color}</dd>
            <dt>Référence</dt>
            <dd>${product.sku}</dd>
        `;
    }
}

/**
 * Extrait et affiche les imprimantes compatibles à partir de la description
 */
function extractPrinterCompatibility(description) {
    if (!description) return;
    
    const compatibilityContainer = document.getElementById('printer-compatibility');
    
    // Rechercher les sections de compatibilité d'imprimantes dans la description
    const compatibilityPattern = /<h3>.*compatible.*<\/h3>.*?<ul>([\s\S]*?)<\/ul>/i;
    const match = description.match(compatibilityPattern);
    
    if (match && match[1]) {
        // Extraire les éléments de liste des imprimantes compatibles
        const printerListHtml = match[1];
        const printerPattern = /<li>(.*?)<\/li>/g;
        const printers = [];
        let printerMatch;
        
        while ((printerMatch = printerPattern.exec(printerListHtml)) !== null) {
            printers.push(printerMatch[1].trim());
        }
        
        // Si des imprimantes ont été trouvées, les afficher
        if (printers.length > 0) {
            compatibilityContainer.innerHTML = '';
            
            printers.forEach(printer => {
                const printerElement = document.createElement('div');
                printerElement.className = 'printer-item';
                printerElement.textContent = printer;
                compatibilityContainer.appendChild(printerElement);
            });
            
            return;
        }
    }
    
// Si aucune liste d'imprimantes n'a été trouvée, chercher simplement des mentions d'imprimantes
const printerMentions = [];
const printerBrands = ['HP', 'Canon', 'Epson', 'Brother', 'Lexmark', 'Samsung', 'Kyocera', 'Xerox', 'Ricoh', 'Konica', 'Minolta', 'Dell'];

printerBrands.forEach(brand => {
    const brandRegex = new RegExp(`${brand}\\s+([\\w\\d-]+)`, 'gi');
    let brandMatch;
    
    while ((brandMatch = brandRegex.exec(description)) !== null) {
        if (brandMatch[1] && brandMatch[1].length > 1) {
            printerMentions.push(`${brand} ${brandMatch[1]}`);
        }
    }
});

// Si des mentions d'imprimantes ont été trouvées, les afficher
if (printerMentions.length > 0) {
    const uniquePrinters = [...new Set(printerMentions)]; // Éliminer les doublons
    
    compatibilityContainer.innerHTML = '';
    
    uniquePrinters.forEach(printer => {
        const printerElement = document.createElement('div');
        printerElement.className = 'printer-item';
        printerElement.textContent = printer;
        compatibilityContainer.appendChild(printerElement);
    });
} else {
    // Si aucune imprimante n'a été trouvée, afficher un message
    compatibilityContainer.innerHTML = '<p>Information sur la compatibilité non disponible.</p>';
}
}

// Affichage des imprimantes compatibles
function displayCompatiblePrinters(printers) {
    const container = document.getElementById('modal-printer-compatibility');
    if (!container || !printers || !printers.length) {
        // Si aucune imprimante compatible, masquer cette section
        const tab = document.querySelector('.tab-btn[data-tab="compatibility"]');
        if (tab) tab.style.display = 'none';
        return;
    }
    
    // Vider le conteneur
    container.innerHTML = '';
    
    // Regrouper par marque
    const printersByBrand = {};
    printers.forEach(printer => {
        if (!printersByBrand[printer.brand]) {
            printersByBrand[printer.brand] = [];
        }
        printersByBrand[printer.brand].push(printer.model);
    });
    
    // Créer la liste des imprimantes par marque
    Object.keys(printersByBrand).forEach(brand => {
        const brandDiv = document.createElement('div');
        brandDiv.className = 'printer-brand';
        
        const brandTitle = document.createElement('h4');
        brandTitle.textContent = brand;
        brandDiv.appendChild(brandTitle);
        
        const modelsList = document.createElement('ul');
        printersByBrand[brand].forEach(model => {
            const modelItem = document.createElement('li');
            modelItem.textContent = model;
            modelsList.appendChild(modelItem);
        });
        
        brandDiv.appendChild(modelsList);
        container.appendChild(brandDiv);
    });
    
    // Afficher l'onglet
    const tab = document.querySelector('.tab-btn[data-tab="compatibility"]');
    if (tab) tab.style.display = 'block';
}

// Affichage des spécifications détaillées
function displaySpecifications(specs) {
    const container = document.getElementById('modal-full-specifications');
    if (!container || !specs || !specs.length) {
        // Si aucune spécification, masquer cette section
        const tab = document.querySelector('.tab-btn[data-tab="specifications"]');
        if (tab) tab.style.display = 'none';
        return;
    }
    
    // Vider le conteneur
    container.innerHTML = '';
    
    // Créer le tableau des spécifications
    specs.forEach(spec => {
        const row = document.createElement('tr');
        
        const nameCell = document.createElement('th');
        nameCell.textContent = spec.name || '';
        row.appendChild(nameCell);
        
        const valueCell = document.createElement('td');
        valueCell.textContent = spec.unit ? `${spec.value} ${spec.unit}` : spec.value;
        row.appendChild(valueCell);
        
        container.appendChild(row);
    });
    
    // Afficher l'onglet
    const tab = document.querySelector('.tab-btn[data-tab="specifications"]');
    if (tab) tab.style.display = 'block';
}

// Affichage des attributs dans la description courte
function displayAttributes(attributes, shortDescContainer) {
    if (!shortDescContainer || !attributes) return;
    
    // Créer une liste des attributs non vides
    const attributesList = document.createElement('ul');
    attributesList.className = 'product-attributes';
    
    // Vérifier et ajouter les attributs pertinents
    if (attributes.color) {
        addAttributeItem(attributesList, 'Couleur', attributes.color);
    }
    
    if (attributes.capacity) {
        addAttributeItem(attributesList, 'Capacité', attributes.capacity);
    }
    
    if (attributes.rendement) {
        addAttributeItem(attributesList, 'Rendement', `${attributes.rendement} pages`);
    }
    
    if (attributes.reference_oem) {
        addAttributeItem(attributesList, 'Référence OEM', attributes.reference_oem);
    }
    
    // N'ajouter la liste que s'il y a des attributs
    if (attributesList.children.length > 0) {
        shortDescContainer.appendChild(attributesList);
    }
}

// Fonction utilitaire pour ajouter un élément d'attribut
function addAttributeItem(list, label, value) {
    const item = document.createElement('li');
    item.innerHTML = `<strong>${label}:</strong> ${value}`;
    list.appendChild(item);
}

/**
* Crée et affiche le tableau des spécifications complètes
*/
function createSpecificationsTable(product) {
const specsTableContainer = document.getElementById('full-specifications');
specsTableContainer.innerHTML = '';

// Structure de base du tableau
specsTableContainer.innerHTML = `
    <tr>
        <th>Caractéristique</th>
        <th>Valeur</th>
    </tr>
`;

// Ajouter les informations de base
addSpecificationRow(specsTableContainer, 'Référence', product.sku);
addSpecificationRow(specsTableContainer, 'Marque', product.brand ? product.brand.name : 'Non spécifié');
addSpecificationRow(specsTableContainer, 'Catégorie', product.category ? product.category.name : 'Non spécifié');

// Déterminer le type de produit (encre ou toner) et ajouter l'information
const isInk = isInkCartridge(product);
addSpecificationRow(specsTableContainer, 'Type', isInk ? 'Cartouche d\'encre' : 'Cartouche toner');

// Ajouter toutes les spécifications du produit
if (product.specifications && product.specifications.length > 0) {
    product.specifications.forEach(spec => {
        addSpecificationRow(specsTableContainer, spec.name, spec.value + (spec.unit ? ' ' + spec.unit : ''));
    });
}

// Extraire et ajouter des informations supplémentaires de la description
extractAdditionalSpecifications(product.description, specsTableContainer);
}

/**
* Ajoute une ligne au tableau des spécifications
*/
function addSpecificationRow(table, name, value) {
if (!value || value === '' || value === 'null' || value === 'undefined') {
    value = 'Non spécifié';
}

const row = document.createElement('tr');
row.innerHTML = `
    <td class="checkbox-column">...</td>
    <td class="image-column">...</td>
    <td class="name-column">...</td>
    <td class="sku-column">${product.sku || 'N/A'}</td>
    <td class="category-column">${categoryName}</td>)
    <td class="brand-column">${brandName}</td>)
    <td class="price-column">${price} €</td>)
    <td class="stock-column"><span class="stock-badge ${stockClass}">${stockQuantity}</span></td>
    <td class="status-column"><span class="status-badge ${statusClass}">${statusText}</span></td>
    <td class="actions-column">...</td>
`;
table.appendChild(row);
}

/**
* Détermine si le produit est une cartouche d'encre ou toner
*/
function isInkCartridge(product) {
// Vérifier la catégorie
if (product.category && product.category.name) {
    const categoryName = product.category.name.toLowerCase();
    if (categoryName.includes('toner')) return false;
    if (categoryName.includes('encre')) return true;
}

// Vérifier le nom du produit
const productName = (product.name || '').toLowerCase();
if (productName.includes('toner')) return false;
if (productName.includes('encre') || productName.includes('ink')) return true;

// Vérifier les spécifications
if (product.specifications && product.specifications.length > 0) {
    for (const spec of product.specifications) {
        if (spec.name.toLowerCase() === 'type' || spec.name.toLowerCase() === 'technologie') {
            const value = spec.value.toLowerCase();
            if (value.includes('toner') || value.includes('laser')) return false;
            if (value.includes('encre') || value.includes('ink') || value.includes('jet')) return true;
        }
    }
}

// Vérifier la description
const description = (product.description || '').toLowerCase();
if (description.includes('toner') || description.includes('laser')) return false;
if (description.includes('encre') || description.includes('ink') || description.includes('jet d\'encre')) return true;

// Par défaut, considérer comme encre
return true;
}

/**
* Extrait des spécifications supplémentaires de la description
*/
function extractAdditionalSpecifications(description, table) {
if (!description) return;

// Liste des spécifications à rechercher
const specsToExtract = [
    { name: 'Rendement', pattern: /rendement\s*:?\s*([\d\s]+)\s*pages/i },
    { name: 'Capacité', pattern: /capacité\s*:?\s*([\d\.,]+)\s*ml/i },
    { name: 'Couleur', pattern: /couleur\s*:?\s*(\w+)/i },
    { name: 'Format', pattern: /format\s*:?\s*(\w+)/i },
    { name: 'Référence constructeur', pattern: /référence\s+constructeur\s*:?\s*([\w\d-]+)/i },
    { name: 'Code OEM', pattern: /code\s+oem\s*:?\s*([\w\d-]+)/i }
];

// Rechercher chaque spécification
specsToExtract.forEach(spec => {
    const match = description.match(spec.pattern);
    if (match && match[1]) {
        // Vérifier si cette spécification existe déjà dans le tableau
        const existingRow = Array.from(table.querySelectorAll('th')).find(th => 
            th.textContent.toLowerCase() === spec.name.toLowerCase()
        );
        
        // Si non, l'ajouter
        if (!existingRow) {
            addSpecificationRow(table, spec.name, match[1].trim());
        }
    }
});
}

/**
* Ajoute le produit au panier
*/
function addToCart(quantity) {
// Récupérer l'ID du produit depuis l'URL
const params = new URLSearchParams(window.location.search);
const productId = params.get('id');

if (!productId) {
    showNotification("Impossible d'ajouter au panier: produit invalide", 'error');
    return;
}

// Récupérer le panier actuel du localStorage
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// Vérifier si le produit est déjà dans le panier
const existingItem = cart.find(item => item.id === productId);

if (existingItem) {
    // Mettre à jour la quantité
    existingItem.quantity += quantity;
} else {
    // Ajouter le produit au panier
    const product = {
        id: productId,
        name: document.getElementById('product-title').textContent,
        price: parseFloat(document.getElementById('product-price').textContent),
        quantity: quantity,
        image: document.getElementById('product-main-image').src
    };
    
    cart.push(product);
}

// Enregistrer le panier mis à jour
localStorage.setItem('cart', JSON.stringify(cart));

// Mettre à jour le compteur du panier
updateCartCount();

// Afficher une notification
showNotification('Produit ajouté au panier avec succès', 'success');
}

/**
* Met à jour le compteur d'articles dans le panier
*/
function updateCartCount() {
const cart = JSON.parse(localStorage.getItem('cart')) || [];
const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
const totalPrice = cart.reduce((total, item) => total + (item.price * item.quantity), 0);

// Mettre à jour le compteur
const cartCountElement = document.getElementById('cart-count');
if (cartCountElement) {
    cartCountElement.textContent = totalItems;
}

// Mettre à jour le prix total
const cartTotalElement = document.getElementById('cart-total');
if (cartTotalElement) {
    cartTotalElement.textContent = totalPrice.toFixed(2) + ' €';
}
}

/**
* Affiche une notification à l'utilisateur
*/
function showNotification(message, type = 'info') {
// Supprimer les notifications existantes
const existingNotifications = document.querySelectorAll('.notification');
existingNotifications.forEach(notif => notif.remove());

// Créer la notification
const notification = document.createElement('div');
notification.className = `notification ${type}`;
notification.innerHTML = message;

// Styles pour la notification
Object.assign(notification.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '15px 20px',
    borderRadius: '4px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    zIndex: '9999',
    backgroundColor: type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3',
    color: 'white',
    maxWidth: '300px'
});

// Ajouter au DOM
document.body.appendChild(notification);

// Disparition automatique
setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(100%)';
    notification.style.transition = 'all 0.5s ease';
    
    setTimeout(() => notification.remove(), 500);
}, 3000);
}

/**
* Affiche un message d'erreur et cache le contenu du produit
*/
function showError(message) {
// Cacher l'indicateur de chargement
document.getElementById('loading-indicator').style.display = 'none';

// Afficher le message d'erreur
const errorContainer = document.getElementById('error-message');
errorContainer.style.display = 'block';

const errorMessage = errorContainer.querySelector('p');
if (errorMessage) {
    errorMessage.textContent = message || "Désolé, nous n'avons pas pu charger les informations du produit.";
}
}

// Appeler updateCartCount au chargement pour initialiser le compteur
updateCartCount();