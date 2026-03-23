import Swal from 'sweetalert2';

;(function () {
    document.addEventListener('DOMContentLoaded', () => {

        // CSRF token from meta or cookie
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';

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

            if (!hasActiveFilters()) {
                searchEmpty?.classList.remove('hidden');
                searchLoading?.classList.add('hidden');
                searchTableWrapper?.classList.add('hidden');
                return;
            }

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

                    let actionBtn;
                    if (m.yaComprado) {
                        // Ya es propietario — descargar gratis
                        actionBtn = `<button class="btn-dl-search p-1.5 text-white/30 hover:text-primary transition-colors" title="Ya comprado — Descargar" data-id="${m.idMultimedia}" data-nombre="${escapeHtml(m.nombreComposicion)}" data-costo="0" data-owned="true"><span class="material-symbols-outlined text-[18px]">download</span></button>`;
                    } else if (m.puedeDescargar) {
                        // Puede comprar
                        actionBtn = `<button class="btn-dl-search p-1.5 text-white/30 hover:text-primary transition-colors" title="Descargar" data-id="${m.idMultimedia}" data-nombre="${escapeHtml(m.nombreComposicion)}" data-costo="${m.costoCreditos}" data-owned="false"><span class="material-symbols-outlined text-[18px]">download</span></button>`;
                    } else {
                        // Sin creditos
                        actionBtn = `<button class="p-1.5 text-white/30 hover:text-yellow-400 transition-colors" title="Creditos insuficientes"><span class="material-symbols-outlined text-[18px]">shopping_cart</span></button>`;
                    }

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

                // Bind download buttons
                searchTbody.querySelectorAll('.btn-dl-search').forEach(btn => {
                    btn.addEventListener('click', () => handleDownload(btn));
                });

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
        // DOWNLOAD HANDLER (SweetAlert + countdown)
        // ==========================================
        async function handleDownload(btn) {
            const idMultimedia = btn.dataset.id;
            const nombreComposicion = btn.dataset.nombre;
            const costoCreditos = parseInt(btn.dataset.costo) || 0;
            const yaComprado = btn.dataset.owned === 'true';

            try {
                btn.disabled = true;
                btn.style.opacity = '0.5';

                // SweetAlert con countdown de 5 segundos
                let countdown = 5;
                let countdownInterval;

                const creditMsg = yaComprado
                    ? 'Ya tienes este archivo. No se descontaran creditos.'
                    : `Se descontaran <strong>${costoCreditos} R$</strong> de tus creditos.`;

                const swalResult = await Swal.fire({
                    title: nombreComposicion,
                    html: `${creditMsg}<br><br>La descarga iniciara en <strong id="swal-countdown">${countdown}</strong> segundos...`,
                    icon: 'info',
                    showCancelButton: true,
                    confirmButtonText: 'Descargar ahora',
                    cancelButtonText: 'No descargar',
                    background: '#0a0a0c',
                    color: '#fff',
                    allowOutsideClick: false,
                    didOpen: () => {
                        const countdownEl = document.getElementById('swal-countdown');
                        countdownInterval = setInterval(() => {
                            countdown--;
                            if (countdownEl) countdownEl.textContent = countdown;
                            if (countdown <= 0) {
                                clearInterval(countdownInterval);
                                Swal.clickConfirm();
                            }
                        }, 1000);
                    },
                    willClose: () => {
                        clearInterval(countdownInterval);
                    }
                });

                if (swalResult.isDismissed) {
                    Swal.fire({
                        icon: 'info',
                        title: 'Descarga cancelada',
                        text: 'No se descontaron creditos.',
                        timer: 2000,
                        showConfirmButton: false,
                        background: '#0a0a0c',
                        color: '#fff'
                    });
                    return;
                }

                // Solicitar token de descarga
                const res = await fetch(`/ritmaap/json/multimedia/${idMultimedia}/request-download`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'CSRF-Token': csrfToken
                    }
                });
                const data = await res.json();

                if (data.blocked) {
                    Swal.fire({ icon: 'error', title: 'Descargas suspendidas', text: data.msg, background: '#0a0a0c', color: '#fff' });
                    return;
                }

                const warning = res.headers.get('X-Download-Warning');
                if (warning) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Advertencia',
                        text: warning,
                        timer: 4000,
                        showConfirmButton: false,
                        background: '#0a0a0c',
                        color: '#fff'
                    });
                }

                if (data.ok && data.token) {
                    // Animar descuento de créditos si no es propietario
                    if (!yaComprado && costoCreditos > 0 && window.animateCredits) {
                        window.animateCredits(costoCreditos);
                    }
                    // Pequeño delay para que la animación se vea antes del redirect
                    setTimeout(() => {
                        window.location.href = `/ritmaap/api/download/${data.token}`;
                    }, yaComprado ? 0 : 400);
                } else {
                    Swal.fire({ icon: 'error', title: 'Error', text: data.msg || 'No se pudo generar el link.', background: '#0a0a0c', color: '#fff' });
                }

            } catch (err) {
                console.error('Error download:', err);
                Swal.fire({ icon: 'error', title: 'Error', text: 'Error al solicitar descarga.', background: '#0a0a0c', color: '#fff' });
            } finally {
                btn.disabled = false;
                btn.style.opacity = '1';
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
        // ANIMACION DOWNCOUNT DE CREDITOS (global)
        // Expuesta como window.animateCredits(costo)
        // ==========================================
        window.animateCredits = function(costo) {
            if (!costo || costo <= 0) return;
            const badge = document.querySelector('a[href="/ritmaap/creditos"] .font-mono');
            if (!badge) return;

            const current = parseInt(badge.textContent) || 0;
            const target = Math.max(0, current - costo);
            const duration = 1200; // ms
            const startTime = performance.now();

            // Flash rojo en el badge
            const container = badge.closest('a');
            if (container) {
                container.style.transition = 'all 0.3s';
                container.style.borderColor = 'rgba(239,68,68,0.6)';
                container.style.background = 'rgba(239,68,68,0.15)';
                badge.style.color = '#ef4444';
            }

            // Floating "-X" indicator
            if (container) {
                const floater = document.createElement('span');
                floater.textContent = `-${costo}`;
                floater.style.cssText = `
                    position: absolute; top: -5px; right: -5px; z-index: 100;
                    font-size: 12px; font-weight: 900; color: #ef4444;
                    font-family: monospace; pointer-events: none;
                    animation: creditFloat 1.5s ease-out forwards;
                `;
                container.style.position = 'relative';
                container.appendChild(floater);
                setTimeout(() => floater.remove(), 1500);
            }

            // Easing countdown
            function step(now) {
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / duration, 1);
                // easeOutCubic
                const ease = 1 - Math.pow(1 - progress, 3);
                const val = Math.round(current - (current - target) * ease);
                badge.textContent = val;

                if (progress < 1) {
                    requestAnimationFrame(step);
                } else {
                    badge.textContent = target;
                    // Restaurar colores
                    setTimeout(() => {
                        if (container) {
                            container.style.borderColor = '';
                            container.style.background = '';
                            badge.style.color = '';
                        }
                    }, 600);
                }
            }
            requestAnimationFrame(step);
        };

        // ==========================================
        // ANIMACION UPCOUNT DE CREDITOS (global)
        // Expuesta como window.animateCreditsUp(cantidad)
        // ==========================================
        window.animateCreditsUp = function(cantidad) {
            if (!cantidad || cantidad <= 0) return;
            const badge = document.querySelector('a[href="/ritmaap/creditos"] .font-mono');
            if (!badge) return;

            const current = parseInt(badge.textContent) || 0;
            const target = current + cantidad;
            const duration = 1400;
            const startTime = performance.now();

            const container = badge.closest('a');
            if (container) {
                container.style.transition = 'all 0.3s';
                container.style.borderColor = 'rgba(34,197,94,0.7)';
                container.style.background = 'rgba(34,197,94,0.15)';
                badge.style.color = '#22c55e';
                // Pulse scale
                container.style.transform = 'scale(1.12)';
                setTimeout(() => { container.style.transform = 'scale(1)'; }, 300);
            }

            // Floating "+X" indicator (sube desde abajo)
            if (container) {
                const floater = document.createElement('span');
                floater.textContent = `+${cantidad}`;
                floater.style.cssText = `
                    position: absolute; top: -5px; right: -5px; z-index: 100;
                    font-size: 13px; font-weight: 900; color: #22c55e;
                    font-family: monospace; pointer-events: none;
                    animation: creditFloatUp 1.6s ease-out forwards;
                `;
                container.style.position = 'relative';
                container.appendChild(floater);
                setTimeout(() => floater.remove(), 1600);
            }

            // Easing count UP
            function step(now) {
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const ease = 1 - Math.pow(1 - progress, 3);
                const val = Math.round(current + (target - current) * ease);
                badge.textContent = val;

                if (progress < 1) {
                    requestAnimationFrame(step);
                } else {
                    badge.textContent = target;
                    setTimeout(() => {
                        if (container) {
                            container.style.borderColor = '';
                            container.style.background = '';
                            badge.style.color = '';
                        }
                    }, 800);
                }
            }
            requestAnimationFrame(step);
        };

        // Inyectar CSS de las animaciones floating (una sola vez)
        if (!document.getElementById('credit-float-style')) {
            const s = document.createElement('style');
            s.id = 'credit-float-style';
            s.textContent = `
                @keyframes creditFloat {
                    0%   { opacity: 1; transform: translateY(0) scale(1); }
                    70%  { opacity: 1; transform: translateY(-28px) scale(1.2); }
                    100% { opacity: 0; transform: translateY(-40px) scale(0.8); }
                }
                @keyframes creditFloatUp {
                    0%   { opacity: 0; transform: translateY(12px) scale(0.7); }
                    20%  { opacity: 1; transform: translateY(0) scale(1.15); }
                    70%  { opacity: 1; transform: translateY(-24px) scale(1.1); }
                    100% { opacity: 0; transform: translateY(-38px) scale(0.8); }
                }
            `;
            document.head.appendChild(s);
        }

    });
})();
