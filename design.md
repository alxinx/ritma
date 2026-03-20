# RITMA — Design System

> Guía de diseño completa para la plataforma RITMA.
> Cualquier agente o desarrollador puede leer este documento y reproducir fielmente la identidad visual del proyecto.

---

## 1. Identidad de Marca

**RITMA** es una plataforma profesional de música y video para DJs. Su estética es **dark-mode exclusivo**, inspirada en equipos de audio profesional (VU meters, waveforms, scan lines), con un acento neón lima que evoca la energía de un escenario.

**Filosofía visual:**
- Oscuridad total como lienzo (`#000000`)
- Glass-morphism (blur + transparencia) en todas las superficies
- Tipografía industrial: bold, uppercase, tracking amplio
- Detalles neón lima (`#C9DA2B`) como hilo conductor
- Micro-patrones (pixel grid, scan lines) como texturas sutiles
- Transiciones suaves (300–700ms) en toda interacción

**Logos:**
- `public/img/logos/isotipo.png` — Isotipo (ícono cuadrado, usado en sidebar)
- `public/img/logos/logo_horizontal_transparente.png` — Logo horizontal completo

---

## 2. Paleta de Colores

### Colores principales

| Nombre | Hex | Uso |
|---|---|---|
| **Primary** | `#C9DA2B` | Botones, glows, bordes activos, acentos, sombras neón |
| **Background** | `#000000` | Fondo global del body |
| **Surface Dark** | `#1A1A1A` | Fondo de cards, contenedores internos |
| **Background Light** | `#F8F9FA` | No se usa activamente (dark-mode exclusivo) |

### Colores de acento (RITMA palette)

| Nombre | Hex | Uso |
|---|---|---|
| **Ritma Purple** | `#A462A7` | Pills, etiquetas de género |
| **Ritma Blue** | `#4F74B8` | Pills secundarias, indicadores |
| **Ritma Cyan** | `#57C5D3` | Acentos decorativos |
| **Ritma Orange** | `#FFC857` | Gradientes, highlights |
| **Ritma Red** | `#FF4D4D` | Error, peligro, estados críticos |

### Colores extendidos

| Nombre | Hex | Uso |
|---|---|---|
| Vibrant Purple | `#4B0082` | Fondo gradiente del body |
| Deep Cyan | `#008B8B` | Fondo gradiente secundario |
| Midnight Blue | `#191970` | Fondo gradiente terciario |
| Error Red | `#FF3131` | VU meter peak, alertas críticas |

### Opacidades frecuentes (sobre blanco)

- `white/3` → `rgba(255,255,255,0.03)` — Fondo glass mínimo
- `white/5` → `rgba(255,255,255,0.05)` — Bordes sutiles, separadores
- `white/10` → `rgba(255,255,255,0.10)` — Bordes de inputs, divisores
- `white/20` → `rgba(255,255,255,0.20)` — Bordes hover
- `white/30` → `rgba(255,255,255,0.30)` — Texto terciario (metadata)
- `white/40` → `rgba(255,255,255,0.40)` — Texto secundario (labels, headers tabla)
- `white/60` → `rgba(255,255,255,0.60)` — Texto nav inactivo
- `white/70` → `rgba(255,255,255,0.70)` — Texto contenido medio
- `white/90` → `rgba(255,255,255,0.90)` — Texto body principal

---

## 3. Tipografía

### Fuentes

| Rol | Familia | Pesos | Clase Tailwind |
|---|---|---|---|
| **Display / Headings** | Montserrat | 700, 800 | `font-display` |
| **Body / Texto** | Roboto | 400, 500 | `font-body` |
| **Monospace** | System mono stack | — | `font-mono` |

### Carga de fuentes (en `<head>`)

```html
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700;800&family=Roboto:wght@400;500&display=swap" rel="stylesheet">
```

### Íconos

```html
<!-- Material Symbols Outlined (principal) -->
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
<!-- Material Icons Round (legacy) -->
<link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet">
```

### Escala tipográfica

