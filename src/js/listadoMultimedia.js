// ==========================================
// LISTADO MULTIMEDIA - Búsqueda async, géneros, polling de estados, paginación
// ==========================================

; (function () {
    document.addEventListener('DOMContentLoaded', () => {

        // --- SELECTORES ---
        const tbody = document.getElementById('multimedia-tbody');
        const searchInput = document.getElementById('searchMultimedia');
        const paginationButtons = document.getElementById('pagination-buttons');
        const totalElementos = document.getElementById('total-elementos');
        const generosHidden = document.getElementById('generosSeleccionados');

        // Genre modal
        const btnAbrirGeneros = document.getElementById('btn-abrir-generos');
        const modalGeneros = document.getElementById('modal-generos');
        const listaGenerosModal = document.getElementById('lista-generos-modal');
        const contenedorPills = document.getElementById('contenedor-pills-generos');
        const inputBusquedaGenero = document.getElementById('busqueda-genero-modal');

        // --- ESTADO ---
        let currentPage = 1;
        const LIMIT = 20;
        let debounceTimer;
        let abortController;
        let selectedGeneros = [];
        let statusPollInterval = null;
        let visibleIds = [];

        // ==========================================
        // 1. FETCH Y RENDERIZADO DE TABLA
        // ==========================================
        async function fetchMultimedia() {
            if (abortController) abortController.abort();
            abortController = new AbortController();

            const q = searchInput?.value || '';
            const buscarpor = document.getElementById('buscarpor')?.value || 'artista';
            const formato = document.getElementById('formatosBusqueda')?.value || 'all';
            const generos = selectedGeneros.length > 0
                ? JSON.stringify(selectedGeneros.map(g => g.id))
                : '';
            const bpmMinEl = document.getElementById('bpmMin');
            const bpmMaxEl = document.getElementById('bpmMax');
            const bpmMin = bpmMinEl && bpmMinEl.value !== bpmMinEl.min ? bpmMinEl.value : '';
            const bpmMax = bpmMaxEl && bpmMaxEl.value !== bpmMaxEl.max ? bpmMaxEl.value : '';

            try {
                const params = new URLSearchParams({
                    q, buscarpor, formato, generos, bpmMin, bpmMax,
                    page: currentPage,
                    limit: LIMIT
                });

                const res = await fetch(`/app/dash/json/multimedia?${params}`, {
                    signal: abortController.signal
                });
                const data = await res.json();

                if (data.ok) {
                    renderTable(data.multimedia);
                    renderPagination(data.total, data.pagina, data.totalPaginas);
                    startStatusPolling(data.multimedia);
                }
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error('[RTM-LIST] Error fetching multimedia:', err);
                }
            }
        }

        function renderTable(items) {
            if (!tbody) return;
            tbody.innerHTML = '';
            visibleIds = [];

            if (items.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="px-8 py-16 text-center text-gray-500">
                            <span class="material-symbols-outlined text-4xl block mb-2">search_off</span>
                            <span class="text-[11px] uppercase tracking-widest">No se encontraron resultados</span>
                        </td>
                    </tr>`;
                return;
            }

            items.forEach(item => {
                visibleIds.push(item.idMultimedia);
                const tr = document.createElement('tr');
                tr.className = 'hover:bg-white/2 transition-colors group';
                tr.dataset.id = item.idMultimedia;

                // Tendencia (placeholder - se calculara con analytics despues)
                const trendIcon = 'trending_flat';
                const trendClass = 'trend-neutral';

                // Artista
                const artistName = item.ARTISTA?.nombreArtista || 'Sin artista';

                // Formato pill
                const formatPill = item.tipoAsset === 'AUDIO'
                    ? `<span class="gray-pill"><span class="material-symbols-outlined">music_note</span> AUDIO</span>`
                    : `<span class="green-pill"><span class="material-symbols-outlined">video_chat</span>VIDEO</span>`;

                // Status pill
                const statusHtml = getStatusPill(item);

                // Downloads
                const downloads = (item.descargas || 0).toLocaleString();

                tr.innerHTML = `
                    <td class="px-8 py-5">
                        <span class="material-symbols-outlined ${trendClass} text-xl">${trendIcon}</span>
                    </td>
                    <td class="px-8 py-5 font-bold text-white">${escapeHtml(artistName)}</td>
                    <td class="px-8 py-5">
                        <span class="text-gray-300">${escapeHtml(item.nombreComposicion)}</span>
                        <p class="text-[10px] text-gray-500 font-mono mt-1">${item.bpm ? item.bpm + ' BPM' : ''}</p>
                    </td>
                    <td class="px-8 py-5">${formatPill}</td>
                    <td class="px-8 py-5">
                        <span class="status-pill" data-id="${item.idMultimedia}">${statusHtml}</span>
                    </td>
                    <td class="px-8 py-5 text-right font-bold text-primary">${downloads}</td>
                    <td class="px-8 py-5 text-center">
                        <a href="profile/mediafile/${item.idMultimedia}">
                            <button class="btn-small btn-green">Gestionar</button>
                        </a>
                    </td>`;

                tbody.appendChild(tr);
            });
        }

        function getStatusPill(item) {
            if (item.estado === 'DISABLE') {
                return `<span class="gray-pill"><span class="material-symbols-outlined">cloud_off</span> Off line</span>`;
            }

            switch (item.estado_ingesta) {
                case 'ready':
                    return `<span class="green-pill"><span class="material-symbols-outlined">cloud_done</span> On line</span>`;
                case 'processing':
                    return `<span class="purple-pill"><span class="material-symbols-outlined text-ritma-purple">cloud_sync</span> Procesando</span>`;
                case 'uploading':
                    return `<span class="blue-pill"><span class="material-symbols-outlined">cloud_upload</span> Subiendo</span>`;
                case 'error':
                    return `<span class="red-pill"><span class="material-symbols-outlined text-error-red">cloud_alert</span> Error</span>`;
                default:
                    return `<span class="gray-pill"><span class="material-symbols-outlined">help</span> Desconocido</span>`;
            }
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // ==========================================
        // 2. PAGINACION
        // ==========================================
        function renderPagination(total, pagina, totalPaginas) {
            if (!totalElementos || !paginationButtons) return;

            const desde = total === 0 ? 0 : ((pagina - 1) * LIMIT) + 1;
            const hasta = Math.min(pagina * LIMIT, total);
            totalElementos.textContent = `Elementos ${desde}-${hasta} de ${total.toLocaleString()} elementos`;

            paginationButtons.innerHTML = '';

            // Boton anterior
            const btnPrev = crearBotonPag('chevron_left', pagina > 1, () => {
                currentPage = pagina - 1;
                fetchMultimedia();
            });
            paginationButtons.appendChild(btnPrev);

            // Paginas numericas (max 5 visibles)
            const startPage = Math.max(1, pagina - 2);
            const endPage = Math.min(totalPaginas, startPage + 4);

            for (let i = startPage; i <= endPage; i++) {
                const btn = document.createElement('button');
                btn.className = i === pagina
                    ? 'size-8 rounded bg-primary text-black font-bold text-[10px] flex items-center justify-center'
                    : 'size-8 rounded bg-white/5 border border-white/10 text-[10px] font-bold flex items-center justify-center hover:bg-white/10 text-white transition-all';
                btn.textContent = i;
                btn.addEventListener('click', () => {
                    currentPage = i;
                    fetchMultimedia();
                });
                paginationButtons.appendChild(btn);
            }

            // Boton siguiente
            const btnNext = crearBotonPag('chevron_right', pagina < totalPaginas, () => {
                currentPage = pagina + 1;
                fetchMultimedia();
            });
            paginationButtons.appendChild(btnNext);
        }

        function crearBotonPag(icon, enabled, onClick) {
            const wrapper = document.createElement('div');
            wrapper.className = 'flex flex-col gap-6 w-auto';
            const btn = document.createElement('button');
            btn.type = 'submit';
            btn.className = `btn-green w-full p-1 group relative overflow-hidden ${enabled ? '' : 'opacity-30 pointer-events-none'}`;
            btn.innerHTML = `
                <div class="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                <span class="material-symbols-outlined text-black transition-transform group-hover:translate-x-1">${icon}</span>`;
            if (enabled) btn.addEventListener('click', onClick);
            wrapper.appendChild(btn);
            return wrapper;
        }

        // ==========================================
        // 3. BUSQUEDA ASINCRONA
        // ==========================================
        searchInput?.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                currentPage = 1;
                fetchMultimedia();
            }, 400);
        });

        // BPM Double Range Slider
        const bpmSliderMin = document.getElementById('bpmMin');
        const bpmSliderMax = document.getElementById('bpmMax');
        const bpmTrackFill = document.getElementById('bpm-track-fill');
        const bpmTooltip = document.getElementById('bpm-tooltip');
        const bpmTooltipText = document.getElementById('bpm-tooltip-text');

        function updateBpmSlider() {
            if (!bpmSliderMin || !bpmSliderMax) return;
            let minVal = parseInt(bpmSliderMin.value);
            let maxVal = parseInt(bpmSliderMax.value);
            const rangeMin = parseInt(bpmSliderMin.min);
            const rangeMax = parseInt(bpmSliderMin.max);

            // Prevent crossing
            if (minVal > maxVal) {
                [minVal, maxVal] = [maxVal, minVal];
                bpmSliderMin.value = minVal;
                bpmSliderMax.value = maxVal;
            }

            const total = rangeMax - rangeMin;
            const leftPct = ((minVal - rangeMin) / total) * 100;
            const rightPct = ((maxVal - rangeMin) / total) * 100;

            if (bpmTrackFill) {
                bpmTrackFill.style.left = leftPct + '%';
                bpmTrackFill.style.width = (rightPct - leftPct) + '%';
            }

            // Tooltip
            const isDefault = minVal === rangeMin && maxVal === rangeMax;
            if (bpmTooltip && bpmTooltipText) {
                if (isDefault) {
                    bpmTooltip.classList.add('hidden');
                } else {
                    bpmTooltip.classList.remove('hidden');
                    bpmTooltipText.textContent = minVal + ' - ' + maxVal;
                    const centerPct = (leftPct + rightPct) / 2;
                    bpmTooltip.style.left = centerPct + '%';
                }
            }
        }

        function onBpmSliderInput() {
            updateBpmSlider();
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => { currentPage = 1; fetchMultimedia(); }, 400);
        }

        bpmSliderMin?.addEventListener('input', onBpmSliderInput);
        bpmSliderMax?.addEventListener('input', onBpmSliderInput);
        updateBpmSlider();

        // Detectar cambios en los customSelect (delegacion de eventos)
        // Los onclick de .ritma-option usan stopPropagation, asi que
        // escuchamos en fase de captura para detectar la seleccion
        document.addEventListener('click', (e) => {
            const option = e.target.closest('.ritma-option');
            if (option) {
                // Dejar que el onclick nativo del mixin actualice el valor primero
                setTimeout(() => {
                    currentPage = 1;
                    fetchMultimedia();
                }, 50);
            }

            // Cerrar todos los dropdowns al hacer click fuera de un select
            if (!e.target.closest('[id^="select-container"]')) {
                document.querySelectorAll('.options-container').forEach(d => d.classList.add('hidden'));
            }
        }, true); // true = capture phase (para capturar antes del stopPropagation)

        // ==========================================
        // 4. MODAL DE GENEROS
        // ==========================================
        btnAbrirGeneros?.addEventListener('click', async (e) => {
            e.preventDefault();
            modalGeneros.classList.remove('hidden');

            // Cargar generos si no estan en el DOM
            if (listaGenerosModal.children.length === 0) {
                try {
                    const res = await fetch('/app/dash/json/generos');
                    const generos = await res.json();

                    generos.forEach(g => {
                        const item = document.createElement('label');
                        item.className = 'glass-card rounded-sm p-1 relative overflow-hidden';
                        item.innerHTML = `
                            <input type="checkbox" value="${g.genero_id}" data-nombre="${g.nombre}" class="check-genero accent-primary">
                            <span class="text-[10px] w-full justify-between subtittle">${g.nombre}</span>`;
                        listaGenerosModal.appendChild(item);
                    });
                } catch (error) {
                    console.error('[RTM-LIST] Error al cargar géneros:', error);
                }
            }

            // Restaurar checks de generos ya seleccionados
            selectedGeneros.forEach(g => {
                const cb = modalGeneros.querySelector(`input[value="${g.id}"]`);
                if (cb) cb.checked = true;
            });

            setTimeout(() => inputBusquedaGenero?.focus(), 100);
        });

        // Buscador interno del modal
        inputBusquedaGenero?.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase().trim();
            const items = listaGenerosModal.querySelectorAll('label');
            items.forEach(item => {
                const nombre = item.innerText.toLowerCase();
                item.classList.toggle('hidden', !nombre.includes(term));
            });
        });

        // Aceptar generos
        document.getElementById('btn-aceptar-generos')?.addEventListener('click', () => {
            const seleccionados = modalGeneros.querySelectorAll('.check-genero:checked');
            selectedGeneros = Array.from(seleccionados).map(cb => ({
                id: cb.value,
                nombre: cb.dataset.nombre
            }));

            actualizarPillsGeneros();
            modalGeneros.classList.add('hidden');
            if (inputBusquedaGenero) inputBusquedaGenero.value = '';

            // Refrescar busqueda con generos seleccionados
            currentPage = 1;
            fetchMultimedia();
        });

        // Cerrar modal sin cambios
        document.getElementById('btn-cerrar-modal')?.addEventListener('click', () => {
            modalGeneros.classList.add('hidden');
        });

        function actualizarPillsGeneros() {
            if (!contenedorPills || !generosHidden) return;

            contenedorPills.innerHTML = '';
            const ids = selectedGeneros.map(g => g.id);
            generosHidden.value = JSON.stringify(ids);

            selectedGeneros.forEach(g => {
                const pill = document.createElement('div');
                pill.className = 'genre-pill flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/30 rounded-full text-white';
                pill.innerHTML = `
                    <span class="text-[10px] font-bold uppercase">${g.nombre}</span>
                    <span class="material-symbols-outlined text-[14px] cursor-pointer hover:text-red-500" data-id="${g.id}">close</span>`;

                pill.querySelector('.material-symbols-outlined').onclick = (e) => {
                    const idToRemove = e.target.dataset.id;
                    selectedGeneros = selectedGeneros.filter(item => item.id !== idToRemove);

                    const cb = modalGeneros.querySelector(`input[value="${idToRemove}"]`);
                    if (cb) cb.checked = false;

                    actualizarPillsGeneros();
                    currentPage = 1;
                    fetchMultimedia();
                };

                contenedorPills.appendChild(pill);
            });
        }

        // ==========================================
        // 5. POLLING DE ESTADOS (async real-time)
        // ==========================================
        function startStatusPolling(items) {
            // Limpiar polling anterior
            if (statusPollInterval) clearInterval(statusPollInterval);

            // Solo pollear si hay items en estados transitorios
            const transitoryStates = ['uploading', 'processing'];
            const needsPolling = items.some(item =>
                item.estado !== 'DISABLE' && transitoryStates.includes(item.estado_ingesta)
            );

            if (!needsPolling || visibleIds.length === 0) return;

            statusPollInterval = setInterval(async () => {
                try {
                    const ids = visibleIds.join(',');
                    const res = await fetch(`/app/dash/json/multimedia/status?ids=${ids}`);
                    const registros = await res.json();

                    registros.forEach(reg => {
                        const pill = document.querySelector(`.status-pill[data-id="${reg.idMultimedia}"]`);
                        if (pill) {
                            const newHtml = getStatusPill(reg);
                            if (pill.innerHTML !== newHtml) {
                                pill.innerHTML = newHtml;
                                // Animacion de cambio
                                pill.classList.add('animate-pulse');
                                setTimeout(() => pill.classList.remove('animate-pulse'), 2000);
                            }
                        }
                    });

                    // Detener polling si ya no hay estados transitorios
                    const stillTransitory = registros.some(r =>
                        r.estado !== 'DISABLE' && transitoryStates.includes(r.estado_ingesta)
                    );
                    if (!stillTransitory) {
                        clearInterval(statusPollInterval);
                        statusPollInterval = null;
                    }

                } catch (err) {
                    console.error('[RTM-STATUS] Error polling:', err);
                }
            }, 5000); // Poll cada 5 segundos
        }

        // Limpiar polling al salir de la página para evitar intervalos huérfanos
        window.addEventListener('pagehide', () => {
            if (statusPollInterval) {
                clearInterval(statusPollInterval);
                statusPollInterval = null;
            }
        });

        // ==========================================
        // INIT - Cargar primera pagina
        // ==========================================
        fetchMultimedia();
    });
})();
