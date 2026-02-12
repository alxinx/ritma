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

    xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
            const globalPerc = Math.round((e.loaded / e.total) * 100);
            
            document.getElementById('global-bar').style.width = `${globalPerc}%`;
            document.getElementById('global-perc').textContent = `${globalPerc}%`;

            actualizarStats(e.loaded, e.total, startTime);

            // Lógica Pro: Distribución
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
                    statusEl.textContent = "<span class'material-symbols-outlined'>arrow_upload_progress</span>SUBIENDO...";
                }

                if (barEl) barEl.style.width = `${trackPerc}%`;
                if (textEl) textEl.textContent = `${trackPerc}%`;
            });
        }
    });

    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4 && xhr.status === 200) {
            console.log("RTM-ENGINE: Success");
             Swal.fire({
                    icon: 'success',
                    title: '¡Listo! ya he subido todos los archivos',
                    background: '#0a0a0c',
                    color: '#fff',
                    confirmButtonColor: '#008B8B',
                    customClass: { 
                        popup: 'rounded-3xl border border-primary/30'
                    }
                });


        }
    };

    xhr.open('POST', '/app/dash/uploadboard', true);
    xhr.send(formData);
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