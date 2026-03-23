import Swal from 'sweetalert2';

document.addEventListener('DOMContentLoaded', () => {
    const cfg = window.__SETTINGS__ || {};
    const csrf = cfg.csrfToken || document.querySelector('meta[name="csrf-token"]')?.content || '';

    // ─── DOM refs ───
    const inpNombre = document.getElementById('inp-nombre');
    const inpApellido = document.getElementById('inp-apellido');
    const inpWhatsapp = document.getElementById('inp-whatsapp');
    const inpInstagram = document.getElementById('inp-instagram');
    const inpTiktok = document.getElementById('inp-tiktok');
    const inpAvatar = document.getElementById('inp-avatar');
    const avatarImg = document.getElementById('avatar-img');
    const avatarSpinner = document.getElementById('avatar-spinner');

    const btnSave = document.getElementById('btn-save');
    const btnDiscard = document.getElementById('btn-discard');
    const btnChangePassword = document.getElementById('btn-change-password');
    const passwordCard = document.getElementById('password-card');
    const btnCancelPassword = document.getElementById('btn-cancel-password');
    const inpPassword = document.getElementById('inp-password');
    const inpConfirmPassword = document.getElementById('inp-confirm-password');
    const passwordError = document.getElementById('password-error');
    const btnSavePassword = document.getElementById('btn-save-password');

    // ─── Original values (for discard) ───
    const originals = {
        nombre: cfg.nombreUsuario,
        apellido: cfg.apellidoUsuario,
        whatsapp: cfg.whatsapp,
        instagram: cfg.instagram,
        tiktok: cfg.tiktok
    };

    // ─── Sanitize input (anti-XSS) ───
    function sanitize(str) {
        return str.replace(/[<>"'`;\\]/g, '').trim();
    }

    // ═══════════════════════════════════════
    // DISCARD — Revert to original values
    // ═══════════════════════════════════════
    btnDiscard?.addEventListener('click', () => {
        inpNombre.value = originals.nombre;
        inpApellido.value = originals.apellido;
        inpWhatsapp.value = originals.whatsapp;
        inpInstagram.value = originals.instagram;
        inpTiktok.value = originals.tiktok;
    });

    // ═══════════════════════════════════════
    // SAVE PROFILE
    // ═══════════════════════════════════════
    btnSave?.addEventListener('click', async () => {
        const nombre = sanitize(inpNombre.value);
        const apellido = sanitize(inpApellido.value);
        const whatsapp = sanitize(inpWhatsapp.value);
        const instagram = sanitize(inpInstagram.value);
        const tiktok = sanitize(inpTiktok.value);

        // Validaciones
        if (!nombre || !apellido) {
            return Swal.fire({
                icon: 'warning',
                title: 'Campos requeridos',
                text: 'Nombre y Apellido son obligatorios.',
                background: '#111',
                color: '#fff',
                confirmButtonColor: '#c9da2b'
            });
        }

        if (!whatsapp) {
            return Swal.fire({
                icon: 'warning',
                title: 'WhatsApp requerido',
                text: 'El número de WhatsApp es obligatorio.',
                background: '#111',
                color: '#fff',
                confirmButtonColor: '#c9da2b'
            });
        }

        if (!instagram && !tiktok) {
            return Swal.fire({
                icon: 'warning',
                title: 'Red social requerida',
                text: 'Debes tener al menos Instagram o TikTok.',
                background: '#111',
                color: '#fff',
                confirmButtonColor: '#c9da2b'
            });
        }

        btnSave.disabled = true;
        btnSave.textContent = 'Guardando...';

        try {
            const res = await fetch('/ritmaap/json/settings/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
                body: JSON.stringify({ nombre, apellido, whatsapp, instagram, tiktok })
            });

            const data = await res.json();

            if (data.ok) {
                // Update originals
                originals.nombre = nombre;
                originals.apellido = apellido;
                originals.whatsapp = whatsapp;
                originals.instagram = instagram;
                originals.tiktok = tiktok;

                Swal.fire({
                    icon: 'success',
                    title: 'Perfil actualizado',
                    text: 'Los cambios se guardaron correctamente.',
                    background: '#111',
                    color: '#fff',
                    confirmButtonColor: '#c9da2b',
                    timer: 2000,
                    showConfirmButton: false
                });

                // Update header name if visible
                setTimeout(() => location.reload(), 2100);
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: data.msg || 'No se pudo actualizar el perfil.',
                    background: '#111',
                    color: '#fff',
                    confirmButtonColor: '#c9da2b'
                });
            }
        } catch (err) {
            console.error('Error saving profile:', err);
            Swal.fire({
                icon: 'error',
                title: 'Error de conexión',
                text: 'Intenta de nuevo.',
                background: '#111',
                color: '#fff',
                confirmButtonColor: '#c9da2b'
            });
        } finally {
            btnSave.disabled = false;
            btnSave.textContent = 'Guardar Cambios';
        }
    });

    // ═══════════════════════════════════════
    // PASSWORD TOGGLE
    // ═══════════════════════════════════════
    btnChangePassword?.addEventListener('click', () => {
        passwordCard.classList.remove('hidden');
        passwordCard.style.animation = 'fadeSlideIn 0.3s ease-out';
        inpPassword.value = '';
        inpConfirmPassword.value = '';
        passwordError.classList.add('hidden');
    });

    btnCancelPassword?.addEventListener('click', () => {
        passwordCard.classList.add('hidden');
        inpPassword.value = '';
        inpConfirmPassword.value = '';
        passwordError.classList.add('hidden');
    });

    // ═══════════════════════════════════════
    // SAVE PASSWORD
    // ═══════════════════════════════════════
    btnSavePassword?.addEventListener('click', async () => {
        const pass = inpPassword.value;
        const confirm = inpConfirmPassword.value;

        passwordError.classList.add('hidden');

        if (!pass || pass.length < 6) {
            passwordError.textContent = '✗ La contraseña debe tener al menos 6 caracteres.';
            passwordError.classList.remove('hidden');
            return;
        }

        if (pass !== confirm) {
            passwordError.textContent = '✗ Las contraseñas no coinciden.';
            passwordError.classList.remove('hidden');
            return;
        }

        btnSavePassword.disabled = true;
        btnSavePassword.textContent = 'Actualizando...';

        try {
            const res = await fetch('/ritmaap/json/settings/password', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
                body: JSON.stringify({ password: pass, confirmPassword: confirm })
            });

            const data = await res.json();

            if (data.ok) {
                Swal.fire({
                    icon: 'success',
                    title: 'Contraseña actualizada',
                    text: 'Tu nueva contraseña está activa.',
                    background: '#111',
                    color: '#fff',
                    confirmButtonColor: '#c9da2b',
                    timer: 2000,
                    showConfirmButton: false
                });
                passwordCard.classList.add('hidden');
                inpPassword.value = '';
                inpConfirmPassword.value = '';
            } else {
                passwordError.textContent = `✗ ${data.msg || 'Error al cambiar la contraseña.'}`;
                passwordError.classList.remove('hidden');
            }
        } catch (err) {
            console.error('Error changing password:', err);
            passwordError.textContent = '✗ Error de conexión. Intenta de nuevo.';
            passwordError.classList.remove('hidden');
        } finally {
            btnSavePassword.disabled = false;
            btnSavePassword.textContent = 'Actualizar Contraseña';
        }
    });

    // ═══════════════════════════════════════
    // AVATAR UPLOAD
    // ═══════════════════════════════════════
    inpAvatar?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Frontend validations
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (!allowedTypes.includes(file.type)) {
            return Swal.fire({
                icon: 'warning',
                title: 'Formato no soportado',
                text: 'Solo se permiten archivos .jpg y .png',
                background: '#111',
                color: '#fff',
                confirmButtonColor: '#c9da2b'
            });
        }

        const maxSize = 2 * 1024 * 1024; // 2MB
        if (file.size > maxSize) {
            return Swal.fire({
                icon: 'warning',
                title: 'Archivo muy grande',
                text: 'El tamaño máximo es 2MB.',
                background: '#111',
                color: '#fff',
                confirmButtonColor: '#c9da2b'
            });
        }

        // Show spinner
        avatarSpinner.classList.remove('hidden');

        const formData = new FormData();
        formData.append('avatar', file);

        try {
            const res = await fetch('/ritmaap/json/settings/avatar', {
                method: 'POST',
                headers: { 'X-CSRF-Token': csrf },
                body: formData
            });

            const data = await res.json();

            if (data.ok) {
                // Update image src with cache-busting
                avatarImg.src = data.imageUrl + '?t=' + Date.now();

                Swal.fire({
                    icon: 'success',
                    title: 'Foto actualizada',
                    background: '#111',
                    color: '#fff',
                    confirmButtonColor: '#c9da2b',
                    timer: 1500,
                    showConfirmButton: false
                });

                // Update header avatar after short delay
                setTimeout(() => {
                    const headerAvatar = document.querySelector('#profileMenuBtn img');
                    if (headerAvatar) headerAvatar.src = data.imageUrl + '?t=' + Date.now();
                }, 500);
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: data.msg || 'No se pudo actualizar la foto.',
                    background: '#111',
                    color: '#fff',
                    confirmButtonColor: '#c9da2b'
                });
            }
        } catch (err) {
            console.error('Error uploading avatar:', err);
            Swal.fire({
                icon: 'error',
                title: 'Error de conexión',
                text: 'Intenta de nuevo.',
                background: '#111',
                color: '#fff',
                confirmButtonColor: '#c9da2b'
            });
        } finally {
            avatarSpinner.classList.add('hidden');
            inpAvatar.value = ''; // Reset file input
        }
    });

    // ─── CSS animation injection ───
    if (!document.getElementById('settings-keyframes')) {
        const style = document.createElement('style');
        style.id = 'settings-keyframes';
        style.textContent = `
            @keyframes fadeSlideIn {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
        `;
        document.head.appendChild(style);
    }
});
