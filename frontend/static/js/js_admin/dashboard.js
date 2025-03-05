// static/js/js_admin/dashboard.js

import { session } from '../session.js';
import { config } from '../config.js';

/**
 * Classe de gestion du tableau de bord administrateur
 */
class DashboardManager {
    constructor() {
        this.apiBaseUrl = config.apiBaseUrl;
        this.statistics = {};
        this.recentOrders = [];
        this.lowStockProducts = [];
        this.recentActivities = [];
    }

    /**
     * Initialise le tableau de bord
     */
    async init() {
        try {
            console.log('Initialisation du tableau de bord...');
            
            // Vérification de l'authentification
            this.checkAuthentication();
            
            // Initialisation des éléments de l'interface
            this.initDOMElements();
            
            // Affichage de la date actuelle
            this.displayCurrentDate();
            
            // Chargement des données
            await Promise.all([
                this.loadStatistics(),
                this.loadRecentOrders(),
                this.loadLowStockProducts(),
                this.loadRecentActivities()
            ]);
            
            // Configuration de l'événement de déconnexion
            this.setupLogoutEvent();
            
            console.log('Tableau de bord initialisé avec succès');
        } catch (error) {
            console.error('Erreur lors de l\'initialisation du tableau de bord:', error);
            this.showNotification('Une erreur est survenue lors du chargement du tableau de bord.', 'error');
        }
    }

    /**
     * Vérifie l'authentification de l'utilisateur
     */
    checkAuthentication() {
        const userData = session.getUserData();
        
        if (!session.isAuthenticated()) {
            window.location.href = '/login';
            throw new Error('Utilisateur non authentifié');
        }
        
        if (!userData?.is_admin) {
            window.location.href = '/';
            throw new Error('Accès non autorisé - droits administrateur requis');
        }
    }

    /**
     * Initialise les références aux éléments DOM
     */
    initDOMElements() {
        // Date courante
        this.currentDateElement = document.getElementById('current-date');
        
        // Éléments de statistiques
        this.ordersCountElement = document.getElementById('orders-count');
        this.salesAmountElement = document.getElementById('sales-amount');
        this.productsCountElement = document.getElementById('products-count');
        this.usersCountElement = document.getElementById('users-count');
        
        // Conteneurs
        this.salesChartContainer = document.getElementById('sales-chart');
        this.recentOrdersContainer = document.getElementById('recent-orders');
        this.lowStockProductsContainer = document.getElementById('low-stock-products');
        this.recentActivitiesContainer = document.getElementById('recent-activities');
    }

    /**
     * Affiche la date actuelle
     */
    displayCurrentDate() {
        if (!this.currentDateElement) return;
        
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const today = new Date();
        
        this.currentDateElement.textContent = today.toLocaleDateString('fr-FR', options);
    }

    /**
     * Configure l'événement de déconnexion
     */
    setupLogoutEvent() {
        const logoutLink = document.getElementById('logout-link');
        
        if (logoutLink) {
            logoutLink.addEventListener('click', (e) => {
                e.preventDefault();
                session.logout();
                window.location.href = '/login';
            });
        }
    }

    /**
     * Charge les statistiques globales
     */
    async loadStatistics() {
        try {
            // Dans un environnement réel, remplacer par un appel API
            // const response = await fetch(`${this.apiBaseUrl}/admin/statistics`, {
            //     headers: {
            //         'Authorization': `Bearer ${session.getToken()}`
            //     }
            // });
            
            // if (!response.ok) {
            //     throw new Error(`Erreur HTTP: ${response.status}`);
            // }
            
            // this.statistics = await response.json();
            
            // Pour démonstration, utiliser des données fictives
            this.statistics = {
                ordersToday: 12,
                salesAmountToday: 1250.75,
                totalProducts: 124,
                activeProducts: 110,
                lowStockProducts: 8,
                totalUsers: 45,
                salesLastWeek: [
                    { date: '2023-03-01', amount: 950.25 },
                    { date: '2023-03-02', amount: 1050.75 },
                    { date: '2023-03-03', amount: 850.50 },
                    { date: '2023-03-04', amount: 1250.00 },
                    { date: '2023-03-05', amount: 1100.25 },
                    { date: '2023-03-06', amount: 950.00 },
                    { date: '2023-03-07', amount: 1200.25 }
                ]
            };
            
            this.updateStatisticsUI();
            this.renderSalesChart();
        } catch (error) {
            console.error('Erreur lors du chargement des statistiques:', error);
            this.showNotification('Erreur lors du chargement des statistiques', 'error');
        }
    }

