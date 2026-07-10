// Router minimalista de vistas. Mantiene estado global de la app.

(function () {
  'use strict';

  const root = document.getElementById('app');
  let pauseStartedAt = null;

  const state = {
    currentGame: null,
    selected: null,
    noteMode: false,
    timerHandle: null
  };

  function clearTimer() {
    if (state.timerHandle) {
      clearInterval(state.timerHandle);
      state.timerHandle = null;
    }
  }

  function navigate(view, params) {
    clearTimer();
    pauseStartedAt = null;
    window.scrollTo(0, 0);
    if (view === 'home') {
      SudokuUIHome.render(root, params || {});
    } else if (view === 'difficulty') {
      SudokuUIDifficulty.render(root);
    } else if (view === 'stats') {
      SudokuUIStats.render(root);
    } else if (view === 'game') {
      SudokuUIGame.render(root, params || {}, state, {
        onNavigate: (v, p) => navigate(v, p),
        onPauseChange: (paused) => {
          if (paused && state.currentGame) {
            pauseStartedAt = Date.now();
          } else if (state.currentGame) {
            if (pauseStartedAt) {
              const pauseDuration = Date.now() - pauseStartedAt;
              state.currentGame.pausedAccum = (state.currentGame.pausedAccum || 0) + pauseDuration;
              pauseStartedAt = null;
            }
          }
        }
      });
    }
  }

  // Carga inicial: detecta si hay partida en curso.
  function boot() {
    const existing = SudokuStorage.load();
    if (existing && !existing.completed && !existing.gameOver) {
      state.currentGame = existing;
      navigate('home', { hasSavedGame: true, savedGame: existing });
    } else {
      SudokuStorage.clear();
      state.currentGame = null;
      navigate('home', { hasSavedGame: false });
    }
  }

  window.__sudokuNavigate = navigate;
  window.__sudokuState = state;

  document.addEventListener('DOMContentLoaded', boot);
})();
