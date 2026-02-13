import Swal from 'sweetalert2';
;(function() {
    document.addEventListener('DOMContentLoaded', () => {
        
        // --- 1. SELECTORES GLOBALES ---
        const contenedorFilas = document.getElementById('contenedor-filas');
        const btnAgregarFila = document.getElementById('btn-agregar-fila');
        const totalItemsTxt = document.querySelector('.total-items-count');
        
        // Selectores de Artista (Cabezal)
        const inputArtista = document.getElementById('nombreArtista');
        const idArtistaOculto = document.getElementById('idArtista');
        const sugerenciasArtista = document.getElementById('sugerencias-artista');

        // Selectores de Álbum (Cabezal)
        const inputAlbum = document.getElementById('nombreAlbum');
        const idAlbumOculto = document.querySelector('.idAlbum-js');
        const sugerenciasAlbum = document.querySelector('.sugerencias-album-js');

        const MAX_FILAS = 5
        let timeoutBusqueda;

        // --- 2. GESTIÓN DE FILAS (AGREGAR / ELIMINAR) ---
        function actualizarInterfaz() {
            const filas = document.querySelectorAll('.fila-archivo');
            if (totalItemsTxt) totalItemsTxt.textContent = filas.length;

            if (filas.length >= MAX_FILAS) {
                btnAgregarFila?.classList.add('opacity-50', 'pointer-events-none');
            } else {
                btnAgregarFila?.classList.remove('opacity-50', 'pointer-events-none');
            }
        }

        
    btnAgregarFila?.addEventListener('click', () => {
    const filas = document.querySelectorAll('.fila-archivo');
    if (filas.length < MAX_FILAS) {
        const nuevoIndice = filas.length + 1;
        
        const nuevaFila = document.createElement('div');
        nuevaFila.className = 'fila-archivo grid grid-cols-12 gap-4 items-end bg-white/5 p-4 rounded-2xl border border-white/5';
        nuevaFila.setAttribute('data-index', nuevoIndice);

        nuevaFila.innerHTML = `
            <div class="col-span-1 flex items-center justify-center pb-3">
                <span class="numero-fila text-[10px] font-mono text-primary font-bold">${nuevoIndice.toString().padStart(2, '0')}</span>
            </div>
            <div class="col-span-4 space-y-2">
                <div class="relative group">
                    <label class="subTittle text-primary"> ¿Cómo se llama la obra?</label>
                        <input class="ritma-input-field" type="text" name="titulo[]" placeholder="¿Cómo se llama  el disco?">
                        <span class="material-symbols-outlined ritma-input-icon pt-2">music_note</span>
                </div>
            </div>
            
            <div class="col-span-2 space-y-2">
                <label class="subTittle text-primary"> VALOR EN CRÉDITOS</label>
                    <input class="ritma-input-field" type="number" name="costoCreditos[]" min="0" max="100" placeholder="10">
            </div>
            
            <div class="col-span-2 space-y-2 flex items-center justify-center pt-3">
                <label class="group flex items-center justify-between w-full cursor-pointer py-2">
                    <span class="acordeonTitulo text-white/60 group-hover:text-primary transition-colors">Video</span>
                    <input type="checkbox" name="es_video[]" class="ritma-switch-input"   >
                </label>
            </div>
            <div class="col-span-2 space-y-2 flex items-center justify-center pt-3">
                <input type="file" name="archivo[]" class="hidden input-archivo-real" id="file-${nuevoIndice}" accept=".mp3,.wav,.mp4,.mov,.m4a, .flac, .m4a, .aac, .ogg, .wma, .aiff, .avi, .mkv, .wmv, .webm, .mpeg, .mpg, .m4v">
                <label for="file-${nuevoIndice}" class="cursor-pointer bg-primary/10 text-primary text-[10px] px-3 py-2 rounded-lg hover:bg-primary hover:text-black transition-all" >
                    SUBIR ARCHIVO
                </label>
            </div>
            <div class="col-span-1 flex items-center justify-center pb-3">
                <button type="button" class="btn-eliminar-js text-primary hover:text-red-500 transition-colors">
                    <span class="material-symbols-outlined">delete</span>
                </button>
            </div>
        `;

        contenedorFilas.appendChild(nuevaFila);
        actualizarInterfaz();
    }
});

        // --- 3. AUTOCOMPLETADO DE ARTISTAS ---
        if (inputArtista) {
            inputArtista.addEventListener('input', (e) => {
                clearTimeout(timeoutBusqueda);
                const query = e.target.value.trim();
                
                // Limpieza en cascada: Si cambia artista, invalidamos ID y limpiamos álbum
                if (idArtistaOculto) idArtistaOculto.value = '';
                if (inputAlbum) {
                    inputAlbum.value = '';
                    if (idAlbumOculto) idAlbumOculto.value = '';
                }

                if (query.length < 2) {
                    sugerenciasArtista.classList.add('hidden');
                    return;
                }

                timeoutBusqueda = setTimeout(async () => {
                    try {
                        const res = await fetch(`/app/dash/json/artistas?nombreArtista=${encodeURIComponent(query)}`);
                        const artistas = await res.json();
                        renderizarSugerencias(artistas, sugerenciasArtista, inputArtista, idArtistaOculto, 'artista');
                    } catch (err) { console.error("Error Artistas:", err); }
                }, 300);
            });
        }

        // --- 4. AUTOCOMPLETADO DE ÁLBUMES (DEPENDIENTE) ---
        if (inputAlbum) {
            inputAlbum.addEventListener('input', (e) => {
                clearTimeout(timeoutBusqueda);
                const query = e.target.value.trim();
                const artistaId = idArtistaOculto?.value;

                if (idAlbumOculto) idAlbumOculto.value = ''; 

                // Solo busca si hay un artista seleccionado previamente
                if (!artistaId || query.length < 1) {
                    sugerenciasAlbum.classList.add('hidden');
                    return;
                }

                timeoutBusqueda = setTimeout(async () => {
                    try {
                        const res = await fetch(`/app/dash/json/album/${artistaId}?q=${encodeURIComponent(query)}`);
                        const albums = await res.json();
                        renderizarSugerencias(albums, sugerenciasAlbum, inputAlbum, idAlbumOculto, 'album');
                    } catch (err) { console.error("Error Álbumes:", err); }
                }, 300);
            });
        }

        // --- 5. FUNCIÓN DE RENDERIZADO UNIFICADA ---
        function renderizarSugerencias(data, contenedor, inputTxt, inputId, tipo) {
            contenedor.innerHTML = '';
            if (data.length === 0) {
                contenedor.classList.add('hidden');
                return;
            }

            data.forEach(item => {
                const div = document.createElement('div');
                div.className = "px-4 py-3 hover:bg-primary hover:text-black cursor-pointer text-[11px] uppercase transition-colors border-b border-white/5 last:border-0 text-white";
                
                const nombre = tipo === 'artista' ? item.nombreArtista : item.nombreAlbum;
                const idValue = tipo === 'artista' ? item.idArtista : item.idAlbum;

                div.innerHTML = `<strong>${nombre}</strong>`;
                div.addEventListener('click', () => {
                    inputTxt.value = nombre;
                    if (inputId) inputId.value = idValue;
                    contenedor.classList.add('hidden');
                    
                    // Foco automático al siguiente campo si seleccionó artista
                    if(tipo === 'artista') inputAlbum?.focus();
                });
                contenedor.appendChild(div);
            });
            contenedor.classList.remove('hidden');
        }

        // Cierre de listas al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (inputArtista && !inputArtista.contains(e.target)) sugerenciasArtista?.classList.add('hidden');
            if (inputAlbum && !inputAlbum.contains(e.target)) sugerenciasAlbum?.classList.add('hidden');
        });

        // Inicialización
        actualizarInterfaz();
    });
})();


