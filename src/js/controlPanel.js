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

        const config = window.__USERPANEL__;
        if (!config) return;

        const csrfToken = config.csrfToken;

        // ==========================================
        // MIEMBROS ACTIVOS
        // ==========================================
        const membersTbody = document.getElementById('members-tbody');
        const membersTotal = document.getElementById('members-total');
        const membersPages = document.getElementById('members-pages');
        const searchInput = document.getElementById('searchUser');

        let currentPage = 1;
        let searchDebounce = null;

        async function loadMembers(page = 1, search = '') {
            if (!membersTbody) return;
            currentPage = page;

            try {
                const params = new URLSearchParams({ page, search });
                const res = await fetch(`/app/dash/json/users/members?${params}`);
                const json = await res.json();

                if (!json.ok) return;

                if (json.data.length === 0) {
                    membersTbody.innerHTML = `
                        <tr>
                            <td colspan="5" class="px-6 py-10 text-center text-white/30 text-xs uppercase tracking-widest">
                                No se encontraron miembros
                            </td>
                        </tr>`;
                } else {
                    membersTbody.innerHTML = json.data.map(u => {
                        const fecha = u.ultimaDescarga
                            ? new Date(u.ultimaDescarga).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
                            : '—';
                        return `
                        <tr class="hover:bg-white/3 transition-colors">
                            <td class="px-6 py-4">
                                <p class="font-bold text-white text-sm">${u.nombre} ${u.apellido}</p>
                                <p class="text-[10px] text-white/40 mt-0.5">${u.email}</p>
                            </td>
                            <td class="px-6 py-4 text-primary font-bold">${u.creditos}</td>
                            <td class="px-6 py-4 text-white/70">${u.nroDescargas}</td>
                            <td class="px-6 py-4 text-white/50 text-xs">${fecha}</td>
                            <td class="px-6 py-4 text-center">
                                <button class="text-white/40 hover:text-primary transition-colors">
                                    <span class="material-symbols-outlined text-lg">visibility</span>
                                </button>
                            </td>
                        </tr>`;
                    }).join('');
                }

                if (membersTotal) {
                    membersTotal.textContent = `${json.total} miembro${json.total !== 1 ? 's' : ''} — Página ${json.page} de ${json.totalPages}`;
                }

                if (membersPages) {
                    membersPages.innerHTML = '';
                    for (let i = 1; i <= json.totalPages; i++) {
                        const pageBtn = document.createElement('button');
                        pageBtn.textContent = i;
                        pageBtn.className = i === json.page
                            ? 'px-3 py-1 text-xs font-bold bg-primary text-black rounded'
                            : 'px-3 py-1 text-xs font-bold text-white/40 hover:text-white bg-white/5 rounded';
                        pageBtn.addEventListener('click', () => loadMembers(i, searchInput ? searchInput.value : ''));
                        membersPages.appendChild(pageBtn);
                    }
                }
            } catch (err) {
                console.error('Error loading members:', err);
            }
        }

        if (searchInput) {
            searchInput.addEventListener('input', () => {
                clearTimeout(searchDebounce);
                searchDebounce = setTimeout(() => {
                    loadMembers(1, searchInput.value.trim());
                }, 400);
            });
        }

        // ==========================================
        // SOLICITUDES / ASPIRANTES
        // ==========================================
        const aspirantesList = document.getElementById('aspirantes-list');
        const aspirantesEmpty = document.getElementById('aspirantes-empty');

        async function loadAspirantes() {
            if (!aspirantesList) return;

            try {
                const res = await fetch('/app/dash/json/users/aspirantes');
                const json = await res.json();
                if (!json.ok) return;

                if (json.data.length === 0) {
                    aspirantesList.innerHTML = '';
                    if (aspirantesEmpty) aspirantesEmpty.classList.remove('hidden');
                    return;
                }

                if (aspirantesEmpty) aspirantesEmpty.classList.add('hidden');

                aspirantesList.innerHTML = json.data.map(a => {
                    const pill = a.verificado
                        ? '<span class="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-green-500/20 text-green-400 border border-green-500/30 rounded-full">Verificado</span>'
                        : '<span class="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30 rounded-full">Sin Verificar</span>';

                    const fecha = new Date(a.fecha).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });

                    return `
                    <div class="p-4 bg-white/3 border border-white/5 rounded-xl hover:border-primary/20 transition-all">
                        <div class="flex items-start justify-between mb-2">
                            <div>
                                <p class="font-bold text-white text-sm">${a.nombre} ${a.apellido}</p>
                                <p class="text-[10px] text-white/40">${a.email}</p>
                            </div>
                            ${pill}
                        </div>
                        <div class="flex gap-3 text-[10px] text-white/30 mb-3 flex-wrap">
                            <span class="flex items-center gap-1"><span class="material-symbols-outlined text-xs">phone_iphone</span>${a.whatsapp}</span>
                            ${a.ciudad ? `<span class="flex items-center gap-1"><span class="material-symbols-outlined text-xs">location_on</span>${a.ciudad}</span>` : ''}
                            <span>${fecha}</span>
                        </div>
                        <div class="flex gap-2">
                            <button class="btn-aprobar flex-1 py-2 text-[10px] font-bold uppercase tracking-widest bg-primary/10 text-primary border border-primary/30 rounded-lg hover:bg-primary/20 transition-all" data-id="${a.idAspirante}" data-nombre="${a.nombre} ${a.apellido}">
                                <span class="material-symbols-outlined text-sm align-middle mr-1">check</span> Aprobar
                            </button>
                            <button class="btn-rechazar py-2 px-3 text-[10px] font-bold uppercase tracking-widest bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/20 transition-all" data-id="${a.idAspirante}" data-nombre="${a.nombre} ${a.apellido}">
                                <span class="material-symbols-outlined text-sm align-middle">close</span>
                            </button>
                        </div>
                    </div>`;
                }).join('');

                aspirantesList.querySelectorAll('.btn-aprobar').forEach(b => {
                    b.addEventListener('click', () => handleAprobar(b.dataset.id, b.dataset.nombre));
                });
                aspirantesList.querySelectorAll('.btn-rechazar').forEach(b => {
                    b.addEventListener('click', () => handleRechazar(b.dataset.id, b.dataset.nombre));
                });

            } catch (err) {
                console.error('Error loading aspirantes:', err);
            }
        }

        async function handleAprobar(id, nombre) {
            const result = await Swal.fire({
                title: '¿Aprobar solicitud?',
                html: `Estás a punto de darle acceso al panel de usuario a <strong>${nombre}</strong>. ¿Estás seguro?`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Sí, aprobar',
                cancelButtonText: 'No, cancelar',
                confirmButtonColor: '#C9DA2B',
                background: '#0a0a0c',
                color: '#fff'
            });

            if (!result.isConfirmed) return;

            try {
                const res = await fetch(`/app/dash/json/users/aspirantes/${id}/aprobar`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'CSRF-Token': csrfToken }
                });
                const data = await res.json();

                if (data.ok) {
                    await Swal.fire({
                        icon: 'success',
                        title: 'Usuario creado',
                        text: data.msg,
                        timer: 2000,
                        showConfirmButton: false,
                        background: '#0a0a0c',
                        color: '#fff'
                    });
                    loadAspirantes();
                    loadMembers(currentPage, searchInput ? searchInput.value : '');
                } else {
                    Swal.fire({ icon: 'error', title: 'Error', text: data.msg, background: '#0a0a0c', color: '#fff' });
                }
            } catch (err) {
                Swal.fire({ icon: 'error', title: 'Error', text: 'Error de conexión', background: '#0a0a0c', color: '#fff' });
            }
        }

        async function handleRechazar(id, nombre) {
            const result = await Swal.fire({
                title: '¿Rechazar solicitud?',
                html: `Estás a punto de rechazar la solicitud de <strong>${nombre}</strong>. Esta acción no se puede deshacer.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí, rechazar',
                cancelButtonText: 'No, cancelar',
                confirmButtonColor: '#ef4444',
                background: '#0a0a0c',
                color: '#fff'
            });

            if (!result.isConfirmed) return;

            try {
                const res = await fetch(`/app/dash/json/users/aspirantes/${id}/rechazar`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'CSRF-Token': csrfToken }
                });
                const data = await res.json();

                if (data.ok) {
                    await Swal.fire({
                        icon: 'success',
                        title: 'Solicitud rechazada',
                        timer: 1500,
                        showConfirmButton: false,
                        background: '#0a0a0c',
                        color: '#fff'
                    });
                    loadAspirantes();
                } else {
                    Swal.fire({ icon: 'error', title: 'Error', text: data.msg, background: '#0a0a0c', color: '#fff' });
                }
            } catch (err) {
                Swal.fire({ icon: 'error', title: 'Error', text: 'Error de conexión', background: '#0a0a0c', color: '#fff' });
            }
        }

        // Init
        loadMembers(1);
        loadAspirantes();
    });
})();
