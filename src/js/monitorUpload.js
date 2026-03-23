import Swal from 'sweetalert2';

/**
 * monitorUpload.js - CORE RTM-ENGINE
 * Integra optimización de imagen, monitor de progreso y handshake final.
 */
let progresoArchivos = {};

// Limpiar estado global al salir de la página para evitar memory leak
window.addEventListener('pagehide', () => { progresoArchivos = {}; });

window.inicializarMonitor = async function (formData) {
    progresoArchivos = {}; // Reiniciamos en cada carga
    // 1. LIMPIAR Y PREPARAR HEADER
    const artista = formData.get('nombreArtista') || 'Artista';
    const album = formData.get('nombreAlbum') || 'Álbum';
    document.getElementById('monitor-artista-album').textContent = `${artista} | ${album}`;

    // 2. RENDERIZAR INTERFAZ (Evita errores de "style" al asegurar que existan los IDs)
    await prepararInterfazMonitor(formData);

    // 3. CAPTURAR ARCHIVOS REALES DE LOS INPUTS
    const coverInput = document.getElementById('coverAlbum');
    const trackInputs = document.querySelectorAll('input[name="archivo[]"]');
    const titulos = formData.getAll('titulo[]');

    let keysSubidas = { cover: null, tracks: [] };
    let metadatosExtraidos = []; // Metadatos extraídos durante la subida

    try {
        // --- A. PROCESAR Y SUBIR PORTADA ---
        if (coverInput && coverInput.files[0]) {
            const statusCover = document.getElementById('status-cover');
            if (statusCover) statusCover.textContent = 'OPTIMIZANDO...';

            // Reemplazo de Sharp en el Cliente
            const fotoOptimizada = await optimizarImagenWebP(coverInput.files[0]);

            const resCover = await ejecutarSubidaDirecta(fotoOptimizada, 'cover', 'Portada', 'cover');
            keysSubidas.cover = resCover.fileKey;
        }

        // --- B. SUBIR TRACKS EN SECUENCIA ---
        // Extraemos duración AQUÍ (1 archivo a la vez) para no recargar después
        const trackInputsArray = Array.from(trackInputs);
        for (let i = 0; i < trackInputsArray.length; i++) {
            const file = trackInputsArray[i].files[0];
            if (file) {
                const duracion = await obtenerDuracionMedia(file);
                metadatosExtraidos[i] = {
                    tamano: file.size,
                    formato: file.name.split('.').pop().toLowerCase(),
                    duracion: Math.round(duracion)
                };
                const resTrack = await ejecutarSubidaDirecta(file, 'multimedia', titulos[i], i);
                keysSubidas.tracks[i] = resTrack.fileKey;
            }
        }

        // --- C. HANDSHAKE FINAL CON EL BACKEND ---
        await enviarRegistroFinalDB(formData, keysSubidas, metadatosExtraidos);

    } catch (error) {
        console.error("Fallo crítico en el flujo:", error);
        Swal.fire({ icon: 'error', title: 'RTM-ENGINE ERROR', text: error.message, background: '#0a0a0c', color: '#fff' });
    } finally {
        progresoArchivos = {}; // Liberar referencias al terminar (éxito o error)
    }
};

/**
 * Optimiza la imagen a 1000x1000 WebP (Reemplazo de Middleware Sharp)
 * Usa OffscreenCanvas + createImageBitmap para no bloquear el main thread.
 * Fallback a canvas normal si OffscreenCanvas no está disponible.
 */
async function optimizarImagenWebP(file) {
    const SIZE = 1000;
    const bitmap = await createImageBitmap(file);

    // Calcular cover/center
    const scale = Math.max(SIZE / bitmap.width, SIZE / bitmap.height);
    const x = (SIZE / 2) - (bitmap.width / 2) * scale;
    const y = (SIZE / 2) - (bitmap.height / 2) * scale;

    let blob;

    if (typeof OffscreenCanvas !== 'undefined') {
        // OffscreenCanvas: no bloquea el main thread
        const offscreen = new OffscreenCanvas(SIZE, SIZE);
        const ctx = offscreen.getContext('2d');
        ctx.drawImage(bitmap, x, y, bitmap.width * scale, bitmap.height * scale);
        bitmap.close();
        blob = await offscreen.convertToBlob({ type: 'image/webp', quality: 0.8 });
    } else {
        // Fallback para navegadores sin OffscreenCanvas
        const canvas = document.createElement('canvas');
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(bitmap, x, y, bitmap.width * scale, bitmap.height * scale);
        bitmap.close();
        blob = await new Promise(resolve => {
            canvas.toBlob(resolve, 'image/webp', 0.8);
            canvas.width = 0;
            canvas.height = 0;
        });
    }

    return new File([blob], file.name.replace(/\.[^/.]+$/, ".webp"), { type: 'image/webp' });
}

/**
 * Dibuja los elementos en el DOM antes de iniciar la subida
 */
