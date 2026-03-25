import Swal from 'sweetalert2';

document.addEventListener('DOMContentLoaded', () => {
    const csrf = window.__CREDITS__?.csrfToken || document.querySelector('meta[name="csrf-token"]')?.content || '';

    // =============================================
    // ELEMENTOS
    // =============================================
    const searchInput = document.getElementById('credits-search');
    const filterDesde = document.getElementById('filter-desde');
    const filterHasta = document.getElementById('filter-hasta');
    const tbody = document.getElementById('credits-tbody');
    const prevBtn = document.getElementById('credits-prev');
    const nextBtn = document.getElementById('credits-next');
    const infoSpan = document.getElementById('credits-info');
    const btnExport = document.getElementById('btn-export');
    const packsList = document.getElementById('packs-list');

    // Form pack
    const packFormTitle = document.getElementById('pack-form-title');
    const packEditId = document.getElementById('pack-edit-id');
    const packNombre = document.getElementById('pack-nombre');
    const packValor = document.getElementById('pack-valor');
    const packCreditos = document.getElementById('pack-creditos');
    const packDescuento = document.getElementById('pack-descuento');
    const btnSavePack = document.getElementById('btn-save-pack');
    const btnCancelEdit = document.getElementById('btn-cancel-edit');

    let currentPage = 1;
    let debounceTimer = null;

    // =============================================
    // HISTORIAL DE TRANSACCIONES
    // =============================================

    async function loadCreditsHistory(page = 1, search = '') {
        try {
            const params = new URLSearchParams({ page, limit: 15, search });
            if (filterDesde && filterDesde.value) params.set('desde', filterDesde.value);
            if (filterHasta && filterHasta.value) params.set('hasta', filterHasta.value);

            const res = await fetch(`/app/dash/json/credits/history?${params}`);
            const data = await res.json();

            if (!data.ok) return;

            currentPage = data.page;
            renderCreditsTable(data.data);
            renderPagination(data);
        } catch (err) {
            console.error('Error loading credits:', err);
        }
    }

    function renderCreditsTable(rows) {
        if (!rows.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="py-10 text-center">
                        <span class="text-white/20 text-sm font-mono">No se encontraron transacciones</span>
                    </td>
                </tr>`;
            return;
        }

        tbody.innerHTML = rows.map(r => {
            const fecha = r.fechaCompra ? new Date(r.fechaCompra).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
            const valor = r.valorPack ? `$${Number(r.valorPack).toLocaleString('es-CO')}` : '$0';

            return `
                <tr class="border-b border-white/3 hover:bg-white/2 transition-colors">
                    <td class="py-3">
                        <div class="flex flex-col">
                            <span class="text-sm font-medium text-white">${escapeHtml(r.usuario)}</span>
                            <span class="text-[10px] text-white/30 font-mono">${escapeHtml(r.email)}</span>
                        </div>
                    </td>
                    <td class="py-3">
                        <span class="text-xs font-bold bg-white/5 text-white/60 px-2 py-1 rounded-lg border border-white/10">${escapeHtml(r.pack)}</span>
                    </td>
                    <td class="py-3 text-right">
                        <span class="text-sm font-mono text-white/60">${valor}</span>
                    </td>
                    <td class="py-3 text-right">
                        <span class="text-[10px] text-white/40 font-mono">${fecha}</span>
                    </td>
                </tr>`;
        }).join('');
    }

    function renderPagination(data) {
        infoSpan.textContent = `Mostrando ${data.data.length} de ${data.total} — Página ${data.page}/${data.totalPages}`;
        prevBtn.disabled = data.page <= 1;
        nextBtn.disabled = data.page >= data.totalPages;
    }

    // Debounce search
    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            currentPage = 1;
            loadCreditsHistory(1, searchInput.value.trim());
        }, 400);
    });

    // Filtros de fecha
    if (filterDesde) filterDesde.addEventListener('change', () => {
        currentPage = 1;
        loadCreditsHistory(1, searchInput.value.trim());
    });
    if (filterHasta) filterHasta.addEventListener('change', () => {
        currentPage = 1;
        loadCreditsHistory(1, searchInput.value.trim());
    });

    prevBtn.addEventListener('click', () => {
        if (currentPage > 1) loadCreditsHistory(currentPage - 1, searchInput.value.trim());
    });
    nextBtn.addEventListener('click', () => {
        loadCreditsHistory(currentPage + 1, searchInput.value.trim());
    });

    // =============================================
    // CHART — Ventas últimos 30 días (barras por día)
    // =============================================

    async function loadChart() {
        try {
            const res = await fetch('/app/dash/json/credits/chart');
            const data = await res.json();
            if (!data.ok) return;

            const ctx = document.getElementById('credits-chart');
            if (!ctx) return;

            const labels = data.data.map(d => d.dia);
            const ventas = data.data.map(d => d.totalVentas || 0);

            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [
                        {
                            label: 'Ventas ($COP)',
                            data: ventas,
                            backgroundColor: 'rgba(201, 218, 43, 0.3)',
                            borderColor: 'rgba(201, 218, 43, 0.8)',
                            borderWidth: 1,
                            borderRadius: 4,
                            barPercentage: 0.7
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: { color: 'rgba(255,255,255,0.4)', font: { size: 10, family: 'monospace' } }
                        },
                        tooltip: {
                            callbacks: {
                                label: (ctx) => `$${ctx.parsed.y.toLocaleString('es-CO')} COP`
                            }
                        }
                    },
                    scales: {
                        x: {
                            ticks: {
                                color: 'rgba(255,255,255,0.3)',
                                font: { size: 9 },
                                maxRotation: 45,
                                maxTicksLimit: 15
                            },
                            grid: { color: 'rgba(255,255,255,0.03)' }
                        },
                        y: {
                            ticks: {
                                color: 'rgba(255,255,255,0.3)',
                                font: { size: 10 },
                                callback: (v) => `$${(v / 1000).toFixed(0)}k`
                            },
                            grid: { color: 'rgba(255,255,255,0.03)' }
                        }
                    }
                }
            });
        } catch (err) {
            console.error('Error loading chart:', err);
        }
    }

    // =============================================
    // EXPORT — Descarga directa XLS (usa filtros de fecha inline)
    // =============================================

    btnExport.addEventListener('click', () => {
        const desde = filterDesde?.value || '';
        const hasta = filterHasta?.value || '';
        let url = '/app/dash/json/credits/export';
        const params = new URLSearchParams();
        if (desde) params.set('desde', desde);
        if (hasta) params.set('hasta', hasta);
        if (params.toString()) url += `?${params}`;
        window.open(url, '_blank');
    });

    // =============================================
    // PACKS — CRUD
    // =============================================

    async function loadPacks() {
        try {
            const res = await fetch('/app/dash/json/packs');
            const data = await res.json();
            if (!data.ok) return;

            renderPacks(data.data);
        } catch (err) {
            console.error('Error loading packs:', err);
        }
    }

    function renderPacks(packs) {
        if (!packs.length) {
            packsList.innerHTML = `
                <div class="text-center py-8">
                    <span class="material-symbols-outlined text-4xl text-white/5 block mb-2">inventory_2</span>
                    <p class="text-white/20 text-xs font-mono">No hay packs creados</p>
                </div>`;
            return;
        }

        packsList.innerHTML = packs.map(p => {
            const isActive = p.estado === 'enable';
            const valor = `$${Number(p.valorPack).toLocaleString('es-CO')}`;

            return `
                <div class="flex items-center justify-between p-3 rounded-2xl border transition-all ${isActive ? 'border-white/5 hover:border-primary/20' : 'border-red-500/10 opacity-50'}" style="background: rgba(255,255,255,0.02);">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                            <span class="text-xs font-bold text-white truncate">${escapeHtml(p.nombrePack)}</span>
                            ${p.descuento > 0 ? `<span class="text-[8px] font-bold bg-primary/10 text-primary px-1 py-0.5 rounded-full">-${p.descuento}%</span>` : ''}
                            ${!isActive ? '<span class="text-[8px] font-bold bg-red-500/10 text-red-400 px-1 py-0.5 rounded-full">OFF</span>' : ''}
                        </div>
                        <div class="flex items-center gap-2 mt-0.5">
                            <span class="text-[10px] text-white/30 font-mono">${valor}</span>
                            <span class="text-white/10">·</span>
                            <span class="text-[10px] text-primary/60 font-mono font-bold">${p.nroCreditos} créditos</span>
                        </div>
                    </div>
                    <div class="flex items-center gap-1 ml-2">
                        <button onclick="window.__editPack__('${p.idPack}', '${escapeHtml(p.nombrePack)}', ${p.valorPack}, ${p.nroCreditos}, ${p.descuento})" class="btn-small btn-ghost !py-1 !px-2 !border-white/10 !text-white/40 hover:!text-primary hover:!border-primary/30 cursor-pointer" title="Editar">
                            <span class="material-symbols-outlined text-xs">edit</span>
                        </button>
                        <button onclick="window.__togglePack__('${p.idPack}', '${isActive ? 'disable' : 'enable'}')" class="btn-small btn-ghost !py-1 !px-2 !border-white/10 ${isActive ? '!text-white/40 hover:!text-red-400 hover:!border-red-500/30' : '!text-red-400 hover:!text-primary hover:!border-primary/30'} cursor-pointer" title="${isActive ? 'Suspender' : 'Activar'}">
                            <span class="material-symbols-outlined text-xs">${isActive ? 'pause_circle' : 'play_circle'}</span>
                        </button>
                    </div>
                </div>`;
        }).join('');
    }

    // =============================================
    // PACK FORM — Validación + Máscara de miles
    // =============================================

    function validatePackForm() {
        const nombre = packNombre.value.trim();
        const valor = parseValorMask(packValor.value);
        const creditos = parseInt(packCreditos.value);
        const valid = nombre.length > 0 && valor > 0 && creditos > 0 && creditos <= 10000;
        btnSavePack.disabled = !valid;
    }

    // Máscara de miles para valorPack
    packValor.addEventListener('input', () => {
        let raw = packValor.value.replace(/[^\d]/g, '');
        if (raw) {
            packValor.value = '$' + Number(raw).toLocaleString('es-CO');
        } else {
            packValor.value = '';
        }
        validatePackForm();
    });

    packNombre.addEventListener('input', validatePackForm);
    packCreditos.addEventListener('input', validatePackForm);
    packDescuento.addEventListener('input', validatePackForm);

    function parseValorMask(val) {
        return Number((val || '').replace(/[^\d]/g, '')) || 0;
    }

    // Guardar pack (crear o editar)
    btnSavePack.addEventListener('click', async () => {
        const editId = packEditId.value;
        const body = {
            nombrePack: packNombre.value.trim(),
            valorPack: parseValorMask(packValor.value),
            nroCreditos: parseInt(packCreditos.value) || 0,
            descuento: parseInt(packDescuento.value) || 0
        };

        try {
            const url = editId
                ? `/app/dash/json/packs/${editId}`
                : '/app/dash/json/packs';
            const method = editId ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
                body: JSON.stringify(body)
            });
            const data = await res.json();

            if (data.ok) {
                Swal.fire({
                    icon: 'success',
                    title: data.msg,
                    background: '#111',
                    color: '#fff',
                    confirmButtonColor: '#c9da2b',
                    timer: 1500,
                    showConfirmButton: false
                });
                resetPackForm();
                loadPacks();
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: data.msg,
                    background: '#111',
                    color: '#fff',
                    confirmButtonColor: '#c9da2b'
                });
            }
        } catch (err) {
            console.error('Error saving pack:', err);
        }
    });

    // Editar pack
    window.__editPack__ = (id, nombre, valor, creditos, descuento) => {
        packEditId.value = id;
        packNombre.value = nombre;
        packValor.value = '$' + Number(valor).toLocaleString('es-CO');
        packCreditos.value = creditos;
        packDescuento.value = descuento;
        packFormTitle.textContent = 'Editar Pack';
        btnCancelEdit.classList.remove('hidden');
        validatePackForm();
        packNombre.focus();
    };

    // Toggle estado pack
    window.__togglePack__ = async (id, nuevoEstado) => {
        const accion = nuevoEstado === 'disable' ? 'suspender' : 'activar';
        const result = await Swal.fire({
            title: `¿${accion.charAt(0).toUpperCase() + accion.slice(1)} pack?`,
            text: `El pack será ${nuevoEstado === 'disable' ? 'suspendido' : 'activado'}`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: `Sí, ${accion}`,
            cancelButtonText: 'Cancelar',
            background: '#111',
            color: '#fff',
            confirmButtonColor: nuevoEstado === 'disable' ? '#ef4444' : '#c9da2b',
            cancelButtonColor: '#333'
        });

        if (!result.isConfirmed) return;

        try {
            const res = await fetch(`/app/dash/json/packs/${id}/toggle`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }
            });
            const data = await res.json();
            if (data.ok) {
                Swal.fire({
                    icon: 'success',
                    title: data.msg,
                    background: '#111',
                    color: '#fff',
                    confirmButtonColor: '#c9da2b',
                    timer: 1200,
                    showConfirmButton: false
                });
                loadPacks();
            }
        } catch (err) {
            console.error('Error toggling pack:', err);
        }
    };

    // Cancelar edición
    btnCancelEdit.addEventListener('click', resetPackForm);

    function resetPackForm() {
        packEditId.value = '';
        packNombre.value = '';
        packValor.value = '';
        packCreditos.value = '';
        packDescuento.value = '0';
        packFormTitle.textContent = 'Nuevo Pack';
        btnCancelEdit.classList.add('hidden');
        btnSavePack.disabled = true;
    }

    // =============================================
    // HELPERS
    // =============================================

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    // =============================================
    // INIT
    // =============================================

    loadCreditsHistory();
    loadPacks();
    loadChart();
});