//MODALS FOR GENERS
// --- 5. LÓGICA DE GÉNEROS (MODAL, BUSCADOR Y PILLS) ---
(function(){
    const btnAbrirGeneros = document.getElementById('btn-abrir-generos');
    const modalGeneros = document.getElementById('modal-generos');
    const listaGenerosModal = document.getElementById('lista-generos-modal');
    const contenedorPills = document.getElementById('contenedor-pills-generos');
    const inputGenerosOculto = document.getElementById('generosSeleccionados');
    const inputBusquedaGenero = document.getElementById('busqueda-genero-modal');

    let generosFinales = []; // Los que ya están aceptados y confirmados

    // 1. ABRIR MODAL Y CARGAR DATOS
    btnAbrirGeneros?.addEventListener('click', async () => {
        modalGeneros.classList.remove('hidden');
        
        // Evitar recargar de la DB si ya los tenemos en el DOM del modal
        if (listaGenerosModal.children.length === 0) {
            try {
                const res = await fetch('/app/dash/json/generos'); 
                const generos = await res.json();
                
                generos.forEach(g => {
                    const item = document.createElement('label');
                    item.className = "glass-card rounded-sm p-1 relative overflow-hidden";
                    item.innerHTML = `
                        <input type="checkbox" value="${g.genero_id}" data-nombre="${g.nombre}" class="check-genero accent-primary">
                            <span class="text-[10px] w-full justify-between subtittle">${g.nombre}</span>
                    `;
                    listaGenerosModal.appendChild(item);
                });
            } catch (error) {
                console.error("Error al cargar géneros:", error);
            }
        }
        
        // Foco automático al buscador al abrir
        setTimeout(() => inputBusquedaGenero?.focus(), 100);
    });

    // 2. BUSCADOR INTERNO DEL MODAL (FILTRADO DOM)
    inputBusquedaGenero?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase().trim();
        const items = listaGenerosModal.querySelectorAll('label');

        items.forEach(item => {
            const nombreGenero = item.innerText.toLowerCase();
            // Si coincide con el término o la búsqueda está vacía, mostrar
            if (nombreGenero.includes(term)) {
                item.classList.remove('hidden');
            } else {
                item.classList.add('hidden');
            }
        });
    });



    // 3. CONFIRMAR SELECCIÓN Y CERRAR
    document.getElementById('btn-aceptar-generos')?.addEventListener('click', () => {
        const seleccionados = modalGeneros.querySelectorAll('.check-genero:checked');
        generosFinales = Array.from(seleccionados).map(cb => ({
            id: cb.value,
            nombre: cb.dataset.nombre
        }));

        actualizarPills();
        modalGeneros.classList.add('hidden');
        if(inputBusquedaGenero) inputBusquedaGenero.value = ''; // Limpiar buscador al salir
    });

    // 4. ACTUALIZAR VISUALIZACIÓN (PILLS)
    function actualizarPills() {
        if(!contenedorPills || !inputGenerosOculto) return;
        
        contenedorPills.innerHTML = '';
        const ids = generosFinales.map(g => g.id);
        inputGenerosOculto.value = JSON.stringify(ids); 

        generosFinales.forEach(g => {
            const pill = document.createElement('div');
            pill.className = "genre-pill flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/30 rounded-full text-white";
            pill.innerHTML = `
                <span class="text-[10px] font-bold uppercase">${g.nombre}</span>
                <span class="material-symbols-outlined text-[14px] cursor-pointer hover:text-red-500" data-id="${g.id}">close</span>
            `;
            
            pill.querySelector('.material-symbols-outlined').onclick = (e) => {
                const idToRemove = e.target.dataset.id;
                generosFinales = generosFinales.filter(item => item.id !== idToRemove);
                
                const cb = modalGeneros.querySelector(`input[value="${idToRemove}"]`);
                if(cb) cb.checked = false;
                
                actualizarPills();
            };

            contenedorPills.appendChild(pill);
        });
    }

    // 5. CERRAR MODAL SIN CAMBIOS
    document.getElementById('btn-cerrar-modal')?.addEventListener('click', () => {
        modalGeneros.classList.add('hidden');
    });
})();



