// Vista principal de la partida: grid 9x9, header con tiempo, controles y keypad.

(function () {
  'use strict';

  let undoStack = [];
  let redoStack = [];

  function render(root, params, state, callbacks) {
    const game = state.currentGame;
    if (!game) {
      callbacks.onNavigate('home');
      return;
    }

    root.innerHTML = '';

    const screen = document.createElement('div');
    screen.className = 'screen screen-game';

    // =================== HEADER ===================
    const header = document.createElement('div');
    header.className = 'game-header';

    const backBtn = document.createElement('button');
    backBtn.className = 'btn btn-icon';
    backBtn.setAttribute('aria-label', 'Volver al inicio');
    backBtn.innerHTML = '&lsaquo;';
    backBtn.addEventListener('click', () => {
      if (confirm('¿Salir de la partida? Se guardará el progreso.')) {
        callbacks.onNavigate('home');
      }
    });
    header.appendChild(backBtn);

    const center = document.createElement('div');
    center.className = 'game-header-center';

    const diffLabel = document.createElement('div');
    diffLabel.className = 'header-difficulty';
    diffLabel.textContent = SudokuGenerator.difficultyLabel(game.difficulty);
    center.appendChild(diffLabel);

    const timer = document.createElement('div');
    timer.className = 'header-timer';
    timer.textContent = SudokuStorage.formatTime(game.elapsedMs || 0);
    center.appendChild(timer);

    header.appendChild(center);

    const pauseBtn = document.createElement('button');
    pauseBtn.className = 'btn btn-icon';
    pauseBtn.setAttribute('aria-label', 'Pausa');
    pauseBtn.innerHTML = '&#10073;&#10073;';
    pauseBtn.addEventListener('click', () => togglePause());
    header.appendChild(pauseBtn);

    screen.appendChild(header);

    // =================== STATUS BAR ===================
    const status = document.createElement('div');
    status.className = 'game-status';

    const mistakesEl = document.createElement('div');
    mistakesEl.className = 'status-item';
    const mistakesLabel = document.createElement('span');
    mistakesLabel.className = 'status-label';
    mistakesLabel.textContent = 'Errores';
    const mistakesDots = document.createElement('span');
    mistakesDots.className = 'status-dots';
    for (let i = 0; i < game.maxMistakes; i++) {
      const dot = document.createElement('span');
      dot.className = 'dot' + (i < game.mistakes ? ' filled' : '');
      mistakesDots.appendChild(dot);
    }
    mistakesEl.appendChild(mistakesLabel);
    mistakesEl.appendChild(mistakesDots);
    status.appendChild(mistakesEl);

    screen.appendChild(status);

    // =================== GRID ===================
    const boardWrap = document.createElement('div');
    boardWrap.className = 'board-wrap';
    const board = document.createElement('div');
    board.className = 'board';
    boardWrap.appendChild(board);
    screen.appendChild(boardWrap);

    const cells = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        if (game.givenCells[r][c]) cell.classList.add('given');
        if (r % 3 === 0) cell.classList.add('border-top');
        if (c % 3 === 0) cell.classList.add('border-left');
        if (r === 8) cell.classList.add('border-bottom');
        if (c === 8) cell.classList.add('border-right');
        cell.dataset.row = r;
        cell.dataset.col = c;
        cell.addEventListener('click', () => selectCell(r, c));
        board.appendChild(cell);
        cells.push(cell);
      }
    }

    // =================== TOOLBAR ===================
    const toolbar = document.createElement('div');
    toolbar.className = 'toolbar';

    const undoBtn = makeToolBtn('&larr;', 'Deshacer', () => doUndo());
    const eraseBtn = makeToolBtn('&#9003;', 'Borrar', () => eraseCell());
    const notesBtn = makeToolBtn('&#9998;', 'Notas', () => toggleNoteMode());
    notesBtn.classList.add('tool-toggle');
    const hintBtn = makeToolBtn('?', 'Pista', () => doHint());
    const solveBtn = makeToolBtn('&#128065;', 'Solución', () => showSolution());
    solveBtn.classList.add('tool-solve');

    [undoBtn, eraseBtn, notesBtn, hintBtn, solveBtn].forEach((b) => toolbar.appendChild(b));
    screen.appendChild(toolbar);

    // =================== KEYPAD ===================
    const keypad = document.createElement('div');
    keypad.className = 'keypad';
    for (let n = 1; n <= 9; n++) {
      const btn = document.createElement('button');
      btn.className = 'keypad-btn';
      btn.textContent = String(n);
      btn.addEventListener('click', () => inputNumber(n));
      keypad.appendChild(btn);
    }
    screen.appendChild(keypad);

    // =================== MODAL OVERLAY ===================
    const modal = document.createElement('div');
    modal.className = 'modal hidden';
    screen.appendChild(modal);

    root.appendChild(screen);

    // =================== ESTADO INICIAL ===================
    undoStack = [];
    redoStack = [];
    state.selected = null;
    state.noteMode = false;
    notesBtn.classList.remove('active');
    refreshBoard();
    startTimer();
    updateNoteModeButton();

    // =================== FUNCIONES ===================

    function selectCell(r, c) {
      if (game.completed || game.gameOver || game.isPaused) return;
      state.selected = { row: r, col: c };
      refreshBoard();
    }

    function inputNumber(n) {
      if (!state.selected) return;
      if (game.completed || game.gameOver || game.isPaused) return;
      const { row, col } = state.selected;
      if (game.givenCells[row][col]) return;

      if (state.noteMode) {
        // Notas
        pushHistory();
        const notes = game.notes[row][col];
        const idx = notes.indexOf(n);
        if (idx >= 0) notes.splice(idx, 1);
        else notes.push(n);
        notes.sort((a, b) => a - b);
        saveAndRefresh();
        return;
      }

      pushHistory();
      if (game.currentBoard[row][col] === n) {
        // toggle: si repite, borrar
        game.currentBoard[row][col] = 0;
        game.notes[row][col] = [];
      } else {
        game.currentBoard[row][col] = n;
        game.notes[row][col] = [];

        if (n !== game.solution[row][col]) {
          game.mistakes++;
          if (game.mistakes >= game.maxMistakes) {
            triggerGameOver();
            return;
          }
        } else {
          // ¿partida completada?
          if (isBoardComplete(game.currentBoard)) {
            triggerWin();
            return;
          }
        }
      }
      saveAndRefresh();
    }

    function eraseCell() {
      if (!state.selected) return;
      const { row, col } = state.selected;
      if (game.givenCells[row][col]) return;
      if (game.currentBoard[row][col] === 0 && game.notes[row][col].length === 0) return;
      pushHistory();
      game.currentBoard[row][col] = 0;
      game.notes[row][col] = [];
      saveAndRefresh();
    }

    function toggleNoteMode() {
      state.noteMode = !state.noteMode;
      updateNoteModeButton();
    }

    function updateNoteModeButton() {
      if (state.noteMode) notesBtn.classList.add('active');
      else notesBtn.classList.remove('active');
    }

    function doUndo() {
      if (undoStack.length === 0) return;
      const prev = undoStack.pop();
      redoStack.push(snapshot(game));
      restore(game, prev);
      saveAndRefresh();
    }

    function doHint() {
      if (game.completed || game.gameOver || game.isPaused) return;
      if (!state.selected) {
        showToast('Selecciona una celda primero');
        return;
      }
      const { row, col } = state.selected;
      if (game.givenCells[row][col]) {
        showToast('Esta celda es una pista, no se puede modificar');
        return;
      }
      const hint = SudokuHints.getHint(game.currentBoard, game.solution, row, col);
      showHintModal(hint, row, col);
    }

    function showHintModal(hint, row, col) {
      modal.classList.remove('hidden');
      modal.innerHTML = '';

      const sheet = document.createElement('div');
      sheet.className = 'modal-sheet';

      const title = document.createElement('div');
      title.className = 'modal-title';
      title.textContent = 'Pista';
      sheet.appendChild(title);

      const big = document.createElement('div');
      big.className = 'hint-value';
      big.textContent = String(hint.value);
      sheet.appendChild(big);

      const msg = document.createElement('div');
      msg.className = 'modal-msg';
      msg.textContent = hint.message;
      sheet.appendChild(msg);

      const apply = document.createElement('button');
      apply.className = 'btn btn-primary btn-block';
      apply.textContent = 'Aplicar';
      apply.addEventListener('click', () => {
        pushHistory();
        game.currentBoard[row][col] = hint.value;
        game.notes[row][col] = [];
        if (isBoardComplete(game.currentBoard)) {
          saveAndRefresh();
          modal.classList.add('hidden');
          triggerWin();
          return;
        }
        saveAndRefresh();
        modal.classList.add('hidden');
      });
      sheet.appendChild(apply);

      const close = document.createElement('button');
      close.className = 'btn btn-text btn-block';
      close.textContent = 'Cerrar';
      close.addEventListener('click', () => {
        modal.classList.add('hidden');
      });
      sheet.appendChild(close);

      modal.appendChild(sheet);
    }

    function showSolution() {
      modal.classList.remove('hidden');
      modal.innerHTML = '';

      const sheet = document.createElement('div');
      sheet.className = 'modal-sheet modal-sheet-wide';

      const title = document.createElement('div');
      title.className = 'modal-title';
      title.textContent = 'Solución';
      sheet.appendChild(title);

      const grid = document.createElement('div');
      grid.className = 'board board-solution';
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          const cell = document.createElement('div');
          cell.className = 'cell cell-solution';
          if (r % 3 === 0) cell.classList.add('border-top');
          if (c % 3 === 0) cell.classList.add('border-left');
          if (r === 8) cell.classList.add('border-bottom');
          if (c === 8) cell.classList.add('border-right');
          cell.textContent = String(game.solution[r][c]);
          grid.appendChild(cell);
        }
      }
      sheet.appendChild(grid);

      const fill = document.createElement('button');
      fill.className = 'btn btn-primary btn-block';
      fill.textContent = 'Resolver mi partida';
      fill.addEventListener('click', () => {
        if (confirm('¿Rellenar toda la partida con la solución y finalizar?')) {
          game.currentBoard = SudokuSolver.deepCopy(game.solution);
          game.completed = true;
          saveAndRefresh();
          modal.classList.add('hidden');
          triggerWin(true);
        }
      });
      sheet.appendChild(fill);

      const close = document.createElement('button');
      close.className = 'btn btn-text btn-block';
      close.textContent = 'Cerrar';
      close.addEventListener('click', () => {
        modal.classList.add('hidden');
      });
      sheet.appendChild(close);

      modal.appendChild(sheet);
    }

    function triggerGameOver() {
      game.gameOver = true;
      saveAndRefresh();
      modal.classList.remove('hidden');
      modal.innerHTML = '';
      const sheet = document.createElement('div');
      sheet.className = 'modal-sheet';
      const title = document.createElement('div');
      title.className = 'modal-title';
      title.textContent = 'Has perdido';
      sheet.appendChild(title);
      const msg = document.createElement('div');
      msg.className = 'modal-msg';
      msg.textContent = `Has cometido los ${game.maxMistakes} errores permitidos.`;
      sheet.appendChild(msg);

      const show = document.createElement('button');
      show.className = 'btn btn-secondary btn-block';
      show.textContent = 'Ver solución';
      show.addEventListener('click', () => {
        modal.classList.add('hidden');
        showSolution();
      });
      sheet.appendChild(show);

      const again = document.createElement('button');
      again.className = 'btn btn-primary btn-block';
      again.textContent = 'Nueva partida';
      again.addEventListener('click', () => {
        SudokuStorage.clear();
        state.currentGame = null;
        callbacks.onNavigate('difficulty');
      });
      sheet.appendChild(again);

      const home = document.createElement('button');
      home.className = 'btn btn-text btn-block';
      home.textContent = 'Volver al inicio';
      home.addEventListener('click', () => {
        SudokuStorage.clear();
        state.currentGame = null;
        callbacks.onNavigate('home');
      });
      sheet.appendChild(home);

      modal.appendChild(sheet);
    }

    function triggerWin(forced) {
      game.completed = true;
      game.completedAt = new Date().toISOString();
      SudokuStorage.save(game);
      modal.classList.remove('hidden');
      modal.innerHTML = '';
      const sheet = document.createElement('div');
      sheet.className = 'modal-sheet';
      const title = document.createElement('div');
      title.className = 'modal-title';
      title.textContent = forced ? 'Partida finalizada' : '¡Felicidades!';
      sheet.appendChild(title);
      const msg = document.createElement('div');
      msg.className = 'modal-msg';
      if (forced) {
        msg.textContent = 'Has rellenado la partida con la solución.';
      } else {
        msg.textContent = `Has completado la partida en ${SudokuStorage.formatTime(game.elapsedMs || 0)} con ${game.mistakes} error${game.mistakes === 1 ? '' : 'es'}.`;
      }
      sheet.appendChild(msg);

      const again = document.createElement('button');
      again.className = 'btn btn-primary btn-block';
      again.textContent = 'Nueva partida';
      again.addEventListener('click', () => {
        SudokuStorage.clear();
        state.currentGame = null;
        callbacks.onNavigate('difficulty');
      });
      sheet.appendChild(again);

      const home = document.createElement('button');
      home.className = 'btn btn-text btn-block';
      home.textContent = 'Volver al inicio';
      home.addEventListener('click', () => {
        SudokuStorage.clear();
        state.currentGame = null;
        callbacks.onNavigate('home');
      });
      sheet.appendChild(home);

      modal.appendChild(sheet);
    }

    function togglePause() {
      if (game.completed || game.gameOver) return;
      game.isPaused = !game.isPaused;
      callbacks.onPauseChange(game.isPaused);
      pauseBtn.innerHTML = game.isPaused ? '&#9658;' : '&#10073;&#10073;';
      if (game.isPaused) {
        showPauseOverlay();
      } else {
        hidePauseOverlay();
        startTimer();
      }
      saveAndRefresh();
    }

    function showPauseOverlay() {
      const overlay = document.createElement('div');
      overlay.className = 'pause-overlay';
      overlay.id = 'pauseOverlay';
      const txt = document.createElement('div');
      txt.className = 'pause-text';
      txt.textContent = 'Pausa';
      overlay.appendChild(txt);
      const resume = document.createElement('button');
      resume.className = 'btn btn-primary';
      resume.textContent = 'Reanudar';
      resume.addEventListener('click', togglePause);
      overlay.appendChild(resume);
      screen.appendChild(overlay);
    }

    function hidePauseOverlay() {
      const o = document.getElementById('pauseOverlay');
      if (o) o.remove();
    }

    // =================== RENDER ===================
    function refreshBoard() {
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          const cell = cells[r * 9 + c];
          const value = game.currentBoard[r][c];
          const isGiven = game.givenCells[r][c];
          const isSelected = state.selected && state.selected.row === r && state.selected.col === c;
          const sameValue = state.selected && value !== 0 &&
            game.currentBoard[state.selected.row][state.selected.col] === value;
          const isPeer = state.selected && !isSelected &&
            (state.selected.row === r || state.selected.col === c ||
              (Math.floor(state.selected.row / 3) === Math.floor(r / 3) &&
               Math.floor(state.selected.col / 3) === Math.floor(c / 3)));
          const isConflict = value !== 0 && SudokuSolver.getConflictsInBoard(game.currentBoard, r, c).length > 0;

          cell.className = 'cell';
          if (isGiven) cell.classList.add('given');
          if (!isGiven && value !== 0) cell.classList.add('user');
          if (r % 3 === 0) cell.classList.add('border-top');
          if (c % 3 === 0) cell.classList.add('border-left');
          if (r === 8) cell.classList.add('border-bottom');
          if (c === 8) cell.classList.add('border-right');
          if (isSelected) cell.classList.add('selected');
          if (isPeer) cell.classList.add('peer');
          if (sameValue) cell.classList.add('same-value');
          if (isConflict) cell.classList.add('conflict');

          cell.innerHTML = '';
          if (value !== 0) {
            const span = document.createElement('span');
            span.className = 'cell-value';
            span.textContent = String(value);
            cell.appendChild(span);
          } else if (game.notes[r][c].length > 0) {
            const notesWrap = document.createElement('div');
            notesWrap.className = 'cell-notes';
            for (let n = 1; n <= 9; n++) {
              const noteCell = document.createElement('div');
              noteCell.className = 'note-cell';
              if (game.notes[r][c].includes(n)) {
                noteCell.textContent = String(n);
              }
              notesWrap.appendChild(noteCell);
            }
            cell.appendChild(notesWrap);
          }
        }
      }
    }

    function startTimer() {
      clearTimer();
      if (game.isPaused || game.completed || game.gameOver) return;
      state.timerHandle = setInterval(() => {
        game.elapsedMs = (game.elapsedMs || 0) + 1000;
        timer.textContent = SudokuStorage.formatTime(game.elapsedMs);
        if ((game.elapsedMs / 1000) % 5 === 0) {
          SudokuStorage.save(game);
        }
      }, 1000);
    }

    function saveAndRefresh() {
      SudokuStorage.save(game);
      refreshBoard();
      updateMistakesDots();
    }

    function updateMistakesDots() {
      const dots = mistakesDots.querySelectorAll('.dot');
      dots.forEach((d, i) => {
        if (i < game.mistakes) d.classList.add('filled');
        else d.classList.remove('filled');
      });
    }

    function pushHistory() {
      undoStack.push(snapshot(game));
      if (undoStack.length > 50) undoStack.shift();
      redoStack = [];
    }

    function showToast(text) {
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.textContent = text;
      screen.appendChild(toast);
      setTimeout(() => toast.classList.add('show'), 10);
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, 1800);
    }

    // Si la partida está pausada al volver, mostrar overlay
    if (game.isPaused) {
      pauseBtn.innerHTML = '&#9658;';
      showPauseOverlay();
    }
  }

  // =================== HELPERS ===================
  function snapshot(game) {
    return {
      currentBoard: SudokuSolver.deepCopy(game.currentBoard),
      notes: game.notes.map((row) => row.map((notes) => notes.slice())),
      mistakes: game.mistakes
    };
  }

  function restore(game, snap) {
    game.currentBoard = SudokuSolver.deepCopy(snap.currentBoard);
    game.notes = snap.notes.map((row) => row.map((notes) => notes.slice()));
    game.mistakes = snap.mistakes;
  }

  function isBoardComplete(board) {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c] === 0) return false;
      }
    }
    return true;
  }

  function makeToolBtn(html, label, onClick) {
    const b = document.createElement('button');
    b.className = 'tool-btn';
    b.innerHTML = html;
    b.setAttribute('aria-label', label);
    b.title = label;
    b.addEventListener('click', onClick);
    return b;
  }

  window.SudokuUIGame = { render };
})();
