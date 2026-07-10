// Vista de estadísticas: muestra totales, rachas, records por dificultad.

(function () {
  'use strict';

  function render(root) {
    const stats = SudokuStorage.getStats();
    root.innerHTML = '';

    const screen = document.createElement('div');
    screen.className = 'screen screen-stats';

    // Header
    const header = document.createElement('div');
    header.className = 'screen-header';
    const back = document.createElement('button');
    back.className = 'btn btn-icon';
    back.setAttribute('aria-label', 'Volver');
    back.innerHTML = '&larr;';
    back.addEventListener('click', () => window.__sudokuNavigate('home'));
    const title = document.createElement('h1');
    title.className = 'screen-title';
    title.textContent = 'Estadísticas';
    const spacer = document.createElement('div');
    spacer.style.width = '44px';
    header.appendChild(back);
    header.appendChild(title);
    header.appendChild(spacer);
    screen.appendChild(header);

    // Resumen global
    const summary = document.createElement('div');
    summary.className = 'stats-summary';
    summary.appendChild(makeStatCard('Partidas', String(stats.total), 'total'));
    summary.appendChild(makeStatCard('Victorias', String(stats.won), 'won'));
    summary.appendChild(makeStatCard('Derrotas', String(stats.lost), 'lost'));
    screen.appendChild(summary);

    // Porcentaje de victoria + racha
    const streakRow = document.createElement('div');
    streakRow.className = 'stats-row';
    streakRow.appendChild(makeStatCard('% Victoria', SudokuStorage.formatPercent(stats.winRate), 'rate'));
    streakRow.appendChild(makeStatCard('Racha actual', String(stats.currentStreak), 'streak'));
    streakRow.appendChild(makeStatCard('Mejor racha', String(stats.bestStreak), 'best-streak'));
    screen.appendChild(streakRow);

    // Tiempos y errores
    const totalsRow = document.createElement('div');
    totalsRow.className = 'stats-row';
    totalsRow.appendChild(makeStatCard('Tiempo total', SudokuStorage.formatLongTime(stats.totalTimePlayed), 'time'));
    totalsRow.appendChild(makeStatCard('Última partida', SudokuStorage.formatRelativeDate(stats.lastPlayedAt), 'last'));
    screen.appendChild(totalsRow);

    // Por dificultad
    const byDiff = document.createElement('div');
    byDiff.className = 'stats-section';
    const byDiffTitle = document.createElement('h2');
    byDiffTitle.className = 'stats-section-title';
    byDiffTitle.textContent = 'Por dificultad';
    byDiff.appendChild(byDiffTitle);

    for (const lvl of ['easy', 'medium', 'hard', 'extreme']) {
      const d = stats.byDifficulty[lvl];
      const card = document.createElement('div');
      card.className = `stats-diff-card diff-${lvl}`;

      const label = document.createElement('div');
      label.className = 'stats-diff-label';
      label.textContent = SudokuGenerator.difficultyLabel(lvl);
      card.appendChild(label);

      if (d.played === 0) {
        const empty = document.createElement('div');
        empty.className = 'stats-diff-empty';
        empty.textContent = 'Sin partidas';
        card.appendChild(empty);
      } else {
        const counts = document.createElement('div');
        counts.className = 'stats-diff-counts';
        const winRate = d.played > 0 ? d.won / d.played : 0;
        counts.textContent = `${d.won}/${d.played} ganadas · ${SudokuStorage.formatPercent(winRate)}`;
        card.appendChild(counts);

        const records = document.createElement('div');
        records.className = 'stats-diff-records';
        if (d.won > 0) {
          const bestTime = document.createElement('div');
          bestTime.className = 'record-line';
          bestTime.innerHTML = `<span class="record-key">Mejor tiempo</span><span class="record-val">${SudokuStorage.formatTime(d.bestTimeMs)}</span>`;
          records.appendChild(bestTime);

          const avgTime = document.createElement('div');
          avgTime.className = 'record-line';
          avgTime.innerHTML = `<span class="record-key">Tiempo medio</span><span class="record-val">${SudokuStorage.formatTime(d.avgTimeMs)}</span>`;
          records.appendChild(avgTime);

          const bestMist = document.createElement('div');
          bestMist.className = 'record-line';
          bestMist.innerHTML = `<span class="record-key">Menos errores</span><span class="record-val">${d.bestMistakes === null ? '—' : d.bestMistakes}</span>`;
          records.appendChild(bestMist);

          const avgMist = document.createElement('div');
          avgMist.className = 'record-line';
          avgMist.innerHTML = `<span class="record-key">Errores medios</span><span class="record-val">${d.avgMistakes.toFixed(1)}</span>`;
          records.appendChild(avgMist);
        } else {
          const noWins = document.createElement('div');
          noWins.className = 'stats-diff-empty';
          noWins.textContent = 'Sin victorias todavía';
          records.appendChild(noWins);
        }
        card.appendChild(records);
      }
      byDiff.appendChild(card);
    }
    screen.appendChild(byDiff);

    // Botón reset
    if (stats.total > 0) {
      const reset = document.createElement('button');
      reset.className = 'btn btn-text btn-block';
      reset.textContent = 'Borrar historial';
      reset.addEventListener('click', () => {
        if (confirm('¿Borrar todo el historial de partidas? Esta acción no se puede deshacer.')) {
          SudokuStorage.clearHistory();
          window.__sudokuNavigate('stats');
        }
      });
      screen.appendChild(reset);
    }

    root.appendChild(screen);
  }

  function makeStatCard(label, value, kind) {
    const card = document.createElement('div');
    card.className = `stat-card stat-${kind}`;
    const v = document.createElement('div');
    v.className = 'stat-value';
    v.textContent = value;
    const l = document.createElement('div');
    l.className = 'stat-label';
    l.textContent = label;
    card.appendChild(v);
    card.appendChild(l);
    return card;
  }

  window.SudokuUIStats = { render };
})();