//UPLOAD FILES

(function () {
    const formulario = document.getElementById('upload-form');

    formulario?.addEventListener('submit', async (e) => {
        e.preventDefault();

        // 1. RECOLECCIÓN Y CONTEO DE ARCHIVOS
        const rawFormData = new FormData(formulario);
        const todosLosInputs = document.querySelectorAll('input[type="file"][name="archivo[]"], input[type="file"][name="coverAlbum"]');     
        rawFormData.delete('archivo[]');
        let archivosRealesEncontrados = 0;

        todosLosInputs.forEach((input) => {
            if (input.files && input.files.length > 0) {
                if (input.name === 'archivo[]') {
                    rawFormData.append('archivo[]', input.files[0]);
                    archivosRealesEncontrados++;
                } 
            }
        });

        // --- VALIDACIÓN A: AL MENOS 1 ARCHIVO ---
        if (archivosRealesEncontrados === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'FALTAN ARCHIVOS',
                text: 'El RTM-ENGINE necesita al menos un archivo para procesar.',
                background: '#0a0a0c', color: '#fff'
            });
            return;
        }

        // --- VALIDACIÓN B: NOMBRE DEL ARTISTA ---
        const nombreArtista = rawFormData.get('nombreArtista')?.trim(); 
        if (!nombreArtista) {
            Swal.fire({
                icon: 'error',
                title: 'ARTISTA REQUERIDO',
                text: 'Indica el nombre del artista para la indexación.',
                background: '#0a0a0c', color: '#fff'
            });
            return;
        }

        // --- VALIDACIÓN C: GÉNEROS MUSICALES ---
        // Al ser un input hidden que se llena dinámicamente:
        const generos = rawFormData.get('generosSeleccionados')?.trim();
        if (!generos || generos === "" || generos === "[]") {
            Swal.fire({
                icon: 'error',
                title: 'GÉNERO REQUERIDO',
                text: 'Debes seleccionar al menos un género musical.',
                background: '#0a0a0c', color: '#fff'
            });
            return;
        }


        //VALIDO QUE LOS ARCHIVOS MULTIMEDIA SEAN LOS PERMITIDOS! 
        const extensionesPermitidas = ['mp3', 'wav', 'mp4', 'mov', 'm4a', 'flac', 'm4a', 'aac', 'ogg','wma',  'aiff', 'avi','mkv','wmv','webm', 'mpeg', 'mpg', 'm4v', 'jpg', 'webp', 'png', 'jpeg', ];
        let archivosInvalidos = [];

        todosLosInputs.forEach((input, index) => {
            if (input.files.length > 0) {
                const file = input.files[0];
                const ext = file.name.split('.').pop().toLowerCase();
                
                if (!extensionesPermitidas.includes(ext)) {
                    archivosInvalidos.push(`Fila ${index + 1}: .${ext}`);
                }
            }
        });

        if (archivosInvalidos.length > 0) {
            Swal.fire({
                icon: 'error',
                title: 'FORMATO NO VÁLIDO',
                html: `<div class="text-[11px] text-left uppercase">Los siguientes archivos no son multimedia permitida:<br><b>${archivosInvalidos.join('<br>')}</b></div>`,
                background: '#0a0a0c', color: '#fff'
            });
            return; 
        }



        // 2. PREPARACIÓN DE DATA LIGERA PARA EL SERVIDOR
        const validationData = new FormData();
        for (let [key, value] of rawFormData.entries()) {
            if (!(value instanceof File)) {
                validationData.append(key, value);
            }
        }

        Swal.fire({
            title: 'VERIFICANDO CON EL CORE...',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); },
            background: '#0a0a0c', color: '#fff'
        });

        try {
            const response = await fetch('/app/dash/uploadboard', {
                method: 'POST',
                body: validationData
            });

            const data = await response.json();

            // Aquí el servidor nos dirá si el artista existe o si hay algún otro problema
            if (!data.ok) {
                Swal.fire({
                    icon: 'error',
                    title: 'ERROR DE VALIDACIÓN',
                    text: data.msg || 'Error en los datos enviados.',
                    background: '#0a0a0c', color: '#fff'
                });
                return;
            }

            // 3. TODO OK -> CAMBIO DE UI Y SUBIDA REAL
            Swal.close();
            document.getElementById('upload-form').classList.add('hidden');
            document.getElementById('live-ingest-monitor').classList.remove('hidden');

            if (typeof inicializarMonitor === 'function') {
                inicializarMonitor(rawFormData);
            }

        } catch (error) {
            console.error("Error en validación:", error);
            Swal.fire({ icon: 'error', title: 'COMMUNICATION ERROR', background: '#0a0a0c', color: '#fff' });
        }
    });
})();




// Listener Global para cambios en inputs de archivos
document.addEventListener('change', (e) => {
    if (e.target.matches('input[type="file"]')) {
        const input = e.target;
        // Buscamos el label asociado
        const label = document.querySelector(`label[for="${input.id}"]`);
        
        if (label) {
            if (input.files && input.files.length > 0) {
                // Cambiamos estado visual
                label.classList.add('archivo-cargado');
                
                // Cambiamos el icono a un "check" de verificado
                const icono = label.querySelector('.material-symbols-outlined');
                if (icono) icono.textContent = 'check_circle';
                
                // Mostramos el nombre del archivo (limitado para no romper el diseño)
                const texto = label.querySelector('p');
                if (texto) {
                    const nombreLimpio = input.files[0].name.length > 15 
                        ? input.files[0].name.substring(0, 12) + '...' 
                        : input.files[0].name;
                    texto.textContent = nombreLimpio;
                }
            } else {
                // Revertimos si el usuario quita el archivo
                label.classList.remove('archivo-cargado');
                const icono = label.querySelector('.material-symbols-outlined');
                if (icono) icono.textContent = 'cloud_upload';
            }
        }
    }
});