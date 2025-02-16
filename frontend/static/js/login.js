import { session } from './session.js';
import { notifications } from './notifications.js';

async function handleLogin(credentials) {
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(credentials)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error);
        }

        // Gestion de la connexion
        session.handleLogin(data);

        // Notification de succès
        notifications.create({
            type: 'success',
            title: 'Connexion réussie',
            message: `Bienvenue, ${data.user.firstname}!`
        });

        // Redirection
        window.location.href = '/';

    } catch (error) {
        notifications.create({
            type: 'error',
            title: 'Erreur de connexion',
            message: error.message
        });
    }
}