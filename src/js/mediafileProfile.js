import Swal from 'sweetalert2';

;(function () {
    document.addEventListener('DOMContentLoaded', () => {
        const config = window.__MEDIAFILE__;
        if (!config) return;

        const { idMultimedia, tipoAsset, csrfToken } = config;
        let currentEstado = config.estado;

        // ==========================================
        // TOGGLE ESTADO (SUSPEND / ENABLE)
        // ==========================================
        const btnToggle = document.getElementById('btn-toggle-estado');
        if (btnToggle) {
            btnToggle.addEventListener('click', async () => {
                const accion = currentEstado === 'ENABLE' ? 'suspender' : 'habilitar';
                const result = await Swal.fire({
                    title: `¿${accion.charAt(0).toUpperCase() + accion.slice(1)} este multimedia?`,
                    text: currentEstado === 'ENABLE'
                        ? 'Los usuarios no podrán descargar este archivo mientras esté suspendido.'
                        : 'El archivo volverá a estar disponible para descarga.',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: `Sí, ${accion}`,
                    cancelButtonText: 'Cancelar',
                    background: '#0a0a0c',
                    color: '#fff'
                });

                if (!result.isConfirmed) return;

                try {
                    const res = await fetch(`/app/dash/json/multimedia/${idMultimedia}/toggle`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                            'CSRF-Token': csrfToken
                        }
                    });
                    const data = await res.json();

                    if (data.ok) {
                        currentEstado = data.nuevoEstado;
                        // Update button
                        if (data.nuevoEstado === 'DISABLE') {
                            btnToggle.className = btnToggle.className.replace('btn-danger', 'btn-green').replace('btn btn-danger', 'btn btn-green');
                            const h = btnToggle.querySelector('h4, h5');
                            if (h) h.textContent = tipoAsset === 'VIDEO' ? 'Habilitar Video' : 'Habilitar Multimedia';
                        } else {
                            btnToggle.className = btnToggle.className.replace('btn-green', 'btn-danger');
                            const h = btnToggle.querySelector('h4, h5');
                            if (h) h.textContent = tipoAsset === 'VIDEO' ? 'Suspender Video' : 'Suspender Multimedia';
                        }

                        Swal.fire({
                            icon: 'success',
                            title: data.nuevoEstado === 'ENABLE' ? 'Habilitado' : 'Suspendido',
                            timer: 1500,
                            showConfirmButton: false,
                            background: '#0a0a0c',
                            color: '#fff'
                        });
                    }
                } catch (err) {
                    console.error('Error toggle:', err);
                    Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cambiar el estado.', background: '#0a0a0c', color: '#fff' });
                }
            });
        }

        // ==========================================
        // DOWNLOAD FLOW (OTP Redis Token)
        // ==========================================
        const btnDownload = document.getElementById('btn-request-download');
        if (btnDownload) {
            btnDownload.addEventListener('click', async () => {
                try {
                    btnDownload.disabled = true;
                    btnDownload.style.opacity = '0.5';

                    const res = await fetch(`/app/dash/json/multimedia/${idMultimedia}/request-download`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'CSRF-Token': csrfToken
                        }
                    });
                    const data = await res.json();

                    if (data.ok && data.token) {
                        // Redirect to download endpoint
                        window.location.href = `/app/dash/api/download/${data.token}`;
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
        if (tipoAsset === 'AUDIO' && config.hasPreview) {
            const container = document.getElementById('waveform-container');
            const playhead = document.getElementById('playhead');
            const progress = document.getElementById('waveform-progress');
            const btnPlay = document.getElementById('btn-play-pause');
            const playIcon = document.getElementById('play-icon');
            const currentTimeEl = document.getElementById('current-time');

            if (!container || !playhead) return;

            const audio = new Audio(config.previewUrl);
            let isPlaying = false;
            let isDragging = false;

            function formatTime(s) {
                const m = Math.floor(s / 60);
                const sec = Math.floor(s % 60);
                return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
            }

            function updatePlayhead() {
                if (!isDragging && audio.duration) {
                    const pct = (audio.currentTime / audio.duration) * 100;
                    playhead.style.left = pct + '%';
                    progress.style.width = pct + '%';
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

            if (btnPlay) btnPlay.addEventListener('click', togglePlay);

            // Click on waveform to seek
            container.addEventListener('click', (e) => {
                if (isDragging) return;
                const rect = container.getBoundingClientRect();
                const pct = (e.clientX - rect.left) / rect.width;
                if (audio.duration) {
                    audio.currentTime = pct * audio.duration;
                    playhead.style.left = (pct * 100) + '%';
                    progress.style.width = (pct * 100) + '%';
                    if (!isPlaying) togglePlay();
                }
            });

            // Draggable playhead
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
                progress.style.width = (pct * 100) + '%';
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
                progress.style.width = '0%';
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
            const timeDisplay = document.getElementById('video-time');
            const btnFullscreen = document.getElementById('btn-fullscreen');

            if (!video || !btnPlay) return;

            let isPlaying = false;

            function formatTime(s) {
                const m = Math.floor(s / 60);
                const sec = Math.floor(s % 60);
                return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
            }

            btnPlay.addEventListener('click', () => {
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

            video.addEventListener('timeupdate', () => {
                if (video.duration && progressFill) {
                    const pct = (video.currentTime / video.duration) * 100;
                    progressFill.style.width = pct + '%';
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
                    const rect = progressBar.getBoundingClientRect();
                    const pct = (e.clientX - rect.left) / rect.width;
                    if (video.duration) {
                        video.currentTime = pct * video.duration;
                    }
                });
            }

            video.addEventListener('ended', () => {
                isPlaying = false;
                if (playIcon) playIcon.textContent = 'play_arrow';
            });

            if (btnFullscreen) {
                btnFullscreen.addEventListener('click', () => {
                    if (video.requestFullscreen) video.requestFullscreen();
                });
            }
        }
    });
})();
