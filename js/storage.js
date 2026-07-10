// Wrapper de localStorage con serialización JSON y helpers de tiempo.

(function () {
  'use strict';

  const KEY = 'sudoku.currentGame';

  function isAvailable() {
    try {
      const t = '__sudoku_test__';
      localStorage.setItem(t, t);
      localStorage.removeItem(t);
      return true;
    } catch (e) {
      return false;
    }
  }

  function load() {
    if (!isAvailable()) return null;
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || !data.puzzle || !data.solution) return null;
      return data;
    } catch (e) {
      return null;
    }
  }

  function save(state) {
    if (!isAvailable()) return false;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      return false;
    }
  }

  function clear() {
    if (!isAvailable()) return;
    try {
      localStorage.removeItem(KEY);
    } catch (e) {}
  }

  function formatTime(ms) {
    const total = Math.floor(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  window.SudokuStorage = { load, save, clear, formatTime, isAvailable };
})();