| Elemento | Clases | Ejemplo de uso |
|---|---|---|
| H1 | `text-5xl uppercase leading-none tracking-tighter font-display font-extrabold` | Título de página en dashboard |
| H2 | `text-4xl uppercase leading-none font-display font-extrabold` | Secciones principales |
| H3 | `text-2xl uppercase leading-none font-display font-bold` | Headers de tarjetas |
| H4 / Nav | `text-xs uppercase leading-none font-display font-bold` | Items del sidebar |
| Stat Number | `text-4xl font-display font-extrabold text-primary` | Número grande en stat cards |
| Stat Label | `text-[11px] font-bold text-gray-400 uppercase tracking-[0.3em]` | Label de stat card |
| Body | `text-xl leading-relaxed text-white/90` | Párrafos de contenido |
| Label / Tag | `text-[10px] font-bold uppercase tracking-widest` | Etiquetas, pills, metadata |
| Micro | `text-[9px] font-bold uppercase tracking-wider` | Timestamps, tags mínimos |
| Monospace | `font-mono text-sm` | Información técnica, logs |

### Letter-spacing (tracking)

- `tracking-tighter` → Headings principales (tracking negativo)
- `tracking-wider` → Texto de botones
- `tracking-widest` → Labels pequeños
- `tracking-[0.2em]` a `tracking-[0.4em]` → Input labels personalizados

---

## 4. Layout & Estructura

### Estructura principal (App)

```
┌──────────────────────────────────────────────────┐
│ HEADER (sticky, h-20, glass-header, z-30)        │
├────────┬─────────────────────────────────────────┤
│        │                                         │
│ SIDE   │  MAIN CONTENT                           │
│ BAR    │  (flex-1, ml-[60px] lg:ml-72,           │
│        │   p-4 pb-32)                            │
│ (fixed │                                         │
│  left  │  ┌─────────────────────────────────┐    │
│  w-20  │  │ Grid de Stats (4 cols)          │    │
│  lg:   │  ├─────────────────────────────────┤    │
│  w-72) │  │ Contenido principal             │    │
│        │  │ (tabla, cards, forms...)        │    │
│        │  └─────────────────────────────────┘    │
│        │                                         │
├────────┴─────────────────────────────────────────┤
│ FOOTER (fixed bottom, h-12, glass-header, z-30)  │
└──────────────────────────────────────────────────┘
```

### Grid system

```css
/* Stats row — 4 columnas */
grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8

/* Contenido 3 columnas */
grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8

/* Contenido 2 columnas */
grid grid-cols-1 lg:grid-cols-2 gap-8
```

### Responsive breakpoints (Tailwind defaults)

| Breakpoint | Min-width | Comportamiento |
|---|---|---|
| (default) | 0px | Todo apilado, sidebar colapsado (60px) |
| `sm` | 640px | — |
| `md` | 768px | Grid de 2 columnas |
| `lg` | 1024px | Grid completo, sidebar expandido (288px) |
| `xl` | 1280px | — |
| `2xl` | 1536px | — |

### Sidebar (mobile)

- **Cerrado**: `width: 60px`, solo logo visible, `.sidebar-text` y `.sidebar-footer` con `opacity: 0`
- **Abierto** (tap en botón): `width: 260px`, todo visible con `opacity: 1`
- Transición: `transition-all duration-300`

### Z-index hierarchy

| Nivel | z-index | Uso |
|---|---|---|
| SweetAlert2 | `z-[5000]` | Alertas/Confirmaciones |
| Modales | `z-[3000]` | Edit modals, genre selector |
| Sidebar | `z-51` | Navegación fija |
| Header/Footer | `z-30` | Sticky bars |
| Contenido overlay | `z-10` | Elementos dentro de cards |
| Default | `z-0` | Contenido base |

---

## 5. Superficies Glass-morphism

### Glass Card (`.glass-card`) — Componente principal

```css
background: rgba(255, 255, 255, 0.03);
backdrop-filter: blur(12px);
border: 1px solid rgba(255, 255, 255, 0.1);
border-radius: 1.5rem; /* rounded-3xl */
```

Uso: Stat cards, contenedores principales, modales, formularios.

### Glass Sidebar (`.glass-sidebar`)

