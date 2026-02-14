import Swal from 'sweetalert2';

/**
 * monitorUpload.js - CORE RTM-ENGINE
 * Integra optimización de imagen, monitor de progreso y handshake final.
 */
let progresoArchivos = {};
window.inicializarMonitor = async function(formData) {
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

    try {
        // --- A. PROCESAR Y SUBIR PORTADA ---
        if (coverInput && coverInput.files[0]) {
            const statusCover = document.getElementById('status-cover');
            if(statusCover) statusCover.textContent = 'OPTIMIZANDO...';
            
            // Reemplazo de Sharp en el Cliente
            const fotoOptimizada = await optimizarImagenWebP(coverInput.files[0]);
            
            const resCover = await ejecutarSubidaDirecta(fotoOptimizada, 'cover', 'Portada', 'cover');
            keysSubidas.cover = resCover.fileKey;
        }

        // --- B. SUBIR TRACKS EN PARALELO ---
        const promesasTracks = Array.from(trackInputs).map(async (input, i) => {
            const file = input.files[0];
            if (file) {
                const resTrack = await ejecutarSubidaDirecta(file, 'multimedia', titulos[i], i);
                keysSubidas.tracks[i] = resTrack.fileKey;
            }
        });

        await Promise.all(promesasTracks);

        // --- C. HANDSHAKE FINAL CON EL BACKEND ---
        await enviarRegistroFinalDB(formData, keysSubidas);

    } catch (error) {
        console.error("Fallo crítico en el flujo:", error);
        Swal.fire({ icon: 'error', title: 'RTM-ENGINE ERROR', text: error.message, background: '#0a0a0c', color: '#fff' });
    }
};

/**
 * Optimiza la imagen a 1000x1000 WebP (Reemplazo de Middleware Sharp)
 */
async function optimizarImagenWebP(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const SIZE = 1000;
                canvas.width = SIZE;
                canvas.height = SIZE;
                const ctx = canvas.getContext('2d');
                
                // Efecto Cover/Center
                const scale = Math.max(SIZE / img.width, SIZE / img.height);
                const x = (SIZE / 2) - (img.width / 2) * scale;
                const y = (SIZE / 2) - (img.height / 2) * scale;
                ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
                
                canvas.toBlob((blob) => {
                    resolve(new File([blob], file.name.replace(/\.[^/.]+$/, ".webp"), { type: 'image/webp' }));
                }, 'image/webp', 0.8);
            };
        };
    });
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
                    <span class="text-[10px] uppercase font-mono">${(i+1).toString().padStart(2,'0')} - ${titulo}</span>
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
async function enviarRegistroFinalDB(formData, keysSubidas) {
    console.log("--- INICIANDO HANDSHAKE FINAL RITMA ---");
    
    // 1. CAPTURAR ELEMENTOS DEL DOM (Definición local para evitar ReferenceErrors)
    const tokenElement = document.querySelector('input[name="_csrf"]'); // <-- AQUÍ SE DEFINE 🚀
    const trackInputs = document.querySelectorAll('input[name="archivo[]"]');
    
    if (!tokenElement) {
        throw new Error("Token de seguridad (CSRF) no encontrado en el formulario.");
    }

    const csrfTokenValue = tokenElement.value;

    // 2. EXTRAER METADATOS Y DURACIÓN
  const metadatosFiles = await Promise.all(Array.from(trackInputs).map(async (input) => {
    const file = input.files[0];
    if (!file) return null;

    const seg = await obtenerDuracionMedia(file); // Extraemos segundos aquí

    return {
        tamano: file.size,
        formato: file.name.split('.').pop().toLowerCase(),
        duracion: Math.round(seg) // Se guarda dentro del objeto del track
    };
}));


    // 3. CONSTRUIR PAYLOAD SEGURO
    const payload = {
        nombreArtista: formData.get('nombreArtista'),
        nombreAlbum: formData.get('nombreAlbum'),
        generosSeleccionados: formData.get('generosSeleccionados'),
        idArtista: formData.get('idArtista'),
        idAlbum: formData.get('idAlbum'),
        keyCover: keysSubidas.cover,
        keysTracks: keysSubidas.tracks.filter(k => k),
        metadatos: metadatosFiles.filter(m => m !== null), // Aquí ya viajan las duraciones individuales
        titulos: formData.getAll('titulo[]'),
        costos: formData.getAll('costoCreditos[]'),
        subtitulos: formData.getAll('subtitulos[]')
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
        throw new Error(data.msg || "Fallo en el registro de base de datos");
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


function obtenerDuracionMedia(file) {
    return new Promise((resolve) => {
        const element = file.type.startsWith('video') ? document.createElement('video') : document.createElement('audio');
        element.src = URL.createObjectURL(file);
        
        element.onloadedmetadata = () => {
            URL.revokeObjectURL(element.src);
            resolve(element.duration || 0);
        };

        element.onerror = () => {
            console.warn(`[RTM-ENGINE] No se pudo extraer duración de: ${file.name}`);
            resolve(0);
        };
    });
}