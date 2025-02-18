// frontend/static/js/forgot-password.js

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('forgot-password-form');
    const statusMessage = document.getElementById('status-message');

    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();

            try {
                // Désactivation du formulaire pendant la requête
                form.classList.add('loading');
                form.querySelector('button').disabled = true;

                const email = this.email.value.trim();

                const response = await fetch('/api/auth/forgot-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Une erreur est survenue');
                }

                // Affichage du message de succès
                showStatus('success',
                    'Un email contenant les instructions de réinitialisation ' +
                    'vous a été envoyé. Vérifiez votre boîte de réception.'
                );

                // Réinitialisation du formulaire
                form.reset();

            } catch (error) {
                showStatus('error', error.message);
            } finally {
                // Réactivation du formulaire
                form.classList.remove('loading');
                form.querySelector('button').disabled = false;
            }
        });
    }
});

/**
 * Affiche un message de statut
 * @param {string} type - Type de message ('success', 'error', 'info')
 * @param {string} message - Contenu du message
 */
function showStatus(type, message) {
    const statusDiv = document.getElementById('status-message');
    statusDiv.className = `status-message ${type}`;
    statusDiv.textContent = message;
    statusDiv.style.display = 'block';

    if (type === 'success') {
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 5000);
    }
}