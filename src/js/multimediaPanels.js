(function(){
    document.addEventListener('DOMContentLoaded', () => {
        const contenedor = document.getElementById('contenedor-filas');
        const btnAgregar = document.getElementById('btn-agregar-fila');
        const totalItemsTxt = document.querySelector('.total-items-count'); // Para el texto "TOTAL ITEMS: X"
        const MAX_FILAS = 5;

        function actualizarContador() {
            const numFilas = contenedor.querySelectorAll('.fila-archivo').length;
            if (totalItemsTxt) totalItemsTxt.textContent = numFilas;
            
            // Deshabilitar botón si llegamos al límite
            if (numFilas >= MAX_FILAS) {
                btnAgregar.classList.add('opacity-50', 'cursor-not-allowed');
                btnAgregar.disabled = true;
            } else {
                btnAgregar.classList.remove('opacity-50', 'cursor-not-allowed');
                btnAgregar.disabled = false;
            }
        }

        btnAgregar.addEventListener('click', () => {
            const filas = contenedor.querySelectorAll('.fila-archivo');
            
            if (filas.length < MAX_FILAS) {
                const nuevoIndice = filas.length + 1;
                const nuevaFila = filas[0].cloneNode(true);

                nuevaFila.setAttribute('data-index', nuevoIndice);
                nuevaFila.querySelector('.numero-fila').textContent = nuevoIndice.toString().padStart(2, '0');
                
                const inputs = nuevaFila.querySelectorAll('input');
                inputs.forEach(input => {
                    input.value = '';
                    if(input.type === 'checkbox') input.checked = false;
                    const oldId = input.getAttribute('id');
                    if(oldId) input.setAttribute('id', oldId.replace(/-\d+$/, `-${nuevoIndice}`));
                });

                contenedor.appendChild(nuevaFila);
                actualizarContador();
            }
        });

        contenedor.addEventListener('click', (e) => {
            const btnDelete = e.target.closest('.btn-eliminar-js'); 
            if (btnDelete) {
                const filas = contenedor.querySelectorAll('.fila-archivo');
                if (filas.length > 1) {
                    btnDelete.closest('.fila-archivo').remove();
                    reordenarFilas();
                    actualizarContador();
                }
            }
        });

        function reordenarFilas() {
            const filas = contenedor.querySelectorAll('.fila-archivo');
            filas.forEach((fila, i) => {
                fila.querySelector('.numero-fila').textContent = (i + 1).toString().padStart(2, '0');
                fila.setAttribute('data-index', i + 1);
            });
        }
        
        // Inicializar contador al cargar
        actualizarContador();
    });
})();