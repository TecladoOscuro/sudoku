// Vista de inicio: muestra botón "Continuar partida" si hay una guardada, o solo "Nueva partida".

(function () {
  'use strict';

  function renderPreview(game) {
    const preview = document.createElement('div');
    preview.className = 'preview-grid';
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const cell = document.createElement('div');
        cell.className = 'preview-cell';
        const v = game.currentBoard ? game.currentBoard[r][c] : game.puzzle[r][c];
        cell.textContent = v ? String(v) : '';
        preview.appendChild(cell);
      }
    }
    return preview;
  }

  function render(root, params) {
    root.innerHTML = '';

    const screen = document.createElement('div');
    screen.className = 'screen screen-home';

    const header = document.createElement('div');
    header.className = 'home-header';
    const logo = document.createElement('div');
    logo.className = 'logo';
    logo.textContent = 'Sudoku';
    const subtitle = document.createElement('div');
    subtitle.className = 'subtitle';
    subtitle.textContent = 'Sin publicidad';
    header.appendChild(logo);
    header.appendChild(subtitle);
    screen.appendChild(header);

    if (params.hasSavedGame && params.savedGame) {
      const g = params.savedGame;
      const card = document.createElement('div');
      card.className = 'continue-card';

      const title = document.createElement('div');
      title.className = 'continue-title';
      title.textContent = 'Continuar partida';
      card.appendChild(title);

      const meta = document.createElement('div');
      meta.className = 'continue-meta';
      const diff = document.createElement('span');
      diff.className = `badge diff-${g.difficulty}`;
      diff.textContent = SudokuGenerator.difficultyLabel(g.difficulty);
      const time = document.createElement('span');
      time.className = 'meta-time';
      time.textContent = SudokuStorage.formatTime(g.elapsedMs || 0);
      meta.appendChild(diff);
      meta.appendChild(time);
      card.appendChild(meta);

      card.appendChild(renderPreview(g));

      const btn = document.createElement('button');
      btn.className = 'btn btn-primary btn-large';
      btn.textContent = 'Continuar';
      btn.addEventListener('click', () => {
        window.__sudokuNavigate('game');
      });
      card.appendChild(btn);

      screen.appendChild(card);
    }

    const newBtn = document.createElement('button');
    newBtn.className = 'btn btn-primary btn-large btn-block';
    newBtn.textContent = params.hasSavedGame ? 'Nueva partida' : 'Nueva partida';
    newBtn.addEventListener('click', () => {
      if (typeof window.__sudokuNavigate === 'function') {
        window.__sudokuNavigate('difficulty');
      }
    });
    screen.appendChild(newBtn);

    if (params.hasSavedGame) {
      const discard = document.createElement('button');
      discard.className = 'btn btn-text';
      discard.textContent = 'Descartar partida actual';
      discard.addEventListener('click', () => {
        if (confirm('¿Descartar la partida actual? No se puede recuperar.')) {
          SudokuStorage.clear();
          if (typeof window.__sudokuNavigate === 'function') {
            window.__sudokuNavigate('home', { hasSavedGame: false });
          }
        }
      });
      screen.appendChild(discard);
    }

    root.appendChild(screen);
  }

  window.SudokuUIHome = { render };
})();