```css
background: rgba(0, 0, 0, 0.4);
backdrop-filter: blur(20px);
border-right: 1px solid rgba(255, 255, 255, 0.05);
```

### Glass Header (`.glass-header`)

```css
background: rgba(0, 0, 0, 0.3);
backdrop-filter: blur(15px);
border-bottom: 1px solid rgba(255, 255, 255, 0.05);
```

---

## 6. Sombras & Glows

### Box-shadows

| Nombre | CSS | Uso |
|---|---|---|
| `neon-accent-shadow` | `0 0 20px rgba(201,218,43,0.15)` | Hover sutil en cards |
| `glow-green` | `0 0 30px rgba(201,218,43,0.3)` | Glow principal (botones, badges) |
| `glow-red` | `0 0 30px rgba(255,49,49,0.3)` | Error / peligro |
| `video-glow` | `0 0 50px -10px rgba(201,218,43,0.2)` | Contenedor de video |
| Neon card hover | `0 0 25px rgba(201,218,43,0.08)` | Cards interactivas |
| Input focus | `0 0 20px rgba(201,218,43,0.1)` | Focus en inputs |
| Checkbox checked | `0 0 20px 2px rgba(201,218,43,0.6)` | Checkbox activo |
| Switch checked | `0 0 15px rgba(201,218,43,0.4)` | Toggle activo |

### Text-shadow

| Nombre | CSS |
|---|---|
| `glow-primary` | `text-shadow: 0 0 10px rgba(201,218,43,0.5)` |

---

## 7. Componentes de Formulario

### Input Field (`.ritma-input-field`)

```css
/* Base */
w-full bg-black/40 border border-white/10 px-4 py-3 pr-12
rounded-sm font-display text-[11px] font-bold uppercase tracking-[0.2em]
text-white placeholder:text-slate-600 transition-all duration-300 outline-none

/* Focus */
border-primary/50 bg-black/60 shadow-[0_0_20px_rgba(201,218,43,0.1)]
```

- Ícono derecho: Material Symbols, `text-white/10`, en focus → `drop-shadow(0 0 8px rgba(201,218,43,0.5))`

### Select (`.ritma-select-trigger`)

```css
appearance-none w-full bg-black/40 border border-primary/40 px-4 py-3
rounded-sm font-display text-[11px] font-bold uppercase tracking-[0.2em]
text-white cursor-pointer
```

- Chevron SVG personalizado en `#C9DA2B`
- Dropdown: `bg-surface-dark border border-primary/20 shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-xl`

### Checkbox (`.checkbox-ritma-glow`)

```css
/* Base */
appearance-none size-2 rounded-md border-2 border-white/10 bg-white/5 cursor-pointer

/* Checked */
bg-primary border-primary
box-shadow: 0 0 20px 2px rgba(201,218,43,0.6)
/* Checkmark SVG negro como ::after */
```

### Switch / Toggle (`.ritma-switch-input`)

```css
/* Base */
appearance-none w-12 h-6 rounded-full border-2 border-white/10 bg-white/5

/* Thumb (::after) */
absolute top-1 left-1 size-3 bg-white/20 rounded-full

/* Checked */
bg-primary border-primary, box-shadow: 0 0 15px rgba(201,218,43,0.4)
/* Thumb → left-7 bg-black */
```

### Range Slider (`.ritma-range`)

```css
/* Track */
h-1 bg-white/10 rounded-full

/* Thumb */
size-4 bg-primary rounded-full border-2 border-black
box-shadow: 0 0 10px #C9DA2B
```

### Upload Zone (`.upload-zone`)

```css
/* Base */
border-2 border-dashed border-white/10 bg-white/[0.02] rounded-xl

/* Drag active / hover */
border-primary bg-primary/5 shadow-[0_0_40px_rgba(201,218,43,0.1)]

/* Archivo cargado (.archivo-cargado) */
border-color: #00ff88
background: rgba(0,255,136,0.05)
box-shadow: 0 0 15px rgba(0,255,136,0.1)
```

---

## 8. Botones

### Primary (`.btn-green`)