async function prepararInterfazMonitor(formData) {
    const container = document.getElementById('monitor-items-container');
    container.innerHTML = '';
    const titulos = formData.getAll('titulo[]');

    // Fila de la Portada
    container.insertAdjacentHTML('beforeend', `
        <div class="bg-white/5 p-4 rounded-xl border border-primary/20 mb-4">
            <div class="flex justify-between items-center mb-2">
                <span class="text-[10px] font-bold text-primary uppercase">CARÁTULA DEL ÁLBUM</span>
                <span id="status-cover" class="text-[9px] opacity-50">ESPERANDO...</span>
            </div>
            <div class="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                <div id="bar-cover" class="h-full bg-primary transition-all duration-300" style="width: 0%"></div>
            </div>
        </div>
    `);

    // Filas de los Tracks
    titulos.forEach((titulo, i) => {
        container.insertAdjacentHTML('beforeend', `
            <div class="bg-white/5 p-4 rounded-xl border border-white/5 mb-2">
                <div class="flex justify-between items-center mb-2">
                    <span class="text-[10px] uppercase font-mono">${(i + 1).toString().padStart(2, '0')} - ${titulo}</span>
                    <span id="perc-${i}" class="text-[9px] font-mono">0%</span>
                </div>
                <div class="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <div id="bar-${i}" class="h-full bg-primary transition-all duration-300" style="width: 0%"></div>
                </div>
            </div>
        `);
    });

    return new Promise(resolve => setTimeout(resolve, 200)); // Delay para asegurar render
}

/**
 * Pide firma y sube el archivo con XHR para monitorizar progreso
 */
async function ejecutarSubidaDirecta(file, category, nombreVisual, index) {
    const resSign = await fetch('/app/dash/api/upload/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, fileType: file.type, category })
    });

    const { uploadUrl, fileKey } = await resSign.json();

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                const perc = Math.round((e.loaded / e.total) * 100);
                const idUnico = index === 'cover' ? 'cover' : `track-${index}`;
                progresoArchivos[idUnico] = perc;

                const barId = index === 'cover' ? 'bar-cover' : `bar-${index}`;
                const percId = index === 'cover' ? 'status-cover' : `perc-${index}`;

                const bar = document.getElementById(barId);
                const txt = document.getElementById(percId);

                actualizarProgresoGlobal();
                if (bar) bar.style.width = `${perc}%`;
                if (txt) txt.textContent = index === 'cover' ? `SUBIENDO... ${perc}%` : `${perc}%`;
            }
        };

        xhr.onload = () => {
            if (index === 'cover') document.getElementById('status-cover').textContent = 'LISTO';
            resolve({ fileKey });
        };
        xhr.onerror = () => reject(new Error(`Error en subida de: ${nombreVisual}`));
        xhr.send(file);
    });
}

/**
 * Handshake final: Envía llaves de R2 y Metadata al servidor
 */
async function enviarRegistroFinalDB(formData, keysSubidas, metadatosExtraidos) {
    console.log("--- INICIANDO HANDSHAKE FINAL RITMA ---");

    // 1. CAPTURAR ELEMENTOS DEL DOM
    const tokenElement = document.querySelector('input[name="_csrf"]');
    const trackInputs = document.querySelectorAll('input[name="archivo[]"]');

    if (!tokenElement) {
        throw new Error("Token de seguridad (CSRF) no encontrado en el formulario.");
    }

    const csrfTokenValue = tokenElement.value;

    // 2. METADATOS YA EXTRAÍDOS (se reciben como parámetro, no se re-leen los archivos)

    // 3. CONSTRUIR PAYLOAD SEGURO
    const subtitulosArray = [];

    trackInputs.forEach((input) => {
        const fila = input.closest('.fila-archivo');
        if (fila) {
            const checkbox = fila.querySelector('input[name="subtitulos[]"]');
            subtitulosArray.push(checkbox && checkbox.checked ? 'on' : 'off');
        } else {
            subtitulosArray.push('off');
        }
    });

    const payload = {
        nombreArtista: formData.get('nombreArtista'),
        nombreAlbum: formData.get('nombreAlbum'),
        generosSeleccionados: formData.get('generosSeleccionados'),
        idArtista: formData.get('idArtista'),
        idAlbum: formData.get('idAlbum'),
        keyCover: keysSubidas.cover,
        keysTracks: keysSubidas.tracks.filter(k => k),
        metadatos: metadatosExtraidos.filter(m => m !== null),
        titulos: formData.getAll('titulo[]'),
        costos: formData.getAll('costoCreditos[]'),
        bpms: formData.getAll('bpm[]'),
        subtitulos: subtitulosArray
    };

    // 4. ENVÍO AL BACKEND
    const res = await fetch('/app/dash/uploadboard', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': csrfTokenValue // Usamos la variable recién definida
        },
        body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.ok) {
        Swal.fire({
            icon: 'success',
            title: '¡RTM-ENGINE CORONADO!',
            text: data.msg,
            background: '#0a0a0c', color: '#fff'
        }).then(() => window.location.href = '/app/dash/multimedia');
    } else {
        // Soporta errores del controlador (data.msg) y del validador (data.errores)
        const errorMsg = data.msg
            || (data.errores && data.errores.map(e => e.msg).join(', '))
            || "Fallo en el registro de base de datos";
        throw new Error(errorMsg);
    }
}

