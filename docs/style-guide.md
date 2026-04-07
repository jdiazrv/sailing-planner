# Sailing Planner — Guía de estilos

> Referencia completa del sistema de diseño. Última actualización: 2026-04-07.

---

## Índice

1. [Principios](#1-principios)
2. [Sistema de temas](#2-sistema-de-temas)
3. [Tokens de color](#3-tokens-de-color)
4. [Tipografía](#4-tipografía)
5. [Espaciado](#5-espaciado)
6. [Bordes y radios](#6-bordes-y-radios)
7. [Sombras y efectos](#7-sombras-y-efectos)
8. [Componentes — Botones](#8-componentes--botones)
9. [Componentes — Formularios](#9-componentes--formularios)
10. [Componentes — Cards y paneles](#10-componentes--cards-y-paneles)
11. [Componentes — Badges y pills de estado](#11-componentes--badges-y-pills-de-estado)
12. [Componentes — Tablas y filas de datos](#12-componentes--tablas-y-filas-de-datos)
13. [Componentes — Modales y diálogos](#13-componentes--modales-y-diálogos)
14. [Componentes — Timeline](#14-componentes--timeline)
15. [Componentes — Controles segmentados](#15-componentes--controles-segmentados)
16. [Navegación — Sidebar](#16-navegación--sidebar)
17. [Layouts](#17-layouts)
18. [Animaciones y transiciones](#18-animaciones-y-transiciones)
19. [Breakpoints responsivos](#19-breakpoints-responsivos)
20. [Iconos](#20-iconos)
21. [Marca](#21-marca)
22. [Accesibilidad](#22-accesibilidad)

---

## 1. Principios

**CSS puro, sin framework de componentes.** No se usa shadcn/ui, Radix, ni ninguna librería de componentes. Todo es CSS custom properties + clases semánticas sobre HTML nativo.

**El tema es el sistema.** El color no es una variable aislada — es una red de tokens relacionados. Nunca usar valores de color hardcodeados; siempre `var(--token)`.

**Componentes por clase, no por estilo inline.** Los estilos inline solo se usan para overrides puntuales justificados (p.ej. `left: 37%` en barras de timeline que se calculan con datos dinámicos).

**Diseño náutico, profesional y contenido.** El espacio es apretado pero no claustrofóbico. La jerarquía visual se construye con tipografía y fondo, no con decoración.

---

## 2. Sistema de temas

La app tiene **5 temas** aplicados mediante el atributo `data-theme` en `<html>`. Dos oscuros, tres claros.

| ID | Nombre | Modo | Acento | Uso |
|---|---|---|---|---|
| *(default)* | **Madrugada** | Oscuro | `#00b4d8` cyan | Tema por defecto |
| `jade` | **Jade** | Oscuro | `#00d4aa` esmeralda | Oscuro alternativo |
| `abismo` | **Abismo** | Claro | `#0057ff` azul eléctrico | Claro SaaS |
| `poniente` | **Poniente** | Claro | `#e8571a` coral | Claro cálido |
| `bruma` | **Bruma** | Claro | `#6366f1` índigo | Claro suave |

Los temas oscuros solo sobreescriben los tokens de acento y el fondo de body. Los temas claros redefinen completamente todas las variables de superficie, tinta, estado y sombra.

La selección se persiste en `localStorage` y se aplica antes de que React hidrate (en el script de `layout.tsx`) para evitar FOUC.

---

## 3. Tokens de color

### 3.1 Superficies

```css
--background          /* Fondo de página */
--surface             /* Superficie primaria — cards, paneles */
--surface-raised      /* Superficie elevada — filas, inputs */
--surface-strong      /* Superficie sólida — modales, tooltips */
--surface-overlay     /* Tinte de overlay sutil */
```

**Valores en Madrugada (oscuro por defecto):**

```css
--background:      #0e1520
--surface:         rgba(20, 30, 46, 0.92)
--surface-raised:  rgba(25, 38, 58, 0.80)
--surface-strong:  #131e2f
--surface-overlay: rgba(255, 255, 255, 0.04)
```

### 3.2 Bordes

```css
--border          /* Borde estándar */
--border-subtle   /* Borde muy tenue — separadores internos */
--border-strong   /* Borde prominente — énfasis */
```

**Madrugada:**

```css
--border:        rgba(255, 255, 255, 0.08)
--border-subtle: rgba(255, 255, 255, 0.04)
--border-strong: rgba(255, 255, 255, 0.14)
```

### 3.3 Tinta (texto)

```css
--ink         /* Texto primario */
--ink-medium  /* Texto secundario — metadata, fechas */
--ink-soft    /* Texto terciario — labels, hints */
--ink-dim     /* Texto casi invisible — separadores textuales */
--ink-faint   /* Apenas perceptible */
--muted       /* Muted color fijo — no depende de opacidad */
```

**Madrugada:**

```css
--ink:        #e2e8f0
--ink-medium: rgba(226, 232, 240, 0.52)
--ink-soft:   rgba(226, 232, 240, 0.38)
--ink-dim:    rgba(226, 232, 240, 0.10)
--ink-faint:  rgba(226, 232, 240, 0.05)
--muted:      #8a9ab0
```

### 3.4 Acento

El acento es el color de identidad del tema. Todos sus derivados se calculan a partir de él.

```css
--accent           /* Color de acción principal */
--accent-strong    /* Versión más brillante — brand, wordmark */
--accent-soft      /* Fondo tenue acento — 14% opacidad */
--accent-border    /* Borde acento — 32% opacidad */
--accent-glow      /* Brillo sutil — 8% opacidad */
--accent-selected  /* Estado seleccionado — 16% opacidad */
--accent-zone-border /* Borde de zona activa — 55% */
--on-accent        /* Texto sobre fondo de acento */
```

### 3.5 Feedback

```css
--error:              #f87171   /* Rojo (oscuro) / #dc2626 (claro) */
--success:            #34d399   /* Verde (oscuro) / #16a34a (claro) */
--feedback-error-bg:  rgba(error, 0.12)
--feedback-ok-bg:     rgba(success, 0.12)
```

### 3.6 Estado de visitas/etapas

```css
--status-ok-bg / --status-ok-text           /* Confirmado — verde */
--status-plan-bg / --status-plan-text        /* Planificado — acento */
--status-tentative-bg / --status-tentative-text  /* Tentativo — ámbar */
--status-cancel-bg / --status-cancel-text    /* Cancelado — gris */
--status-readonly-bg / --status-readonly-text / --status-readonly-border  /* Solo lectura — ámbar */
```

### 3.7 Especiales

```css
--map-canvas-from / --map-canvas-to  /* Gradiente de fondo del mapa */
--color-visit                        /* Color de marcadores de visita */
--color-trip-alt                     /* Color alternativo de tramo */
--code-bg / --code-text / --code-border  /* Campos de código (invite) */
--tooltip-bg / --tooltip-text        /* Tooltips */
--row-hover-bg / --row-hover-border  /* Hover en filas */
--modal-overlay                      /* Backdrop de modales */
--tour-overlay / --tour-ring / --tour-popover  /* Tour onboarding */
```

---

## 4. Tipografía

### 4.1 Familias

```css
--font-display: "Cinzel", "Trajan Pro", serif     /* Headings, brand */
--font-body:    "Avenir Next", "Segoe UI", "Helvetica Neue", sans-serif
--font-ui:      var(--font-body)
```

`Cinzel` se carga desde Google Fonts (weight 600). Se usa exclusivamente para el wordmark, títulos de hero y H1 de páginas de presentación.

`font-body` se usa para todo el resto — UI, labels, body text, datos.

### 4.2 Escala tipográfica

| Uso | Tamaño | Peso | Letter-spacing | Line-height |
|---|---|---|---|---|
| Hero H1 | `clamp(2rem, 5vw, 4.2rem)` | 600 display | `-0.06em` | `0.95` |
| H2 / título de sección | `clamp(0.95rem, 2vw, 1.3rem)` | 600 | `0` | `1.1` |
| H3 / subtítulo de card | `1rem – 1.05rem` | 600 | `0` | `1.2` |
| Body principal | `0.88rem – 0.92rem` | 400–500 | `0` | `1.55–1.65` |
| Body compacto | `0.85rem` | 500 | `0` | `1.4` |
| Metadata / fechas | `0.8rem – 0.82rem` | 400–500 | `0` | `1.3` |
| Label uppercase | `0.72rem – 0.75rem` | 600–700 | `0.06em–0.08em` | `1` |
| Micro label | `0.62rem – 0.68rem` | 700 | `0.1em` | `1` |
| Wordmark | `18px` (sidebar) / `14px` (sm) | 600 Cinzel | `0.12em` | `1` |

### 4.3 Convenciones

- Los labels de categoría y eyebrow van en **uppercase** con `letter-spacing: 0.06em–0.1em`.
- Las cifras métricas (NM, días, visitantes) van en la fuente body a tamaño grande con peso 600.
- No hay `h4`, `h5`, `h6` en el sistema — la jerarquía adicional se resuelve con tamaño + color (ink-soft).
- `font-variant-numeric: tabular-nums` en relojes y cifras alineadas.

---

## 5. Espaciado

El sistema no usa una escala fija de tokens (no hay `--space-4`, `--space-8`…). El espaciado se define directamente en cada componente con valores en `rem` múltiplos de `0.25rem`.

### Referencia práctica

| Contexto | Valor |
|---|---|
| Gap entre elementos inline pequeños | `0.3rem – 0.4rem` |
| Padding de pill / badge | `0.18rem 0.55rem` – `0.25rem 0.6rem` |
| Padding de botón | `0 0.85rem – 0 1rem` |
| Padding interno de fila de datos | `0.26rem 0.4rem` – `0.4rem 0.65rem` |
| Padding de card / panel | `0.65rem 0.75rem` – `1.15rem 1.25rem` |
| Gap entre cards en grid | `1rem` |
| Gap entre secciones de página | `1.25rem – 1.5rem` |
| Padding de página (shell) | `clamp(1.25rem, 3vw, 2rem)` |
| Altura de botón estándar | `var(--button-height)` = `2.5rem` |
| Altura de botón pequeño | `2.15rem` |

---

## 6. Bordes y radios

### Border-radius por componente

| Componente | Valor |
|---|---|
| Body / page-level | `18px – 24px` |
| Card / panel | `18px` |
| Auth card | `24px` |
| Modal inner | `18px` |
| Input, select | `12px` |
| Botón estándar | `12px` |
| Botón pequeño / row action | `8px` |
| Badge / pill | `999px` (completamente redondo) |
| Icon button | `999px` |
| Timeline bar | `0` (rectangular — es una barra de Gantt) |
| Timeline visit badge | `0.45rem` |
| Marcador de mapa | `999px` |
| Fila de datos | `12px` |
| Lista item | `12px` |

---

## 7. Sombras y efectos

```css
--shadow:        0 20px 50px rgba(0, 0, 0, 0.30)   /* Estándar */
--shadow-strong: 0 24px 60px rgba(0, 0, 0, 0.40)   /* Modales, auth card */
```

En temas claros las sombras usan el color de tinta de ese tema al 10–18% de opacidad.

**Backdrop blur:** `backdrop-filter: blur(18px)` en surfaces. `blur(3px)` en el backdrop de modales.

**Focus ring en inputs:**
```css
box-shadow: 0 0 0 3px var(--accent-soft);
border-color: var(--accent-border);
```

**Hover glow en botones:**
```css
box-shadow: 0 0 0 1px var(--accent-border);
```

**Borde de acento en fila seleccionada:**
```css
box-shadow: inset 3px 0 0 var(--accent);
```

---

## 8. Componentes — Botones

### Clases disponibles

```
.primary-button        Acción principal
.secondary-button      Acción secundaria
.secondary-button--small  Secundario compacto
.link-button           Acción terciaria (texto)
.link-button--danger   Destructiva (texto rojo)
.google-button         OAuth Google
.icon-button           Botón de icono circular
```

### Especificaciones

**`.primary-button`**
```css
height: var(--button-height);   /* 2.5rem */
padding: 0 1rem;
border-radius: 12px;
background: linear-gradient(135deg, var(--accent), var(--accent-strong));
color: var(--on-accent);
font-size: 0.85rem;
font-weight: 500;
transition: box-shadow 120ms ease;

&:hover  { box-shadow: 0 0 0 1px var(--accent-border); }
&:active { opacity: 0.9; }
&:disabled { opacity: 0.45; cursor: not-allowed; }
```

**`.secondary-button`**
```css
height: var(--button-height);
padding: 0 1rem;
border-radius: 12px;
background: var(--surface-raised);
border: 1px solid var(--border);
color: var(--ink);
font-size: 0.85rem;
font-weight: 500;

&:hover { box-shadow: 0 0 0 1px var(--accent-border); }
```

**`.secondary-button--small`**
```css
height: 2.15rem;
padding: 0 0.85rem;
font-size: 0.8rem;
```

**`.link-button`**
```css
background: transparent;
border: none;
color: var(--ink-medium);
font-size: 0.82rem;
padding: 0.3rem 0;

&:hover { color: var(--ink); }
```

**`.icon-button`**
```css
width: 2rem;
height: 2rem;
border-radius: 999px;
background: var(--surface-raised);
border: 1px solid var(--border);
display: grid;
place-items: center;
transition: transform 120ms, background 120ms;

&:hover { transform: translateY(-1px); background: var(--surface-strong); }
```

**`.google-button`** — Colores fijos (no temados):
```css
background: #ffffff;
color: #3c4043;
border: 1px solid #dadce0;
/* En hover: border-color: #c6c6c6 */
```

### Reglas de uso

- Un único `.primary-button` por sección de formulario o modal.
- Las acciones destructivas van como `.link-button--danger`, nunca como primary.
- Los botones de icon-only llevan siempre `aria-label`.
- En móvil, los botones de formulario ocupan ancho completo.

---

## 9. Componentes — Formularios

### Field estándar

```css
.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.field span {  /* label */
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--ink-soft);
  letter-spacing: 0.04em;
}

.field input,
.field select,
.field textarea {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-raised);
  color: var(--ink);
  padding: 0.65rem 0.85rem;
  font-size: 0.88rem;
  transition: border-color 120ms, box-shadow 120ms;
}

.field input:focus {
  border-color: var(--accent-border);
  box-shadow: 0 0 0 3px var(--accent-soft);
  outline: none;
}
```

### Feedback de formulario

```css
.feedback--error {
  color: var(--error);
  background: var(--feedback-error-bg);
  border-radius: 10px;
  padding: 0.55rem 0.75rem;
  font-size: 0.83rem;
}

.feedback--success {
  color: var(--success);
  background: var(--feedback-ok-bg);
  border-radius: 10px;
  padding: 0.55rem 0.75rem;
  font-size: 0.83rem;
}
```

### Password input

Wrapper con posición relativa. Toggle de visibilidad como botón absoluto a la derecha (`right: 0.65rem`), color `var(--muted)`, sin borde ni fondo.

### Inline actions (grupo de botones bajo formulario)

```css
.inline-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
```

---

## 10. Componentes — Cards y paneles

### Variantes

```
.panel            Panel de contenido general
.auth-card        Formulario de autenticación
.dashboard-card   Tarjeta del dashboard
.boat-card        Tarjeta compacta de barco en lista
.feature-card     Card de feature en landing
```

### Base común

```css
border: 1px solid var(--border);
border-radius: 18px;
background: var(--surface);
backdrop-filter: blur(18px);
box-shadow: var(--shadow);
```

### Especificaciones por variante

**`.panel`** — padding `1rem – 1.25rem`

**`.auth-card`**
```css
width: min(480px, 100%);
padding: 1.75rem;
border-radius: 24px;
background: var(--auth-card-bg);
border-color: var(--auth-card-border);
box-shadow: var(--shadow-strong);
```

**`.boat-card`**
```css
padding: 0.65rem 0.75rem;
border-radius: 16px;
background: var(--surface-raised);
```

### Estructura interna de panel

```html
<article class="panel">
  <p class="eyebrow">Categoría</p>
  <h3>Título</h3>
  <p class="lead">Cuerpo principal...</p>
</article>
```

`.eyebrow` — uppercase, `0.72rem`, `--ink-soft`, `letter-spacing: 0.1em`
`.lead` — `0.88rem`, line-height `1.55`

---

## 11. Componentes — Badges y pills de estado

### Badge de acento

```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.04em;
}
```

### Status pill

```css
.status-pill {
  padding: 0.18rem 0.55rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
```

Modificadores de estado (añadir al elemento):

| Clase | Token bg | Token text | Color base | Usado en |
|---|---|---|---|---|
| `.is-confirmed` | `--status-ok-bg` | `--status-ok-text` | Verde | Visitas confirmadas, disponibilidad ocupada |
| `.is-planned` | `--status-plan-bg` | `--status-plan-text` | Cyan/azul (varía por tema) | Escalas de viaje planificadas |
| `.is-tentative` | `--status-tentative-bg` | `--status-tentative-text` | Amarillo | Visitas tentativas, disponibilidad tentativa |
| `.is-cancelled` / `.is-muted` | `--status-cancel-bg` | `--status-cancel-text` | Gris | Cancelados, indefinidos |
| `.is-blocked` | patrón rayado diagonal | `--status-cancel-text` | Gris rayado | Períodos bloqueados |
| `.is-available` | `--status-plan-bg` | `--status-plan-text` | Cyan/azul | Disponibilidad libre en el timeline |
| `.is-occupied` | `--status-ok-bg` | `--status-ok-text` | Verde | Disponibilidad ocupada por visita confirmada |
| `.is-undefined` | superficie + tono cancel | muted | Gris claro, borde punteado | Sin definir, fuera de temporada |
| `.is-readonly` | `--status-readonly-bg` | `--status-readonly-text` | Amarillo suave | Contexto de solo lectura |

### Coherencia de colores en toda la app

Los mismos tokens de estado se aplican de forma consistente en:
- `status-pill` (etiqueta de estado en tablas y cards)
- `timeline-bar` (barras en el timeline de Gantt)
- `visit-badge` (avatar de visitante con borde de estado)
- `route-summary__visit-badge` (en resumen de ruta)

**Regla:** nunca añadir un color de estado ad-hoc. Siempre usar las clases `.is-{estado}` sobre el elemento que ya tiene los estilos base (`status-pill`, `timeline-bar`, etc.).

### Mapa de estados por contexto

| Estado | Escalas de viaje | Visitas | Disponibilidad (timeline) |
|---|---|---|---|
| Confirmado / Ocupado | `.is-confirmed` (verde) | `.is-confirmed` (verde) | `.is-occupied` (verde) |
| Planificado / Disponible | `.is-planned` (cyan) | `.is-planned` (cyan) | `.is-available` (cyan) |
| Tentativo | `.is-tentative` (amarillo) | `.is-tentative` (amarillo) | `.is-tentative` (amarillo) |
| Bloqueado | — | `.is-blocked` (rayado gris) | `.is-blocked` (rayado gris) |
| Sin definir | `.is-undefined` (gris) | `.is-cancelled` (gris) | `.is-undefined` (gris punteado) |

### Visit chip (en listas de presencia)

```css
.visit-chip {
  padding: 5px 8px;
  border-radius: 999px;
  background: rgba(23, 48, 66, 0.06);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
```

---

## 12. Componentes — Tablas y filas de datos

### Data sheet

```css
.data-sheet {
  display: grid;
  gap: 0.4rem;
}
```

### Data row

```css
.data-row {
  display: grid;   /* columnas definidas por el contexto */
  padding: 0.26rem 0.4rem;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--surface-raised);
  font-size: 0.79rem;
  cursor: pointer;
  transition: transform 120ms, background 120ms, border-color 120ms, box-shadow 120ms;
}

.data-row:hover {
  transform: translateY(-1px);
  background: var(--row-hover-bg);
  border-color: var(--row-hover-border);
  box-shadow: var(--shadow);
}

.data-row.is-selected {
  border-color: var(--accent);
  background: /* mezcla surface-raised + accent-soft */;
  box-shadow: inset 3px 0 0 var(--accent);
}
```

### Columnas típicas de una fila

- Nombre (mayor peso visual, `font-weight: 600`)
- Metadata secundaria en `--ink-soft`
- Fechas en `0.78rem`, `--ink-medium`
- Acción (icon button) alineada a la derecha

---

## 13. Componentes — Modales y diálogos

Se usa `<dialog>` nativo con la API `.showModal()`.

### Estructura

```html
<dialog class="modal">
  <div class="modal__inner">
    <header class="modal__header">
      <h2>Título</h2>
      <button class="modal__close icon-button" aria-label="Cerrar">×</button>
    </header>
    <div class="modal__body">
      <!-- contenido scrollable -->
    </div>
    <footer class="modal__footer">
      <button class="secondary-button">Cancelar</button>
      <button class="primary-button">Confirmar</button>
    </footer>
  </div>
</dialog>
```

### Especificaciones

```css
.modal {
  position: fixed;
  inset: 0;
  background: transparent;
  border: none;
  padding: 0;
  overflow: hidden;
}

.modal::backdrop {
  background: var(--modal-overlay);   /* rgba(0,0,0,0.60) */
  backdrop-filter: blur(3px);
}

.modal__inner {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(600px, calc(100vw - 2rem));
  max-height: calc(100vh - 3rem);
  display: flex;
  flex-direction: column;
  background: var(--surface-strong);
  border: 1px solid var(--border);
  border-radius: 18px;
  box-shadow: var(--shadow-strong);
}

.modal__inner--wide {
  width: min(860px, calc(100vw - 2rem));
}

.modal__header {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  background: var(--surface-strong);
  z-index: 1;
}

.modal__body {
  padding: 1.15rem;
  overflow-y: auto;
  flex: 1;
}

.modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0.65rem 1rem;
  border-top: 1px solid var(--border);
}
```

### Variante de confirmación destructiva

El botón de confirmación en acciones destructivas (borrar, cancelar reserva) es `.primary-button` con background `var(--error)` — nunca `.link-button--danger` como acción principal de modal.

---

## 14. Componentes — Timeline

El timeline es un diagrama de Gantt horizontal. Cada fila tiene un label y una pista de barras.

### Estructura

```html
<div class="timeline-card">
  <div class="timeline__scale">
    <!-- Encabezados de mes -->
  </div>
  <div class="timeline__lane">
    <div class="timeline__lane-label">Etapa / visita</div>
    <div class="timeline__lane-track">
      <div class="timeline-bar is-confirmed" style="left: 14%; width: 22%;"></div>
    </div>
  </div>
</div>
```

### Timeline lane

```css
.timeline__lane {
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr);
  gap: 0.6rem;
  align-items: center;
  margin-bottom: 0.18rem;
}

.timeline__lane-track {
  position: relative;
  min-height: 1.82rem;
  border: 1px dashed var(--border);
  background: var(--surface-raised);
}

.timeline__lane-track--highlight {
  border-style: solid;
}
```

### Timeline bar

```css
.timeline-bar {
  position: absolute;
  top: 2px;
  bottom: 2px;
  padding: 0 0.72rem;
  font-size: 0.76rem;
  font-weight: 600;
  border-radius: 0;                   /* rectangular — Gantt bar */
  border: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  white-space: nowrap;
  overflow: hidden;
  transition: transform 140ms, opacity 140ms, box-shadow 140ms;
  cursor: pointer;
}

.timeline-bar:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow);
  z-index: 2;
}
```

Los colores de las barras vienen de los modificadores `.is-{estado}` — ver [sección 11](#11-componentes--badges-y-pills-de-estado) para el mapa completo.

**Barras de escala de viaje** (`.timeline-bar--trip`): usan `var(--accent-soft)` / `var(--accent)` como base, sobreescritas por el estado (`.is-planned`, `.is-confirmed`, etc.).

**Barras de disponibilidad** (fila inferior): estado calculado automáticamente — `.is-available` (libre), `.is-occupied` (visita confirmada), `.is-tentative` (visita tentativa), `.is-blocked` (período bloqueado, rayado), `.is-undefined` (sin escala).

**Glifos de disponibilidad:**
| Estado | Glifo |
|---|---|
| `available` / `confirmed` | `✓` |
| `tentative` / `planned` | `?` |
| `blocked` | `✕` |
| `cancelled` / `undefined` | `!` |

### Visit badge (avatar en timeline)

```css
.timeline-visit-badge {
  width: 1.7rem;
  height: 1.7rem;
  border-radius: 0.45rem;
  overflow: hidden;
  border: 1px solid var(--border-subtle);
  object-fit: cover;
}
```

---

## 15. Componentes — Controles segmentados

```css
.segmented-control {
  display: grid;
  grid-template-columns: repeat(N, 1fr);   /* N = número de opciones */
  gap: 0.4rem;
  padding: 0.3rem;
  background: var(--surface-raised);
  border-radius: 12px;
  border: 1px solid var(--border);
}

.segmented-control button {
  padding: 0.55rem 0.85rem;
  border-radius: 8px;
  background: transparent;
  border: 1px solid transparent;
  color: var(--ink-soft);
  font-size: 0.82rem;
  font-weight: 500;
  transition: background 120ms, color 120ms, border-color 120ms;
}

.segmented-control button.is-active {
  background: var(--accent-soft);
  border-color: var(--accent-border);
  color: var(--accent);
  font-weight: 600;
}
```

---

## 16. Navegación — Sidebar

El sidebar es fijo, colapsa a `52px` y se expande a `220px` al hacer hover. En móvil se transforma en un drawer.

```css
:root {
  --sidebar-w:           220px;
  --sidebar-w-collapsed: 52px;
  --sidebar-transition:  200ms ease;
}

.app-sidebar {
  position: fixed;
  left: 0; top: 0;
  z-index: 200;
  width: var(--sidebar-w-collapsed);
  height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border-right: 1px solid var(--border-subtle);
  transition: width var(--sidebar-transition);
  overflow: hidden;
}

.app-sidebar:hover,
.app-sidebar:focus-within {
  width: var(--sidebar-w);
}
```

### Nav item

```css
.app-sidebar__item {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.45rem 0.5rem;
  border-radius: 8px;
  color: var(--ink-medium);
  font-size: 0.83rem;
  font-weight: 500;
  white-space: nowrap;
  text-decoration: none;
  transition: background 0.12s, color 0.12s;
}

.app-sidebar__item:hover {
  background: var(--surface-raised);
  color: var(--ink);
}

.app-sidebar__item.is-active {
  background: var(--accent-soft);
  color: var(--accent);
}
```

El icono del item tiene tamaño `18×18px` con `flex-shrink: 0`. El label de texto se oculta visualmente cuando el sidebar está colapsado (overflow hidden del padre).

### Tooltip de item colapsado

```css
/* Visible solo cuando sidebar está colapsado */
.app-sidebar__item::after {
  content: attr(data-label);
  position: absolute;
  left: calc(100% + 8px);
  /* estilos de tooltip */
  opacity: 0;
  pointer-events: none;
  transition: opacity 100ms;
}
```

### Offset de contenido

```css
body:has(.app-sidebar) .shell {
  margin-left: var(--sidebar-w-collapsed);
  max-width: calc(100vw - var(--sidebar-w-collapsed));
}
```

---

## 17. Layouts

### Shell (contenedor de página)

```css
.shell {
  width: min(1480px, calc(100% - 2rem));
  margin: 0 auto;
  padding: 1.2rem 1.25rem 2.5rem;
  animation: shell-fade-in 0.18s ease both;
}

.shell--guest {
  width: min(1320px, calc(100% - 2.5rem));
}
```

### Auth layout

```css
.auth-layout {
  flex: 1;
  display: grid;
  place-items: center;
  min-height: 100dvh;
  padding: 1.5rem;
}

/* Fondo especial solo en páginas de auth */
body:has(.auth-layout) {
  background: var(--auth-bg);
}
```

### Workspace grid (vista de barco)

```css
.workspace-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: minmax(0, 1.65fr) minmax(380px, 1.1fr);
}

.workspace-grid--single    { grid-template-columns: 1fr; }
.workspace-grid--visits    { grid-template-columns: minmax(0, 1.02fr) minmax(380px, 0.98fr); }
.workspace-grid--trip      { grid-template-columns: minmax(0, 1.02fr) minmax(380px, 0.98fr); }

@media (max-width: 1100px) {
  .workspace-grid--visits,
  .workspace-grid--trip   { grid-template-columns: 1fr 0.86fr; }
}

@media (max-width: 760px) {
  .workspace-grid           { grid-template-columns: 1fr; }
}
```

### Dashboard grid

```css
.dashboard-grid {
  display: grid;
  gap: 1rem;
  margin-top: 1.25rem;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

@media (min-width: 900px) {
  .dashboard-grid { grid-template-columns: 1.1fr 0.9fr; }
}
```

### Map canvas

```css
.map-canvas {
  position: relative;
  min-height: 240px;
  border-radius: 16px;
  overflow: hidden;
  background: linear-gradient(var(--map-canvas-from), var(--map-canvas-to));
  border: 1px solid var(--border);
}

.map-panel--tall .map-canvas { min-height: 420px; }
```

---

## 18. Animaciones y transiciones

### Transiciones estándar

| Elemento | Propiedad | Duración | Easing |
|---|---|---|---|
| Botones | box-shadow, background, border | 120ms | ease |
| Filas de datos | transform, background, border, shadow | 120ms | ease |
| Barras de timeline | transform, opacity, shadow, filter | 140ms | ease |
| Sidebar | width | 200ms | ease |
| Nav items | background, color | 120ms | ease |
| Modales | fade-in (opacity + translateY) | 180ms | ease |

### Keyframes definidos

```css
@keyframes shell-fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes shimmerMove {
  from { background-position: 200% 0; }
  to   { background-position: -200% 0; }
}
```

`shell-fade-in` se aplica al `.shell` en cada navegación de página.
`shimmerMove` se usa en skeleton loaders (background animado de shimmer).

### Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

---

## 19. Breakpoints responsivos

| Nombre | Valor | Cambio principal |
|---|---|---|
| Mobile | `max-width: 680px` | Layout columna única, tipografía reducida |
| Tablet | `max-width: 760px` | Workspace grid → columna única |
| Small laptop | `max-width: 900px` | Dashboard 2 cols, grid ratios |
| Medium | `max-width: 1100px` | Workspace grid ajustado |
| Desktop | `min-width: 768px` | Sidebar fijo activo |

El sidebar se convierte en drawer sobre mobile (posición absoluta, activado por toggle).

La mayoría del sizing usa `clamp()` para escalar fluidamente entre breakpoints sin saltos abruptos.

---

## 20. Iconos

Todos los iconos de navegación son SVG inline, stroke-based, sin relleno.

```
Tamaño estándar: 18×18px (sidebar)
stroke-width:    1.75
stroke-linecap:  round
stroke-linejoin: round
color:           currentColor
```

Los iconos de acción dentro de componentes (editar, borrar, etc.) siguen el mismo patrón pero pueden ser de `16×16px`.

No se usa ninguna librería de iconos externa. Todos están definidos como componentes React en `src/components/ui/icons.tsx`.

---

## 21. Marca

### Wordmark

```css
.sp-wordmark {
  font-family: var(--font-display);   /* Cinzel */
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent-strong);
  line-height: 1;
}

/* Variante pequeña (sidebar colapsado, footers) */
.sp-brand--sm .sp-wordmark {
  font-size: 14px;
  letter-spacing: 0.10em;
}
```

### Icono de marca

SVG con polígonos rellenos en `var(--accent)`, líneas con `stroke: var(--accent)` y variantes de opacidad (`0.55`, `0.38`). No alterar su geometría. Tamaños disponibles: `20`, `28`, `40`, `64`, `96px`.

### Uso del logo

- Sidebar: icono `28px` + wordmark `18px` (oculto cuando colapsado)
- Auth card: icono `40px` + wordmark como H1 (`clamp(2rem, 5vw, 4.2rem)` en Cinzel)
- Favicon: variante monocromática del icono

---

## 22. Accesibilidad

### Atributos requeridos

- Todos los `<button>` sin texto visible llevan `aria-label`
- Todos los `<input>` están asociados a un `<label>` (semántico o `aria-labelledby`)
- Los modales llevan `aria-modal="true"` y `role="dialog"`
- Los toggles de estado llevan `aria-pressed`
- Las listas de navegación llevan `role="navigation"` y `aria-label`

### Focus visible

Los elementos interactivos tienen `:focus-visible` explícito:

```css
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

Los inputs reemplazan el outline por el ring de box-shadow (ver §9).

### Contraste

Los cinco temas están validados para cumplir WCAG AA en texto principal. Los textos en `--ink-soft` sobre `--surface` son el punto más bajo (~3.5:1 en temas oscuros) — aceptable para texto de apoyo.

### HTML semántico

Se usan elementos nativos siempre que es posible:
- `<dialog>` para modales
- `<details>` / `<summary>` para acordeones
- `<button>` para acciones (nunca `<div>` clicable)
- `<nav>`, `<main>`, `<header>`, `<footer>`, `<article>`, `<section>` en layout

---

*Guía generada a partir del código fuente de `src/app/globals.css` y los componentes de `src/components/`. Actualizar cuando se modifiquen tokens o se añadan nuevos patrones de componente.*
