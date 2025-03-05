// ============================================================================
//                         GESTION DES UTILISATEURS (ADMIN)
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
    // ============================================================================
    //                         RÉFÉRENCES AUX ÉLÉMENTS DOM
    // ============================================================================
    const usersList = document.getElementById('users-list');
    const addUserBtn = document.getElementById('add-user-btn');
    const userModal = document.getElementById('user-modal');
    const deleteModal = document.getElementById('delete-modal');
    const userForm = document.getElementById('user-form');
    const confirmDeleteBtn = document.getElementById('confirm-delete');
    const searchBtn = document.getElementById('search-btn');
    const searchInput = document.getElementById('search-input');
    const paginationContainer = document.getElementById('pagination');
    const notificationContainer = document.getElementById('notification');
    const logoutBtn = document.getElementById('logout-btn');

    // ============================================================================
    //                         VARIABLES GLOBALES
    // ============================================================================
    let currentPage = 1;
    let totalPages = 1;
    let perPage = 10;
    let searchTerm = '';
    let userToDelete = null;
    const API_URL = 'http://127.0.0.1:5000';

    // ============================================================================
    //                         INITIALISATION
    // ============================================================================
    init();

    // Fonction d'initialisation principale
    function init() {
        console.log("Initialisation de la gestion des utilisateurs admin");
        
        // Pas de vérification d'authentification pour le moment
        // Utiliser directement le token stocké
        
        // Charger les utilisateurs
        loadUsers();
        
        // Configuration des événements
        setupEventListeners();
    }

    // ============================================================================
    //                         AUTHENTIFICATION & SÉCURITÉ
    // ============================================================================
    
    // Fonction pour récupérer le token stocké
    function getToken() {
        return localStorage.getItem('token');
    }

    // ============================================================================
    //                         GESTION DES ÉVÉNEMENTS
    // ============================================================================
    
    // Configuration de tous les écouteurs d'événements
    function setupEventListeners() {
        // Bouton d'ajout d'utilisateur
        if (addUserBtn) {
            addUserBtn.addEventListener('click', function() {
                openUserModal();
            });
        }
        
        // Recherche
        if (searchBtn && searchInput) {
            searchBtn.addEventListener('click', handleSearch);
            searchInput.addEventListener('keyup', function(e) {
                if (e.key === 'Enter') handleSearch();
            });
        }
        
        // Formulaire utilisateur
        if (userForm) {
            userForm.addEventListener('submit', handleUserFormSubmit);
        }
        
        // Fermeture des modals
        document.querySelectorAll('.close, .close-modal').forEach(el => {
            el.addEventListener('click', closeModals);
        });
        
        // Confirmation de suppression
        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', confirmDeleteUser);
        }
        
        // Bouton de copie du mot de passe généré
        const copyPasswordBtn = document.getElementById('copy-password');
        if (copyPasswordBtn) {
            copyPasswordBtn.addEventListener('click', copyGeneratedPassword);
        }
        
        // Fermeture des modals en cliquant en dehors
        window.addEventListener('click', function(e) {
            if (e.target.classList.contains('modal')) {
                closeModals();
            }
        });
        
        // Déconnexion
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function() {
                localStorage.removeItem('token');
                localStorage.removeItem('userData');
                window.location.href = '/pages/login.html';
            });
        }
    }

    // ============================================================================
    //                         CHARGEMENT DES DONNÉES
    // ============================================================================
    
    // Chargement de la liste des utilisateurs avec pagination
    function loadUsers() {
        if (!usersList) return;
        
        const token = getToken();
        
        // Affichage du chargement
        usersList.innerHTML = `<tr><td colspan="7" class="loading">Chargement des utilisateurs...</td></tr>`;
        
        // URL avec paramètres
        let url = `${API_URL}/api/admin/users?page=${currentPage}&per_page=${perPage}`;
        if (searchTerm) {
            url += `&search=${encodeURIComponent(searchTerm)}`;
        }
        
        console.log("Token utilisé:", token);
        console.log("URL de chargement:", url);
        
        fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                console.error("Erreur HTTP:", response.status);
                throw new Error('Erreur lors du chargement des utilisateurs');
            }
            return response.json();
        })
        .then(data => {
            console.log("Données reçues:", data);
            totalPages = data.pages || 1;
            displayUsers(data.users || []);
            updatePagination();
        })
        .catch(error => {
            console.error('Erreur:', error);
            if (usersList) {
                usersList.innerHTML = `<tr><td colspan="7" class="error">Erreur: ${error.message}</td></tr>`;
            }
            showNotification(error.message, 'error');
        });
    }

    // ============================================================================
    //                         AFFICHAGE & RENDU
    // ============================================================================
    
    // Affichage des utilisateurs dans le tableau
    function displayUsers(users) {
        if (!usersList) return;
        
        if (users.length === 0) {
            usersList.innerHTML = `<tr><td colspan="7" class="empty">Aucun utilisateur trouvé</td></tr>`;
            return;
        }
        
        let html = '';
        users.forEach(user => {
            html += `
                <tr class="${!user.is_active ? 'inactive' : ''}">
                    <td>${user.id}</td>
                    <td>${user.firstname} ${user.lastname}</td>
                    <td>${user.email}</td>
                    <td>
                        <span class="status-badge ${user.is_active ? 'active' : 'inactive'}">
                            ${user.is_active ? 'Actif' : 'Inactif'}
                        </span>
                    </td>
                    <td>
                        <span class="role-badge ${user.is_admin ? 'admin' : 'user'}">
                            ${user.is_admin ? 'Admin' : 'Client'}
                        </span>
                    </td>
                    <td>${formatDate(user.created_at)}</td>
                    <td class="actions">
                        <button class="btn-icon edit" onclick="editUser(${user.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon delete" onclick="deleteUser(${user.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        usersList.innerHTML = html;
    }

    // Mise à jour des contrôles de pagination
    function updatePagination() {
        if (!paginationContainer) return;
        
        if (totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }
        
        let html = `
            <button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
                &laquo; Précédent
            </button>
        `;
        
        // Générer les numéros de page
        const maxPages = 5;
        const startPage = Math.max(1, currentPage - Math.floor(maxPages / 2));
        const endPage = Math.min(totalPages, startPage + maxPages - 1);
        
        for (let i = startPage; i <= endPage; i++) {
            html += `
                <button onclick="changePage(${i})" class="${i === currentPage ? 'active' : ''}">
                    ${i}
                </button>
            `;
        }
        
        html += `
            <button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
                Suivant &raquo;
            </button>
        `;
        
        paginationContainer.innerHTML = html;
    }

    // ============================================================================
    //                         FONCTIONS DE NAVIGATION
    // ============================================================================
    
    // Changement de page (exposée globalement)
    window.changePage = function(page) {
        if (page < 1 || page > totalPages) return;
        
        currentPage = page;
        loadUsers();
    };

    // Gestion de la recherche
    function handleSearch() {
        if (!searchInput) return;
        
        searchTerm = searchInput.value.trim();
        currentPage = 1;
        loadUsers();
    }

    // ============================================================================
    //                         GESTION DES FORMULAIRES
    // ============================================================================
    
    // Ouverture du modal utilisateur (création ou édition)
    function openUserModal(user = null) {
        if (!userModal) return;
        
        const form = document.getElementById('user-form');
        const modalTitle = document.getElementById('modal-title');
        
        if (!form || !modalTitle) return;
        
        // Réinitialiser le formulaire
        form.reset();
        document.getElementById('user-id').value = '';
        
        // Cacher le message de mot de passe généré
        const passwordGeneratedContainer = document.getElementById('password-generated');
        if (passwordGeneratedContainer) {
            passwordGeneratedContainer.style.display = 'none';
        }
        
        if (user) {
            // Mode édition
            modalTitle.textContent = `Modifier l'utilisateur`;
            document.getElementById('user-id').value = user.id;
            document.getElementById('email').value = user.email;
            document.getElementById('firstname').value = user.firstname;
            document.getElementById('lastname').value = user.lastname;
            document.getElementById('is-active').checked = user.is_active;
            document.getElementById('is-admin').checked = user.is_admin;
            document.getElementById('is-verified').checked = user.is_verified;
        } else {
            // Mode création
            modalTitle.textContent = 'Ajouter un utilisateur';
            document.getElementById('is-active').checked = true;
            document.getElementById('is-admin').checked = false;
            document.getElementById('is-verified').checked = false;
        }
        
        // Afficher le modal
        userModal.style.display = 'block';
    }

    // ============================================================================
    //                         OPÉRATIONS CRUD UTILISATEURS
    // ============================================================================
    
    // Récupération des données d'un utilisateur pour édition
    window.editUser = function(userId) {
        const token = getToken();
        
        fetch(`${API_URL}/api/admin/users/${userId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) throw new Error('Erreur lors du chargement des données utilisateur');
            return response.json();
        })
        .then(user => {
            openUserModal(user);
        })
        .catch(error => {
            console.error('Erreur:', error);
            showNotification(error.message, 'error');
        });
    };

    // Soumission du formulaire (création/modification)
    function handleUserFormSubmit(event) {
        event.preventDefault();
        
        const token = getToken();
        const userId = document.getElementById('user-id').value;
        const isCreating = !userId;
        
        // Récupération des données du formulaire
        const userData = {
            email: document.getElementById('email').value,
            firstname: document.getElementById('firstname').value,
            lastname: document.getElementById('lastname').value,
            password: document.getElementById('password').value || undefined,
            is_active: document.getElementById('is-active').checked,
            is_admin: document.getElementById('is-admin').checked,
            is_verified: document.getElementById('is-verified').checked
        };
        
        // URL et méthode
        const url = isCreating ? 
            `${API_URL}/api/admin/users` : 
            `${API_URL}/api/admin/users/${userId}`;
            
        const method = isCreating ? 'POST' : 'PUT';
        
        console.log(`${method} request to ${url}`, userData);
        
        fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(userData)
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || 'Erreur lors de l\'enregistrement');
                });
            }
            return response.json();
        })
        .then(data => {
            if (data.generated_password) {
                // Afficher le mot de passe généré
                const generatedPasswordElement = document.getElementById('generated-password');
                const passwordGeneratedContainer = document.getElementById('password-generated');
                
                if (generatedPasswordElement && passwordGeneratedContainer) {
                    generatedPasswordElement.textContent = data.generated_password;
                    passwordGeneratedContainer.style.display = 'block';
                }
            } else {
                // Fermer le modal
                closeModals();
                showNotification(
                    isCreating ? 'Utilisateur créé avec succès' : 'Utilisateur modifié avec succès',
                    'success'
                );
            }
            
            // Recharger la liste
            loadUsers();
        })
        .catch(error => {
            console.error('Erreur:', error);
            showNotification(error.message, 'error');
        });
    }

    // Préparation de la suppression d'un utilisateur
    window.deleteUser = function(userId) {
        if (!deleteModal) return;
        
        userToDelete = userId;
        
        const hardDeleteCheckbox = document.getElementById('hard-delete');
        if (hardDeleteCheckbox) {
            hardDeleteCheckbox.checked = false;
        }
        
        deleteModal.style.display = 'block';
    };

    // Confirmation de la suppression d'un utilisateur
    function confirmDeleteUser() {
        if (!userToDelete) return;
        
        const token = getToken();
        const hardDelete = document.getElementById('hard-delete')?.checked || false;
        
        fetch(`${API_URL}/api/admin/users/${userToDelete}?soft=${!hardDelete}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || 'Erreur lors de la suppression');
                });
            }
            return response.json();
        })
        .then(data => {
            closeModals();
            showNotification(data.message || 'Utilisateur supprimé', 'success');
            loadUsers();
        })
        .catch(error => {
            console.error('Erreur:', error);
            showNotification(error.message, 'error');
        });
    }

    // ============================================================================
    //                         UTILITAIRES D'INTERFACE
    // ============================================================================
    
    // Fermeture des fenêtres modales
    function closeModals() {
        if (userModal) userModal.style.display = 'none';
        if (deleteModal) deleteModal.style.display = 'none';
    }

    // Copie du mot de passe généré dans le presse-papiers
    function copyGeneratedPassword() {
        const generatedPasswordElement = document.getElementById('generated-password');
        if (!generatedPasswordElement) return;
        
        const password = generatedPasswordElement.textContent;
        
        navigator.clipboard.writeText(password).then(
            function() {
                const button = document.getElementById('copy-password');
                if (button) {
                    const originalText = button.textContent;
                    button.textContent = 'Copié!';
                    
                    setTimeout(() => {
                        button.textContent = originalText;
                    }, 2000);
                }
            },
            function() {
                showNotification('Impossible de copier le mot de passe', 'error');
            }
        );
    }

    // Affichage d'une notification temporaire
    function showNotification(message, type = 'info') {
        if (!notificationContainer) return;
        
        notificationContainer.textContent = message;
        notificationContainer.className = `notification ${type}`;
        notificationContainer.style.display = 'block';
        
        // Cacher après 3 secondes
        setTimeout(() => {
            notificationContainer.style.display = 'none';
        }, 3000);
    }

    // Formatage d'une date pour l'affichage
    function formatDate(dateString) {
        if (!dateString) return '';
        
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
});