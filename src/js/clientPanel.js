;(function () {
    document.addEventListener('DOMContentLoaded', () => {

        // ==========================================
        // PROFILE DROPDOWN MENU
        // ==========================================
        const profileBtn = document.getElementById('profileMenuBtn');
        const profileMenu = document.getElementById('profileMenu');

        if (profileBtn && profileMenu) {
            profileBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                profileMenu.classList.toggle('hidden');
            });
            document.addEventListener('click', (e) => {
                if (!profileBtn.contains(e.target) && !profileMenu.contains(e.target)) {
                    profileMenu.classList.add('hidden');
                }
            });
        }

        // ==========================================
        // SEARCH INPUT — Autofocus + Typewriter placeholder
        // ==========================================
        const searchInput = document.getElementById('searchGlobal');
        if (searchInput) {
            searchInput.focus();

            const phrases = [
                'Digita la cancion o artista que buscas',
                'ej: karol g',
                'mañana sera bonito'
            ];
            let phraseIdx = 0;
            let charIdx = 0;
            let isDeleting = false;
            let typeTimer = null;

            function typewriterStep() {
                // Si el usuario escribio algo, detener la animacion
                if (searchInput.value.length > 0) {
                    searchInput.placeholder = '';
                    return;
                }

                const currentPhrase = phrases[phraseIdx];

                if (!isDeleting) {
                    // Escribiendo
                    charIdx++;
                    searchInput.placeholder = currentPhrase.substring(0, charIdx);

                    if (charIdx === currentPhrase.length) {
                        // Pausa al final de la frase
                        typeTimer = setTimeout(() => { isDeleting = true; typewriterStep(); }, 2000);
                        return;
                    }
                    typeTimer = setTimeout(typewriterStep, 60);
                } else {
                    // Borrando
                    charIdx--;
                    searchInput.placeholder = currentPhrase.substring(0, charIdx);

                    if (charIdx === 0) {
                        isDeleting = false;
                        phraseIdx = (phraseIdx + 1) % phrases.length;
                        typeTimer = setTimeout(typewriterStep, 400);
                        return;
                    }
                    typeTimer = setTimeout(typewriterStep, 30);
                }
            }

            typewriterStep();

            // Detener animacion si el usuario enfoca y escribe
            searchInput.addEventListener('input', () => {
                if (searchInput.value.length > 0) {
                    clearTimeout(typeTimer);
                    searchInput.placeholder = '';
                } else {
                    // Reiniciar animacion si borra todo
                    phraseIdx = 0;
                    charIdx = 0;
                    isDeleting = false;
                    typewriterStep();
                }
            });

            // Limpiar al salir de la pagina
            window.addEventListener('pagehide', () => clearTimeout(typeTimer));
        }

        // ==========================================
        // FILTER TYPE BUTTONS (Audio/Video/Todos)
        // ==========================================
        const filterBtns = document.querySelectorAll('.filter-type');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => {
                    b.classList.remove('active', 'bg-primary/15', 'text-primary');
                    b.classList.add('text-white/40');
                });
                btn.classList.add('active', 'bg-primary/15', 'text-primary');
                btn.classList.remove('text-white/40');
            });
        });

        // ==========================================
        // BPM RANGE SLIDER
        // ==========================================
        const bpmMin = document.getElementById('bpmMin');
        const bpmMax = document.getElementById('bpmMax');
        const bpmFill = document.getElementById('bpm-track-fill');
        const bpmTooltip = document.getElementById('bpm-tooltip');
        const bpmTooltipText = document.getElementById('bpm-tooltip-text');

        const bpmLabel = document.getElementById('bpm-range-label');

        function updateBpmSlider() {
            if (!bpmMin || !bpmMax || !bpmFill) return;

            let minVal = parseInt(bpmMin.value);
            let maxVal = parseInt(bpmMax.value);

            if (minVal > maxVal) {
                [bpmMin.value, bpmMax.value] = [maxVal, minVal];
                [minVal, maxVal] = [maxVal, minVal];
            }

            const rangeMin = parseInt(bpmMin.min);
            const rangeMax = parseInt(bpmMin.max);
            const percentMin = ((minVal - rangeMin) / (rangeMax - rangeMin)) * 100;
            const percentMax = ((maxVal - rangeMin) / (rangeMax - rangeMin)) * 100;

            bpmFill.style.left = percentMin + '%';
            bpmFill.style.width = (percentMax - percentMin) + '%';

            // Actualizar label visible
            if (bpmLabel) bpmLabel.textContent = `${minVal} — ${maxVal}`;
        }

        function showBpmTooltip(value, input) {
            if (!bpmTooltip || !bpmTooltipText) return;
            bpmTooltipText.textContent = value;
            const rect = input.getBoundingClientRect();
            const parent = input.parentElement.getBoundingClientRect();
            const percent = (value - parseInt(input.min)) / (parseInt(input.max) - parseInt(input.min));
            const pos = percent * parent.width;
            bpmTooltip.style.left = pos + 'px';
            bpmTooltip.classList.remove('hidden');
        }

        if (bpmMin && bpmMax) {
            bpmMin.addEventListener('input', () => {
                updateBpmSlider();
                showBpmTooltip(bpmMin.value, bpmMin);
            });
            bpmMax.addEventListener('input', () => {
                updateBpmSlider();
                showBpmTooltip(bpmMax.value, bpmMax);
            });
            [bpmMin, bpmMax].forEach(el => {
                el.addEventListener('mouseup', () => bpmTooltip?.classList.add('hidden'));
                el.addEventListener('touchend', () => bpmTooltip?.classList.add('hidden'));
            });
            updateBpmSlider();
        }

        // ==========================================
        // GENRE MODAL
        // ==========================================
        const btnAbrir = document.getElementById('btn-abrir-generos-search');
        const modal = document.getElementById('modal-generos-search');
        const btnCerrar = document.getElementById('btn-cerrar-generos-search');
        const btnAceptar = document.getElementById('btn-aceptar-generos-search');
        const listaGeneros = document.getElementById('lista-generos-search');
        const busquedaGenero = document.getElementById('busqueda-genero-search');
        const pillsContainer = document.getElementById('contenedor-pills-generos-search');
        const inputGeneros = document.getElementById('generosSeleccionadosSearch');
        let selectedGeneros = [];

        btnAbrir?.addEventListener('click', async () => {
            modal?.classList.remove('hidden');
            if (listaGeneros && listaGeneros.children.length === 0) {
                try {
                    const res = await fetch('/ritmaap/json/generos');
                    const generos = await res.json();
                    generos.forEach(g => {
                        const item = document.createElement('label');
                        item.className = 'glass-card rounded-sm p-1 relative overflow-hidden';
                        item.innerHTML = `<input type="checkbox" value="${g.genero_id}" data-nombre="${g.nombre}" class="check-genero-search accent-primary"><span class="text-[10px] w-full justify-between subtittle">${g.nombre}</span>`;
                        listaGeneros.appendChild(item);
                    });
                } catch (err) { console.error('Error loading genres:', err); }
            }
            setTimeout(() => busquedaGenero?.focus(), 100);
        });

        btnCerrar?.addEventListener('click', () => modal?.classList.add('hidden'));

        // Filtro de busqueda dentro del modal
        busquedaGenero?.addEventListener('input', () => {
            const q = busquedaGenero.value.toLowerCase();
            listaGeneros?.querySelectorAll('label').forEach(l => {
                const nombre = l.textContent.toLowerCase();
                l.style.display = nombre.includes(q) ? '' : 'none';
            });
        });

        btnAceptar?.addEventListener('click', () => {
            const checks = modal.querySelectorAll('.check-genero-search:checked');
            selectedGeneros = Array.from(checks).map(cb => ({ id: cb.value, nombre: cb.dataset.nombre }));
            updatePills();
            modal?.classList.add('hidden');
        });

        function updatePills() {
            if (!pillsContainer || !inputGeneros) return;
            pillsContainer.innerHTML = '';
            inputGeneros.value = JSON.stringify(selectedGeneros.map(g => g.id));

            selectedGeneros.forEach(g => {
                const pill = document.createElement('div');
                pill.className = 'genre-pill flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/30 rounded-full text-white';
                pill.innerHTML = `<span class="text-[10px] font-bold uppercase">${g.nombre}</span><span class="material-symbols-outlined text-[14px] cursor-pointer hover:text-red-500" data-id="${g.id}">close</span>`;
                pill.querySelector('.material-symbols-outlined').onclick = (e) => {
                    selectedGeneros = selectedGeneros.filter(item => item.id !== e.target.dataset.id);
                    const cb = modal?.querySelector(`input[value="${e.target.dataset.id}"]`);
                    if (cb) cb.checked = false;
                    updatePills();
                };
                pillsContainer.appendChild(pill);
            });
        }

    });
})();