    /**
     * Met à jour l'interface avec les statistiques
     */
    updateStatisticsUI() {
        if (this.ordersCountElement) {
            this.ordersCountElement.textContent = this.statistics.ordersToday || 0;
        }
        
        if (this.salesAmountElement) {
            const amount = this.statistics.salesAmountToday || 0;
            this.salesAmountElement.textContent = `${amount.toFixed(2)} €`;
        }
        
        if (this.productsCountElement) {
            this.productsCountElement.textContent = this.statistics.activeProducts || 0;
        }
        
        if (this.usersCountElement) {
            this.usersCountElement.textContent = this.statistics.totalUsers || 0;
        }
    }

    /**
     * Charge les commandes récentes
     */
    async loadRecentOrders() {
        try {
            // Dans un environnement réel, remplacer par un appel API
            // const response = await fetch(`${this.apiBaseUrl}/admin/orders/recent`, {
            //     headers: {
            //         'Authorization': `Bearer ${session.getToken()}`
            //     }
            // });
            
            // if (!response.ok) {
            //     throw new Error(`Erreur HTTP: ${response.status}`);
            // }
            
            // this.recentOrders = await response.json();
            
            // Pour démonstration, utiliser des données fictives
            this.recentOrders = [
                { id: 1045, customer: 'Dupont Jean', amount: 125.75, status: 'pending', date: '2023-03-07T14:35:00' },
                { id: 1044, customer: 'Martin Sophie', amount: 89.90, status: 'completed', date: '2023-03-07T10:22:00' },
                { id: 1043, customer: 'Leroy Thomas', amount: 230.50, status: 'processing', date: '2023-03-06T17:10:00' },
                { id: 1042, customer: 'Garcia Maria', amount: 45.00, status: 'completed', date: '2023-03-06T09:45:00' },
                { id: 1041, customer: 'Bernard Paul', amount: 178.25, status: 'completed', date: '2023-03-05T16:20:00' }
            ];
            
            this.renderRecentOrders();
        } catch (error) {
            console.error('Erreur lors du chargement des commandes récentes:', error);
            this.showNotification('Erreur lors du chargement des commandes récentes', 'error');
        }
    }

    /**
     * Affiche les commandes récentes dans le tableau
     */
    renderRecentOrders() {
        if (!this.recentOrdersContainer) return;
        
        // Vider le conteneur
        this.recentOrdersContainer.innerHTML = '';
        
        if (this.recentOrders.length === 0) {
            this.recentOrdersContainer.innerHTML = `
                <tr>
                    <td colspan="5" class="center">Aucune commande récente</td>
                </tr>
            `;
            return;
        }
        
        // Générer les lignes du tableau
        for (const order of this.recentOrders) {
            const statusClass = this.getStatusClass(order.status);
            const statusLabel = this.getStatusLabel(order.status);
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#${order.id}</td>
                <td>${order.customer}</td>
                <td>${order.amount.toFixed(2)} €</td>
                <td><span class="badge ${statusClass}">${statusLabel}</span></td>
                <td>${this.formatDate(order.date)}</td>
            `;
            
            this.recentOrdersContainer.appendChild(row);
        }
    }

    /**
     * Charge les produits à faible stock
     */
    async loadLowStockProducts() {
        try {
            // Dans un environnement réel, remplacer par un appel API
            // const response = await fetch(`${this.apiBaseUrl}/admin/products/low-stock`, {
            //     headers: {
            //         'Authorization': `Bearer ${session.getToken()}`
            //     }
            // });
            
            // if (!response.ok) {
            //     throw new Error(`Erreur HTTP: ${response.status}`);
            // }
            
            // this.lowStockProducts = await response.json();
            
            // Pour démonstration, utiliser des données fictives
            this.lowStockProducts = [
                { id: 201, name: 'Cartouche HP 305XL Noir', stock: 3, minStock: 5 },
                { id: 156, name: 'Cartouche Canon PG-545XL Noir', stock: 2, minStock: 5 },
                { id: 178, name: 'Cartouche Epson 603XL Cyan', stock: 4, minStock: 5 },
                { id: 289, name: 'Toner Brother TN-2420', stock: 1, minStock: 5 }
            ];
            
            this.renderLowStockProducts();
        } catch (error) {
            console.error('Erreur lors du chargement des produits à faible stock:', error);
            this.showNotification('Erreur lors du chargement des produits à faible stock', 'error');
        }
    }

    /**
     * Affiche les produits à faible stock dans le tableau
     */
    renderLowStockProducts() {
        if (!this.lowStockProductsContainer) return;
        
        // Vider le conteneur
        this.lowStockProductsContainer.innerHTML = '';
        
        if (this.lowStockProducts.length === 0) {
            this.lowStockProductsContainer.innerHTML = `
                <tr>
                    <td colspan="3" class="center">Aucun produit à faible stock</td>
                </tr>
            `;
            return;
        }
        
        // Générer les lignes du tableau
        for (const product of this.lowStockProducts) {
            const stockClass = product.stock <= 2 ? 'danger-text' : 'warning-text';
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${product.name}</td>
                <td class="${stockClass}">${product.stock} / ${product.minStock}</td>
                <td>
                    <a href="/admin/pages/products/edit.html?id=${product.id}" class="btn-link">
                        Voir
                    </a>
                </td>
            `;
            
            this.lowStockProductsContainer.appendChild(row);
        }
    }

