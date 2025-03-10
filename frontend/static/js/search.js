// static/js/search.js
document.addEventListener('DOMContentLoaded', function() {
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    
    if (searchForm) {
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const query = searchInput.value.trim();
            if (query.length < 2) {
                // Afficher un message si la requête est trop courte
                alert('Veuillez entrer au moins 2 caractères pour la recherche');
                return;
            }
            
            // Rediriger vers la page de résultats de recherche
            window.location.href = `/pages/search-results.html?q=${encodeURIComponent(query)}`;
        });
    }
});