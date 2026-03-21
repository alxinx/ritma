;(function () {
    document.addEventListener('DOMContentLoaded', () => {

        // ==========================================
        // PROFILE DROPDOWN MENU
        // ==========================================
        const profileBtn = document.getElementById('profileMenuBtn');
        const profileMenu = document.getElementById('profileMenu');

        if (profileBtn && profileMenu) {
            profileBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                profileMenu.classList.toggle('hidden');
            });
            document.addEventListener('click', (e) => {
                if (!profileBtn.contains(e.target) && !profileMenu.contains(e.target)) {
                    profileMenu.classList.add('hidden');
                }
            });
        }

        // ==========================================
        // SEARCH INPUT — Autofocus + Typewriter placeholder
        // ==========================================
        const searchInput = document.getElementById('searchGlobal');
        if (searchInput) {
            searchInput.focus();

            const phrases = [
                'Digita la cancion o artista que buscas',
                'ej: karol g',
                'mañana sera bonito'
            ];
            let phraseIdx = 0;
            let charIdx = 0;
            let isDeleting = false;
            let typeTimer = null;

            function typewriterStep() {
                if (searchInput.value.length > 0) { searchInput.placeholder = ''; return; }
                const currentPhrase = phrases[phraseIdx];
                if (!isDeleting) {
                    charIdx++;
                    searchInput.placeholder = currentPhrase.substring(0, charIdx);
                    if (charIdx === currentPhrase.length) {
                        typeTimer = setTimeout(() => { isDeleting = true; typewriterStep(); }, 2000);
                        return;
                    }
                    typeTimer = setTimeout(typewriterStep, 60);
                } else {
                    charIdx--;
                    searchInput.placeholder = currentPhrase.substring(0, charIdx);
                    if (charIdx === 0) {
                        isDeleting = false;
                        phraseIdx = (phraseIdx + 1) % phrases.length;
                        typeTimer = setTimeout(typewriterStep, 400);
                        return;
                    }
                    typeTimer = setTimeout(typewriterStep, 30);
                }
            }
            typewriterStep();

            searchInput.addEventListener('input', () => {
                if (searchInput.value.length > 0) {
                    clearTimeout(typeTimer);
                    searchInput.placeholder = '';
                } else {
                    phraseIdx = 0; charIdx = 0; isDeleting = false;
                    typewriterStep();
                }
            });
            window.addEventListener('pagehide', () => clearTimeout(typeTimer));
        }

        // ==========================================
        // SEARCH STATE
        // ==========================================
        let currentPage = 1;
        let searchDebounce = null;
        let currentType = 'all';
        let currentGeneros = [];

        // DOM elements
        const searchEmpty = document.getElementById('search-empty');
        const searchLoading = document.getElementById('search-loading');
        const searchTableWrapper = document.getElementById('search-table-wrapper');
        const searchTbody = document.getElementById('search-tbody');
        const searchTotal = document.getElementById('search-total');
        const searchPages = document.getElementById('search-pages');

        // ==========================================
        // FILTER TYPE BUTTONS (Audio/Video/Todos)
        // ==========================================
        const filterBtns = document.querySelectorAll('.filter-type');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => {
                    b.classList.remove('active', 'bg-primary/15', 'text-primary');
                    b.classList.add('text-white/40');
                });
                btn.classList.add('active', 'bg-primary/15', 'text-primary');
                btn.classList.remove('text-white/40');
                currentType = btn.dataset.type;
                currentPage = 1;
                triggerSearch();
            });
        });

        // ==========================================
        // BPM RANGE SLIDER
        // ==========================================
        const bpmMin = document.getElementById('bpmMin');
        const bpmMax = document.getElementById('bpmMax');
        const bpmFill = document.getElementById('bpm-track-fill');
        const bpmTooltip = document.getElementById('bpm-tooltip');
        const bpmTooltipText = document.getElementById('bpm-tooltip-text');
        const bpmLabel = document.getElementById('bpm-range-label');

        function updateBpmSlider() {
            if (!bpmMin || !bpmMax || !bpmFill) return;
            let minVal = parseInt(bpmMin.value);
            let maxVal = parseInt(bpmMax.value);
            if (minVal > maxVal) {
                [bpmMin.value, bpmMax.value] = [maxVal, minVal];
                [minVal, maxVal] = [maxVal, minVal];
            }
            const rangeMin = parseInt(bpmMin.min);
            const rangeMax = parseInt(bpmMin.max);
            const percentMin = ((minVal - rangeMin) / (rangeMax - rangeMin)) * 100;
            const percentMax = ((maxVal - rangeMin) / (rangeMax - rangeMin)) * 100;
            bpmFill.style.left = percentMin + '%';
            bpmFill.style.width = (percentMax - percentMin) + '%';
            if (bpmLabel) bpmLabel.textContent = `${minVal} — ${maxVal}`;
        }

        function showBpmTooltip(value, input) {
            if (!bpmTooltip || !bpmTooltipText) return;
            bpmTooltipText.textContent = value;
            const parent = input.parentElement.getBoundingClientRect();
            const percent = (value - parseInt(input.min)) / (parseInt(input.max) - parseInt(input.min));
            bpmTooltip.style.left = (percent * parent.width) + 'px';
            bpmTooltip.classList.remove('hidden');
        }

        if (bpmMin && bpmMax) {
            bpmMin.addEventListener('input', () => { updateBpmSlider(); showBpmTooltip(bpmMin.value, bpmMin); });
            bpmMax.addEventListener('input', () => { updateBpmSlider(); showBpmTooltip(bpmMax.value, bpmMax); });
            [bpmMin, bpmMax].forEach(el => {
                el.addEventListener('mouseup', () => { bpmTooltip?.classList.add('hidden'); currentPage = 1; triggerSearch(); });
                el.addEventListener('touchend', () => { bpmTooltip?.classList.add('hidden'); currentPage = 1; triggerSearch(); });
            });
            updateBpmSlider();
        }

        // ==========================================
        // GENRE MODAL
        // ==========================================
        const btnAbrir = document.getElementById('btn-abrir-generos-search');
        const modal = document.getElementById('modal-generos-search');
        const btnCerrar = document.getElementById('btn-cerrar-generos-search');
        const btnAceptar = document.getElementById('btn-aceptar-generos-search');
        const listaGeneros = document.getElementById('lista-generos-search');
        const busquedaGenero = document.getElementById('busqueda-genero-search');
        const pillsContainer = document.getElementById('contenedor-pills-generos-search');
        const inputGeneros = document.getElementById('generosSeleccionadosSearch');

        btnAbrir?.addEventListener('click', async () => {
            modal?.classList.remove('hidden');
            if (listaGeneros && listaGeneros.children.length === 0) {
                try {
                    const res = await fetch('/ritmaap/json/generos');
                    const generos = await res.json();
                    generos.forEach(g => {
                        const item = document.createElement('label');
                        item.className = 'glass-card rounded-sm p-1 relative overflow-hidden';
                        item.innerHTML = `<input type="checkbox" value="${g.genero_id}" data-nombre="${g.nombre}" class="check-genero-search accent-primary"><span class="text-[10px] w-full justify-between subtittle">${g.nombre}</span>`;
                        listaGeneros.appendChild(item);
                    });
                } catch (err) { console.error('Error loading genres:', err); }
            }
            setTimeout(() => busquedaGenero?.focus(), 100);
        });

        btnCerrar?.addEventListener('click', () => modal?.classList.add('hidden'));

        busquedaGenero?.addEventListener('input', () => {
            const q = busquedaGenero.value.toLowerCase();
            listaGeneros?.querySelectorAll('label').forEach(l => {
                l.style.display = l.textContent.toLowerCase().includes(q) ? '' : 'none';
            });
        });

        btnAceptar?.addEventListener('click', () => {
            const checks = modal.querySelectorAll('.check-genero-search:checked');
            currentGeneros = Array.from(checks).map(cb => ({ id: cb.value, nombre: cb.dataset.nombre }));
            updatePills();
            modal?.classList.add('hidden');
            currentPage = 1;
            triggerSearch();
        });

        function updatePills() {
            if (!pillsContainer || !inputGeneros) return;
            pillsContainer.innerHTML = '';
            inputGeneros.value = JSON.stringify(currentGeneros.map(g => g.id));
            currentGeneros.forEach(g => {
                const pill = document.createElement('div');
                pill.className = 'genre-pill flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/30 rounded-full text-white';
                pill.innerHTML = `<span class="text-[10px] font-bold uppercase">${escapeHtml(g.nombre)}</span><span class="material-symbols-outlined text-[14px] cursor-pointer hover:text-red-500" data-id="${g.id}">close</span>`;
                pill.querySelector('.material-symbols-outlined').onclick = (e) => {
                    currentGeneros = currentGeneros.filter(item => item.id !== e.target.dataset.id);
                    const cb = modal?.querySelector(`input[value="${e.target.dataset.id}"]`);
                    if (cb) cb.checked = false;
                    updatePills();
                    currentPage = 1;
                    triggerSearch();
                };
                pillsContainer.appendChild(pill);
            });
        }

        // ==========================================
        // SEARCH — Input debounce
        // ==========================================
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                clearTimeout(searchDebounce);
                searchDebounce = setTimeout(() => {
                    currentPage = 1;
                    triggerSearch();
                }, 400);
            });
        }

        // ==========================================
        // SEARCH — Core logic
        // ==========================================
        function hasActiveFilters() {
            const search = searchInput ? searchInput.value.trim() : '';
            const bMin = bpmMin ? parseInt(bpmMin.value) : 20;
            const bMax = bpmMax ? parseInt(bpmMax.value) : 200;
            return search.length > 0 || currentType !== 'all' || currentGeneros.length > 0 || bMin > 20 || bMax < 200;
        }

        async function triggerSearch() {
            if (!searchTbody) return;

            // Si no hay filtros activos, mostrar empty state
            if (!hasActiveFilters()) {
                searchEmpty?.classList.remove('hidden');
                searchLoading?.classList.add('hidden');
                searchTableWrapper?.classList.add('hidden');
                return;
            }

            // Mostrar loading
            searchEmpty?.classList.add('hidden');
            searchTableWrapper?.classList.add('hidden');
            searchLoading?.classList.remove('hidden');

            try {
                const params = new URLSearchParams({
                    page: currentPage,
                    search: searchInput ? searchInput.value.trim() : '',
                    tipo: currentType,
                    bpmMin: bpmMin ? bpmMin.value : 20,
                    bpmMax: bpmMax ? bpmMax.value : 200,
                    generos: JSON.stringify(currentGeneros.map(g => g.id))
                });

                const res = await fetch(`/ritmaap/json/search?${params}`);
                const json = await res.json();

                searchLoading?.classList.add('hidden');

                if (!json.ok || json.data.length === 0) {
                    searchTableWrapper?.classList.add('hidden');
                    searchEmpty?.classList.remove('hidden');
                    if (searchEmpty) {
                        searchEmpty.innerHTML = `
                            <span class="material-symbols-outlined text-6xl text-white/5 mb-4 block">search_off</span>
                            <h3 class="text-lg font-display font-bold text-white/15 mb-2">Sin resultados</h3>
                            <p class="text-white/20 text-xs font-mono uppercase tracking-widest">Intenta con otros filtros o palabras clave</p>`;
                    }
                    return;
                }

                // Renderizar resultados
                searchEmpty?.classList.add('hidden');
                searchTableWrapper?.classList.remove('hidden');

                searchTbody.innerHTML = json.data.map(m => {
                    const fmtColors = {
                        'MP3': 'bg-green-500/20 text-green-400',
                        'WAV': 'bg-blue-500/20 text-blue-400',
                        'FLAC': 'bg-cyan-500/20 text-cyan-400',
                        'MP4': 'bg-purple-500/20 text-purple-400',
                        'MOV': 'bg-pink-500/20 text-pink-400',
                        'AIFF': 'bg-orange-500/20 text-orange-400'
                    };
                    const fmtClass = fmtColors[m.formato] || 'bg-white/10 text-white/50';
                    const tipoIcon = m.tipoAsset === 'VIDEO'
                        ? '<span class="material-symbols-outlined text-purple-400 text-sm">videocam</span>'
                        : '<span class="material-symbols-outlined text-green-400 text-sm">music_note</span>';

                    // Boton descarga o carrito
                    const actionBtn = m.puedeDescargar
                        ? `<button class="p-1.5 text-white/30 hover:text-primary transition-colors" title="Descargar"><span class="material-symbols-outlined text-[18px]">download</span></button>`
                        : `<button class="p-1.5 text-white/30 hover:text-yellow-400 transition-colors" title="Creditos insuficientes — Agregar al carrito"><span class="material-symbols-outlined text-[18px]">shopping_cart</span></button>`;

                    return `
                    <tr class="border-b border-white/5 hover:bg-white/3 transition-colors">
                        <td class="px-4 py-3">
                            <div class="flex items-center gap-2">
                                ${tipoIcon}
                                <span class="text-sm font-bold text-white truncate">${escapeHtml(m.artista)}</span>
                            </div>
                        </td>
                        <td class="px-4 py-3">
                            <p class="text-sm text-white/80 truncate">${escapeHtml(m.nombreComposicion)}</p>
                            ${m.bpm ? `<span class="text-[8px] font-mono text-primary/50 font-bold">${m.bpm} BPM</span>` : ''}
                        </td>
                        <td class="px-4 py-3">
                            <span class="px-2 py-0.5 text-[8px] font-bold uppercase rounded ${fmtClass}">${m.formato}</span>
                        </td>
                        <td class="px-4 py-3">
                            <span class="text-sm font-mono text-primary font-bold">${m.costoCreditos}</span>
                            <span class="text-[8px] text-white/20 ml-0.5">R$</span>
                        </td>
                        <td class="px-4 py-3 text-center">
                            <div class="flex items-center justify-center gap-1">
                                <a href="/ritmaap/profile/mediafile/${m.idMultimedia}" class="p-1.5 text-white/30 hover:text-primary transition-colors" title="Ver detalle">
                                    <span class="material-symbols-outlined text-[18px]">visibility</span>
                                </a>
                                ${actionBtn}
                            </div>
                        </td>
                    </tr>`;
                }).join('');

                // Paginacion
                if (searchTotal) {
                    searchTotal.textContent = `${json.total} resultado${json.total !== 1 ? 's' : ''} — Pagina ${json.page} de ${json.totalPages}`;
                }
                if (searchPages) {
                    searchPages.innerHTML = '';
                    for (let i = 1; i <= json.totalPages; i++) {
                        const pageBtn = document.createElement('button');
                        pageBtn.textContent = i;
                        pageBtn.className = i === json.page
                            ? 'px-3 py-1 text-xs font-bold bg-primary text-black rounded'
                            : 'px-3 py-1 text-xs font-bold text-white/40 hover:text-white bg-white/5 rounded';
                        pageBtn.addEventListener('click', () => {
                            currentPage = i;
                            triggerSearch();
                        });
                        searchPages.appendChild(pageBtn);
                    }
                }

            } catch (err) {
                console.error('Search error:', err);
                searchLoading?.classList.add('hidden');
                searchEmpty?.classList.remove('hidden');
            }
        }

        // ==========================================
        // HELPERS
        // ==========================================
        function escapeHtml(str) {
            if (!str) return '';
            return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        }

    });
})();
