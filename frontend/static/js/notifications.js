// frontend/static/js/notifications.js

/**
 * Gestionnaire de notifications
 * Permet d'afficher des messages de notification à l'utilisateur
 */
class NotificationManager {
    constructor() {
        this.container = null;
        this.queue = [];
        this.maxVisible = 3;
        this.currentVisible = 0;
        this.initialize();
    }

    /**
     * Initialise le gestionnaire de notifications
     */
    initialize() {
        // Création du conteneur s'il n'existe pas
        if (!document.getElementById('notification-container')) {
            this.container = document.createElement('div');
            this.container.id = 'notification-container';
            this.container.className = 'notification-container';
            document.body.appendChild(this.container);
        } else {
            this.container = document.getElementById('notification-container');
        }
    }

    /**
     * Crée une nouvelle notification
     * @param {Object} options - Options de la notification
     * @param {string} options.type - Type de notification ('success', 'error', 'warning', 'info')
     * @param {string} options.title - Titre de la notification
     * @param {string} options.message - Message de la notification
     * @param {number} [options.duration=5000] - Durée d'affichage en ms
     */
    create({ type = 'info', title, message, duration = 5000 }) {
        const notification = {
            id: Date.now(),
            type,
            title,
            message,
            duration
        };

        // Ajout à la file d'attente
        this.queue.push(notification);
        this.processQueue();
    }

    /**
     * Traite la file d'attente des notifications
     */
    processQueue() {
        // Vérifie si on peut afficher plus de notifications
        if (this.currentVisible >= this.maxVisible || this.queue.length === 0) {
            return;
        }

        const notification = this.queue.shift();
        this.show(notification);
    }

    /**
     * Affiche une notification
     * @param {Object} notification - Notification à afficher
     */
    show(notification) {
        this.currentVisible++;

        // Création de l'élément de notification
        const element = document.createElement('div');
        element.className = `notification ${notification.type}`;
        element.innerHTML = `
            <div class="notification-icon">
                ${this.getIconForType(notification.type)}
            </div>
            <div class="notification-content">
                <div class="notification-title">${notification.title}</div>
                <div class="notification-message">${notification.message}</div>
            </div>
            <button class="notification-close">&times;</button>
            <div class="notification-progress"></div>
        `;

        // Ajout au conteneur
        this.container.appendChild(element);

        // Gestion de la barre de progression
        const progress = element.querySelector('.notification-progress');
        progress.style.width = '100%';
        progress.style.transition = `width ${notification.duration}ms linear`;
        setTimeout(() => {
            progress.style.width = '0%';
        }, 50);

        // Suppression automatique
        const timeout = setTimeout(() => {
            this.remove(element, notification.id);
        }, notification.duration);

        // Gestion du bouton de fermeture
        const closeButton = element.querySelector('.notification-close');
        closeButton.addEventListener('click', () => {
            clearTimeout(timeout);
            this.remove(element, notification.id);
        });

        // Pause au survol
        element.addEventListener('mouseenter', () => {
            clearTimeout(timeout);
            progress.style.transition = 'none';
        });

        element.addEventListener('mouseleave', () => {
            const remainingWidth = progress.offsetWidth;
            const remainingTime = (remainingWidth / element.offsetWidth) * notification.duration;
            progress.style.transition = `width ${remainingTime}ms linear`;
            progress.style.width = '0%';
            
            const newTimeout = setTimeout(() => {
                this.remove(element, notification.id);
            }, remainingTime);
        });
    }

    /**
     * Supprime une notification
     * @param {HTMLElement} element - Élément à supprimer
     * @param {number} id - ID de la notification
     */
    remove(element, id) {
        element.classList.add('removing');
        
        element.addEventListener('animationend', () => {
            element.remove();
            this.currentVisible--;
            this.processQueue();
        });
    }

    /**
     * Retourne l'icône correspondant au type de notification
     * @param {string} type - Type de notification
     * @returns {string} Code HTML de l'icône
     */
    getIconForType(type) {
        const icons = {
            success: '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>',
            error: '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>',
            warning: '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M12 2L1 21h22L12 2zm1 14h-2v2h2v-2zm0-6h-2v4h2v-4z"/></svg>',
            info: '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>'
        };
        
        return icons[type] || icons.info;
    }
}

// Export de l'instance
export const notifications = new NotificationManager();