/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/js/multimediaPanels.js"
/*!************************************!*\
  !*** ./src/js/multimediaPanels.js ***!
  \************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

eval("{__webpack_require__.r(__webpack_exports__);\n(function(){\n    document.addEventListener('DOMContentLoaded', () => {\n        const contenedor = document.getElementById('contenedor-filas');\n        const btnAgregar = document.getElementById('btn-agregar-fila');\n        const totalItemsTxt = document.querySelector('.total-items-count'); // Para el texto \"TOTAL ITEMS: X\"\n        const MAX_FILAS = 5;\n\n        function actualizarContador() {\n            const numFilas = contenedor.querySelectorAll('.fila-archivo').length;\n            if (totalItemsTxt) totalItemsTxt.textContent = numFilas;\n            \n            // Deshabilitar botón si llegamos al límite\n            if (numFilas >= MAX_FILAS) {\n                btnAgregar.classList.add('opacity-50', 'cursor-not-allowed');\n                btnAgregar.disabled = true;\n            } else {\n                btnAgregar.classList.remove('opacity-50', 'cursor-not-allowed');\n                btnAgregar.disabled = false;\n            }\n        }\n\n        btnAgregar.addEventListener('click', () => {\n            const filas = contenedor.querySelectorAll('.fila-archivo');\n            \n            if (filas.length < MAX_FILAS) {\n                const nuevoIndice = filas.length + 1;\n                const nuevaFila = filas[0].cloneNode(true);\n\n                nuevaFila.setAttribute('data-index', nuevoIndice);\n                nuevaFila.querySelector('.numero-fila').textContent = nuevoIndice.toString().padStart(2, '0');\n                \n                const inputs = nuevaFila.querySelectorAll('input');\n                inputs.forEach(input => {\n                    input.value = '';\n                    if(input.type === 'checkbox') input.checked = false;\n                    const oldId = input.getAttribute('id');\n                    if(oldId) input.setAttribute('id', oldId.replace(/-\\d+$/, `-${nuevoIndice}`));\n                });\n\n                contenedor.appendChild(nuevaFila);\n                actualizarContador();\n            }\n        });\n\n        contenedor.addEventListener('click', (e) => {\n            const btnDelete = e.target.closest('.btn-eliminar-js'); \n            if (btnDelete) {\n                const filas = contenedor.querySelectorAll('.fila-archivo');\n                if (filas.length > 1) {\n                    btnDelete.closest('.fila-archivo').remove();\n                    reordenarFilas();\n                    actualizarContador();\n                }\n            }\n        });\n\n        function reordenarFilas() {\n            const filas = contenedor.querySelectorAll('.fila-archivo');\n            filas.forEach((fila, i) => {\n                fila.querySelector('.numero-fila').textContent = (i + 1).toString().padStart(2, '0');\n                fila.setAttribute('data-index', i + 1);\n            });\n        }\n        \n        // Inicializar contador al cargar\n        actualizarContador();\n    });\n})();\n\n//# sourceURL=webpack://base/./src/js/multimediaPanels.js?\n}");

/***/ }

/******/ 	});
/************************************************************************/
/******/ 	// The require scope
/******/ 	var __webpack_require__ = {};
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval devtool is used.
/******/ 	var __webpack_exports__ = {};
/******/ 	__webpack_modules__["./src/js/multimediaPanels.js"](0,__webpack_exports__,__webpack_require__);
/******/ 	
/******/ })()
;