    /**
     * Charge les activités récentes
     */
    async loadRecentActivities() {
        try {
            // Dans un environnement réel, remplacer par un appel API
            // const response = await fetch(`${this.apiBaseUrl}/admin/activities`, {
            //     headers: {
            //         'Authorization': `Bearer ${session.getToken()}`
            //     }
            // });
            
            // if (!response.ok) {
            //     throw new Error(`Erreur HTTP: ${response.status}`);
            // }
            
            // this.recentActivities = await response.json();
            
            // Pour démonstration, utiliser des données fictives
            this.recentActivities = [
                { type: 'order', message: 'Nouvelle commande #1045 passée par Dupont Jean', date: '2023-03-07T14:35:00' },
                { type: 'product', message: 'Produit "Cartouche HP 305XL Noir" mis à jour par Admin', date: '2023-03-07T11:20:00' },
                { type: 'user', message: 'Nouvel utilisateur "Sophie Martin" inscrit', date: '2023-03-07T09:15:00' },
                { type: 'order', message: 'Commande #1043 marquée comme "En traitement"', date: '2023-03-06T17:12:00' },
                { type: 'product', message: 'Nouveau produit "Toner Lexmark B222" ajouté par Admin', date: '2023-03-06T14:05:00' }
            ];
            
            this.renderRecentActivities();
        } catch (error) {
            console.error('Erreur lors du chargement des activités récentes:', error);
            this.showNotification('Erreur lors du chargement des activités récentes', 'error');
        }
    }

    /**
     * Affiche les activités récentes
     */
    renderRecentActivities() {
        if (!this.recentActivitiesContainer) return;
        
        // Vider le conteneur
        this.recentActivitiesContainer.innerHTML = '';
        
        if (this.recentActivities.length === 0) {
            this.recentActivitiesContainer.innerHTML = `
                <li class="activity-item">
                    <div class="activity-content">Aucune activité récente</div>
                </li>
            `;
            return;
        }
        
        // Générer les éléments de la liste
        for (const activity of this.recentActivities) {
            const iconClass = this.getActivityIconClass(activity.type);
            
            const item = document.createElement('li');
            item.className = 'activity-item';
            item.innerHTML = `
                <div class="activity-icon ${iconClass}">
                    ${this.getActivityIcon(activity.type)}
                </div>
                <div class="activity-content">
                    <div class="activity-title">${activity.message}</div>
                    <div class="activity-time">${this.formatTimeAgo(activity.date)}</div>
                </div>
            `;
            
            this.recentActivitiesContainer.appendChild(item);
        }
    }

