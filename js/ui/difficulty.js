// Vista de selección de dificultad: 4 botones grandes.

(function () {
  'use strict';

  const LEVELS = [
    { id: 'easy',    label: 'Fácil',   desc: 'Para empezar o relajarse',         color: 'green' },
    { id: 'medium',  label: 'Medio',   desc: 'Un reto equilibrado',              color: 'yellow' },
    { id: 'hard',    label: 'Difícil', desc: 'Para jugadores experimentados',    color: 'orange' },
    { id: 'extreme', label: 'Extremo', desc: 'Solo para los más valientes',      color: 'red' }
  ];

  function render(root) {
    root.innerHTML = '';

    const screen = document.createElement('div');
    screen.className = 'screen screen-difficulty';

    const header = document.createElement('div');
    header.className = 'screen-header';
    const back = document.createElement('button');
    back.className = 'btn btn-icon';
    back.setAttribute('aria-label', 'Volver');
    back.innerHTML = '&larr;';
    back.addEventListener('click', () => window.__sudokuNavigate('home'));
    const title = document.createElement('h1');
    title.className = 'screen-title';
    title.textContent = 'Nueva partida';
    header.appendChild(back);
    header.appendChild(title);
    const spacer = document.createElement('div');
    spacer.style.width = '44px';
    header.appendChild(spacer);
    screen.appendChild(header);

    const subtitle = document.createElement('p');
    subtitle.className = 'screen-subtitle';
    subtitle.textContent = 'Elige una dificultad';
    screen.appendChild(subtitle);

    const list = document.createElement('div');
    list.className = 'difficulty-list';

    for (const lvl of LEVELS) {
      const btn = document.createElement('button');
      btn.className = `difficulty-btn diff-${lvl.color}`;
      const labelEl = document.createElement('div');
      labelEl.className = 'diff-label';
      labelEl.textContent = lvl.label;
      const descEl = document.createElement('div');
      descEl.className = 'diff-desc';
      descEl.textContent = lvl.desc;
      btn.appendChild(labelEl);
      btn.appendChild(descEl);
      btn.addEventListener('click', () => startGame(lvl.id));
      list.appendChild(btn);
    }

    screen.appendChild(list);
    root.appendChild(screen);
  }

  function startGame(level) {
    const screen = document.querySelector('.screen-difficulty');
    if (!screen) return;
    screen.classList.add('loading');
    screen.innerHTML = '';
    const spinner = document.createElement('div');
    spinner.className = 'spinner';
    const msg = document.createElement('p');
    msg.className = 'loading-msg';
    msg.textContent = 'Generando partida...';
    screen.appendChild(spinner);
    screen.appendChild(msg);

    // setTimeout 0 para que la UI pinte antes del cálculo intensivo
    setTimeout(() => {
      let lastError = null;
      // Reintentar hasta 5 veces para máxima robustez
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          const { puzzle, solution } = SudokuGenerator.generateStrict(level, 3);
          const game = {
            puzzle,
            solution,
            givenCells: puzzle.map((row) => row.map((v) => v !== 0)),
            currentBoard: puzzle.map((row) => row.slice()),
            notes: Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => [])),
            difficulty: level,
            mistakes: 0,
            maxMistakes: 3,
            elapsedMs: 0,
            pausedAccum: 0,
            isPaused: false,
            completed: false,
            gameOver: false,
            history: [],
            startedAt: new Date().toISOString()
          };
          SudokuStorage.save(game);
          window.__sudokuState.currentGame = game;
          window.__sudokuNavigate('game');
          return;
        } catch (e) {
          lastError = e;
          // Continuar al siguiente intento
        }
      }
      // Si llegamos aquí, todos los intentos fallaron
      console.error('Error generando partida:', lastError);
      alert('No se pudo generar la partida. Por favor, inténtalo de nuevo.\n\nDetalle: ' + (lastError ? lastError.message : 'desconocido'));
      window.__sudokuNavigate('difficulty');
    }, 0);
  }

  window.SudokuUIDifficulty = { render };
})();
