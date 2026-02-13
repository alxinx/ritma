/**
 * monitorUpload.js - CORE DEL  MONITOR (PRO)
 */
import Swal from 'sweetalert2';
window.inicializarMonitor = function(formData) {
    // 1. Header Metadata
    const artista = formData.get('nombreArtista') || 'Artista Desconocido';
    const album = formData.get('nombreAlbum') || 'Álbum Desconocido';
    document.getElementById('monitor-artista-album').textContent = `${artista} | ${album}`;

    // 2. Conteo de archivos
    const archivos = formData.getAll('archivo[]');
    document.getElementById('monitor-total-files').textContent = `${archivos.length} archivos`;

    // 3. Renderizar Tracks
    const titulos = formData.getAll('titulo[]');
    const container = document.getElementById('monitor-items-container');
    container.innerHTML = ''; 

    titulos.forEach((titulo, i) => {
        const itemHtml = `
            <div class="bg-white/5 rounded-2xl border border-white/5 p-5 flex flex-col gap-4">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <span class="opacity-30 font-mono text-[10px]">${(i + 1).toString().padStart(2, '0')}</span>
                        <h5 class="text-xs font-bold uppercase tracking-wider">${titulo}</h5>
                    </div>
                    <div class="flex items-center gap-4">
                        <span id="status-${i}" class="text-[9px] font-mono opacity-50 uppercase">Waiting...</span>
                        <span id="perc-${i}" class="glass-card px-2 py-0.5 rounded-sm text-[10px] font-mono">0%</span>
                    </div>
                </div>
                <div class="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <div id="bar-${i}" class="h-full bg-primary progress-glow transition-all duration-300" style="width: 0%"></div>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', itemHtml);
    });

    ejecutarSubida(formData);
};

function ejecutarSubida(formData) {
    const xhr = new XMLHttpRequest();
    const startTime = Date.now();
    const titulos = formData.getAll('titulo[]');
    const numTracks = titulos.length;

    // --- MONITOR DE PROGRESO ---
    xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
            const globalPerc = Math.round((e.loaded / e.total) * 100);
            
            document.getElementById('global-bar').style.width = `${globalPerc}%`;
            document.getElementById('global-perc').textContent = `${globalPerc}%`;

            actualizarStats(e.loaded, e.total, startTime);

            titulos.forEach((_, i) => {
                const startRange = (i / numTracks) * 100;
                const endRange = ((i + 1) / numTracks) * 100;
                
                let trackPerc = 0;
                const statusEl = document.getElementById(`status-${i}`);
                const barEl = document.getElementById(`bar-${i}`);
                const textEl = document.getElementById(`perc-${i}`);

                if (globalPerc >= endRange) {
                    trackPerc = 100;
                    statusEl.textContent = "COMPLETO!";
                    statusEl.classList.add('text-primary');
                } else if (globalPerc > startRange) {
                    trackPerc = Math.round(((globalPerc - startRange) / (endRange - startRange)) * 100);
                    statusEl.innerHTML = `<span class="material-symbols-outlined text-[12px] align-middle animate-pulse mr-1">cloud_upload</span> SUBIENDO...`;
                }

                if (barEl) barEl.style.width = `${trackPerc}%`;
                if (textEl) textEl.textContent = `${trackPerc}%`;
            });
        }
    });

    // --- MANEJADOR DE RESPUESTA ÚNICO (PRO) ---
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            try {
                // Parseamos la respuesta del RTM-ENGINE
                const response = JSON.parse(xhr.responseText);

                if (xhr.status === 200 && response.ok) {
                    const globalPerc = document.getElementById('global-perc');
                    if (globalPerc) globalPerc.textContent = '100%';

                    Swal.fire({
                        icon: 'success',
                        title: '¡RTM-ENGINE: INGESTA COMPLETADA! 🧐',
                        text: response.msg,
                        background: '#0a0a0c',
                        color: '#fff',
                        showCancelButton: true,
                        cancelButtonColor: '#303030',
                        confirmButtonColor: '#008B8B',
                        cancelButtonText: 'Subir más archivos',
                        confirmButtonText: 'Ver mis archivos',
                        customClass: { 
                            popup: 'rounded-3xl border border-primary/30 glass-card'
                        }
                    }).then((result) => {
                        if (result.isConfirmed) {
                            window.location.href = '/app/dash/multimedia'; 
                        } else {
                            resetearFormularioIngesta();
                        }
                    });
                } else {
                    // Si el backend nos manda un error (ej: Artista no existe)
                    Swal.fire({
                        icon: 'error',
                        title: 'ERROR EN EL CORE',
                        text: response.msg || 'Fallo crítico en el registro de DB',
                        background: '#0a0a0c',
                        color: '#fff'
                    });
                }
            } catch (e) {
                console.error("Error crítico en respuesta:", e);
                Swal.fire({
                    icon: 'error',
                    title: 'ERROR DE COMUNICACIÓN',
                    text: 'El servidor respondió de forma inesperada.',
                    background: '#0a0a0c', color: '#fff'
                });
            }
        }
    };

    xhr.open('POST', '/app/dash/uploadboard', true);
    xhr.send(formData);
}


function resetearFormularioIngesta() {
    const formulario = document.getElementById('upload-form');
    const monitor = document.getElementById('live-ingest-monitor');
    

    if (!formulario) return;

    // 1. Reset nativo de inputs (text, number, file, checkbox)
    formulario.reset();

    // 2. Limpieza manual de Géneros y Selects
    // Buscamos todos los selects de género (ajusta el selector si usas una clase específica)
    const selectsGeneros = formulario.querySelectorAll('select');
    selectsGeneros.forEach(select => {
        select.selectedIndex = 0; // Vuelve a la primera opción (usualmente "Seleccione...")
        
        // Si usas alguna librería tipo Select2 o TomSelect, debes disparar el evento 'change'
        select.dispatchEvent(new Event('change'));
    });

    // Limpieza de estados visuales de los labels
    const labelsCargados = formulario.querySelectorAll('.archivo-cargado');
    labelsCargados.forEach(label => {
        label.classList.remove('archivo-cargado');
        const icono = label.querySelector('.material-symbols-outlined');
        if (icono) icono.textContent = 'cloud_upload'; // Revertimos icono
    });

    // 3. Limpieza de Previsualización de Portada (Cover)
    // Si tienes un <img> que muestra la miniatura de la portada, hay que resetearlo
    const previewPortada = document.getElementById('preview-cover-album'); // Ajusta el ID
    if (previewPortada) {
        previewPortada.src = '/img/default-placeholder.jpg'; // O un string vacío
    }

    // 4. Limpiar las filas dinámicas (Dejar solo la primera fila "viva")
    const contenedorFilas = document.getElementById('contenedor-filas');
    if (contenedorFilas) {
        const filas = contenedorFilas.querySelectorAll('.fila-archivo');
        filas.forEach((fila, index) => {
            if (index > 0) {
                fila.remove(); 
            } else {
                // Limpiamos los inputs de la primera fila por si acaso
                const inputsFilaUno = fila.querySelectorAll('input');
                inputsFilaUno.forEach(inp => {
                    inp.value = '';
                    if (inp.type === 'checkbox') inp.checked = false;
                });
            }
        });
    }

    // 5. Reset de contadores visuales
    const totalItemsTxt = document.getElementById('total-items-txt'); // Ajusta a tu ID
    if (totalItemsTxt) totalItemsTxt.textContent = '01';

    // 6. Volver a la interfaz de carga
    monitor.classList.add('hidden');
    formulario.classList.remove('hidden');

    // 7. Reset de las barras del monitor para el próximo uso
    document.getElementById('global-bar').style.width = '0%';
    document.getElementById('global-perc').textContent = '0%';

    window.scrollTo({ top: 0, behavior: 'smooth' });
}



function actualizarStats(loaded, total, startTime) {
    const now = Date.now();
    const duration = (now - startTime) / 1000;
    if (duration <= 0) return;

    const bps = loaded / duration;
    const mbps = (bps / (1024 * 1024)).toFixed(1);

    const velEl = document.getElementById('velocidad-media-js');
    if (velEl) velEl.textContent = `${mbps} MB/s`;

    const remainingSeconds = Math.round((total - loaded) / bps);
    const timeEl = document.querySelector('.tiempo-restante-js');
    if (timeEl && remainingSeconds >= 0) {
        const mins = Math.floor(remainingSeconds / 60);
        const secs = remainingSeconds % 60;
        timeEl.textContent = `${mins}:${secs.toString().padStart(2, '0')} min`;
    }
}