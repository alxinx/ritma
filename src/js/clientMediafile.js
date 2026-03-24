import Swal from 'sweetalert2';

;(function () {
    document.addEventListener('DOMContentLoaded', () => {
        const config = window.__MEDIAFILE__;
        if (!config) return;

        const { idMultimedia, tipoAsset, csrfToken, nombreComposicion, costoCreditos, yaComprado } = config;
        let enWishlist = config.enWishlist;
        let enFavoritos = config.enFavoritos;

        // ==========================================
        // WISHLIST TOGGLE
        // ==========================================
        const btnWishlist = document.getElementById('btn-wishlist');
        if (btnWishlist) {
            btnWishlist.addEventListener('click', async () => {
                try {
                    btnWishlist.disabled = true;
                    btnWishlist.style.opacity = '0.5';

                    const res = await fetch(`/ritmaap/json/wishlist/${idMultimedia}/toggle`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'CSRF-Token': csrfToken
                        }
                    });
                    const data = await res.json();

                    if (data.ok) {
                        enWishlist = data.enWishlist;
                        const icon = btnWishlist.querySelector('.material-symbols-outlined');
                        const label = btnWishlist.querySelector('h4, h5');

                        if (enWishlist) {
                            btnWishlist.classList.remove('btn-ghost');
                            btnWishlist.classList.add('btn-danger');
                            if (icon) icon.textContent = 'bookmark_remove';
                            if (label) label.textContent = 'Quitar de Wishlist';
                        } else {
                            btnWishlist.classList.remove('btn-danger');
                            btnWishlist.classList.add('btn-ghost');
                            if (icon) icon.textContent = 'bookmark_add';
                            if (label) label.textContent = 'Agregar a Wishlist';
                        }

                        Swal.fire({
                            icon: 'success',
                            title: enWishlist ? 'Agregado a Wishlist' : 'Eliminado de Wishlist',
                            timer: 1500,
                            showConfirmButton: false,
                            background: '#0a0a0c',
                            color: '#fff'
                        });
                    }
                } catch (err) {
                    console.error('Error wishlist:', err);
                    Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo actualizar la wishlist.', background: '#0a0a0c', color: '#fff' });
                } finally {
                    btnWishlist.disabled = false;
                    btnWishlist.style.opacity = '1';
                }
            });
        }

        // ==========================================
        // FAVORITO TOGGLE
        // ==========================================
        const btnFavorito = document.getElementById('btn-favorito');
        if (btnFavorito) {
            btnFavorito.addEventListener('click', async () => {
                try {
                    btnFavorito.disabled = true;
                    btnFavorito.style.opacity = '0.5';

                    const res = await fetch(`/ritmaap/json/favoritos/${idMultimedia}/toggle`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'CSRF-Token': csrfToken
                        }
                    });
                    const data = await res.json();

                    if (data.ok) {
                        enFavoritos = data.enFavoritos;
                        const icon = btnFavorito.querySelector('.material-symbols-outlined');
                        const label = btnFavorito.querySelector('h4, h5');

                        if (enFavoritos) {
                            btnFavorito.classList.remove('btn-ghost');
                            btnFavorito.classList.add('btn-danger');
                            if (icon) icon.textContent = 'heart_minus';
                            if (label) label.textContent = 'Quitar de Favoritos';
                        } else {
                            btnFavorito.classList.remove('btn-danger');
                            btnFavorito.classList.add('btn-ghost');
                            if (icon) icon.textContent = 'favorite';
                            if (label) label.textContent = 'Agregar a Favoritos';
                        }

                        Swal.fire({
                            icon: 'success',
                            title: enFavoritos ? 'Agregado a Favoritos' : 'Eliminado de Favoritos',
                            timer: 1500,
                            showConfirmButton: false,
                            background: '#0a0a0c',
                            color: '#fff'
                        });
                    }
                } catch (err) {
                    console.error('Error favorito:', err);
                    Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo actualizar favoritos.', background: '#0a0a0c', color: '#fff' });
                } finally {
                    btnFavorito.disabled = false;
                    btnFavorito.style.opacity = '1';
                }
            });
        }

        // ==========================================
        // DOWNLOAD FLOW (con confirmacion SweetAlert + countdown)
        // ==========================================
        const btnDownload = document.getElementById('btn-request-download');

        // Verificar ban al cargar
        if (btnDownload) {
            (async () => {
                try {
                    const banRes = await fetch('/ritmaap/json/download-ban-status');
                    const banData = await banRes.json();
                    if (banData.banned) {
                        btnDownload.disabled = true;
                        btnDownload.style.opacity = '0.3';
                        btnDownload.style.pointerEvents = 'none';
                        btnDownload.innerHTML = '<span class="material-symbols-outlined">block</span> Descargas suspendidas';
                        btnDownload.title = banData.msg;
                    }
                } catch (e) { /* fail open */ }
            })();
        }

        if (btnDownload) {
            btnDownload.addEventListener('click', async () => {
                try {
                    btnDownload.disabled = true;
                    btnDownload.style.opacity = '0.5';

                    // SweetAlert con countdown de 5 segundos
                    const creditMsg = yaComprado
                        ? 'Ya tienes este archivo. No se descontaran creditos.'
                        : `Se descontaran <strong>${costoCreditos} R$</strong> de tus creditos.`;

                    let countdown = 5;
                    let countdownInterval;
                    let cancelled = false;

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
                        cancelled = true;
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

                    // Proceder con la descarga — solicitar token
                    const res = await fetch(`/ritmaap/json/multimedia/${idMultimedia}/request-download`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'CSRF-Token': csrfToken
                        }
                    });
                    const data = await res.json();

                    if (data.blocked) {
                        btnDownload.disabled = true;
                        btnDownload.style.opacity = '0.3';
                        btnDownload.style.pointerEvents = 'none';
                        btnDownload.innerHTML = '<span class="material-symbols-outlined">block</span> Descargas suspendidas';
                        Swal.fire({ icon: 'error', title: 'Descargas suspendidas', text: data.msg, background: '#0a0a0c', color: '#fff' });
                        return;
                    }

                    // Mostrar advertencia de rate limiter si existe
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
                    btnDownload.disabled = false;
                    btnDownload.style.opacity = '1';
                }
            });
        }

        // ==========================================
        // AUDIO PLAYER (waveform + playhead)
        // ==========================================
        if (tipoAsset === 'AUDIO') {
            const container = document.getElementById('waveform-container');
            const playhead = document.getElementById('playhead');
            const progress = document.getElementById('waveform-progress');
            const btnPlay = document.getElementById('btn-play-pause');
            const playIcon = document.getElementById('play-icon');
            const currentTimeEl = document.getElementById('current-time');

            if (!container || !playhead || !btnPlay) return;

            const audio = new Audio(`/ritmaap/api/preview/${idMultimedia}`);
            audio.preload = 'auto';
            let isPlaying = false;
            let isDragging = false;

            playhead.style.left = '0%';
            if (progress) progress.style.width = '0%';

            function formatTime(s) {
                const m = Math.floor(s / 60);
                const sec = Math.floor(s % 60);
                return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
            }

            function updatePlayhead() {
                if (!isDragging && audio.duration) {
                    const pct = (audio.currentTime / audio.duration) * 100;
                    playhead.style.left = pct + '%';
                    if (progress) progress.style.width = pct + '%';
                    if (currentTimeEl) currentTimeEl.textContent = formatTime(audio.currentTime);
                }
                if (isPlaying) requestAnimationFrame(updatePlayhead);
            }

            function togglePlay() {
                if (isPlaying) {
                    audio.pause();
                    isPlaying = false;
                    if (playIcon) playIcon.textContent = 'play_arrow';
                } else {
                    audio.play();
                    isPlaying = true;
                    if (playIcon) playIcon.textContent = 'pause';
                    requestAnimationFrame(updatePlayhead);
                }
            }

            btnPlay.addEventListener('click', (e) => {
                e.stopPropagation();
                togglePlay();
            });

            container.addEventListener('click', (e) => {
                if (isDragging) return;
                const rect = container.getBoundingClientRect();
                const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                if (audio.duration) {
                    audio.currentTime = pct * audio.duration;
                    playhead.style.left = (pct * 100) + '%';
                    if (progress) progress.style.width = (pct * 100) + '%';
                    if (!isPlaying) togglePlay();
                }
            });

            playhead.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                isDragging = true;
            });

            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                const rect = container.getBoundingClientRect();
                let pct = (e.clientX - rect.left) / rect.width;
                pct = Math.max(0, Math.min(1, pct));
                playhead.style.left = (pct * 100) + '%';
                if (progress) progress.style.width = (pct * 100) + '%';
                if (audio.duration && currentTimeEl) {
                    currentTimeEl.textContent = formatTime(pct * audio.duration);
                }
            });

            document.addEventListener('mouseup', () => {
                if (!isDragging) return;
                isDragging = false;
                const pct = parseFloat(playhead.style.left) / 100;
                if (audio.duration) {
                    audio.currentTime = pct * audio.duration;
                }
            });

            audio.addEventListener('ended', () => {
                isPlaying = false;
                if (playIcon) playIcon.textContent = 'play_arrow';
                playhead.style.left = '0%';
                if (progress) progress.style.width = '0%';
                if (currentTimeEl) currentTimeEl.textContent = '00:00';
            });
        }

        // ==========================================
        // VIDEO PLAYER
        // ==========================================
        if (tipoAsset === 'VIDEO') {
            const video = document.getElementById('video-player');
            const btnPlay = document.getElementById('btn-play-pause');
            const playIcon = document.getElementById('play-icon');
            const progressBar = document.getElementById('video-progress-bar');
            const progressFill = document.getElementById('video-progress');
            const seekDot = document.getElementById('video-seek-dot');
            const timeDisplay = document.getElementById('video-time');
            const btnFullscreen = document.getElementById('btn-fullscreen');
            const fullscreenIcon = btnFullscreen ? btnFullscreen.querySelector('.material-symbols-outlined') : null;
            const videoContainer = video ? video.closest('.group') : null;

            if (video && btnPlay) {
                let isPlaying = false;
                let isDragging = false;

                function formatTime(s) {
                    const m = Math.floor(s / 60);
                    const sec = Math.floor(s % 60);
                    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
                }

                function updateProgress(pct) {
                    if (progressFill) progressFill.style.width = pct + '%';
                    if (seekDot) seekDot.style.left = `calc(${pct}% - 6px)`;
                }

                btnPlay.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (isPlaying) {
                        video.pause();
                        isPlaying = false;
                        if (playIcon) playIcon.textContent = 'play_arrow';
                    } else {
                        video.play();
                        isPlaying = true;
                        if (playIcon) playIcon.textContent = 'pause';
                    }
                });

                video.addEventListener('click', (e) => {
                    if (isDragging) return;
                    e.stopPropagation();
                    btnPlay.click();
                });

                video.addEventListener('timeupdate', () => {
                    if (!isDragging && video.duration) {
                        const pct = (video.currentTime / video.duration) * 100;
                        updateProgress(pct);
                    }
                    if (timeDisplay && video.duration) {
                        const dur = Math.floor(video.duration);
                        const durM = Math.floor(dur / 60);
                        const durS = dur % 60;
                        timeDisplay.textContent = `${formatTime(video.currentTime)} / ${String(durM).padStart(2,'0')}:${String(durS).padStart(2,'0')}`;
                    }
                });

                if (progressBar) {
                    progressBar.addEventListener('click', (e) => {
                        if (isDragging) return;
                        const rect = progressBar.getBoundingClientRect();
                        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                        if (video.duration) {
                            video.currentTime = pct * video.duration;
                            updateProgress(pct * 100);
                        }
                    });

                    progressBar.addEventListener('mousedown', (e) => {
                        e.preventDefault();
                        isDragging = true;
                        if (seekDot) {
                            seekDot.style.opacity = '1';
                            seekDot.style.transform = 'translateY(-50%) scale(1.4)';
                        }
                        const rect = progressBar.getBoundingClientRect();
                        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                        updateProgress(pct * 100);
                    });

                    document.addEventListener('mousemove', (e) => {
                        if (!isDragging || !progressBar) return;
                        const rect = progressBar.getBoundingClientRect();
                        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                        updateProgress(pct * 100);
                        if (timeDisplay && video.duration) {
                            const cur = pct * video.duration;
                            const dur = Math.floor(video.duration);
                            const durM = Math.floor(dur / 60);
                            const durS = dur % 60;
                            timeDisplay.textContent = `${formatTime(cur)} / ${String(durM).padStart(2,'0')}:${String(durS).padStart(2,'0')}`;
                        }
                    });

                    document.addEventListener('mouseup', () => {
                        if (!isDragging) return;
                        isDragging = false;
                        if (seekDot) seekDot.style.transform = 'translateY(-50%)';
                        if (progressFill && video.duration) {
                            const pct = parseFloat(progressFill.style.width) / 100;
                            video.currentTime = pct * video.duration;
                        }
                    });
                }

                video.addEventListener('ended', () => {
                    isPlaying = false;
                    if (playIcon) playIcon.textContent = 'play_arrow';
                    updateProgress(0);
                });

                if (btnFullscreen) {
                    btnFullscreen.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const container = videoContainer || video;
                        if (!document.fullscreenElement) {
                            if (container.requestFullscreen) container.requestFullscreen();
                            else if (video.requestFullscreen) video.requestFullscreen();
                        } else {
                            document.exitFullscreen();
                        }
                    });

                    document.addEventListener('fullscreenchange', () => {
                        if (fullscreenIcon) {
                            fullscreenIcon.textContent = document.fullscreenElement ? 'fullscreen_exit' : 'fullscreen';
                        }
                    });
                }
            }
        }
    });
})();