    /**
     * Génère un graphique des ventes des 7 derniers jours
     */
    renderSalesChart() {
        if (!this.salesChartContainer) return;
        
        if (!this.statistics.salesLastWeek || this.statistics.salesLastWeek.length === 0) {
            this.salesChartContainer.innerHTML = '<div class="chart-placeholder">Aucune donnée disponible</div>';
            return;
        }
        
        // Ici, vous intégreriez une bibliothèque de graphiques réelle (Chart.js, D3, etc.)
        // Pour cette démo, nous allons créer un graphique simple en HTML/CSS
        
        const chartData = this.statistics.salesLastWeek;
        const maxValue = Math.max(...chartData.map(item => item.amount)) * 1.1; // +10% pour la marge
        
        // Créer un élément de conteneur de graphique
        const chartElement = document.createElement('div');
        chartElement.className = 'simple-chart';
        chartElement.style.cssText = `
            display: flex;
            height: 100%;
            align-items: flex-end;
            justify-content: space-between;
            padding-top: 20px;
        `;
        
        // Créer les barres du graphique
        chartData.forEach(item => {
            const barContainer = document.createElement('div');
            barContainer.className = 'chart-bar-container';
            barContainer.style.cssText = `
                display: flex;
                flex-direction: column;
                align-items: center;
                flex: 1;
            `;
            
            const barHeight = (item.amount / maxValue) * 100;
            
            const bar = document.createElement('div');
            bar.className = 'chart-bar';
            bar.style.cssText = `
                width: 50%;
                height: ${barHeight}%;
                background-color: var(--primary-color);
                border-radius: 4px 4px 0 0;
                position: relative;
            `;
            
            const tooltip = document.createElement('div');
            tooltip.className = 'chart-tooltip';
            tooltip.textContent = `${item.amount.toFixed(2)} €`;
            tooltip.style.cssText = `
                position: absolute;
                top: -25px;
                left: 50%;
                transform: translateX(-50%);
                background-color: var(--bg-dark);
                color: white;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 12px;
                opacity: 0;
                transition: opacity 0.2s;
            `;
            
            bar.appendChild(tooltip);
            bar.addEventListener('mouseover', () => {
                tooltip.style.opacity = '1';
            });
            bar.addEventListener('mouseout', () => {
                tooltip.style.opacity = '0';
            });
            
            const label = document.createElement('div');
            label.className = 'chart-label';
            label.textContent = this.formatShortDate(item.date);
            label.style.cssText = `
                margin-top: 8px;
                font-size: 12px;
                color: var(--text-secondary);
            `;
            
            barContainer.appendChild(bar);
            barContainer.appendChild(label);
            
            chartElement.appendChild(barContainer);
        });
        
        // Remplacer le contenu du conteneur
        this.salesChartContainer.innerHTML = '';
        this.salesChartContainer.appendChild(chartElement);
    }

    /**
     * Obtient la classe CSS pour un statut de commande
     */
    getStatusClass(status) {
        switch (status) {
            case 'pending': return 'badge-warning';
            case 'processing': return 'badge-info';
            case 'completed': return 'badge-success';
            case 'cancelled': return 'badge-danger';
            default: return 'badge-secondary';
        }
    }

    /**
     * Obtient le libellé pour un statut de commande
     */
    getStatusLabel(status) {
        switch (status) {
            case 'pending': return 'En attente';
            case 'processing': return 'En traitement';
            case 'completed': return 'Terminée';
            case 'cancelled': return 'Annulée';
            default: return status;
        }
    }

    /**
     * Obtient la classe CSS pour une icône d'activité
     */
    getActivityIconClass(type) {
        switch (type) {
            case 'order': return 'bg-primary';
            case 'product': return 'bg-success';
            case 'user': return 'bg-info';
            default: return '';
        }
    }

    /**
     * Obtient l'icône pour un type d'activité
     */
    getActivityIcon(type) {
        switch (type) {
            case 'order': return '<i>📦</i>';
            case 'product': return '<i>📝</i>';
            case 'user': return '<i>👤</i>';
            default: return '<i>📌</i>';
        }
    }

    /**
     * Formate une date relative (il y a ...)
     */
    formatTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) {
            return 'il y a quelques instants';
        }
        
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) {
            return `il y a ${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''}`;
        }
        
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) {
            return `il y a ${diffInHours} heure${diffInHours > 1 ? 's' : ''}`;
        }
        
        return this.formatDate(dateString);
    }

    /**
     * Formate une date (JJ/MM/YYYY HH:MM)
     */
    formatDate(dateString) {
        const date = new Date(dateString);
        return `${date.toLocaleDateString('fr-FR')} ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    }

    /**
     * Formate une date courte (JJ/MM)
     */
    formatShortDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    }

    /**
     * Affiche une notification
     */
    showNotification(message, type = 'info') {
        // Créer l'élément de notification
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background-color: ${type === 'error' ? 'var(--error-color)' : 'var(--primary-color)'};
            color: white;
            border-radius: var(--border-radius);
            box-shadow: var(--shadow);
            z-index: 9999;
            opacity: 0;
            transform: translateY(-10px);
            transition: opacity 0.3s, transform 0.3s;
        `;
        
        // Ajouter au DOM
        document.body.appendChild(notification);
        
        // Afficher avec animation
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        }, 10);
        
        // Masquer après un délai
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-10px)';
            
            // Supprimer du DOM après la transition
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 5000);
    }
}

// Initialisation du gestionnaire de tableau de bord
document.addEventListener('DOMContentLoaded', () => {
    const dashboardManager = new DashboardManager();
    dashboardManager.init();
    
    // Exposer l'instance pour le débogage
    window.dashboardManager = dashboardManager;
});

export default DashboardManager;