document.addEventListener("DOMContentLoaded", function() {
    const tabs = document.querySelectorAll(".profile-nav a");
    const sections = document.querySelectorAll(".profile-section");

    tabs.forEach(tab => {
        tab.addEventListener("click", function(event) {
            event.preventDefault();
            const targetId = this.getAttribute("data-tab");

            tabs.forEach(t => t.classList.remove("active"));
            sections.forEach(section => section.classList.remove("active"));

            this.classList.add("active");
            document.getElementById(targetId).classList.add("active");
        });
    });

    document.getElementById("profile-form").addEventListener("submit", function(event) {
        event.preventDefault();
        alert("Profil mis à jour avec succès !");
    });

    document.getElementById("password-form").addEventListener("submit", function(event) {
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
