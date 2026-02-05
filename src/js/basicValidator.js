;(function() {
    document.addEventListener('DOMContentLoaded', () => {
        
        // --- 1. VALIDACIÓN DE CONTRASEÑAS (RECOVERY) ---
        const passwordAgain = document.getElementById('password_again');
        const password = document.getElementById('password');
        const btnRecuperar = document.getElementById('recuperar');

        
        if (passwordAgain && password && btnRecuperar) {
            const avisoPass = document.createElement('P');
            avisoPass.classList.add('btn-danger', 'text-sm', 'mt-2', 'hidden', 'font-bold');
            passwordAgain.parentElement.after(avisoPass);

            const validarPassword = () => {
                const valPass = password.value;
                const valPassAgain = passwordAgain.value;
                let errores = [];

                if (valPass.length < 5) errores.push("⚠️ La contraseñna debe ser de mínimo 5 caracteres.");
                if (valPass !== valPassAgain && valPassAgain.length > 0) errores.push("🚨 Las contraseñas no coinciden. 🚨");

                if (errores.length > 0) {
                    avisoPass.textContent = errores[0];
                    avisoPass.classList.remove('hidden');
                    btnRecuperar.disabled = true;
                    btnRecuperar.classList.add('opacity-50', 'cursor-not-allowed');
                } else if (valPass.length >= 5 && valPass === valPassAgain) {
                    avisoPass.classList.add('hidden');
                    btnRecuperar.disabled = false;
                    btnRecuperar.classList.remove('opacity-50', 'cursor-not-allowed');
                }
            };

            password.addEventListener('input', validarPassword);
            passwordAgain.addEventListener('input', validarPassword);
        }

        // --- 2. VALIDACIÓN DE EMAIL (FORGOT PASSWORD) ---
        const emailInput = document.getElementById('email');
        const btnForgot = document.getElementById('forgot');

        
        if (emailInput && btnForgot) {
            const avisoEmail = document.createElement('P');
            avisoEmail.classList.add('text-red-500', 'text-sm', 'mt-2', 'hidden', 'font-bold', 'text-center');
            emailInput.parentElement.after(avisoEmail);

            emailInput.addEventListener('input', () => {
                const email = emailInput.value.trim();
                const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

                if (email === "") {
                    avisoEmail.classList.add('hidden');
                    btnForgot.disabled = true;
                } else if (!regex.test(email)) {
                    avisoEmail.textContent = "⚠️ Complete correctamente el email ⚠️";
                    avisoEmail.classList.remove('hidden');
                    btnForgot.disabled = true;
                    btnForgot.classList.add('opacity-50', 'cursor-not-allowed');
                } else {
                    avisoEmail.classList.add('hidden');
                    btnForgot.disabled = false;
                    btnForgot.classList.remove('opacity-50', 'cursor-not-allowed');
                }
            });
        }
    });
})();