import Swal from 'sweetalert2';

;(function () {
    document.addEventListener("DOMContentLoaded", () => {

        // Sidebar toggle
        const btn = document.getElementById("userMenuBtn");
        const menu = document.getElementById("userMenu");
        if (btn && menu) {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                menu.classList.toggle("hidden");
            });
            document.addEventListener("click", (e) => {
                if (!btn.contains(e.target) && !menu.contains(e.target)) {
                    menu.classList.add("hidden");
                }
            });
        }

        const config = window.__USERPROFILE__;
        if (!config) return;

        const { csrfToken, idUsuario } = config;
        let estadoActual = config.estado;

        // ==========================================
        // DOWNLOAD LIBRARY (paginated)
        // ==========================================
        const downloadsTbody = document.getElementById('downloads-tbody');
        const downloadsTotal = document.getElementById('downloads-total');
        const downloadsPages = document.getElementById('downloads-pages');
        let currentPage = 1;

        // Format pill helper (matches multimedia list style)
        function getFormatPill(formato) {
            const f = (formato || '').toUpperCase();
            const colors = {
                'MP3': 'bg-primary/10 border-primary/20 text-primary',
                'WAV': 'bg-ritma-blue/10 border-ritma-blue/20 text-ritma-blue',
                'AIFF': 'bg-ritma-purple/10 border-ritma-purple/20 text-ritma-purple',
                'FLAC': 'bg-ritma-cyan/10 border-ritma-cyan/20 text-ritma-cyan',
                'MP4': 'bg-green-500/10 border-green-500/20 text-green-400',
                'MOV': 'bg-green-500/10 border-green-500/20 text-green-400',
                'ZIP': 'bg-white/5 border-white/10 text-white/60',
            };
            const cls = colors[f] || 'bg-white/5 border-white/10 text-white/40';
            return `<span class="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border rounded-full ${cls}">${f}</span>`;
        }

        async function loadDownloads(page = 1) {
            if (!downloadsTbody) return;
            currentPage = page;

            try {
                const res = await fetch(`/app/dash/json/users/${idUsuario}/downloads?page=${page}`);
                const json = await res.json();
                if (!json.ok) return;

                if (json.data.length === 0) {
                    downloadsTbody.innerHTML = `
                        <tr>
                            <td colspan="4" class="px-6 py-10 text-center text-white/30 text-xs uppercase tracking-widest">
                                Sin descargas registradas
                            </td>
                        </tr>`;
                } else {
                    downloadsTbody.innerHTML = json.data.map(d => {
                        const fecha = new Date(d.fechaDescarga).toLocaleDateString('es-CO', {
                            year: 'numeric', month: '2-digit', day: '2-digit',
                            hour: '2-digit', minute: '2-digit'
                        }).replace(',', ' \u2014');
                        return `
                        <tr class="hover:bg-white/3 transition-colors">
                            <td class="px-6 py-4">
                                <p class="font-bold text-white text-sm">${d.nombreComposicion}</p>
                                <p class="text-[10px] text-white/30 font-mono uppercase tracking-widest mt-0.5">${d.artista}</p>
                            </td>
                            <td class="px-6 py-4">${getFormatPill(d.formato)}</td>
                            <td class="px-6 py-4 text-white/50 text-xs font-mono">${fecha}</td>
                            <td class="px-6 py-4 text-right font-display font-bold text-white">${Number(d.creditos).toFixed(2)}</td>
                        </tr>`;
                    }).join('');
                }

                if (downloadsTotal) {
                    downloadsTotal.textContent = `${json.total} descarga${json.total !== 1 ? 's' : ''} — Página ${json.page} de ${json.totalPages}`;
                }

                if (downloadsPages) {
                    downloadsPages.innerHTML = '';
                    for (let i = 1; i <= json.totalPages; i++) {
                        const pageBtn = document.createElement('button');
                        pageBtn.textContent = i;
                        pageBtn.className = i === json.page
                            ? 'px-3 py-1 text-xs font-bold bg-primary text-black rounded'
                            : 'px-3 py-1 text-xs font-bold text-white/40 hover:text-white bg-white/5 rounded';
                        pageBtn.addEventListener('click', () => loadDownloads(i));
                        downloadsPages.appendChild(pageBtn);
                    }
                }
            } catch (err) {
                console.error('Error loading downloads:', err);
            }
        }

        // ==========================================
        // ADD CREDITS MODAL
        // ==========================================
        const modalCreditos = document.getElementById('modal-creditos');
        const btnAgregar = document.getElementById('btn-agregar-creditos');
        const btnCancelarCred = document.getElementById('btn-cancelar-creditos');
        const btnCloseCred = document.getElementById('close-modal-creditos');
        const btnConfirmarCred = document.getElementById('btn-confirmar-creditos');
        const inputCreditos = document.getElementById('input-creditos');
        const inputCodigoAdmin = document.getElementById('input-codigo-admin');
        const campoCodigoAdmin = document.getElementById('campo-codigo-admin');

        function openModalCreditos() { modalCreditos?.classList.remove('hidden'); }
        function closeModalCreditos() {
            modalCreditos?.classList.add('hidden');
            if (inputCreditos) inputCreditos.value = '';
            if (inputCodigoAdmin) inputCodigoAdmin.value = '';
            campoCodigoAdmin?.classList.add('hidden');
        }

        btnAgregar?.addEventListener('click', openModalCreditos);
        btnCancelarCred?.addEventListener('click', closeModalCreditos);
        btnCloseCred?.addEventListener('click', closeModalCreditos);

        btnConfirmarCred?.addEventListener('click', async () => {
            const cantidad = parseInt(inputCreditos?.value);
            if (!cantidad || cantidad <= 0) {
                return Swal.fire({ icon: 'warning', title: 'Cantidad inválida', text: 'Ingrese un número mayor a 0', background: '#0a0a0c', color: '#fff' });
            }

            const body = { cantidad };
            const codigoAdmin = inputCodigoAdmin?.value?.trim();
            if (codigoAdmin) body.codigoAdmin = codigoAdmin;

            try {
                const res = await fetch(`/app/dash/json/users/${idUsuario}/credits`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'CSRF-Token': csrfToken },
                    body: JSON.stringify(body)
                });
                const data = await res.json();

                if (data.requireCode) {
                    // Show admin code field
                    campoCodigoAdmin?.classList.remove('hidden');
                    inputCodigoAdmin?.focus();
                    return Swal.fire({ icon: 'warning', title: 'Código requerido', text: data.msg, background: '#0a0a0c', color: '#fff' });
                }

                if (data.ok) {
                    closeModalCreditos();
                    // Update stat cards
                    const statDisp = document.getElementById('up-stat-creditos-disp');
                    const statGast = document.getElementById('up-stat-creditos-gast');
                    if (statDisp) statDisp.textContent = data.creditosDisponibles;
                    if (statGast) statGast.textContent = data.creditosGastados;

                    Swal.fire({ icon: 'success', title: 'Créditos asignados', text: data.msg, timer: 2000, showConfirmButton: false, background: '#0a0a0c', color: '#fff' });
                } else {
                    Swal.fire({ icon: 'error', title: 'Error', text: data.msg, background: '#0a0a0c', color: '#fff' });
                }
            } catch (err) {
                Swal.fire({ icon: 'error', title: 'Error', text: 'Error de conexión', background: '#0a0a0c', color: '#fff' });
            }
        });

        // ==========================================
        // EDIT USER DATA MODAL
        // ==========================================
        const modalEditar = document.getElementById('modal-editar');
        const btnEditar = document.getElementById('btn-editar-datos');
        const btnCancelarEdit = document.getElementById('btn-cancelar-editar');
        const btnCloseEdit = document.getElementById('close-modal-editar');
        const btnConfirmarEdit = document.getElementById('btn-confirmar-editar');

        function openModalEditar() { modalEditar?.classList.remove('hidden'); }
        function closeModalEditar() { modalEditar?.classList.add('hidden'); }

        btnEditar?.addEventListener('click', openModalEditar);
        btnCancelarEdit?.addEventListener('click', closeModalEditar);
        btnCloseEdit?.addEventListener('click', closeModalEditar);

        btnConfirmarEdit?.addEventListener('click', async () => {
            const body = {
                nombreUsuario: document.getElementById('edit-nombre')?.value,
                apellidoUsuario: document.getElementById('edit-apellido')?.value,
                password: document.getElementById('edit-password')?.value,
                whatsapp: document.getElementById('edit-whatsapp')?.value,
                ciudad: document.getElementById('edit-ciudad')?.value,
                instagram: document.getElementById('edit-instagram')?.value,
                tiktok: document.getElementById('edit-tiktok')?.value
            };

            try {
                const res = await fetch(`/app/dash/json/users/${idUsuario}/update`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'CSRF-Token': csrfToken },
                    body: JSON.stringify(body)
                });
                const data = await res.json();

                if (data.ok) {
                    closeModalEditar();
                    Swal.fire({
                        icon: 'success', title: 'Datos actualizados', text: data.msg,
                        timer: 2000, showConfirmButton: false, background: '#0a0a0c', color: '#fff'
                    }).then(() => location.reload());
                } else {
                    Swal.fire({ icon: 'error', title: 'Error', text: data.msg, background: '#0a0a0c', color: '#fff' });
                }
            } catch (err) {
                Swal.fire({ icon: 'error', title: 'Error', text: 'Error de conexión', background: '#0a0a0c', color: '#fff' });
            }
        });

        // ==========================================
        // SUSPEND / ACTIVATE USER
        // ==========================================
        const btnToggleStatus = document.getElementById('btn-toggle-status');

        btnToggleStatus?.addEventListener('click', async () => {
            const esSuspender = estadoActual === 'activo';
            const titulo = esSuspender ? '¿Suspender usuario?' : '¿Activar usuario?';
            const texto = esSuspender
                ? 'Este usuario no podrá acceder al panel mientras esté suspendido.'
                : 'El usuario recuperará acceso completo al panel.';
            const btnTexto = esSuspender ? 'Sí, suspender' : 'Sí, activar';
            const btnColor = esSuspender ? '#ef4444' : '#C9DA2B';

            const result = await Swal.fire({
                title: titulo,
                text: texto,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: btnTexto,
                cancelButtonText: 'Cancelar',
                confirmButtonColor: btnColor,
                background: '#0a0a0c',
                color: '#fff'
            });

            if (!result.isConfirmed) return;

            try {
                const res = await fetch(`/app/dash/json/users/${idUsuario}/toggle-status`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'CSRF-Token': csrfToken }
                });
                const data = await res.json();

                if (data.ok) {
                    estadoActual = data.estado;

                    // Update button
                    if (data.estado === 'suspendido') {
                        btnToggleStatus.textContent = 'Activar Usuario';
                        btnToggleStatus.className = 'flex-1 py-3 border border-green-500/30 text-green-400 font-display font-bold text-[10px] uppercase tracking-widest rounded-lg hover:bg-green-500/20 transition-all';
                    } else {
                        btnToggleStatus.textContent = 'Suspender';
                        btnToggleStatus.className = 'flex-1 py-3 border border-red-500/30 text-red-400 font-display font-bold text-[10px] uppercase tracking-widest rounded-lg hover:bg-red-500/20 transition-all';
                    }

                    Swal.fire({
                        icon: 'success', title: data.msg,
                        timer: 1500, showConfirmButton: false, background: '#0a0a0c', color: '#fff'
                    });
                } else {
                    Swal.fire({ icon: 'error', title: 'Error', text: data.msg, background: '#0a0a0c', color: '#fff' });
                }
            } catch (err) {
                Swal.fire({ icon: 'error', title: 'Error', text: 'Error de conexión', background: '#0a0a0c', color: '#fff' });
            }
        });

        // ==========================================
        // WISHLIST MODAL
        // ==========================================
        const modalWishlist = document.getElementById('modal-wishlist');
        const btnAbrirWishlist = document.getElementById('btn-abrir-wishlist');
        const btnCloseWishlist = document.getElementById('close-modal-wishlist');
        const wishlistList = document.getElementById('wishlist-list');
        const wishlistEmpty = document.getElementById('wishlist-empty');

        function closeModalWishlist() { modalWishlist?.classList.add('hidden'); }
        btnCloseWishlist?.addEventListener('click', closeModalWishlist);

        btnAbrirWishlist?.addEventListener('click', async () => {
            modalWishlist?.classList.remove('hidden');

            try {
                const res = await fetch(`/app/dash/json/users/${idUsuario}/wishlist`);
                const json = await res.json();

                if (!json.ok || json.data.length === 0) {
                    if (wishlistList) wishlistList.innerHTML = '';
                    wishlistEmpty?.classList.remove('hidden');
                    return;
                }

                wishlistEmpty?.classList.add('hidden');
                wishlistList.innerHTML = json.data.map(w => {
                    const fecha = new Date(w.fechaCreacion).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
                    return `
                    <div class="flex items-center justify-between p-3 bg-white/3 border border-white/5 rounded-xl hover:border-primary/20 transition-all">
                        <div class="flex-1 min-w-0">
                            <p class="font-bold text-white text-sm truncate">${w.nombreComposicion}</p>
                            <p class="text-[10px] text-white/30 font-mono uppercase tracking-widest">${w.artista}</p>
                        </div>
                        <div class="flex items-center gap-4 ml-4">
                            ${getFormatPill(w.formato)}
                            <span class="text-primary font-display font-bold text-sm">${w.costoCreditos}</span>
                            <span class="text-white/20 text-[9px] font-mono">${fecha}</span>
                        </div>
                    </div>`;
                }).join('');
            } catch (err) {
                console.error('Error loading wishlist:', err);
            }
        });

        // ==========================================
        // CREDIT HISTORY MODAL
        // ==========================================
        const modalCreditHistory = document.getElementById('modal-credit-history');
        const btnCreditHistory = document.getElementById('btn-credit-history');
        const btnCloseCreditHistory = document.getElementById('close-modal-credit-history');
        const creditHistoryTbody = document.getElementById('credit-history-tbody');
        const creditHistoryEmpty = document.getElementById('credit-history-empty');

        function closeModalCreditHistory() { modalCreditHistory?.classList.add('hidden'); }
        btnCloseCreditHistory?.addEventListener('click', closeModalCreditHistory);

        btnCreditHistory?.addEventListener('click', async () => {
            modalCreditHistory?.classList.remove('hidden');

            try {
                const res = await fetch(`/app/dash/json/users/${idUsuario}/credit-history`);
                const json = await res.json();

                if (!json.ok || json.data.length === 0) {
                    if (creditHistoryTbody) creditHistoryTbody.innerHTML = '';
                    creditHistoryEmpty?.classList.remove('hidden');
                    return;
                }

                creditHistoryEmpty?.classList.add('hidden');
                creditHistoryTbody.innerHTML = json.data.map(c => {
                    const fechaCompra = new Date(c.fechaCompra).toLocaleDateString('es-CO', {
                        year: 'numeric', month: '2-digit', day: '2-digit',
                        hour: '2-digit', minute: '2-digit'
                    }).replace(',', ' —');

                    const ultimoUso = c.fechaUltimaCompra
                        ? new Date(c.fechaUltimaCompra).toLocaleDateString('es-CO', {
                            year: 'numeric', month: '2-digit', day: '2-digit',
                            hour: '2-digit', minute: '2-digit'
                        }).replace(',', ' —')
                        : '—';

                    const gastados = c.cantidadComprada - c.cantidadActual;
                    const pctUsado = c.cantidadComprada > 0 ? Math.round((gastados / c.cantidadComprada) * 100) : 0;
                    const barColor = c.cantidadActual === 0 ? 'bg-red-500/40' : 'bg-primary/40';

                    return `
                    <tr class="hover:bg-white/3 transition-colors border-b border-white/5">
                        <td class="px-4 py-4 text-white/50 text-xs font-mono">${fechaCompra}</td>
                        <td class="px-4 py-4 text-right">
                            <span class="font-display font-bold text-white">${c.cantidadComprada}</span>
                        </td>
                        <td class="px-4 py-4 text-right">
                            <span class="font-display font-bold ${c.cantidadActual > 0 ? 'text-primary' : 'text-red-400'}">${c.cantidadActual}</span>
                            <div class="w-full bg-white/5 rounded-full h-1 mt-1">
                                <div class="${barColor} h-1 rounded-full" style="width: ${pctUsado}%"></div>
                            </div>
                        </td>
                        <td class="px-4 py-4 text-right text-white/30 text-xs font-mono">${ultimoUso}</td>
                    </tr>`;
                }).join('');
            } catch (err) {
                console.error('Error loading credit history:', err);
            }
        });

        // ==========================================
        // INIT
        // ==========================================
        loadDownloads(1);
    });
})();
