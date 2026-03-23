import Swal from 'sweetalert2';

/**
 * multiArtistUpload.js — Carga múltiple con parsing de nombre de archivo
 * Formato: [BPM] - [ARTISTA] - [TITULO].ext
 */
;(function () {
    document.addEventListener('DOMContentLoaded', () => {

        // --- TABS ---
        const tabSingle = document.getElementById('single');
        const tabMultiple = document.getElementById('multiple');
        const panelSingle = document.getElementById('tab-single-artist');
        const panelMulti = document.getElementById('tab-multi-artist');

        if (!tabSingle || !tabMultiple) return;

        tabSingle.addEventListener('click', () => {
            tabSingle.classList.replace('inactive', 'active');
            tabMultiple.classList.replace('active', 'inactive');
            panelSingle?.classList.remove('hidden');
            panelMulti?.classList.add('hidden');
        });

        tabMultiple.addEventListener('click', () => {
            tabMultiple.classList.replace('inactive', 'active');
            tabSingle.classList.replace('active', 'inactive');
            panelMulti?.classList.remove('hidden');
            panelSingle?.classList.add('hidden');
        });

        // --- MULTI ARTIST UPLOAD ---
        const inputFiles = document.getElementById('multi-files-standard');
        const inputFolder = document.getElementById('multi-files-folder');
        const tableContainer = document.getElementById('multi-table-container');
        const tableBody = document.getElementById('multi-table-body');
        const fileCountEl = document.getElementById('multi-file-count');
        const btnSubmitMulti = document.getElementById('btnloadnow-multi');

        const MAX_FILES = 10;
        const filesMap = new Map(); // uid -> { file, parsed }
        let artistCheckTimers = {};

        // Allowed MIME prefixes
        const ALLOWED_MIMES = ['audio/', 'video/'];

        // Magic number signatures (first bytes)
        const MAGIC_SIGS = {
            mp3_id3: [0x49, 0x44, 0x33],       // ID3
            mp3_sync: [0xFF, 0xFB],             // MPEG sync
            mp3_sync2: [0xFF, 0xF3],
            mp3_sync3: [0xFF, 0xF2],
            wav: [0x52, 0x49, 0x46, 0x46],      // RIFF
            flac: [0x66, 0x4C, 0x61, 0x43],     // fLaC
            ogg: [0x4F, 0x67, 0x67, 0x53],      // OggS
            aiff: [0x46, 0x4F, 0x52, 0x4D],     // FORM
        };

        // MP4/M4A: check for 'ftyp' at offset 4
        function isMp4(bytes) {
            return bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70;
        }

        function matchesSig(bytes, sig) {
            return sig.every((b, i) => bytes[i] === b);
        }

        async function validateMagicNumbers(file) {
            const slice = file.slice(0, 12);
            const buffer = await slice.arrayBuffer();
            const bytes = new Uint8Array(buffer);

            // Check known audio signatures
            for (const sig of Object.values(MAGIC_SIGS)) {
                if (matchesSig(bytes, sig)) return true;
            }
            // Check MP4/MOV/M4A (ftyp at offset 4)
            if (isMp4(bytes)) return true;
            // AVI check (RIFF + AVI at offset 8)
            if (matchesSig(bytes, MAGIC_SIGS.wav) && bytes[8] === 0x41 && bytes[9] === 0x56 && bytes[10] === 0x49) return true;
            // WebM/MKV (EBML header)
            if (bytes[0] === 0x1A && bytes[1] === 0x45 && bytes[2] === 0xDF && bytes[3] === 0xA3) return true;

            return false;
        }

        // --- FILENAME PARSER ---
        function parseFilename(filename) {
            // Strip extension
            const withoutExt = filename.replace(/\.[^/.]+$/, '');
            // Split by " - " (space-dash-space)
            const parts = withoutExt.split(/\s*-\s*/);

            if (parts.length >= 3) {
                const bpmCandidate = parseInt(parts[0]);
                const bpm = (bpmCandidate >= 20 && bpmCandidate <= 300) ? bpmCandidate : null;
                const artist = bpm !== null ? parts[1].trim() : parts[0].trim();
                // Title is everything after artist (join remaining parts to handle titles with dashes)
                const titleParts = bpm !== null ? parts.slice(2) : parts.slice(1);
                return { bpm, artist, title: titleParts.join(' - ').trim() };
            }

            if (parts.length === 2) {
                const bpmCandidate = parseInt(parts[0]);
                if (bpmCandidate >= 20 && bpmCandidate <= 300) {
                    return { bpm: bpmCandidate, artist: null, title: parts[1].trim() };
                }
                return { bpm: null, artist: parts[0].trim(), title: parts[1].trim() };
            }

            return { bpm: null, artist: null, title: withoutExt.trim() };
        }

        // --- FILE SELECTION ---
        function handleFilesSelected(fileList) {
            const files = Array.from(fileList);
            // Filter only audio/video by MIME
            const validFiles = files.filter(f => ALLOWED_MIMES.some(m => f.type.startsWith(m)));

            if (validFiles.length === 0) {
                return Swal.fire({ icon: 'warning', title: 'Sin archivos válidos', text: 'Solo se aceptan archivos de audio o video.', background: '#0a0a0c', color: '#fff' });
            }

            // Enforce limit
            const totalAfter = filesMap.size + validFiles.length;
            let filesToAdd = validFiles;

            if (totalAfter > MAX_FILES) {
                const canAdd = MAX_FILES - filesMap.size;
                if (canAdd <= 0) {
                    return Swal.fire({ icon: 'warning', title: 'Límite alcanzado', text: `Máximo ${MAX_FILES} archivos por upload.`, background: '#0a0a0c', color: '#fff' });
                }
                filesToAdd = validFiles.slice(0, canAdd);
                Swal.fire({ icon: 'info', title: 'Límite de archivos', text: `Solo se agregaron ${canAdd} archivos (máximo ${MAX_FILES}).`, timer: 2000, showConfirmButton: false, background: '#0a0a0c', color: '#fff' });
            }

            // Validate magic numbers and add rows
            filesToAdd.forEach(async (file) => {
                const valid = await validateMagicNumbers(file);
                if (!valid) {
                    Swal.fire({ icon: 'error', title: 'Archivo rechazado', html: `<b>${file.name}</b> no es un archivo de audio/video válido.`, background: '#0a0a0c', color: '#fff' });
                    return;
                }

                const uid = crypto.randomUUID();
                const parsed = parseFilename(file.name);
                filesMap.set(uid, { file, parsed });
                addTableRow(uid, parsed, file);
                updateCount();
            });

            tableContainer?.classList.remove('hidden');
        }

        inputFiles?.addEventListener('change', (e) => handleFilesSelected(e.target.files));
        inputFolder?.addEventListener('change', (e) => handleFilesSelected(e.target.files));

        function updateCount() {
            if (fileCountEl) fileCountEl.textContent = filesMap.size;
        }

        // --- TABLE ROW ---
        function addTableRow(uid, parsed, file) {
            const idx = filesMap.size;
            const ext = file.name.split('.').pop().toUpperCase();
            const tr = document.createElement('tr');
            tr.className = 'border-b border-white/5 hover:bg-white/3 transition-colors';
            tr.dataset.uid = uid;

            tr.innerHTML = `
                <td class="px-2 py-3 text-[10px] font-mono text-primary font-bold">${idx.toString().padStart(2, '0')}</td>
                <td class="px-2 py-2">
                    <input type="text" class="multi-titulo ritma-input-field text-xs w-full" value="${escapeHtml(parsed.title)}" placeholder="Título">
                    <span class="text-[8px] font-mono text-white/20 mt-0.5 block truncate">${ext} // ${formatSize(file.size)}</span>
                </td>
                <td class="px-2 py-2">
                    <div class="flex items-center gap-1">
                        <input type="text" class="multi-artista ritma-input-field text-xs flex-1 min-w-0" value="${escapeHtml(parsed.artist || '')}" placeholder="Artista">
                        <span class="artist-status material-symbols-outlined text-sm text-white/20 shrink-0">help</span>
                    </div>
                </td>
                <td class="px-2 py-2">
                    <input type="text" class="multi-album ritma-input-field text-xs w-full" value="Single" placeholder="Álbum">
                </td>
                <td class="px-2 py-2">
                    <input type="number" class="multi-bpm ritma-input-field text-xs text-center w-full" value="${parsed.bpm || ''}" min="20" max="300" placeholder="—">
                </td>
                <td class="px-2 py-2 text-center">
                    <input type="checkbox" class="multi-subtitulos accent-primary w-4 h-4 cursor-pointer">
                </td>
                <td class="px-2 py-2">
                    <input type="number" class="multi-creditos ritma-input-field text-xs text-center w-full" value="10" min="0" max="100">
                </td>
                <td class="px-2 py-2 text-center">
                    <button type="button" class="btn-remove-row text-white/30 hover:text-red-500 transition-colors">
                        <span class="material-symbols-outlined text-sm">close</span>
                    </button>
                </td>
            `;

            tableBody.appendChild(tr);

            // Remove button
            tr.querySelector('.btn-remove-row').addEventListener('click', () => {
                filesMap.delete(uid);
                tr.remove();
                reindexRows();
                updateCount();
                if (filesMap.size === 0) tableContainer?.classList.add('hidden');
            });

            // Artist verification with debounce
            const artistInput = tr.querySelector('.multi-artista');
            if (parsed.artist) checkArtistExists(artistInput, tr);

            artistInput.addEventListener('input', () => {
                const timerId = `artist-${uid}`;
                clearTimeout(artistCheckTimers[timerId]);
                artistCheckTimers[timerId] = setTimeout(() => {
                    checkArtistExists(artistInput, tr);
                }, 400);
            });
        }

        function reindexRows() {
            const rows = tableBody.querySelectorAll('tr');
            rows.forEach((tr, i) => {
                const numCell = tr.querySelector('td:first-child');
                if (numCell) numCell.textContent = (i + 1).toString().padStart(2, '0');
            });
        }

        // --- ARTIST VERIFICATION ---
        async function checkArtistExists(input, row) {
            const nombre = input.value.trim();
            const statusIcon = row.querySelector('.artist-status');

            if (!nombre) {
                statusIcon.textContent = 'help';
                statusIcon.className = 'artist-status material-symbols-outlined text-sm text-white/20';
                return;
            }

            try {
                const res = await fetch(`/app/dash/json/artistas/check?nombre=${encodeURIComponent(nombre)}`);
                const data = await res.json();

                if (data.exists) {
                    statusIcon.textContent = 'check_circle';
                    statusIcon.className = 'artist-status material-symbols-outlined text-sm text-green-400';
                    statusIcon.title = 'Artista existe en la DB';
                    // Store the idArtista for later
                    row.dataset.idArtista = data.exact.idArtista;
                } else {
                    statusIcon.textContent = 'warning';
                    statusIcon.className = 'artist-status material-symbols-outlined text-sm text-yellow-400';
                    statusIcon.title = data.similar.length > 0
                        ? `Artista nuevo. Similares: ${data.similar.map(s => s.nombreArtista).join(', ')}`
                        : 'Artista nuevo — se creará al confirmar';
                    row.dataset.idArtista = '';
                }
            } catch (err) {
                console.error('Error checking artist:', err);
            }
        }

        // --- GENRE MODAL (shared with single artist) ---
        const btnAbrirGeneros = document.getElementById('btn-abrir-generos-multi');
        const modalGeneros = document.getElementById('modal-generos');
        const inputGenerosMulti = document.getElementById('generosSeleccionadosMulti');
        const pillsContainerMulti = document.getElementById('contenedor-pills-generos-multi');
        let generosMulti = [];

        btnAbrirGeneros?.addEventListener('click', async () => {
            modalGeneros?.classList.remove('hidden');
            const listaGenerosModal = document.getElementById('lista-generos-modal');
            if (listaGenerosModal && listaGenerosModal.children.length === 0) {
                try {
                    const res = await fetch('/app/dash/json/generos');
                    const generos = await res.json();
                    generos.forEach(g => {
                        const item = document.createElement('label');
                        item.className = 'glass-card rounded-sm p-1 relative overflow-hidden';
                        item.innerHTML = `<input type="checkbox" value="${g.genero_id}" data-nombre="${g.nombre}" class="check-genero accent-primary"><span class="text-[10px] w-full justify-between subtittle">${g.nombre}</span>`;
                        listaGenerosModal.appendChild(item);
                    });
                } catch (err) { console.error('Error loading genres:', err); }
            }
            setTimeout(() => document.getElementById('busqueda-genero-modal')?.focus(), 100);
        });

        // Listen for genre modal accept — update multi pills if multi tab is active
        const originalAcceptBtn = document.getElementById('btn-aceptar-generos');
        if (originalAcceptBtn) {
            // Add a secondary handler for multi-artist
            originalAcceptBtn.addEventListener('click', () => {
                if (panelMulti && !panelMulti.classList.contains('hidden')) {
                    const seleccionados = modalGeneros.querySelectorAll('.check-genero:checked');
                    generosMulti = Array.from(seleccionados).map(cb => ({ id: cb.value, nombre: cb.dataset.nombre }));
                    updateMultiPills();
                }
            });
        }

        function updateMultiPills() {
            if (!pillsContainerMulti || !inputGenerosMulti) return;
            pillsContainerMulti.innerHTML = '';
            inputGenerosMulti.value = JSON.stringify(generosMulti.map(g => g.id));

            generosMulti.forEach(g => {
                const pill = document.createElement('div');
                pill.className = 'genre-pill flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/30 rounded-full text-white';
                pill.innerHTML = `<span class="text-[10px] font-bold uppercase">${g.nombre}</span><span class="material-symbols-outlined text-[14px] cursor-pointer hover:text-red-500" data-id="${g.id}">close</span>`;
                pill.querySelector('.material-symbols-outlined').onclick = (e) => {
                    generosMulti = generosMulti.filter(item => item.id !== e.target.dataset.id);
                    const cb = modalGeneros?.querySelector(`input[value="${e.target.dataset.id}"]`);
                    if (cb) cb.checked = false;
                    updateMultiPills();
                };
                pillsContainerMulti.appendChild(pill);
            });
        }

        // --- FORM SUBMISSION ---
        btnSubmitMulti?.addEventListener('click', async (e) => {
            e.preventDefault();

            if (filesMap.size === 0) {
                return Swal.fire({ icon: 'warning', title: 'Sin archivos', text: 'Selecciona al menos un archivo para subir.', background: '#0a0a0c', color: '#fff' });
            }

            const generosVal = inputGenerosMulti?.value;
            if (!generosVal || generosVal === '[]') {
                return Swal.fire({ icon: 'warning', title: 'Sin géneros', text: 'Selecciona al menos un género musical.', background: '#0a0a0c', color: '#fff' });
            }

            // Validate all rows have title and artist
            const rows = tableBody.querySelectorAll('tr');
            for (const row of rows) {
                const titulo = row.querySelector('.multi-titulo')?.value?.trim();
                const artista = row.querySelector('.multi-artista')?.value?.trim();
                if (!titulo) {
                    return Swal.fire({ icon: 'warning', title: 'Título vacío', text: 'Todos los archivos deben tener un título.', background: '#0a0a0c', color: '#fff' });
                }
                if (!artista) {
                    return Swal.fire({ icon: 'warning', title: 'Artista vacío', text: 'Todos los archivos deben tener un artista.', background: '#0a0a0c', color: '#fff' });
                }
            }

            // Build tracks data
            const tracks = [];
            const filesList = [];

            rows.forEach(row => {
                const uid = row.dataset.uid;
                const entry = filesMap.get(uid);
                if (!entry) return;

                filesList.push({ uid, file: entry.file });
                tracks.push({
                    uid,
                    titulo: row.querySelector('.multi-titulo').value.trim(),
                    nombreArtista: row.querySelector('.multi-artista').value.trim(),
                    idArtista: row.dataset.idArtista || '',
                    nombreAlbum: row.querySelector('.multi-album').value.trim() || 'Single',
                    bpm: parseInt(row.querySelector('.multi-bpm').value) || null,
                    subtitulos: row.querySelector('.multi-subtitulos')?.checked ? 'on' : 'off',
                    costoCreditos: parseInt(row.querySelector('.multi-creditos').value) || 0
                });
            });

            // Show loading
            Swal.fire({ title: 'VERIFICANDO...', allowOutsideClick: false, didOpen: () => Swal.showLoading(), background: '#0a0a0c', color: '#fff' });

            try {
                const csrfToken = document.querySelector('input[name="_csrf"]').value;

                // Switch to monitor
                Swal.close();
                document.getElementById('upload-form').classList.add('hidden');
                document.getElementById('live-ingest-monitor').classList.remove('hidden');

                // Use the multi monitor
                if (typeof window.inicializarMonitorMulti === 'function') {
                    await window.inicializarMonitorMulti(filesList, tracks, generosVal, csrfToken);
                } else {
                    console.error('inicializarMonitorMulti not defined');
                }
            } catch (error) {
                console.error('Error multi-artist upload:', error);
                Swal.fire({ icon: 'error', title: 'Error', text: error.message, background: '#0a0a0c', color: '#fff' });
            }
        });

        // --- HELPERS ---
        function escapeHtml(str) {
            if (!str) return '';
            return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        }

        function formatSize(bytes) {
            if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + 'KB';
            return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
        }
    });
})();
