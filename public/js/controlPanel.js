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

/***/ "./src/js/controlPanel.js"
/*!********************************!*\
  !*** ./src/js/controlPanel.js ***!
  \********************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

eval("{__webpack_require__.r(__webpack_exports__);\n;(function () {\n  document.addEventListener(\"DOMContentLoaded\", () => {\n\n    const btn = document.getElementById(\"userMenuBtn\");\n    const menu = document.getElementById(\"userMenu\");\n\n    if (btn && menu) {\n      btn.addEventListener(\"click\", (e) => {\n        e.stopPropagation();\n        menu.classList.toggle(\"hidden\");\n      });\n\n      document.addEventListener(\"click\", (e) => {\n        if (!btn.contains(e.target) && !menu.contains(e.target)) {\n          menu.classList.add(\"hidden\");\n        }\n      });\n    }\n\n    const sidebar = document.getElementById(\"sidebar\");\n    const toggle = document.getElementById(\"sidebarToggle\");\n\n    if (sidebar && toggle) {\n      toggle.addEventListener(\"click\", () => {\n        sidebar.classList.toggle(\"open\");\n      });\n    }\n\n  });\n})();\n\n\n//# sourceURL=webpack://base/./src/js/controlPanel.js?\n}");

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
/******/ 	__webpack_modules__["./src/js/controlPanel.js"](0,__webpack_exports__,__webpack_require__);
/******/ 	
/******/ })()
;