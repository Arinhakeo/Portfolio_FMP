document.addEventListener("DOMContentLoaded", function () {
    // Gestion des onglets principaux
    const mainTabs = document.querySelectorAll(".profile-nav button");
    const mainSections = document.querySelectorAll(".profile-section");

    mainTabs.forEach((tab) => {
        tab.addEventListener("click", function () {
            const targetId = this.getAttribute("data-tab");

            mainTabs.forEach((t) => t.classList.remove("active"));
            mainSections.forEach((section) => section.classList.remove("active"));

            this.classList.add("active");
            document.getElementById(targetId).classList.add("active");
        });
    });

    // Gestion du formulaire de profil
    document.getElementById('profile-form').addEventListener('submit', async (event) => {
        event.preventDefault();
    
        const updatedProfile = {
            firstname: document.getElementById('firstname').value,
            lastname: document.getElementById('lastname').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            address: {
                street: document.getElementById('address-street').value,
                city: document.getElementById('address-city').value,
                zip: document.getElementById('address-zip').value,
                country: document.getElementById('address-country').value,
            },
        };
    
        try {
            const response = await fetch('/api/auth/me', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify(updatedProfile),
            });
    
            if (!response.ok) {
                throw new Error('Erreur lors de la mise à jour du profil');
            }
    
            const result = await response.json();
            alert('Profil mis à jour avec succès !');
            console.log(result);
        } catch (error) {
            console.error('Erreur:', error);
            alert('Échec de la mise à jour du profil.');
        }
    });

    // Gestion du formulaire de mot de passe
    document.getElementById("password-form").addEventListener("submit", function (event) {
        event.preventDefault();
        const newPassword = document.getElementById("new-password").value;
        const confirmPassword = document.getElementById("confirm-password").value;

        if (newPassword === confirmPassword) {
            alert("Mot de passe changé avec succès !");
        } else {
            alert("Les mots de passe ne correspondent pas.");
        }
    });
});