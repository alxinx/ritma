import Swal from 'sweetalert2';

;(function () {
    document.addEventListener('DOMContentLoaded', () => {
        const config = window.__CREDITOS__;
        if (!config) return;

        const { csrfToken, packs } = config;

        // ==========================================
        // PACK PILLS — Selección en tarjeta principal
        // ==========================================
        let packSeleccionado = null;

        const btnRecarga = document.getElementById('btn-recarga');
        const packDisplay = document.getElementById('pack-display');

        document.querySelectorAll('.pack-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                document.querySelectorAll('.pack-pill').forEach(p => {
                    p.style.borderColor = 'rgba(255,255,255,0.10)';
                    p.style.color = 'rgba(255,255,255,0.4)';
                    p.style.background = 'rgba(255,255,255,0.03)';
                });
                pill.style.borderColor = '#C9DA2B';
                pill.style.color = '#C9DA2B';
                pill.style.background = 'rgba(201,218,43,0.08)';

                packSeleccionado = {
                    idPack: pill.dataset.id,
                    nombre: pill.dataset.nombre,
                    creditos: parseInt(pill.dataset.creditos),
                    valor: parseFloat(pill.dataset.valor),
                    descuento: parseInt(pill.dataset.descuento) || 0
                };

                actualizarDisplayPack(packSeleccionado);

                if (packDisplay) packDisplay.classList.remove('hidden');
            });
        });

        function actualizarDisplayPack(pack) {
            const el = (id) => document.getElementById(id);
            if (el('pack-nombre')) el('pack-nombre').textContent = pack.nombre;
            if (el('pack-creditos')) el('pack-creditos').textContent = pack.creditos.toLocaleString('es-CO');
            const valorFinal = pack.descuento > 0
                ? pack.valor * (1 - pack.descuento / 100)
                : pack.valor;
            if (el('pack-valor')) el('pack-valor').textContent = `$${valorFinal.toLocaleString('es-CO')}`;
            const descEl = el('pack-descuento');
            if (descEl) {
                if (pack.descuento > 0) {
                    descEl.textContent = `${pack.descuento}% descuento aplicado`;
                    descEl.classList.remove('hidden');
                } else {
                    descEl.classList.add('hidden');
                }
            }
        }

        // ==========================================
        // MODAL BOLD — Abrir / Cerrar
        // ==========================================
        const modalBold = document.getElementById('modal-bold');

        if (btnRecarga) {
            btnRecarga.addEventListener('click', () => {
                abrirModalBold(packSeleccionado || null);
            });
        }

        // Botón del header — abre el modal sin pack preseleccionado
        document.getElementById('btn-abrir-modal-header')?.addEventListener('click', () => {
            abrirModalBold(packSeleccionado || null);
        });

        document.getElementById('btn-cerrar-bold')?.addEventListener('click', cerrarModalBold);

        // Cerrar modal al hacer click fuera del contenedor
        modalBold?.addEventListener('click', (e) => {
            if (e.target === modalBold) cerrarModalBold();
        });

        function abrirModalBold(pack) {
            if (!modalBold) return;

            if (pack) {
                // Marcar pack activo en el modal
                modalBold.querySelectorAll('.modal-pack-card').forEach(card => {
                    const isSelected = card.dataset.id === pack.idPack;
                    card.classList.toggle('modal-pack-selected', isSelected);
                    card.style.borderColor = isSelected ? '#C9DA2B' : 'rgba(255,255,255,0.07)';
                    card.style.background = isSelected ? 'rgba(201,218,43,0.06)' : 'rgba(255,255,255,0.02)';
                    card.style.boxShadow = isSelected ? '0 0 18px rgba(201,218,43,0.22)' : 'none';
                    const label = card.querySelector('.pack-selected-badge');
                    if (label) label.classList.toggle('hidden', !isSelected);
                    const nombre = card.querySelector('.modal-pack-nombre');
                    const valor = card.querySelector('.modal-pack-valor');
                    if (nombre) nombre.style.color = isSelected ? '#C9DA2B' : '#fff';
                    if (valor) valor.style.color = isSelected ? '#C9DA2B' : '#fff';
                });
                actualizarPanelPago(pack);
            } else {
                // Sin preselección — limpiar estado
                modalBold.querySelectorAll('.modal-pack-card').forEach(card => {
                    card.classList.remove('modal-pack-selected');
                    card.style.borderColor = 'rgba(255,255,255,0.07)';
                    card.style.background = 'rgba(255,255,255,0.02)';
                    card.style.boxShadow = 'none';
                    const label = card.querySelector('.pack-selected-badge');
                    if (label) label.classList.add('hidden');
                    const nombre = card.querySelector('.modal-pack-nombre');
                    const valor = card.querySelector('.modal-pack-valor');
                    if (nombre) nombre.style.color = '#fff';
                    if (valor) valor.style.color = '#fff';
                });
                const elNombre = document.getElementById('bold-pack-nombre');
                const elTotal = document.getElementById('bold-total-valor');
                const elCreditos = document.getElementById('bold-total-creditos');
                const elDescuento = document.getElementById('bold-descuento');
                if (elNombre) elNombre.textContent = 'Selecciona un pack';
                if (elTotal) elTotal.textContent = '— COP';
                if (elCreditos) elCreditos.textContent = '+0 CRÉDITOS';
                if (elDescuento) elDescuento.classList.add('hidden');
            }

            modalBold.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }

        function cerrarModalBold() {
            if (!modalBold) return;
            modalBold.classList.add('hidden');
            document.body.style.overflow = '';
        }

        // Selección de pack dentro del modal
        modalBold?.querySelectorAll('.modal-pack-card').forEach(card => {
            card.addEventListener('click', () => {
                const idPack = card.dataset.id;
                const pack = packs.find(p => p.idPack === idPack);
                if (!pack) return;

                packSeleccionado = {
                    idPack: pack.idPack,
                    nombre: pack.nombrePack,
                    creditos: pack.nroCreditos,
                    valor: pack.valorPack,
                    descuento: pack.descuento || 0
                };

                // Sincronizar pills externas
                document.querySelectorAll('.pack-pill').forEach(p => {
                    const isActive = p.dataset.id === idPack;
                    p.style.borderColor = isActive ? '#C9DA2B' : 'rgba(255,255,255,0.10)';
                    p.style.color = isActive ? '#C9DA2B' : 'rgba(255,255,255,0.4)';
                    p.style.background = isActive ? 'rgba(201,218,43,0.08)' : 'rgba(255,255,255,0.03)';
                });

                actualizarDisplayPack(packSeleccionado);
                if (packDisplay) packDisplay.classList.remove('hidden');

                modalBold.querySelectorAll('.modal-pack-card').forEach(c => {
                    const isSelected = c.dataset.id === idPack;
                    c.classList.toggle('modal-pack-selected', isSelected);
                    c.style.borderColor = isSelected ? '#C9DA2B' : 'rgba(255,255,255,0.07)';
                    c.style.background = isSelected ? 'rgba(201,218,43,0.06)' : 'rgba(255,255,255,0.02)';
                    c.style.boxShadow = isSelected ? '0 0 18px rgba(201,218,43,0.22)' : 'none';
                    const badge = c.querySelector('.pack-selected-badge');
                    if (badge) badge.classList.toggle('hidden', !isSelected);
                    const nombre = c.querySelector('.modal-pack-nombre');
                    const valor = c.querySelector('.modal-pack-valor');
                    if (nombre) nombre.style.color = isSelected ? '#C9DA2B' : '#fff';
                    if (valor) valor.style.color = isSelected ? '#C9DA2B' : '#fff';
                });

                actualizarPanelPago(packSeleccionado);
            });
        });

        function actualizarPanelPago(pack) {
            const valorFinal = pack.descuento > 0
                ? pack.valor * (1 - pack.descuento / 100)
                : pack.valor;

            const elNombre = document.getElementById('bold-pack-nombre');
            const elTotal = document.getElementById('bold-total-valor');
            const elCreditos = document.getElementById('bold-total-creditos');
            const elDescuento = document.getElementById('bold-descuento');

            if (elNombre) elNombre.textContent = pack.nombre;
            if (elTotal) elTotal.textContent = `$${valorFinal.toLocaleString('es-CO')}`;
            if (elCreditos) elCreditos.textContent = `+${pack.creditos.toLocaleString('es-CO')} CRÉDITOS`;
            if (elDescuento) {
                if (pack.descuento > 0) {
                    elDescuento.textContent = `${pack.descuento}% OFF`;
                    elDescuento.classList.remove('hidden');
                } else {
                    elDescuento.classList.add('hidden');
                }
            }
        }

        // ==========================================
        // BOTÓN PROCESAR PAGO — Bold
        // ==========================================
        document.getElementById('btn-pagar-bold')?.addEventListener('click', async () => {
            if (!packSeleccionado) {
                Swal.fire({ icon: 'warning', title: 'Selecciona un pack', text: 'Elige un paquete de créditos antes de continuar.', background: '#0a0a0c', color: '#fff' });
                return;
            }

            const btn = document.getElementById('btn-pagar-bold');
            btn.disabled = true;
            btn.style.opacity = '0.6';

            try {
                const res = await fetch('/ritmaap/json/creditos/bold/create-payment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'CSRF-Token': csrfToken },
                    body: JSON.stringify({ idPack: packSeleccionado.idPack })
                });
                const data = await res.json();

                if (!data.ok || !data.paymentUrl) {
                    Swal.fire({ icon: 'error', title: 'Error al crear el pago', text: data.msg || 'Intenta de nuevo.', background: '#0a0a0c', color: '#fff' });
                    return;
                }

                // Abrir Bold checkout en nueva pestaña
                window.open(data.paymentUrl, '_blank');

            } catch (err) {
                console.error('createBoldPayment error:', err);
                Swal.fire({ icon: 'error', title: 'Error de conexión', text: 'No se pudo conectar con el servidor de pagos.', background: '#0a0a0c', color: '#fff' });
            } finally {
                btn.disabled = false;
                btn.style.opacity = '1';
            }
        });

        // ==========================================
        // CARGAR MIS COMPRAS (async paginado)
        // ==========================================
        let comprasLoading = false;

        async function loadCompras(page = 1) {
            if (comprasLoading) return;
            comprasLoading = true;
            try {
                const res = await fetch(`/ritmaap/json/creditos/compras?page=${page}`);
                const data = await res.json();

                const skeleton = document.getElementById('compras-skeleton');
                const wrapper = document.getElementById('compras-wrapper');
                const tbody = document.getElementById('compras-tbody');
                const empty = document.getElementById('compras-empty');
                const pagesDiv = document.getElementById('compras-pages');
                const countEl = document.getElementById('compras-count');
                const info = document.getElementById('compras-info');
                const btns = document.getElementById('compras-btns');

                if (skeleton) skeleton.classList.add('hidden');

                if (!data.ok || data.data.length === 0) {
                    if (wrapper) wrapper.classList.add('hidden');
                    if (empty) empty.classList.remove('hidden');
                    if (countEl) countEl.textContent = '0 compras';
                    return;
                }

                if (wrapper) wrapper.classList.remove('hidden');
                if (pagesDiv) pagesDiv.classList.remove('hidden');
                if (empty) empty.classList.add('hidden');
                if (countEl) countEl.textContent = `${data.total} compra${data.total !== 1 ? 's' : ''}`;

                tbody.innerHTML = data.data.map(r => {
                    const fecha = new Date(r.fechaCompra).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
                    const valorFmt = `$${(r.valorPack || 0).toLocaleString('es-CO')}`;
                    const pctUsado = r.cantidadComprada > 0
                        ? Math.round(((r.cantidadComprada - r.cantidadActual) / r.cantidadComprada) * 100)
                        : 0;
                    return `
                    <tr class="border-b border-white/5 hover:bg-white/2 transition-colors">
                        <td class="px-4 py-3">
                            <p class="text-xs font-bold text-white">${escapeHtml(r.nombrePack)}</p>
                            <p class="text-[9px] text-white/30 font-mono mt-0.5">${fecha}</p>
                        </td>
                        <td class="px-4 py-3 text-center">
                            <span class="text-sm font-display font-bold text-primary">${r.nroCreditos.toLocaleString('es-CO')}</span>
                            <span class="text-[8px] text-white/20 ml-0.5">R$</span>
                        </td>
                        <td class="px-4 py-3 text-center">
                            <span class="text-sm font-display font-bold ${r.cantidadActual > 0 ? 'text-green-400' : 'text-white/20'}">${r.cantidadActual.toLocaleString('es-CO')}</span>
                            <span class="text-[8px] text-white/20 ml-0.5">R$</span>
                            ${pctUsado > 0 ? `<div class="w-full bg-white/5 rounded-full h-0.5 mt-1"><div class="bg-primary h-0.5 rounded-full" style="width:${pctUsado}%"></div></div>` : ''}
                        </td>
                        <td class="px-4 py-3 text-right">
                            <span class="text-xs font-mono text-white/60">${valorFmt}</span>
                        </td>
                    </tr>`;
                }).join('');

                if (info) info.textContent = `Página ${data.page} de ${data.totalPages}`;
                if (btns) {
                    btns.innerHTML = '';
                    for (let i = 1; i <= data.totalPages; i++) {
                        const b = document.createElement('button');
                        b.textContent = i;
                        b.className = i === data.page
                            ? 'px-3 py-1 text-[10px] font-bold bg-primary text-black rounded'
                            : 'px-3 py-1 text-[10px] font-bold text-white/40 hover:text-white bg-white/5 rounded';
                        b.addEventListener('click', () => loadCompras(i));
                        btns.appendChild(b);
                    }
                }
            } catch (err) {
                console.error('Error loadCompras:', err);
            } finally {
                comprasLoading = false;
            }
        }

        // ==========================================
        // CARGAR MIS TRANSACCIONES (async paginado)
        // ==========================================
        let transLoading = false;

        async function loadTransacciones(page = 1) {
            if (transLoading) return;
            transLoading = true;
            try {
                const res = await fetch(`/ritmaap/json/creditos/transacciones?page=${page}`);
                const data = await res.json();

                const skeleton = document.getElementById('trans-skeleton');
                const wrapper = document.getElementById('trans-wrapper');
                const tbody = document.getElementById('trans-tbody');
                const empty = document.getElementById('trans-empty');
                const pagesDiv = document.getElementById('trans-pages');
                const countEl = document.getElementById('trans-count');
                const info = document.getElementById('trans-info');
                const btns = document.getElementById('trans-btns');

                if (skeleton) skeleton.classList.add('hidden');

                if (!data.ok || data.data.length === 0) {
                    if (wrapper) wrapper.classList.add('hidden');
                    if (empty) empty.classList.remove('hidden');
                    if (countEl) countEl.textContent = '0 transacciones';
                    return;
                }

                if (wrapper) wrapper.classList.remove('hidden');
                if (pagesDiv) pagesDiv.classList.remove('hidden');
                if (empty) empty.classList.add('hidden');
                if (countEl) countEl.textContent = `${data.total} transacción${data.total !== 1 ? 'es' : ''}`;

                tbody.innerHTML = data.data.map(r => {
                    const fecha = new Date(r.fechaDescarga).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
                    const nombre = r.multimedia ? r.multimedia.nombreComposicion : '—';
                    const idMm = r.multimedia ? r.multimedia.idMultimedia : null;
                    const tipoIcon = r.multimedia?.tipoAsset === 'VIDEO'
                        ? '<span class="material-symbols-outlined text-purple-400 text-xs">videocam</span>'
                        : '<span class="material-symbols-outlined text-green-400 text-xs">music_note</span>';
                    return `
                    <tr class="border-b border-white/5 hover:bg-white/2 transition-colors">
                        <td class="px-4 py-3">
                            <p class="text-[10px] font-mono text-white/40">${fecha}</p>
                        </td>
                        <td class="px-4 py-3">
                            <div class="flex items-center gap-1.5">
                                ${tipoIcon}
                                <p class="text-xs text-white/70 truncate max-w-[140px]">${escapeHtml(nombre)}</p>
                            </div>
                        </td>
                        <td class="px-4 py-3 text-center">
                            <span class="text-sm font-display font-bold text-red-400">-${r.creditos}</span>
                            <span class="text-[8px] text-white/20 ml-0.5">R$</span>
                        </td>
                        <td class="px-4 py-3 text-center">
                            ${idMm
                                ? `<a href="/ritmaap/profile/mediafile/${idMm}" class="text-white/20 hover:text-primary transition-colors"><span class="material-symbols-outlined text-sm">arrow_outward</span></a>`
                                : '<span class="text-white/10">—</span>'
                            }
                        </td>
                    </tr>`;
                }).join('');

                if (info) info.textContent = `Página ${data.page} de ${data.totalPages}`;
                if (btns) {
                    btns.innerHTML = '';
                    for (let i = 1; i <= data.totalPages; i++) {
                        const b = document.createElement('button');
                        b.textContent = i;
                        b.className = i === data.page
                            ? 'px-3 py-1 text-[10px] font-bold bg-primary text-black rounded'
                            : 'px-3 py-1 text-[10px] font-bold text-white/40 hover:text-white bg-white/5 rounded';
                        b.addEventListener('click', () => loadTransacciones(i));
                        btns.appendChild(b);
                    }
                }
            } catch (err) {
                console.error('Error loadTransacciones:', err);
            } finally {
                transLoading = false;
            }
        }

        // ==========================================
        // HELPERS
        // ==========================================
        function escapeHtml(str) {
            if (!str) return '';
            return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        }

        // ==========================================
        // INIT
        // ==========================================
        loadCompras(1);
        loadTransacciones(1);
    });
})();