```css
bg-primary hover:bg-white text-black
py-4 px-8 rounded uppercase tracking-wider font-display font-bold
transition-all duration-300 cursor-pointer
```

- Efecto hover: overlay blanco que se desliza de izquierda a derecha (700ms)

### Ghost (`.btn-ghost`)

```css
border border-white/20 hover:border-primary hover:text-black
text-white font-bold py-4 px-8 rounded uppercase tracking-wider
```

### Danger

```css
bg-red-500 hover:bg-red-600 text-white font-bold
```

### Small / Inline

```css
py-2 px-4 rounded uppercase text-[10px] tracking-wider font-bold
```

---

## 9. Pills & Badges

### Colores de pills

| Variante | Clases |
|---|---|
| **Green** (`.green-pill`) | `bg-primary/10 border border-primary/20 text-primary` |
| **Purple** (`.purple-pill`) | `bg-ritma-purple/10 border border-ritma-purple/20 text-ritma-purple` |
| **Red** (`.red-pill`) | `bg-ritma-red/10 border border-ritma-red/20 text-ritma-red` |
| **Blue** (`.blue-pill`) | `bg-ritma-blue/10 border border-ritma-blue/20 text-white/80` |
| **Gray** (`.gray-pill`) | `bg-black border border-ritma-blue/20` |

### Tag pattern

```css
px-3 py-1 bg-primary/10 text-[9px] font-bold text-primary
rounded-full border border-primary/20 uppercase tracking-wider
```

### Live indicator (dot)

```css
size-2 rounded-full bg-primary animate-pulse
shadow-[0_0_8px_#C9DA2B]
```

---

## 10. Stat Cards

### Estructura (`.stats-crystal`)

```css
rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden
```

### Contenido interno

```
┌─────────────────────────────────┐
│ [Label]              [Ícono]    │  ← flex justify-between
│                                 │
│ 1,247                           │  ← text-4xl font-extrabold
│ ↑ +2.3% vs semana anterior     │  ← text-[10px] trend indicator
└─────────────────────────────────┘
```

- **Label**: `text-[11px] font-bold text-gray-400 uppercase tracking-[0.3em]` (clase `.subTittle`)
- **Valor**: `text-4xl font-display font-extrabold text-primary`
- **Trend up**: `text-green-400` + ícono `trending_up`
- **Trend down**: `text-red-400` + ícono `trending_down`
- **Trend flat**: `text-white/40` + ícono `trending_flat`
- **Overlay**: `.pixel-pattern opacity-5` como patrón de fondo

---

## 11. Tablas

### Header tabs (`.tabla`)

```css
mt-12 border-b border-white/10 flex gap-8
```

### Tab items (`.tablatittles`)

```css
/* Inactivo */
pb-4 text-white/40 hover:text-white font-bold text-xs uppercase tracking-widest cursor-pointer

/* Activo */
pb-4 border-b-2 border-primary text-primary
```

### Table

```html
<table class="w-full text-left">
  <thead class="bg-white/5">
    <th class="px-6 py-4 text-[10px] uppercase font-bold text-white/40 tracking-widest">
  </thead>
  <tbody class="divide-y divide-white/5">
    <td class="px-6 py-4 font-bold text-sm">
  </tbody>
</table>
```

### Paginación

```css
/* Número activo */
px-3 py-1 text-xs font-bold bg-primary text-black rounded

/* Número inactivo */
px-3 py-1 text-xs font-bold text-white/40 hover:text-white bg-white/5 rounded
```

---

## 12. Modales

### Contenedor

```css
fixed inset-0 z-[3000] flex items-center justify-center bg-black/80
```

### Panel

```css
glass-card w-full max-w-lg mx-4 p-8 border border-white/10 relative rounded-3xl
```

### Título modal

```css
font-display font-black text-xl uppercase tracking-tighter mb-6
```

### Acciones

```css
flex items-center justify-end gap-4 mt-8
```

### SweetAlert2 (override global)

```css
.swal2-popup {
  background: #0a0a0c;
  color: #fff;
}
confirmButtonColor: '#C9DA2B'  /* primary */
cancelButtonColor: '#ef4444'   /* red */
```

---

## 13. Animaciones

