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

        const MAX_FILAS = 5;
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
                const nuevaFila = filas[0].cloneNode(true);
                const nuevoIndice = filas.length + 1;

                nuevaFila.setAttribute('data-index', nuevoIndice);
                nuevaFila.querySelector('.numero-fila').textContent = nuevoIndice.toString().padStart(2, '0');
                
                // Limpiar inputs de la nueva fila
                const inputs = nuevaFila.querySelectorAll('input');
                inputs.forEach(input => {
                    input.value = '';
                    if (input.type === 'checkbox') input.checked = false;
                    const oldId = input.getAttribute('id');
                    if (oldId) input.setAttribute('id', oldId.replace(/-\d+$/, `-${nuevoIndice}`));
                });

                contenedorFilas.appendChild(nuevaFila);
                actualizarInterfaz();
            }
        });

        contenedorFilas?.addEventListener('click', (e) => {
            const btnDelete = e.target.closest('.btn-eliminar-js');
            if (btnDelete) {
                const filas = document.querySelectorAll('.fila-archivo');
                if (filas.length > 1) {
                    btnDelete.closest('.fila-archivo').remove();
                    // Re-enumerar filas restantes
                    document.querySelectorAll('.fila-archivo').forEach((f, i) => {
                        f.querySelector('.numero-fila').textContent = (i + 1).toString().padStart(2, '0');
                    });
                    actualizarInterfaz();
                }
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
(function() {
    const formulario = document.getElementById('upload-form'); 

    formulario?.addEventListener('submit', async (e) => {
        e.preventDefault();

        // 1. Crear un FormData "ligero" (sin los archivos pesados) para validar campos
        const rawFormData = new FormData(formulario);
        const validationData = new FormData();
        
        // Solo copiamos los campos de texto, no los archivos
        for (let [key, value] of rawFormData.entries()) {
            if (!(value instanceof File)) {
                validationData.append(key, value);
            }
        }

        // Feedback visual
        Swal.fire({
            title: 'RTM-ENGINE: VALIDANDO',
            html: '<span class="text-[10px] font-mono opacity-60 uppercase tracking-widest">Checking constraints...</span>',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); },
            background: '#0a0a0c', color: '#fff',
            customClass: { popup: 'rounded-3xl border border-white/10 glass-card' }
        });

        try {
            // Enviamos solo los textos. El servidor responderá instantáneamente
            const response = await fetch('/app/dash/uploadboard', {
                method: 'POST',
                body: validationData 
            });

            const data = await response.json();

            // Si faltan campos (Artista, Título, etc.), el servidor dirá que NO
            if (!data.ok) {
                const listaErrores = data.errores.map(err => `<li>• ${err.msg}</li>`).join('');
                Swal.fire({
                    icon: 'error',
                    title: 'DATOS INCOMPLETOS',
                    html: `<div class="text-left text-[11px] font-mono text-red-400 uppercase">${listaErrores}</div>`,
                    background: '#0a0a0c', color: '#fff',
                    confirmButtonColor: '#008B8B',
                    customClass: { popup: 'rounded-3xl border border-red-500/30' }
                });
                return;
            }

            // --- SI TODO ESTÁ BIEN ---
            Swal.close();

            // Intercambiamos la UI
            document.getElementById('upload-form').classList.add('hidden');
            document.getElementById('live-ingest-monitor').classList.remove('hidden');

            // 2. DISPARAR MONITOR CON LOS ARCHIVOS REALES
            // Aquí usamos el original que sí tiene los archivos pesados
            if (typeof inicializarMonitor === 'function') {
                const rawFormData = new FormData(formulario);
                
                inicializarMonitor(rawFormData);
            }

        } catch (error) {
            Swal.fire({ icon: 'error', title: 'ENGINE ERROR', background: '#0a0a0c', color: '#fff' });
        }
    });
})();