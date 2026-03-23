import Swal from 'sweetalert2';

;(function () {
    document.addEventListener('DOMContentLoaded', () => {
        const config = window.__WISHLIST__;
        if (!config) return;

        const { csrfToken, R2_PUBLIC_URL } = config;
        let creditosDisponibles = config.creditosDisponibles;

        const searchInput = document.getElementById('wishlist-search');
        const skeleton = document.getElementById('wishlist-skeleton');
        const grid = document.getElementById('wishlist-grid');
        const empty = document.getElementById('wishlist-empty');
        const countEl = document.getElementById('wishlist-count');

        // ==========================================
        // AUDIO MANAGER — Singleton (previene overlaps)
        // ==========================================
        const AudioManager = {
            current: null,
            currentId: null,
            onEndedCb: null,

            play(id, url, onEnded) {
                if (this.currentId && this.currentId !== id) {
                    this._resetCardUI(this.currentId);
                }
                if (this.current) {
                    this.current.pause();
                    this.current.removeEventListener('ended', this.onEndedCb);
                    this.current = null;
                }
                this.current = new Audio(url);
                this.currentId = id;
                this.onEndedCb = () => {
                    this._resetCardUI(id);
                    if (onEnded) onEnded();
                };
                this.current.addEventListener('ended', this.onEndedCb);
                this.current.play();
            },

            pause() {
                if (this.current) this.current.pause();
            },

            toggle(id, url, onEnded) {
                if (this.currentId === id && this.current) {
                    if (this.current.paused) {
                        this.current.play();
                        return true; // playing
                    } else {
                        this.current.pause();
                        return false; // paused
                    }
                }
                this.play(id, url, onEnded);
                return true; // playing
            },

            isPlaying(id) {
                return this.currentId === id && this.current && !this.current.paused;
            },

            _resetCardUI(id) {
                const card = document.querySelector(`[data-id="${id}"]`);
                if (!card) return;
                const overlay = card.querySelector('.play-overlay');
                const icon = overlay ? overlay.querySelector('.material-symbols-outlined') : null;
                if (icon) icon.textContent = 'play_arrow';
                if (overlay) overlay.classList.remove('playing');
            }
        };

        // ==========================================
        // CARGAR WISHLIST
        // ==========================================
        let debounceTimer = null;

        async function loadWishlist(search = '') {
            try {
                const params = new URLSearchParams();
                if (search) params.set('search', search);

                const res = await fetch(`/ritmaap/json/wishlist/search?${params}`);
                const data = await res.json();

                if (!data.ok) throw new Error(data.msg);

                skeleton.classList.add('hidden');

                if (data.data.length === 0) {
                    grid.classList.add('hidden');
                    empty.classList.remove('hidden');
                    if (countEl) countEl.textContent = '0 archivos en wishlist';
                    return;
                }

                empty.classList.add('hidden');
                grid.classList.remove('hidden');
                if (countEl) countEl.textContent = `${data.total} archivo${data.total !== 1 ? 's' : ''} en wishlist`;

                renderGrid(data.data);

            } catch (err) {
                console.error('Error loadWishlist:', err);
                skeleton.classList.add('hidden');
                empty.classList.remove('hidden');
            }
        }

        function renderGrid(items) {
            grid.innerHTML = '';

            items.forEach(item => {
                const card = document.createElement('div');
                card.dataset.id = item.idMultimedia;
                card.className = 'wishlist-card rounded-xl overflow-hidden transition-all duration-300';
                card.style.cssText = 'background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);';

                const typeIcon = item.tipoAsset === 'VIDEO' ? 'videocam' : 'music_note';
                const costLabel = item.yaComprado
                    ? '<span class="text-[9px] text-green-400 font-mono">COMPRADO</span>'
                    : `<span class="text-[9px] text-primary font-mono">${item.costoCreditos} R$</span>`;

                card.innerHTML = `
                    <div class="relative aspect-square overflow-hidden cursor-pointer group cover-wrapper">
                        <img
                            src="/img/coverGenerico.webp"
                            data-src="${item.coverUrl}"
                            alt="${item.nombreComposicion}"
                            class="w-full h-full object-cover lazy-img transition-transform duration-500 group-hover:scale-110"
                            loading="lazy"
                        />
                        <div class="play-overlay absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <span class="material-symbols-outlined text-white text-5xl drop-shadow-lg">play_arrow</span>
                        </div>
                        <div class="absolute top-2 left-2">
                            <span class="material-symbols-outlined text-xs text-white/60 bg-black/40 rounded-full px-1.5 py-0.5">${typeIcon}</span>
                        </div>
                    </div>
                    <div class="p-3">
                        <h4 class="text-sm font-bold text-white truncate" title="${item.nombreComposicion}">${item.nombreComposicion}</h4>
                        <p class="text-[11px] text-white/40 truncate mt-0.5">${item.artista}</p>
                        <div class="flex items-center justify-between mt-1">
                            ${costLabel}
                            ${item.bpm ? `<span class="text-[9px] text-white/20 font-mono">${item.bpm} BPM</span>` : ''}
                        </div>
                        <div class="flex items-center gap-1.5 mt-3">
                            <a href="/ritmaap/profile/mediafile/${item.idMultimedia}" class="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 hover:bg-primary/20 transition-colors" title="Visitar perfil">
                                <span class="material-symbols-outlined text-sm text-white/60 hover:text-primary">visibility</span>
                            </a>
                            <button class="btn-download flex items-center justify-center w-8 h-8 rounded-full bg-white/5 hover:bg-primary/20 transition-colors" title="Descargar" data-id="${item.idMultimedia}" data-name="${item.nombreComposicion}" data-cost="${item.costoCreditos}" data-owned="${item.yaComprado}">
                                <span class="material-symbols-outlined text-sm text-white/60 hover:text-primary">download</span>
                            </button>
                            <button class="btn-remove flex items-center justify-center w-8 h-8 rounded-full bg-white/5 hover:bg-red-500/20 transition-colors ml-auto" title="Quitar de Wishlist" data-id="${item.idMultimedia}">
                                <span class="material-symbols-outlined text-sm text-white/60 hover:text-red-400">bookmark_remove</span>
                            </button>
                        </div>
                    </div>
                `;

                grid.appendChild(card);
            });

            // Lazy load images
            lazyLoadImages();

            // Bind events
            bindCardEvents();
        }

        // ==========================================
        // LAZY LOAD
        // ==========================================
        function lazyLoadImages() {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        const src = img.dataset.src;
                        if (src) {
                            img.src = src;
                            img.addEventListener('error', () => {
                                img.src = '/img/coverGenerico.webp';
                            }, { once: true });
                        }
                        observer.unobserve(img);
                    }
                });
            }, { rootMargin: '200px' });

            document.querySelectorAll('.lazy-img[data-src]').forEach(img => {
                observer.observe(img);
            });
        }

        // ==========================================
        // BIND CARD EVENTS
        // ==========================================
        function bindCardEvents() {
            // Play/Pause on cover click
            grid.querySelectorAll('.cover-wrapper').forEach(wrapper => {
                wrapper.addEventListener('click', () => {
                    const card = wrapper.closest('.wishlist-card');
                    const id = card.dataset.id;
                    const overlay = wrapper.querySelector('.play-overlay');
                    const icon = overlay.querySelector('.material-symbols-outlined');

                    const playing = AudioManager.toggle(id, `/ritmaap/api/preview/${id}`, () => {
                        icon.textContent = 'play_arrow';
                        overlay.classList.remove('playing');
                    });

                    if (playing) {
                        icon.textContent = 'pause';
                        overlay.classList.add('playing');
                    } else {
                        icon.textContent = 'play_arrow';
                        overlay.classList.remove('playing');
                    }
                });
            });

            // Download buttons
            grid.querySelectorAll('.btn-download').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    handleDownload(btn);
                });
            });

            // Remove from wishlist
            grid.querySelectorAll('.btn-remove').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    handleRemove(btn);
                });
            });
        }

        // ==========================================
        // DOWNLOAD HANDLER
        // ==========================================
        async function handleDownload(btn) {
            const idMultimedia = btn.dataset.id;
            const nombre = btn.dataset.name;
            const costo = parseInt(btn.dataset.cost) || 0;
            const yaComprado = btn.dataset.owned === 'true';

            try {
                btn.disabled = true;
                btn.style.opacity = '0.5';

                // Check ban
                const banRes = await fetch('/ritmaap/json/download-ban-status');
                const banData = await banRes.json();
                if (banData.banned) {
                    Swal.fire({ icon: 'error', title: 'Descargas suspendidas', text: banData.msg, background: '#0a0a0c', color: '#fff' });
                    return;
                }

                // Check credits
                if (!yaComprado && costo > creditosDisponibles) {
                    Swal.fire({ icon: 'warning', title: 'Creditos insuficientes', html: `Necesitas <strong>${costo} R$</strong> pero tienes <strong>${creditosDisponibles} R$</strong>.`, background: '#0a0a0c', color: '#fff' });
                    return;
                }

                // SweetAlert countdown
                const creditMsg = yaComprado
                    ? 'Ya tienes este archivo. No se descontaran creditos.'
                    : `Se descontaran <strong>${costo} R$</strong> de tus creditos.`;

                let countdown = 5;
                let countdownInterval;

                const swalResult = await Swal.fire({
                    title: nombre,
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
                        icon: 'info', title: 'Descarga cancelada', text: 'No se descontaron creditos.',
                        timer: 2000, showConfirmButton: false, background: '#0a0a0c', color: '#fff'
                    });
                    return;
                }

                // Request download token
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

                // Rate limiter warning
                const warning = res.headers.get('X-Download-Warning');
                if (warning) {
                    Swal.fire({
                        icon: 'warning', title: 'Advertencia', text: warning,
                        timer: 4000, showConfirmButton: false, background: '#0a0a0c', color: '#fff'
                    });
                }

                if (data.ok && data.token) {
                    // Animate credits
                    if (!yaComprado && costo > 0 && window.animateCredits) {
                        creditosDisponibles -= costo;
                        window.animateCredits(costo);
                    }

                    // Update card to show "COMPRADO"
                    if (!yaComprado) {
                        btn.dataset.owned = 'true';
                        const card = btn.closest('.wishlist-card');
                        const costSpan = card.querySelector('.text-primary.font-mono');
                        if (costSpan) {
                            costSpan.className = 'text-[9px] text-green-400 font-mono';
                            costSpan.textContent = 'COMPRADO';
                        }
                    }

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
        // REMOVE FROM WISHLIST
        // ==========================================
        async function handleRemove(btn) {
            const idMultimedia = btn.dataset.id;
            const card = btn.closest('.wishlist-card');

            try {
                btn.disabled = true;

                const res = await fetch(`/ritmaap/json/wishlist/${idMultimedia}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'CSRF-Token': csrfToken
                    }
                });
                const data = await res.json();

                if (data.ok) {
                    // Stop audio if playing this card
                    if (AudioManager.isPlaying(idMultimedia)) {
                        AudioManager.pause();
                    }

                    // Fade out + shrink animation
                    card.style.transition = 'all 0.4s ease-out';
                    card.style.opacity = '0';
                    card.style.transform = 'scale(0.8)';

                    setTimeout(() => {
                        card.remove();

                        // Update count
                        const remaining = grid.querySelectorAll('.wishlist-card').length;
                        if (countEl) countEl.textContent = `${remaining} archivo${remaining !== 1 ? 's' : ''} en wishlist`;

                        if (remaining === 0) {
                            grid.classList.add('hidden');
                            empty.classList.remove('hidden');
                        }
                    }, 400);

                    Swal.fire({
                        icon: 'success', title: 'Eliminado de Wishlist',
                        timer: 1500, showConfirmButton: false, background: '#0a0a0c', color: '#fff'
                    });
                } else {
                    Swal.fire({ icon: 'error', title: 'Error', text: data.msg, background: '#0a0a0c', color: '#fff' });
                    btn.disabled = false;
                }
            } catch (err) {
                console.error('Error remove wishlist:', err);
                Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo eliminar de la wishlist.', background: '#0a0a0c', color: '#fff' });
                btn.disabled = false;
            }
        }

        // ==========================================
        // SEARCH DEBOUNCE
        // ==========================================
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    loadWishlist(searchInput.value.trim());
                }, 400);
            });
        }

        // ==========================================
        // CLEANUP ON PAGE HIDE
        // ==========================================
        window.addEventListener('pagehide', () => {
            if (AudioManager.current) {
                AudioManager.pause();
                AudioManager.current.src = '';
                AudioManager.current = null;
                AudioManager.currentId = null;
            }
        });

        // ==========================================
        // INJECT CSS for playing overlay
        // ==========================================
        const style = document.createElement('style');
        style.textContent = `
            .play-overlay.playing {
                opacity: 1 !important;
                background: rgba(0,0,0,0.6) !important;
            }
            .wishlist-card:hover {
                border-color: rgba(201,218,43,0.15) !important;
                transform: translateY(-2px);
            }
            .wishlist-card {
                transition: all 0.3s ease;
            }
        `;
        document.head.appendChild(style);

        // ==========================================
        // INITIAL LOAD
        // ==========================================
        loadWishlist();
    });
})();