### Keyframes definidos

```css
/* Efecto de escaneo (artista scan) */
@keyframes scan {
  0%   { transform: translateY(-100%); }
  100% { transform: translateY(1000%); }
}
/* Uso: 3s linear infinite */

/* Barra de progreso que se encoge */
@keyframes shrink {
  from { transform: scaleX(1); }
  to   { transform: scaleX(0); }
}

/* Sacudida de error */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25%      { transform: translateX(-5px); }
  75%      { transform: translateX(5px); }
}
/* Uso: 0.5s */

/* Glow pulsante para nuevos aspirantes */
@keyframes aspiranteGlow {
  0%   { box-shadow: 0 0 0 0 rgba(201,218,43,0.6); }
  50%  { box-shadow: 0 0 20px 4px rgba(201,218,43,0.3); }
  100% { box-shadow: 0 0 0 0 rgba(201,218,43,0); }
}
/* Uso: 1s ease-in-out, 3 repeticiones */
```

### Tailwind animations usadas

- `animate-pulse` → Loading, status indicator
- `animate-ping` → Badges de peligro
- `transition-all duration-300` → Hover/focus general
- `transition-colors duration-500` → Cambios de color suaves

---

## 14. Texturas & Patrones

### Pixel Grid (`.pixel-pattern`)

```css
background-image: radial-gradient(var(--color-primary) 1px, transparent 1px);
background-size: 4px 4px;
```

Se usa como overlay con `opacity-5` en stat cards.

### Background Grid (`.bg-grid`)

```css
background-image:
  linear-gradient(to right, rgba(201,218,43,0.1) 1px, transparent 1px),
  linear-gradient(to bottom, #1A1A1A 1px, transparent 1px);
background-size: 100px 100px;
```

### Scan Lines (`.upload-scan-lines`)

```css
background: linear-gradient(to bottom, transparent 50%, rgba(201,218,43,0.03) 50%);
background-size: 100% 4px;
position: absolute; inset: 0; pointer-events: none;
```

### Sidebar decorative line (`.sidebar-line`)

```css
background: linear-gradient(to bottom, #C9DA2B 0%, transparent 100%);
```

---

## 15. Fondo Global

### Body background

```css
background: radial-gradient(circle at top left, #2D0054 0%, #001F3F 50%, #000000 100%);
background-attachment: fixed;
```

### Vibrant background (`.vibrant-bg`)

```css
background: linear-gradient(135deg, #1A0B2E 0%, #002B36 50%, #001A33 100%);
```

### Selection

```css
::selection {
  background: #C9DA2B;
  color: #000000;
}
```

---

## 16. Scrollbar

### Custom scrollbar (`.custom-scrollbar`)

```css
::-webkit-scrollbar       { width: 4px; }
::-webkit-scrollbar-track  { background: transparent; }
::-webkit-scrollbar-thumb  { background: rgba(201,218,43,0.2); border-radius: 10px; }
```

---

## 17. VU Meter (efecto audio)

### Barra individual (`.vu-meter-bar`)

```css
width: 4px;
background: #C9DA2B;
border-radius: 1px;
box-shadow: 0 0 8px rgba(201,218,43,0.4);
```

### Barra peak (`.vu-meter-peak`)

```css
background: #FF3131;
box-shadow: 0 0 10px rgba(255,49,49,0.6);
```

### Barra activa con gradiente (`.vu-bar-active`)

```css
background: linear-gradient(to top, var(--color-primary), var(--color-ritma-red));
```

---

## 18. Mixins Pug (Componentes reutilizables)

Definidos en `views/components/mixins/`:

### Formularios

| Mixin | Descripción |
|---|---|
| `+ritmaInput(id, name, type, label, required, placeholder, icon)` | Input estándar con ícono derecho |
| `+ritmaInputPrefix(id, name, type, label, prefix, required, placeholder)` | Input con prefijo izquierdo |
| `+customSelect(id, name, label, activeOption, options)` | Dropdown personalizado |
| `+formField(id, name, type, label, required, placeholder, vuPattern)` | Input con barras VU meter |
| `+ritmaSwitch(id, name, label, checked)` | Toggle switch |

