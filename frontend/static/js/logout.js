// Dans un fichier logout.js pour la déconnexion
import session from './session.js';

async function logout() {
    await session.handleLogout(); // Gère proprement la déconnexion via SessionManager
    window.location.href = '/index.html';
}

logout();