// frontend/static/js/verify-email.js

document.addEventListener('DOMContentLoaded', function() {
    // Initialisation des éléments
    const resendButton = document.getElementById('resend-button');
    const timerDisplay = document.getElementById('timer');
    
    // Récupération du token dans l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    // Si on a un token, on tente de vérifier l'email
    if (token) {
        verifyEmail(token);
    } else {
        // Sinon on affiche l'état initial
        showVerificationState('pending');
        startResendTimer();
    }
    
    // Gestionnaire pour le renvoi d'email
    if (resendButton) {
        resendButton.addEventListener('click', handleResendEmail);
    }
});

/**
 * Affiche l'état de vérification approprié
 * @param {string} state - État à afficher ('pending', 'success', 'error')
 * @param {string} [message] - Message optionnel d'erreur
 */
function showVerificationState(state, message = '') {
    // Cache tous les états
    document.querySelectorAll('.verification-state').forEach(el => {
        el.style.display = 'none';
    });
    
    // Affiche l'état demandé
    const stateElement = document.getElementById(`verification-${state}`);
    if (stateElement) {
        stateElement.style.display = 'block';
    }
    
    // Met à jour le message d'erreur si nécessaire
    if (state === 'error' && message) {
        document.getElementById('error-message').textContent = message;
    }
}

/**
 * Démarre le minuteur pour le renvoi d'email
 */
function startResendTimer() {
    let timeLeft = 120; // 2 minutes
    const timerDisplay = document.getElementById('timer');
    const resendButton = document.getElementById('resend-button');
    
    const timer = setInterval(() => {
        timeLeft--;
        
        // Mise à jour de l'affichage
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerDisplay.textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Fin du timer
        if (timeLeft <= 0) {
            clearInterval(timer);
            resendButton.disabled = false;
            timerDisplay.parentElement.style.display = 'none';
        }
    }, 1000);
}

/**
 * Vérifie le token d'email
 * @param {string} token - Token de vérification
 */
async function verifyEmail(token) {
    try {
        const response = await fetch('/api/auth/verify-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Erreur de vérification');
        }
        
        // Affichage du succès
        showVerificationState('success');
        
    } catch (error) {
        showVerificationState('error', error.message);
    }
}

/**
 * Gère le renvoi de l'email de vérification
 */
async function handleResendEmail() {
    const button = document.getElementById('resend-button');
    button.disabled = true;
    
    try {
        const response = await fetch('/api/auth/resend-verification', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Erreur lors du renvoi');
        }
        
        // Réinitialisation du timer
        startResendTimer();
        document.querySelector('.resend-timer').style.display = 'block';
        
    } catch (error) {
        showVerificationState('error', error.message);
    }
}