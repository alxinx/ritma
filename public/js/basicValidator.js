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

/***/ "./src/js/basicValidator.js"
/*!**********************************!*\
  !*** ./src/js/basicValidator.js ***!
  \**********************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

eval("{__webpack_require__.r(__webpack_exports__);\n;(function() {\n    document.addEventListener('DOMContentLoaded', () => {\n        \n        // --- 1. VALIDACIÓN DE CONTRASEÑAS (RECOVERY) ---\n        const passwordAgain = document.getElementById('password_again');\n        const password = document.getElementById('password');\n        const btnRecuperar = document.getElementById('recuperar');\n\n        \n        if (passwordAgain && password && btnRecuperar) {\n            const avisoPass = document.createElement('P');\n            avisoPass.classList.add('btn-danger', 'text-sm', 'mt-2', 'hidden', 'font-bold');\n            passwordAgain.parentElement.after(avisoPass);\n\n            const validarPassword = () => {\n                const valPass = password.value;\n                const valPassAgain = passwordAgain.value;\n                let errores = [];\n\n                if (valPass.length < 5) errores.push(\"⚠️ La contraseñna debe ser de mínimo 5 caracteres.\");\n                if (valPass !== valPassAgain && valPassAgain.length > 0) errores.push(\"🚨 Las contraseñas no coinciden. 🚨\");\n\n                if (errores.length > 0) {\n                    avisoPass.textContent = errores[0];\n                    avisoPass.classList.remove('hidden');\n                    btnRecuperar.disabled = true;\n                    btnRecuperar.classList.add('opacity-50', 'cursor-not-allowed');\n                } else if (valPass.length >= 5 && valPass === valPassAgain) {\n                    avisoPass.classList.add('hidden');\n                    btnRecuperar.disabled = false;\n                    btnRecuperar.classList.remove('opacity-50', 'cursor-not-allowed');\n                }\n            };\n\n            password.addEventListener('input', validarPassword);\n            passwordAgain.addEventListener('input', validarPassword);\n        }\n\n        // --- 2. VALIDACIÓN DE EMAIL (FORGOT PASSWORD) ---\n        const emailInput = document.getElementById('email');\n        const btnForgot = document.getElementById('forgot');\n\n        \n        if (emailInput && btnForgot) {\n            const avisoEmail = document.createElement('P');\n            avisoEmail.classList.add('text-red-500', 'text-sm', 'mt-2', 'hidden', 'font-bold', 'text-center');\n            emailInput.parentElement.after(avisoEmail);\n\n            emailInput.addEventListener('input', () => {\n                const email = emailInput.value.trim();\n                const regex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;\n\n                if (email === \"\") {\n                    avisoEmail.classList.add('hidden');\n                    btnForgot.disabled = true;\n                } else if (!regex.test(email)) {\n                    avisoEmail.textContent = \"⚠️ Complete correctamente el email ⚠️\";\n                    avisoEmail.classList.remove('hidden');\n                    btnForgot.disabled = true;\n                    btnForgot.classList.add('opacity-50', 'cursor-not-allowed');\n                } else {\n                    avisoEmail.classList.add('hidden');\n                    btnForgot.disabled = false;\n                    btnForgot.classList.remove('opacity-50', 'cursor-not-allowed');\n                }\n            });\n        }\n    });\n})();\n\n//# sourceURL=webpack://base/./src/js/basicValidator.js?\n}");

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
/******/ 	__webpack_modules__["./src/js/basicValidator.js"](0,__webpack_exports__,__webpack_require__);
/******/ 	
/******/ })()
;