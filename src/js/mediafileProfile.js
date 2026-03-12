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
        if (tipoAsset === 'AUDIO') {
            const container = document.getElementById('waveform-container');
            const playhead = document.getElementById('playhead');
            const progress = document.getElementById('waveform-progress');
            const btnPlay = document.getElementById('btn-play-pause');
            const playIcon = document.getElementById('play-icon');
            const currentTimeEl = document.getElementById('current-time');

            if (!container || !playhead || !btnPlay) return;

            // Audio source: proxy endpoint (no R2 URL exposed)
            const audio = new Audio(`/app/dash/api/preview/${idMultimedia}`);
            audio.preload = 'auto';
            let isPlaying = false;
            let isDragging = false;

            // Ensure playhead starts at 0
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

            // Play/pause button — stopPropagation to avoid triggering seek
            btnPlay.addEventListener('click', (e) => {
                e.stopPropagation();
                togglePlay();
            });

            // Click on waveform to seek
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

            // Only setup player controls if video element exists
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

                // Play/Pause toggle
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

                // Also toggle on video click
                video.addEventListener('click', (e) => {
                    if (isDragging) return;
                    e.stopPropagation();
                    btnPlay.click();
                });

                // Time update → progress bar + seek dot + time display
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

                // Click on progress bar to seek
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

                    // Drag to seek on progress bar
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
                        if (seekDot) {
                            seekDot.style.transform = 'translateY(-50%)';
                        }
                        // Apply seek
                        if (progressFill && video.duration) {
                            const pct = parseFloat(progressFill.style.width) / 100;
                            video.currentTime = pct * video.duration;
                        }
                    });
                }

                // Ended
                video.addEventListener('ended', () => {
                    isPlaying = false;
                    if (playIcon) playIcon.textContent = 'play_arrow';
                    updateProgress(0);
                });

                // Fullscreen toggle with icon swap
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
            } // end if (video && btnPlay)
        }

        // ==========================================
        // EDIT DATA MODAL
        // ==========================================
        const btnEditar = document.getElementById('btn-editar-datos');
        const modal = document.getElementById('modal-editar-datos');

        if (btnEditar && modal) {
            const modalClose = document.getElementById('modal-close');
            const modalCancel = document.getElementById('modal-cancel');
            const modalSave = document.getElementById('modal-save');
            const editNombre = document.getElementById('edit-nombre');
            const editBpm = document.getElementById('edit-bpm');
            const editCreditos = document.getElementById('edit-creditos');
            const editAlbum = document.getElementById('edit-album');
            const editAlbumId = document.getElementById('edit-album-id');
            const albumAutocomplete = document.getElementById('album-autocomplete');
            const generosContainer = document.getElementById('generos-container');

            let allGeneros = [];
            let albumDebounce = null;

            function openModal() {
                // Prefill from config
                if (editNombre) editNombre.value = config.nombreComposicion || '';
                if (editBpm) editBpm.value = config.bpm || '';
                if (editCreditos) editCreditos.value = config.costoCreditos || 0;
                if (editAlbumId) editAlbumId.value = config.idAlbum || '';
                if (editAlbum) editAlbum.value = '';

                modal.classList.remove('hidden');
                modal.classList.add('flex');

                // Load genres
                loadGeneros();
            }

            function closeModal() {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
                if (albumAutocomplete) albumAutocomplete.classList.add('hidden');
            }

            async function loadGeneros() {
                try {
                    const res = await fetch('/app/dash/json/generos');
                    allGeneros = await res.json();
                    renderGeneros();
                } catch (err) {
                    console.error('Error loading genres:', err);
                }
            }

            function renderGeneros() {
                if (!generosContainer) return;
                const currentGeneros = config.generosActuales || [];
                generosContainer.innerHTML = allGeneros.map(g => {
                    const checked = currentGeneros.includes(g.genero_id) ? 'checked' : '';
                    return `
                        <label class="flex items-center gap-2 cursor-pointer p-1 hover:bg-white/5 rounded text-white text-[11px] font-bold uppercase tracking-wider">
                            <input type="checkbox" class="checkbox-ritma-glow genero-check" value="${g.genero_id}" ${checked}>
                            ${g.nombre}
                        </label>
                    `;
                }).join('');
            }

            // Album autocomplete
            if (editAlbum && config.idArtista) {
                editAlbum.addEventListener('input', () => {
                    clearTimeout(albumDebounce);
                    const q = editAlbum.value.trim();
                    if (q.length < 1) {
                        albumAutocomplete.classList.add('hidden');
                        return;
                    }
                    albumDebounce = setTimeout(async () => {
                        try {
                            const res = await fetch(`/app/dash/json/album/${config.idArtista}?q=${encodeURIComponent(q)}`);
                            const albums = await res.json();
                            if (albums.length === 0) {
                                albumAutocomplete.classList.add('hidden');
                                return;
                            }
                            albumAutocomplete.innerHTML = albums.map(a =>
                                `<div class="px-4 py-2 hover:bg-primary/10 cursor-pointer text-sm text-white font-bold" data-id="${a.idAlbum}">${a.nombreAlbum}</div>`
                            ).join('');
                            albumAutocomplete.classList.remove('hidden');

                            // Click handler for autocomplete items
                            albumAutocomplete.querySelectorAll('[data-id]').forEach(item => {
                                item.addEventListener('click', () => {
                                    editAlbumId.value = item.dataset.id;
                                    editAlbum.value = item.textContent;
                                    albumAutocomplete.classList.add('hidden');
                                });
                            });
                        } catch (err) {
                            console.error('Album search error:', err);
                        }
                    }, 300);
                });
            }

            // Save
            if (modalSave) {
                modalSave.addEventListener('click', async () => {
                    const selectedGeneros = Array.from(
                        generosContainer.querySelectorAll('.genero-check:checked')
                    ).map(cb => cb.value);

                    const result = await Swal.fire({
                        title: '¿Guardar cambios?',
                        text: 'Se actualizarán los datos de esta composición.',
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonText: 'Sí, guardar',
                        cancelButtonText: 'Cancelar',
                        background: '#0a0a0c',
                        color: '#fff'
                    });

                    if (!result.isConfirmed) return;

                    try {
                        modalSave.disabled = true;
                        modalSave.style.opacity = '0.5';

                        const body = {
                            nombreComposicion: editNombre ? editNombre.value : '',
                            bpm: editBpm ? parseInt(editBpm.value) || null : null,
                            costoCreditos: editCreditos ? parseInt(editCreditos.value) : 0,
                            idAlbum: editAlbumId ? editAlbumId.value : '',
                            albumNombre: editAlbum ? editAlbum.value.trim() : '',
                            generos: selectedGeneros
                        };

                        const res = await fetch(`/app/dash/json/multimedia/${idMultimedia}/update`, {
                            method: 'PATCH',
                            headers: {
                                'Content-Type': 'application/json',
                                'CSRF-Token': csrfToken
                            },
                            body: JSON.stringify(body)
                        });
                        const data = await res.json();

                        if (data.ok) {
                            await Swal.fire({
                                icon: 'success',
                                title: 'Datos actualizados',
                                timer: 1500,
                                showConfirmButton: false,
                                background: '#0a0a0c',
                                color: '#fff'
                            });
                            window.location.reload();
                        } else {
                            Swal.fire({ icon: 'error', title: 'Error', text: data.msg || 'No se pudieron guardar los cambios.', background: '#0a0a0c', color: '#fff' });
                        }
                    } catch (err) {
                        console.error('Error saving:', err);
                        Swal.fire({ icon: 'error', title: 'Error', text: 'Error al guardar datos.', background: '#0a0a0c', color: '#fff' });
                    } finally {
                        modalSave.disabled = false;
                        modalSave.style.opacity = '1';
                    }
                });
            }

            btnEditar.addEventListener('click', openModal);
            if (modalClose) modalClose.addEventListener('click', closeModal);
            if (modalCancel) modalCancel.addEventListener('click', closeModal);

            // Close on backdrop click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal();
            });

            // Close on Escape
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
            });
        }
    });
})();