function actualizarProgresoGlobal() {
    const valores = Object.values(progresoArchivos);
    if (valores.length === 0) return;

    const suma = valores.reduce((a, b) => a + b, 0);
    const promedio = Math.round(suma / valores.length);

    // Actualizamos el DOM del monitor
    const globalBar = document.getElementById('global-bar');
    const globalPerc = document.getElementById('global-perc');

    if (globalBar) globalBar.style.width = `${promedio}%`;
    if (globalPerc) globalPerc.textContent = `${promedio}%`;
}


/**
 * Monitor Multi-Artist — Sube archivos y registra con artistas independientes
 */
window.inicializarMonitorMulti = async function (filesList, tracks, generosSeleccionados, csrfToken) {
    progresoArchivos = {};

    // Header
    const headerEl = document.getElementById('monitor-artista-album');
    if (headerEl) headerEl.textContent = `Multi-Artista | ${filesList.length} archivos`;

    // Build monitor UI
    const container = document.getElementById('monitor-items-container');
    container.innerHTML = '';

    filesList.forEach((item, i) => {
        const track = tracks.find(t => t.uid === item.uid);
        container.insertAdjacentHTML('beforeend', `
            <div class="bg-white/5 p-4 rounded-xl border border-white/5 mb-2">
                <div class="flex justify-between items-center mb-2">
                    <span class="text-[10px] uppercase font-mono">${(i + 1).toString().padStart(2, '0')} - ${track ? track.titulo : item.file.name}</span>
                    <span id="perc-${i}" class="text-[9px] font-mono">0%</span>
                </div>
                <div class="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <div id="bar-${i}" class="h-full bg-primary transition-all duration-300" style="width: 0%"></div>
                </div>
            </div>
        `);
    });

    await new Promise(resolve => setTimeout(resolve, 200));

    try {
        const keysSubidas = [];
        const metadatosExtraidos = [];

        // Upload each file sequentially
        for (let i = 0; i < filesList.length; i++) {
            const file = filesList[i].file;

            const duracion = await obtenerDuracionMedia(file);
            metadatosExtraidos.push({
                tamano: file.size,
                formato: file.name.split('.').pop().toLowerCase(),
                duracion: Math.round(duracion),
                nombreFinal: file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_\- ]/g, '') + '.' + file.name.split('.').pop().toLowerCase()
            });

            const res = await ejecutarSubidaDirecta(file, 'multimedia', tracks[i]?.titulo || file.name, i);
            keysSubidas.push(res.fileKey);
        }

        // Build payload with per-track artist info
        const payload = {
            generosSeleccionados,
            tracks: tracks.map((t, i) => ({
                titulo: t.titulo,
                nombreArtista: t.nombreArtista,
                idArtista: t.idArtista || '',
                nombreAlbum: t.nombreAlbum,
                bpm: t.bpm,
                subtitulos: t.subtitulos,
                costoCreditos: t.costoCreditos,
                keyTrack: keysSubidas[i],
                metadato: metadatosExtraidos[i]
            }))
        };

        const res = await fetch('/app/dash/uploadboard/multi', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-csrf-token': csrfToken
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.ok) {
            Swal.fire({
                icon: 'success',
                title: '¡RTM-ENGINE MULTI CORONADO!',
                text: data.msg,
                background: '#0a0a0c', color: '#fff'
            }).then(() => window.location.href = '/app/dash/multimedia');
        } else {
            const errorMsg = data.msg || (data.errores && data.errores.map(e => e.msg).join(', ')) || 'Error en registro';
            throw new Error(errorMsg);
        }
    } catch (error) {
        console.error('Multi-artist upload error:', error);
        Swal.fire({ icon: 'error', title: 'RTM-ENGINE ERROR', text: error.message, background: '#0a0a0c', color: '#fff' });
    } finally {
        progresoArchivos = {};
    }
};


function obtenerDuracionMedia(file) {
    return new Promise((resolve) => {
        const element = file.type.startsWith('video') ? document.createElement('video') : document.createElement('audio');
        const objectUrl = URL.createObjectURL(file);

        // Limpia listeners ANTES de tocar src para evitar loop infinito
        const cleanup = (duration) => {
            element.onloadedmetadata = null;
            element.onerror = null;
            element.src = '';
            element.load();
            URL.revokeObjectURL(objectUrl);
            resolve(duration);
        };

        element.preload = 'metadata';
        element.src = objectUrl;

        element.onloadedmetadata = () => {
            cleanup(element.duration || 0);
        };

        element.onerror = () => {
            console.warn(`[RTM-ENGINE] No se pudo extraer duración de: ${file.name}`);
            cleanup(0);
        };
    });
}