### Botones

| Mixin | Descripción |
|---|---|
| `+btnSubmit(id, name, label, icon)` | Botón submit principal (verde/primary) |
| `+btnSubmitMini(id, name, label, icon)` | Botón submit compacto |
| `+formActions(primaryLabel, secondaryHref)` | Grupo de acciones de form |

### Upload

| Mixin | Descripción |
|---|---|
| `+fileUpload(id, name, required, title, subtitle, acceptTypes)` | Zona de upload grande |
| `+fileUploadMini(id, name, required, subtitle, acceptTypes)` | Zona de upload compacta |

### Layout

| Mixin | Descripción |
|---|---|
| `+ritmaCard(title, subtitle)` | Tarjeta contenedora con glass-card |
| `+ritmaGrid(cols, gap)` | Grid responsive wrapper |

### Alertas

| Mixin | Descripción |
|---|---|
| `+alertSuccess(title, message)` | Notificación verde con barra auto-close |
| `+alertError(title, message)` | Notificación roja con animación shake |
| `+alertWarning(title, message)` | Notificación amarilla/naranja |

### Logs

| Mixin | Descripción |
|---|---|
| `+systemLog(type, message)` | Entrada de log con timestamp |

---

## 19. Gradientes de texto

### Lightning gradient (efecto gradiente en texto)

```css
background: linear-gradient(135deg, var(--color-ritma-orange) 0%, var(--color-ritma-purple) 100%);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
```

---

## 20. Estado de carga de archivos

### Archivo cargado exitosamente (`.archivo-cargado`)

```css
border-color: #00ff88;
background: rgba(0,255,136,0.05);
box-shadow: 0 0 15px rgba(0,255,136,0.1);
/* Todo el texto e íconos internos → color: #00ff88 */
```

---

## 21. Progress Circle (SVG)

Usado en cards de usuarios/consumidores:

```html
<svg viewBox="0 0 36 36">
  <!-- Track -->
  <circle cx="18" cy="18" r="15.9" fill="none"
    stroke="rgba(255,255,255,0.05)" stroke-width="3"/>
  <!-- Progress -->
  <circle cx="18" cy="18" r="15.9" fill="none"
    stroke="#C9DA2B" stroke-width="3"
    stroke-dasharray="75, 100" stroke-linecap="round"
    transform="rotate(-90 18 18)"/>
  <!-- Valor central -->
  <text x="18" y="20.5" text-anchor="middle"
    class="text-[10px] font-black fill-white">75%</text>
</svg>
```

---

## 22. Resumen rápido para agentes

Si estás construyendo una nueva pantalla para RITMA:

1. **Fondo**: Ya heredado del body (`radial-gradient` púrpura-oscuro → negro)
2. **Contenedor**: Usa `glass-card rounded-3xl p-8 border border-white/10`
3. **Títulos**: `font-display font-extrabold text-2xl uppercase tracking-tighter text-white`
4. **Labels**: `text-[10px] font-bold uppercase tracking-widest text-white/40`
5. **Inputs**: Aplica clase `.ritma-input-field` o usa el mixin `+ritmaInput()`
6. **Botón principal**: `bg-primary text-black font-bold uppercase tracking-wider rounded py-3 px-6`
7. **Tablas**: `bg-white/5` en header, `divide-y divide-white/5` en body, texto `text-white/40` en headers
8. **Cards internas**: `bg-white/3 border border-white/5 rounded-xl p-4`
9. **Hover**: Siempre `transition-all duration-300`, bordes cambian a `border-primary/20`
10. **Glows**: Cualquier estado activo o especial lleva `box-shadow` con `rgba(201,218,43,X)`
11. **Íconos**: Siempre `Material Symbols Outlined`, tamaño `text-lg` o `text-xl`
12. **Stats**: Número grande + label arriba + trend abajo, todo dentro de `.stats-crystal.glass-card`
13. **Alertas/Confirmaciones**: SweetAlert2 con `background: '#0a0a0c'`, `color: '#fff'`
14. **Color primario en TODAS partes**: `#C9DA2B` — es el ADN visual de RITMA
