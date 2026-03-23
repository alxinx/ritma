import Swal from 'sweetalert2';

;(function () {
    document.addEventListener('DOMContentLoaded', () => {

        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';

        // ==========================================
        // SINGLETON AUDIO MANAGER
        // — Garantiza que solo un audio suene a la vez
        // ==========================================
        const AudioManager = {
            current: null,
            currentId: null,
            onEndedCb: null,

            play(id, url, onEnded) {
                // Si hay otro audio sonando, pausarlo y resetear su UI
                if (this.current && this.currentId !== id) {
                    this.current.pause();
                    this._resetRowUI(this.currentId);
                }
                // Si es el mismo, solo hacer play
                if (this.currentId === id && this.current) {
                    this.current.play();
                    return;
                }
                // Nuevo audio
                if (this.current) {
                    this.current.pause();
                    this.current.src = '';
                }
                this.current = new Audio(url);
                this.current.preload = 'auto';
                this.currentId = id;
                this.onEndedCb = onEnded;
                this.current.addEventListener('ended', () => {
                    this._resetRowUI(id);
                    this.current = null;
                    this.currentId = null;
                    if (this.onEndedCb) this.onEndedCb();
                });
                this.current.play().catch(() => {});
            },

            pause() {
                if (this.current) this.current.pause();
            },

            toggle(id, url, onEnded) {
                if (this.currentId === id && this.current && !this.current.paused) {
                    this.pause();
                    return false; // pausado
                }
                this.play(id, url, onEnded);
                return true; // reproduciendo
            },

            isPlaying(id) {
                return this.currentId === id && this.current && !this.current.paused;
            },

            _resetRowUI(id) {
                const row = document.querySelector(`tr[data-id="${id}"]`);
                if (!row) return;
                const eqIcon = row.querySelector('.eq-icon');
                const playBtn = row.querySelector('.btn-play-row');
                if (eqIcon) {
                    eqIcon.innerHTML = row.dataset.tipo === 'VIDEO'
                        ? '<span class="material-symbols-outlined text-purple-400 text-sm">videocam</span>'
                        : '<span class="material-symbols-outlined text-green-400 text-sm">music_note</span>';
                }
                if (playBtn) playBtn.querySelector('.material-symbols-outlined').textContent = 'play_arrow';
            }
        };

        // ==========================================
        // ESTADO DE BUSQUEDA
        // ==========================================
        let currentPage = 1;
        let searchDebounce = null;
        let currentGenero = 'all';
        let currentArtista = null;
        let currentArtistaName = '';
        let artistasCache = [];
        let artistasLoaded = false;

        const bibSkeleton = document.getElementById('bib-skeleton');
        const bibTableWrapper = document.getElementById('bib-table-wrapper');
        const bibEmpty = document.getElementById('bib-empty');
        const bibTbody = document.getElementById('bib-tbody');
        const bibTotal = document.getElementById('bib-total');
        const bibPages = document.getElementById('bib-pages');
        const bibSearch = document.getElementById('bib-search');

        // ==========================================
        // GENRE PILLS
        // ==========================================
        document.querySelectorAll('.genre-pill-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.genre-pill-btn').forEach(b => {
                    b.className = 'genre-pill-btn px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-full border border-white/15 text-white/40 hover:border-primary/40 hover:text-primary transition-all';
                    b.dataset.id === 'all'
                        ? b.classList.add('px-4')
                        : null;
                });
                btn.className = 'genre-pill-btn active px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-full transition-all bg-primary text-black border border-primary';
                currentGenero = btn.dataset.id;
                currentPage = 1;
                triggerSearch();
            });
        });

        // ==========================================
        // SEARCH INPUT — debounce
        // ==========================================
        bibSearch?.addEventListener('input', () => {
            clearTimeout(searchDebounce);
            searchDebounce = setTimeout(() => {
                currentPage = 1;
                triggerSearch();
            }, 350);
        });

        // ==========================================
        // ARTISTAS GRID — carga lazy al abrir la página
        // ==========================================
        async function loadArtistas() {
            if (artistasLoaded) return;
            try {
                const res = await fetch('/ritmaap/json/biblioteca/artistas');
                const json = await res.json();
                artistasCache = json.data || [];
                artistasLoaded = true;
                renderArtistas(artistasCache);
            } catch (err) {
                console.error('Error loading artistas:', err);
            }
        }

        function renderArtistas(artistas) {
            const grid = document.getElementById('artistas-grid');
            if (!grid) return;

            // Quitar skeletons
            grid.querySelectorAll('.artista-skeleton').forEach(el => el.remove());

            if (artistas.length === 0) {
                grid.innerHTML = '<p class="col-span-3 text-center text-white/20 text-xs py-4">Sin artistas</p>';
                return;
            }

            artistas.forEach(a => {
                const item = document.createElement('button');
                item.className = 'artista-item flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-white/5 transition-all group';
                item.dataset.id = a.idArtista;
                item.dataset.nombre = a.nombreArtista;
                if (currentArtista === a.idArtista) item.classList.add('bg-primary/10', 'ring-1', 'ring-primary/30');

                const imgSrc = a.cover
                    ? `${window.__R2_URL__}/images/artistas/${a.cover}`
                    : '/img/artista2.webp';

                item.innerHTML = `
                    <img
                        src="${imgSrc}"
                        alt="${escapeHtml(a.nombreArtista)}"
                        loading="lazy"
                        class="w-14 h-14 rounded-full object-cover border border-white/10 group-hover:border-primary/30 transition-all"
                        onerror="this.src='/img/artista2.webp'"
                    >
                    <span class="text-[9px] font-bold uppercase tracking-wide text-white/50 group-hover:text-white text-center leading-tight line-clamp-2">${escapeHtml(a.nombreArtista)}</span>
                    <span class="text-[8px] font-mono text-primary/40">${a.total} DL</span>
                `;

                item.addEventListener('click', () => {
                    if (currentArtista === a.idArtista) {
                        // Deseleccionar
                        currentArtista = null;
                        currentArtistaName = '';
                        item.classList.remove('bg-primary/10', 'ring-1', 'ring-primary/30');
                    } else {
                        // Seleccionar
                        currentArtista = a.idArtista;
                        currentArtistaName = a.nombreArtista;
                        grid.querySelectorAll('.artista-item').forEach(el => {
                            el.classList.remove('bg-primary/10', 'ring-1', 'ring-primary/30');
                        });
                        item.classList.add('bg-primary/10', 'ring-1', 'ring-primary/30');
                    }
                    currentPage = 1;
                    triggerSearch();
                });

                grid.appendChild(item);
            });
        }

        // Buscador interno de artistas
        const artistaSearchInput = document.getElementById('artista-search-input');
        artistaSearchInput?.addEventListener('input', () => {
            const q = artistaSearchInput.value.toLowerCase().trim();
            const filtered = q
                ? artistasCache.filter(a => a.nombreArtista.toLowerCase().includes(q))
                : artistasCache;
            const grid = document.getElementById('artistas-grid');
            if (grid) {
                grid.querySelectorAll('.artista-item').forEach(el => el.remove());
            }
            renderArtistas(filtered);
        });

        // ==========================================
        // SEARCH CORE
        // ==========================================
        async function triggerSearch() {
            if (!bibTbody) return;

            showSkeleton();

            try {
                const params = new URLSearchParams({
                    page: currentPage,
                    search: bibSearch ? bibSearch.value.trim() : '',
                    genero: currentGenero === 'all' ? '' : currentGenero,
                    idArtista: currentArtista || ''
                });

                const res = await fetch(`/ritmaap/json/biblioteca/search?${params}`);
                const json = await res.json();

                hideSkeleton();

                if (!json.ok || json.data.length === 0) {
                    showEmpty();
                    return;
                }

                renderTable(json);

            } catch (err) {
                console.error('Biblioteca search error:', err);
                hideSkeleton();
                showEmpty();
            }
        }

        function showSkeleton() {
            bibSkeleton?.classList.remove('hidden');
            bibTableWrapper?.classList.add('hidden');
            bibEmpty?.classList.add('hidden');
        }

        function hideSkeleton() {
            bibSkeleton?.classList.add('hidden');
        }

        function showEmpty() {
            bibEmpty?.classList.remove('hidden');
            bibTableWrapper?.classList.add('hidden');
        }

        function renderTable(json) {
            bibTableWrapper?.classList.remove('hidden');
            bibEmpty?.classList.add('hidden');

            const fmtColors = {
                'MP3': 'bg-green-500/20 text-green-400',
                'WAV': 'bg-blue-500/20 text-blue-400',
                'FLAC': 'bg-cyan-500/20 text-cyan-400',
                'MP4': 'bg-purple-500/20 text-purple-400',
                'MOV': 'bg-pink-500/20 text-pink-400',
                'AIFF': 'bg-orange-500/20 text-orange-400'
            };

            bibTbody.innerHTML = json.data.map(m => {
                const fmtClass = fmtColors[m.formato] || 'bg-white/10 text-white/50';
                const tipoIcon = m.tipoAsset === 'VIDEO'
                    ? '<span class="material-symbols-outlined text-purple-400 text-sm">videocam</span>'
                    : '<span class="material-symbols-outlined text-green-400 text-sm">music_note</span>';

                const fechaStr = m.fechaDescarga
                    ? new Date(m.fechaDescarga).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
                    : '—';

                return `
                <tr class="border-b border-white/5 hover:bg-white/2 transition-colors" data-id="${m.idMultimedia}" data-tipo="${m.tipoAsset}">
                    <td class="px-3 py-3 w-8">
                        <div class="eq-icon flex items-center justify-center w-7 h-7 rounded-lg bg-white/5">
                            ${tipoIcon}
                        </div>
                    </td>
                    <td class="px-4 py-3" style="width:20%">
                        <span class="text-sm font-bold text-white/80 truncate block max-w-[120px]">${escapeHtml(m.artista)}</span>
                    </td>
                    <td class="px-4 py-3" style="width:30%">
                        <p class="text-sm text-white truncate font-medium">${escapeHtml(m.nombreComposicion)}</p>
                        ${m.bpm ? `<span class="text-[8px] font-mono text-primary/50 font-bold">${m.bpm} BPM</span>` : ''}
                    </td>
                    <td class="px-4 py-3" style="width:20%">
                        <span class="px-2 py-0.5 text-[8px] font-bold uppercase rounded mr-2 ${fmtClass}">${m.formato}</span>
                        <span class="text-[9px] font-mono text-white/20">${fechaStr}</span>
                    </td>
                    <td class="px-4 py-3 text-center" style="width:16%">
                        <div class="flex items-center justify-center gap-1">
                            <button class="btn-play-row p-1.5 text-white/30 hover:text-primary transition-colors"
                                data-id="${m.idMultimedia}" title="Preview">
                                <span class="material-symbols-outlined text-[18px]">play_arrow</span>
                            </button>
                            <a href="/ritmaap/profile/mediafile/${m.idMultimedia}"
                                class="p-1.5 text-white/30 hover:text-primary transition-colors" title="Ver detalle">
                                <span class="material-symbols-outlined text-[18px]">visibility</span>
                            </a>
                            <button class="btn-dl-bib p-1.5 text-white/30 hover:text-primary transition-colors"
                                data-id="${m.idMultimedia}"
                                data-nombre="${escapeHtml(m.nombreComposicion)}"
                                data-costo="0"
                                data-owned="true"
                                title="Descargar (Ya comprado)">
                                <span class="material-symbols-outlined text-[18px]">download</span>
                            </button>
                        </div>
                    </td>
                </tr>`;
            }).join('');

            // Bind play buttons
            bibTbody.querySelectorAll('.btn-play-row').forEach(btn => {
                btn.addEventListener('click', () => handlePlay(btn));
            });

            // Bind download buttons
            bibTbody.querySelectorAll('.btn-dl-bib').forEach(btn => {
                btn.addEventListener('click', () => handleDownload(btn));
            });

            // Pagination
            if (bibTotal) {
                bibTotal.textContent = `${json.total} descarga${json.total !== 1 ? 's' : ''} — Pagina ${json.page} de ${json.totalPages}`;
            }
            if (bibPages) {
                bibPages.innerHTML = '';
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
                    bibPages.appendChild(pageBtn);
                }
            }
        }

        // ==========================================
        // PLAY HANDLER — con equalizador animado
        // ==========================================
        function handlePlay(btn) {
            const id = btn.dataset.id;
            const row = document.querySelector(`tr[data-id="${id}"]`);
            const eqIcon = row?.querySelector('.eq-icon');
            const playIcon = btn.querySelector('.material-symbols-outlined');
            const url = `/ritmaap/api/preview/${id}`;

            const isNowPlaying = AudioManager.toggle(id, url, () => {
                // onEnded callback: resetear icono
                if (eqIcon) {
                    const tipo = row.dataset.tipo;
                    eqIcon.innerHTML = tipo === 'VIDEO'
                        ? '<span class="material-symbols-outlined text-purple-400 text-sm">videocam</span>'
                        : '<span class="material-symbols-outlined text-green-400 text-sm">music_note</span>';
                }
                if (playIcon) playIcon.textContent = 'play_arrow';
            });

            if (isNowPlaying) {
                // Mostrar equalizador animado
                if (eqIcon) {
                    eqIcon.innerHTML = `
                        <div class="eq-bars flex items-end gap-px h-5 w-5 justify-center">
                            <div class="eq-bar bg-primary rounded-sm w-1" style="animation: eqBounce 0.6s ease-in-out infinite alternate; height: 60%"></div>
                            <div class="eq-bar bg-primary rounded-sm w-1" style="animation: eqBounce 0.8s ease-in-out infinite alternate 0.15s; height: 40%"></div>
                            <div class="eq-bar bg-primary rounded-sm w-1" style="animation: eqBounce 0.5s ease-in-out infinite alternate 0.3s; height: 80%"></div>
                            <div class="eq-bar bg-primary rounded-sm w-1" style="animation: eqBounce 0.7s ease-in-out infinite alternate 0.1s; height: 50%"></div>
                        </div>`;
                }
                if (playIcon) playIcon.textContent = 'pause';
            } else {
                // Pausado: restaurar icono
                if (eqIcon) {
                    const tipo = row?.dataset.tipo;
                    eqIcon.innerHTML = tipo === 'VIDEO'
                        ? '<span class="material-symbols-outlined text-purple-400 text-sm">videocam</span>'
                        : '<span class="material-symbols-outlined text-green-400 text-sm">music_note</span>';
                }
                if (playIcon) playIcon.textContent = 'play_arrow';
            }
        }

        // ==========================================
        // DOWNLOAD HANDLER — mismo flujo que perfil
        // ==========================================
        async function handleDownload(btn) {
            const idMultimedia = btn.dataset.id;
            const nombreComposicion = btn.dataset.nombre;

            try {
                btn.disabled = true;
                btn.style.opacity = '0.5';

                // Verificar ban primero
                const banRes = await fetch('/ritmaap/json/download-ban-status');
                const banData = await banRes.json();
                if (banData.banned) {
                    Swal.fire({ icon: 'error', title: 'Descargas suspendidas', text: banData.msg, background: '#0a0a0c', color: '#fff' });
                    return;
                }

                let countdown = 5;
                let countdownInterval;

                const swalResult = await Swal.fire({
                    title: nombreComposicion,
                    html: `Ya tienes este archivo. <strong>No se descontaran creditos.</strong><br><br>La descarga iniciara en <strong id="swal-countdown">${countdown}</strong> segundos...`,
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
                    willClose: () => clearInterval(countdownInterval)
                });

                if (swalResult.isDismissed) {
                    Swal.fire({ icon: 'info', title: 'Descarga cancelada', timer: 1500, showConfirmButton: false, background: '#0a0a0c', color: '#fff' });
                    return;
                }

                const res = await fetch(`/ritmaap/json/multimedia/${idMultimedia}/request-download`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'CSRF-Token': csrfToken }
                });
                const data = await res.json();

                if (data.blocked) {
                    Swal.fire({ icon: 'error', title: 'Descargas suspendidas', text: data.msg, background: '#0a0a0c', color: '#fff' });
                    return;
                }

                const warning = res.headers.get('X-Download-Warning');
                if (warning) {
                    Swal.fire({ icon: 'warning', title: 'Advertencia', text: warning, timer: 4000, showConfirmButton: false, background: '#0a0a0c', color: '#fff' });
                }

                if (data.ok && data.token) {
                    window.location.href = `/ritmaap/api/download/${data.token}`;
                } else {
                    Swal.fire({ icon: 'error', title: 'Error', text: data.msg || 'No se pudo generar el link.', background: '#0a0a0c', color: '#fff' });
                }

            } catch (err) {
                console.error('Error download biblioteca:', err);
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
        // CSS KEYFRAME para equalizador (inyectar una sola vez)
        // ==========================================
        if (!document.getElementById('eq-style')) {
            const style = document.createElement('style');
            style.id = 'eq-style';
            style.textContent = `
                @keyframes eqBounce {
                    0%   { height: 20%; }
                    100% { height: 100%; }
                }
                .eq-bars { display: flex; align-items: flex-end; }
            `;
            document.head.appendChild(style);
        }

        // ==========================================
        // INIT — cargar datos al arrancar
        // ==========================================
        triggerSearch();
        loadArtistas();

        // Limpiar audio al salir de la página
        window.addEventListener('pagehide', () => {
            AudioManager.pause();
            if (AudioManager.current) {
                AudioManager.current.src = '';
            }
        });

    });
})();
