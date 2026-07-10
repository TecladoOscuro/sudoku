// Sistema de pistas lógicas (estilo sudoku.com).
// Devuelve { value, technique, message } para una celda vacía, o null.

(function () {
  'use strict';

  function getCellUnits(row, col) {
    return [
      { type: 'row', cells: Array.from({ length: 9 }, (_, c) => [row, c]) },
      { type: 'col', cells: Array.from({ length: 9 }, (_, r) => [r, col]) },
      { type: 'box', cells: boxCells(row, col) }
    ];
  }

  function boxCells(row, col) {
    const br = Math.floor(row / 3) * 3;
    const bc = Math.floor(col / 3) * 3;
    const cells = [];
    for (let r = br; r < br + 3; r++) {
      for (let c = bc; c < bc + 3; c++) {
        cells.push([r, c]);
      }
    }
    return cells;
  }

  function valuesIn(puzzle, cells) {
    const s = new Set();
    for (const [r, c] of cells) {
      if (puzzle[r][c]) s.add(puzzle[r][c]);
    }
    return s;
  }

  function candidatesForCell(puzzle, row, col) {
    const used = new Set();
    for (let i = 0; i < 9; i++) {
      if (puzzle[row][i]) used.add(puzzle[row][i]);
      if (puzzle[i][col]) used.add(puzzle[i][col]);
    }
    const [br, bc] = [Math.floor(row / 3) * 3, Math.floor(col / 3) * 3];
    for (let r = br; r < br + 3; r++) {
      for (let c = bc; c < bc + 3; c++) {
        if (puzzle[r][c]) used.add(puzzle[r][c]);
      }
    }
    const cands = [];
    for (let n = 1; n <= 9; n++) if (!used.has(n)) cands.push(n);
    return cands;
  }

  // Devuelve pista para la celda indicada. puzzle = grid con valores actuales del usuario.
  // solution = grid completa.
  function getHint(puzzle, solution, row, col) {
    if (puzzle[row][col] !== 0) {
      return { value: puzzle[row][col], technique: 'completa', message: 'Esta celda ya está rellena.' };
    }
    const correct = solution[row][col];
    const cands = candidatesForCell(puzzle, row, col);
    if (cands.length === 0) {
      return { value: correct, technique: 'sin-candidatos', message: 'No hay candidatos posibles. Revisa errores.' };
    }
    if (cands.length === 1) {
      return {
        value: correct,
        technique: 'candidato-unico',
        message: `Candidato único: solo el ${correct} es posible en esta celda.`
      };
    }
    // Hidden single: el número correcto solo encaja en esta celda dentro de su fila/col/box.
    for (const unit of getCellUnits(row, col)) {
      const used = valuesIn(puzzle, unit.cells);
      if (used.has(correct)) continue;
      let onlyHere = true;
      for (const [r, c] of unit.cells) {
        if (r === row && c === col) continue;
        if (puzzle[r][c] === 0) {
          const otherCands = candidatesForCell(puzzle, r, c);
          if (otherCands.includes(correct)) {
            onlyHere = false;
            break;
          }
        }
      }
      if (onlyHere) {
        const names = { row: 'fila', col: 'columna', box: 'cuadrante 3x3' };
        return {
          value: correct,
          technique: 'oculto-unico',
          message: `Número oculto único: el ${correct} solo puede ir en esta celda dentro de su ${names[unit.type]}.`
        };
      }
    }
    // Fallback: revelar sin técnica específica
    return {
      value: correct,
      technique: 'revelar',
      message: `El valor correcto es ${correct}.`
    };
  }

  window.SudokuHints = { getHint };
})();
