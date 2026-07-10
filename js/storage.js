// Wrapper de localStorage con serialización JSON y helpers de tiempo.
// Maneja el estado de partida actual Y el historial de partidas finalizadas.

(function () {
  'use strict';

  const KEY = 'sudoku.currentGame';
  const HISTORY_KEY = 'sudoku.history';
  const MAX_HISTORY = 200;

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

  // =================== PARTIDA ACTUAL ===================
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

  // =================== HISTORIAL ===================
  function loadHistory() {
    if (!isAvailable()) return [];
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function saveHistory(arr) {
    if (!isAvailable()) return false;
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(arr));
      return true;
    } catch (e) {
      return false;
    }
  }

  // Registra una partida finalizada en el historial.
  // entry = { difficulty, result: 'won'|'lost'|'abandoned', mistakes, elapsedMs, completedAt }
  function recordGame(entry) {
    const arr = loadHistory();
    arr.push(entry);
    // Limitar tamaño
    while (arr.length > MAX_HISTORY) arr.shift();
    saveHistory(arr);
    return arr;
  }

  function clearHistory() {
    if (!isAvailable()) return;
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch (e) {}
  }

  // =================== ESTADÍSTICAS ===================
  // Calcula estadísticas agregadas del historial.
  function getStats() {
    const arr = loadHistory();
    const stats = {
      total: arr.length,
      won: 0,
      lost: 0,
      abandoned: 0,
      winRate: 0,
      totalTimeMs: 0,
      totalTimePlayed: 0, // alias para tiempo total
      totalMistakes: 0,
      bestStreak: 0,
      currentStreak: 0,
      lastPlayedAt: null,
      byDifficulty: {
        easy:   { played: 0, won: 0, lost: 0, bestTimeMs: null, avgTimeMs: 0, avgMistakes: 0, bestMistakes: Infinity },
        medium: { played: 0, won: 0, lost: 0, bestTimeMs: null, avgTimeMs: 0, avgMistakes: 0, bestMistakes: Infinity },
        hard:   { played: 0, won: 0, lost: 0, bestTimeMs: null, avgTimeMs: 0, avgMistakes: 0, bestMistakes: Infinity },
        extreme:{ played: 0, won: 0, lost: 0, bestTimeMs: null, avgTimeMs: 0, avgMistakes: 0, bestMistakes: Infinity }
      }
    };
    if (arr.length === 0) return stats;

    let currentStreak = 0;
    let bestStreak = 0;
    let lastWin = false;
    for (const g of arr) {
      stats.totalTimeMs += g.elapsedMs || 0;
      stats.totalMistakes += g.mistakes || 0;
      if (g.result === 'won') stats.won++;
      else if (g.result === 'lost') stats.lost++;
      else stats.abandoned++;

      // Streak: solo cuentan victorias consecutivas
      if (g.result === 'won') {
        if (lastWin) currentStreak++;
        else currentStreak = 1;
        bestStreak = Math.max(bestStreak, currentStreak);
        lastWin = true;
      } else {
        lastWin = false;
        currentStreak = 0;
      }

      // Por dificultad
      const d = stats.byDifficulty[g.difficulty];
      if (d) {
        d.played++;
        if (g.result === 'won') {
          d.won++;
          if (d.bestTimeMs === null || (g.elapsedMs || 0) < d.bestTimeMs) {
            d.bestTimeMs = g.elapsedMs || 0;
          }
          if ((g.mistakes || 0) < d.bestMistakes) d.bestMistakes = g.mistakes || 0;
        } else if (g.result === 'lost') {
          d.lost++;
        }
      }
    }
    stats.currentStreak = currentStreak;
    stats.bestStreak = bestStreak;
    stats.winRate = stats.total > 0 ? stats.won / stats.total : 0;
    stats.totalTimePlayed = stats.totalTimeMs;
    stats.lastPlayedAt = arr[arr.length - 1].completedAt || null;

    // Medias por dificultad
    for (const key of Object.keys(stats.byDifficulty)) {
      const d = stats.byDifficulty[key];
      if (d.won > 0) {
        let totalTime = 0, totalMistakes = 0, count = 0;
        for (const g of arr) {
          if (g.difficulty === key && g.result === 'won') {
            totalTime += g.elapsedMs || 0;
            totalMistakes += g.mistakes || 0;
            count++;
          }
        }
        d.avgTimeMs = count > 0 ? totalTime / count : 0;
        d.avgMistakes = count > 0 ? totalMistakes / count : 0;
      }
      if (d.bestMistakes === Infinity) d.bestMistakes = null;
    }
    return stats;
  }

  // =================== HELPERS ===================
  function formatTime(ms) {
    if (ms == null) return '—';
    const total = Math.floor(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    if (total < 3600) return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    const h = Math.floor(total / 3600);
    return `${h}h ${String(m % 60).padStart(2, '0')}m`;
  }

  function formatLongTime(ms) {
    if (ms == null) return '—';
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${s}s`;
  }

  function formatPercent(p) {
    if (!p && p !== 0) return '—';
    return `${Math.round(p * 100)}%`;
  }

  function formatRelativeDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    const now = new Date();
    const diffMs = now - d;
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'ahora mismo';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `hace ${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `hace ${diffH} h`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `hace ${diffD} día${diffD === 1 ? '' : 's'}`;
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  }

  window.SudokuStorage = {
    load, save, clear,
    loadHistory, saveHistory, recordGame, clearHistory,
    getStats,
    formatTime, formatLongTime, formatPercent, formatRelativeDate,
    isAvailable
  };
})();
