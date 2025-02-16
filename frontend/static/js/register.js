// frontend/static/js/register.js

/**
 * Gestionnaire du formulaire d'inscription
 */
document.addEventListener('DOMContentLoaded', function() {
    // Récupération des éléments du DOM
    const registerForm = document.getElementById('register-form');
    const passwordInput = document.getElementById('password');
    const passwordConfirmInput = document.getElementById('password-confirm');
    const togglePasswordBtn = document.querySelector('.toggle-password');
    const strengthMeter = document.querySelector('.strength-meter');
    const strengthText = document.querySelector('.strength-text');

    // Gestion de l'affichage/masquage du mot de passe
    if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', function() {
            const type = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = type;
            this.querySelector('.eye-icon').textContent = type === 'password' ? '👁️' : '👁️‍🗨️';
        });
    }

    // Validation en temps réel du mot de passe
    if (passwordInput) {
        passwordInput.addEventListener('input', function() {
            const strength = checkPasswordStrength(this.value);
            updatePasswordStrengthIndicator(strength);
        });
    }

    // Validation en temps réel de la confirmation du mot de passe
    if (passwordConfirmInput) {
        passwordConfirmInput.addEventListener('input', function() {
            validatePasswordMatch(passwordInput.value, this.value);
        });
    }

    // Gestion de la soumission du formulaire
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Validation finale avant envoi
            if (!validateForm(this)) {
                return;
            }

            try {
                const formData = {
                    firstname: this.firstname.value.trim(),
                    lastname: this.lastname.value.trim(),
                    email: this.email.value.trim(),
                    password: this.password.value,
                    newsletter: this.newsletter.checked
                };

                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Erreur lors de l\'inscription');
                }

                // Stockage du token et redirection
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                
                // Redirection vers la page d'accueil
                window.location.href = '/';

            } catch (error) {
                showError(error.message);
            }
        });
    }
});

/**
 * Vérifie la force du mot de passe
 * @param {string} password - Mot de passe à vérifier
 * @returns {Object} - Score et feedback sur la force du mot de passe
 */
function checkPasswordStrength(password) {
    let score = 0;
    let feedback = [];

    // Longueur minimale
    if (password.length >= 8) {
        score++;
    } else {
        feedback.push('8 caractères minimum');
    }

    // Présence de majuscules
    if (/[A-Z]/.test(password)) {
        score++;
    } else {
        feedback.push('Au moins 1 majuscule');
    }

    // Présence de minuscules
    if (/[a-z]/.test(password)) {
        score++;
    } else {
        feedback.push('Au moins 1 minuscule');
    }

    // Présence de chiffres
    if (/\d/.test(password)) {
        score++;
    } else {
        feedback.push('Au moins 1 chiffre');
    }

    // Présence de caractères spéciaux
    if (/[^A-Za-z0-9]/.test(password)) {
        score++;
    } else {
        feedback.push('Au moins 1 caractère spécial');
    }

    return {
        score: score,
        feedback: feedback
    };
}

/**
 * Met à jour l'indicateur de force du mot de passe
 * @param {Object} strength - Résultat de checkPasswordStrength
 */
function updatePasswordStrengthIndicator(strength) {
    const strengthMeter = document.querySelector('.strength-meter');
    const strengthText = document.querySelector('.strength-text');

    // Suppression des classes existantes
    strengthMeter.className = 'strength-meter';

    // Ajout de la nouvelle classe selon le score
    if (strength.score === 0) {
        strengthMeter.classList.add('very-weak');
        strengthText.textContent = 'Très faible';
    } else if (strength.score <= 2) {
        strengthMeter.classList.add('weak');
        strengthText.textContent = 'Faible';
    } else if (strength.score <= 3) {
        strengthMeter.classList.add('medium');
        strengthText.textContent = 'Moyen';
    } else if (strength.score <= 4) {
        strengthMeter.classList.add('strong');
        strengthText.textContent = 'Fort';
    } else {
        strengthMeter.classList.add('very-strong');
        strengthText.textContent = 'Très fort';
    }

    // Affichage du feedback si nécessaire
    if (strength.feedback.length > 0) {
        strengthText.textContent += ` (${strength.feedback.join(', ')})`;
    }
}

/**
 * Valide la correspondance des mots de passe
 * @param {string} password - Mot de passe original
 * @param {string} confirmation - Confirmation du mot de passe
 */
function validatePasswordMatch(password, confirmation) {
    const confirmInput = document.getElementById('password-confirm');
    const matchFeedback = document.querySelector('.password-match-feedback');

    if (password !== confirmation) {
        confirmInput.classList.add('error');
        if (!matchFeedback) {
            const feedback = document.createElement('small');
            feedback.className = 'password-match-feedback error-text';
            feedback.textContent = 'Les mots de passe ne correspondent pas';
            confirmInput.parentNode.appendChild(feedback);
        }
    } else {
        confirmInput.classList.remove('error');
        if (matchFeedback) {
            matchFeedback.remove();
        }
    }
}

/**
 * Valide l'ensemble du formulaire
 * @param {HTMLFormElement} form - Formulaire à valider
 * @returns {boolean} - True si le formulaire est valide
 */
function validateForm(form) {
    // Validation du prénom et nom
    if (form.firstname.value.trim().length < 2) {
        showError('Le prénom doit contenir au moins 2 caractères');
        return false;
    }

    if (form.lastname.value.trim().length < 2) {
        showError('Le nom doit contenir au moins 2 caractères');
        return false;
    }

    // Validation de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email.value.trim())) {
        showError('Adresse email invalide');
        return false;
    }

    // Validation du mot de passe
    const passwordStrength = checkPasswordStrength(form.password.value);
    if (passwordStrength.score < 3) {
        showError('Le mot de passe est trop faible');
        return false;
    }

    // Validation de la confirmation du mot de passe
    if (form.password.value !== form['password-confirm'].value) {
        showError('Les mots de passe ne correspondent pas');
        return false;
    }

    // Validation des conditions d'utilisation
    if (!form.terms.checked) {
        showError('Vous devez accepter les conditions d\'utilisation');
        return false;
    }

    return true;
}

/**
 * Affiche un message d'erreur
 * @param {string} message - Message d'erreur à afficher
 */
function showError(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';

    // Masquage automatique après 3 secondes
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 3000);
}