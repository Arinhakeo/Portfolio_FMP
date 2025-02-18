// Dans un fichier logout.js pour la déconnexion
function logout() {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_info');
    window.location.href = '/login';
}