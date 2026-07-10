# Sudoku PWA

Sudoku en español, sin publicidad, instalable en iPhone como app nativa.

> 🔗 **Demo en vivo:** [https://tecladooscuro.github.io/sudoku/](https://tecladooscuro.github.io/sudoku/)
> 📦 **Repo:** [https://github.com/TecladoOscuro/sudoku](https://github.com/TecladoOscuro/sudoku)

---

## ¿Qué es?

Una **PWA** (Progressive Web App) de Sudoku que se ve y se siente como una app nativa, funciona **offline**, y se puede añadir a la pantalla de inicio del iPhone desde Safari con un toque. Cero anuncios, cero trackers, cero cuentas.

Inspirada en la UI de [sudoku.com](https://sudoku.com) pero con la publicidad eliminada y todo el código abierto.

---

## Características

- 🎮 **4 niveles de dificultad:** Fácil, Medio, Difícil, Extremo.
- 🧠 **Generación algorítmica:** cada partida es única; nada de puzzles pre-guardados.
- 💾 **Guardado automático:** la partida en curso se persiste en `localStorage` y se restaura al volver.
- ⏱️ **Cronómetro con pausa.**
- 📝 **Modo notas** (candidates).
- ↶ **Deshacer.**
- 💡 **Pistas lógicas:** candidato único, número oculto único y revelador.
- 👁 **Botón Solución:** muestra la grid completa y permite rellenar la partida para finalizarla.
- ❌ **Detección de errores:** máximo 3 errores (como sudoku.com) → game over.
- 🎯 **Resaltado** de fila/columna/3×3 y de números iguales al seleccionado.
- 🟥 **Detección de conflictos** en tiempo real.
- 🌗 **Modo claro / oscuro** automático según el sistema.
- 📱 **Mobile-first:** touch targets ≥44px, safe-area-insets, viewport-fit=cover.
- 📲 **Instalable en iPhone** vía Safari → Compartir → "Añadir a pantalla de inicio".
- 🔌 **Funciona offline** (Service Worker con cache-first).

---

## Cómo instalar en iPhone

1. Abre [https://tecladooscuro.github.io/sudoku/](https://tecladooscuro.github.io/sudoku/) en **Safari**.
2. Pulsa el botón de **Compartir** (cuadrado con flecha hacia arriba).
3. Selecciona **"Añadir a pantalla de inicio"**.
4. Confirma el nombre "Sudoku" y pulsa Añadir.

La app aparecerá en tu pantalla de inicio con el icono azul con un "9" y se abrirá en pantalla completa, sin barra de Safari.

> **Nota iOS:** en Android la app puede aparecer el diálogo nativo "Añadir a pantalla de inicio". En iOS, la instalación es manual desde Safari (limitación del sistema).

---

## Algoritmo de generación

El núcleo del proyecto. Genera puzzles con **solución única garantizada** y dificultad calibrada por número de pistas y simetría.

### Pipeline

1. **Generar grid completamente resuelta.**
   - Rellenar las 3 cajas diagonales (3×3) con `shuffle([1..9])` cada una — son independientes entre sí, no hay restricciones cruzadas.
   - Resolver el resto con **backtracking con selección aleatoria de candidatos** → produce una grid resuelta distinta en cada llamada.

2. **Eliminar celdas con verificación de unicidad.**
   - Recorrer las celdas en orden aleatorio (o en pares de simetría 180° según dificultad).
   - Por cada celda (o par), vaciarla temporalmente.
   - Ejecutar el solver con `countSolutions(grid, 2)` (corte temprano al encontrar 2 soluciones).
   - Si hay exactamente 1 solución, mantener vacía. Si hay 2+, revertir.

3. **Parar al alcanzar el objetivo de pistas** del nivel o cuando se agote el tiempo.

### Parámetros por nivel

| Nivel    | Pistas | Simetría 180° | Tiempo máx. |
|----------|-------:|:-------------:|------------:|
| Fácil    |     42 |      sí       |    3 s      |
| Medio    |     33 |      sí       |    3 s      |
| Difícil  |     28 |      sí       |    4 s      |
| Extremo  |     23 |      libre    |    6 s      |

El solver cuenta soluciones con **early-exit a 2**, así que verificar unicidad en un puzzle de 28 pistas tarda pocos ms. Solo en el nivel Extremo el `countSolutions` con grids muy vacías puede tardar más; por eso el timeout de 6 s.

### Notas sobre la simetría

Los puzzles de Fácil, Medio y Difícil tienen **simetría rotacional 180°** (las pistas se distribuyen simétricamente respecto al centro), igual que los puzzles clásicos de Nikoli. Esto se logra procesando las celdas **en pares** (cada celda con su opuesta 180°): cuando se vacía un par, ambas celdas se vacían a la vez; si la verificación de unicidad falla, ambas se revierten a la vez — la simetría nunca se rompe. La celda central `(4,4)` es su propia opuesta, por lo que se procesa como singleton.

El nivel Extremo abandona la simetría para acercarse al mínimo teórico de pistas (17) sin restricciones estéticas.

---

## Estructura del proyecto

```
sudoku-pwa/
├── index.html                 # Estructura HTML, meta tags PWA/iOS
├── manifest.json              # Manifiesto PWA
├── sw.js                      # Service Worker (offline cache-first)
├── css/
│   └── styles.css             # Estilos mobile-first + dark mode
├── js/
│   ├── app.js                 # Router de vistas
│   ├── storage.js             # Wrapper de localStorage
│   ├── sudoku/
│   │   ├── solver.js          # Backtracking con bitmasks + countSolutions
│   │   ├── generator.js       # Generación de puzzles por dificultad
│   │   └── hints.js           # Técnicas lógicas (candidato único, hidden single)
│   └── ui/
│       ├── home.js            # Pantalla inicio
│       ├── difficulty.js      # Selector de dificultad
│       ├── keypad.js          # Teclado numérico
│       └── game.js            # Vista de partida completa
├── icons/
│   ├── icon-192.png           # Icono PWA 192×192
│   ├── icon-512.png           # Icono PWA 512×512
│   └── apple-touch-icon.png   # Icono iOS 180×180
├── scripts/
│   └── generate-icons.py      # Regenera los iconos PNG desde cero
└── README.md
```

---

## Despliegue

La app es **100% estática**: no hay build, no hay dependencias npm, no hay backend. Despliega como cualquier sitio estático.

### GitHub Pages (recomendado)

1. Sube el repo a GitHub.
2. Settings → Pages.
3. Source: **Deploy from a branch** → `main` → `/` (root).
4. La app quedará disponible en `https://<usuario>.github.io/sudoku/`.

El `manifest.json` usa `start_url: "./"` y el SW usa rutas **relativas** (`./css/styles.css`, etc.), por lo que funciona correctamente bajo el subpath `/sudoku/`.

### Otros hostings

Funciona en Netlify, Vercel, Cloudflare Pages, GitLab Pages o cualquier servidor estático. Solo sube el contenido de la carpeta.

> ⚠️ **Requisito PWA:** el sitio debe servirse por **HTTPS** (o `localhost`) para que la PWA sea instalable.

---

## Desarrollo local

No requiere build. Simplemente:

```bash
# Clonar
git clone https://github.com/TecladoOscuro/sudoku.git
cd sudoku

# Servir con cualquier servidor estático
python3 -m http.server 8000
# o
npx serve .
```

Abre `http://localhost:8000` en el navegador.

> iOS requiere HTTPS (o `localhost`) para permitir instalación. En local puedes usar `localhost:8000` y probar la PWA completa.

---

## Tests manuales

Se incluyen **3 rondas de QA independientes** ejecutadas durante el desarrollo, cubriendo:

- Generación correcta de puzzles en los 4 niveles (solución única, simetría 180°).
- Validación de jugadas (detección de conflictos).
- Cálculo de candidatos y pistas lógicas.
- Persistencia en `localStorage` (continuar partida al recargar).
- Flujo completo: home → dificultad → juego → pausa → error → game over → win.

Ver `scripts/qa-*.mjs` (no incluidos en el repo final, ejecutados en desarrollo).

---

## Licencia

MIT. Úsalo, modifícalo, haz fork. Sin atribución obligatoria.

---

## Créditos

- Algoritmo de generación de sudoku: técnica clásica de **backtracking + eliminación con verificación de unicidad** (referencias: [101computing.net](https://www.101computing.net/sudoku-generator-algorithm/), [trekhleb/javascript-algorithms](https://github.com/trekhleb/javascript-algorithms)).
- UI inspirada en [sudoku.com](https://sudoku.com).
- PWA: guía de [MDN — Making PWAs installable](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable).
