// Sudoku solver: backtracking con bitmasks para velocidad.
// Expone window.SudokuSolver con utilidades para validación y generación.

(function () {
  'use strict';

  const ALL_BITS = 0x3fe; // bits 1..9 activos: 0b1111111110 = 510

  function deepCopy(grid) {
    return grid.map((row) => row.slice());
  }

  function shuffle(array) {
    const arr = array.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function emptyGrid() {
    return Array.from({ length: 9 }, () => Array(9).fill(0));
  }

  function isValidPlacement(grid, row, col, num) {
    for (let i = 0; i < 9; i++) {
      if (i !== col && grid[row][i] === num) return false;
      if (i !== row && grid[i][col] === num) return false;
    }
    const br = Math.floor(row / 3) * 3;
    const bc = Math.floor(col / 3) * 3;
    for (let r = br; r < br + 3; r++) {
      for (let c = bc; c < bc + 3; c++) {
        if ((r !== row || c !== col) && grid[r][c] === num) return false;
      }
    }
    return true;
  }

  // Llena las 3 cajas diagonales (independientes entre sí) con permutaciones aleatorias.
  function fillDiagonalBoxes(grid) {
    for (let box = 0; box < 9; box += 3) {
      const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      let idx = 0;
      for (let r = box; r < box + 3; r++) {
        for (let c = box; c < box + 3; c++) {
          grid[r][c] = nums[idx++];
        }
      }
    }
  }

  // Backtracking con selección aleatoria de candidatos.
  // Retorna true si logra llenar la grid.
  function fillRest(grid) {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] === 0) {
          const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
          for (const n of nums) {
            if (isValidPlacement(grid, r, c, n)) {
              grid[r][c] = n;
              if (fillRest(grid)) return true;
              grid[r][c] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  }

  // Genera una grid completamente resuelta y válida.
  function generateSolved() {
    const grid = emptyGrid();
    fillDiagonalBoxes(grid);
    fillRest(grid);
    return grid;
  }

  // Cuenta soluciones hasta `limit`. 0 = ilimitado.
  // Retorna el número encontrado (cap a limit+1 para "más de limit").
  function countSolutions(grid, limit) {
    const maxSolutions = limit > 0 ? limit : Infinity;
    let count = 0;
    const used = [
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0]
    ];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] !== 0) used[r][c] = 1 << grid[r][c];
      }
    }

    function backtrack(pos) {
      if (count >= maxSolutions) return;
      if (pos === 81) {
        count++;
        return;
      }
      const r = Math.floor(pos / 9);
      const c = pos % 9;
      if (grid[r][c] !== 0) {
        backtrack(pos + 1);
        return;
      }
      let mask = 0;
      for (let i = 0; i < 9; i++) {
        mask |= used[r][i] | used[i][c];
      }
      const br = Math.floor(r / 3) * 3;
      const bc = Math.floor(c / 3) * 3;
      for (let rr = br; rr < br + 3; rr++) {
        for (let cc = bc; cc < bc + 3; cc++) {
          mask |= used[rr][cc];
        }
      }
      const available = ALL_BITS & ~mask;
      if (available === 0) return;
      // Extraer bits y probar en orden ascendente (barajado opcionalmente)
      for (let n = 1; n <= 9; n++) {
        if (count >= maxSolutions) return;
        const bit = 1 << n;
        if (available & bit) {
          used[r][c] = bit;
          grid[r][c] = n;
          backtrack(pos + 1);
          used[r][c] = 0;
          grid[r][c] = 0;
        }
      }
    }

    backtrack(0);
    return count;
  }

  // Solver simple: devuelve la primera solución encontrada o null.
  function solve(grid) {
    const work = deepCopy(grid);
    const result = deepCopy(grid);
    const found = [];

    function backtrack(pos) {
      if (found.length) return;
      if (pos === 81) {
        found.push(deepCopy(work));
        return;
      }
      const r = Math.floor(pos / 9);
      const c = pos % 9;
      if (work[r][c] !== 0) {
        backtrack(pos + 1);
        return;
      }
      for (let n = 1; n <= 9; n++) {
        if (isValidPlacement(work, r, c, n)) {
          work[r][c] = n;
          backtrack(pos + 1);
          work[r][c] = 0;
        }
      }
    }

    backtrack(0);
    return found[0] || null;
  }

  // Verifica si un movimiento es legal en el estado actual del usuario (puede haber duplicados).
  function isPlacementLegalInBoard(board, row, col, num) {
    for (let i = 0; i < 9; i++) {
      if (i !== col && board[row][i] === num) return false;
      if (i !== row && board[i][col] === num) return false;
    }
    const br = Math.floor(row / 3) * 3;
    const bc = Math.floor(col / 3) * 3;
    for (let r = br; r < br + 3; r++) {
      for (let c = bc; c < bc + 3; c++) {
        if ((r !== row || c !== col) && board[r][c] === num) return false;
      }
    }
    return true;
  }

  // Devuelve array de números que coinciden con la solución en (row, col), o [] si vacío.
  function getConflictsInBoard(board, row, col) {
    const num = board[row][col];
    if (!num) return [];
    const conflicts = [];
    for (let i = 0; i < 9; i++) {
      if (i !== col && board[row][i] === num) conflicts.push([row, i]);
      if (i !== row && board[i][col] === num) conflicts.push([i, col]);
    }
    const br = Math.floor(row / 3) * 3;
    const bc = Math.floor(col / 3) * 3;
    for (let r = br; r < br + 3; r++) {
      for (let c = bc; c < bc + 3; c++) {
        if ((r !== row || c !== col) && board[r][c] === num) conflicts.push([r, c]);
      }
    }
    return conflicts;
  }

  // Calcula candidatos (notas) para una celda vacía.
  function getCandidates(board, row, col) {
    if (board[row][col] !== 0) return [];
    const used = new Set();
    for (let i = 0; i < 9; i++) {
      if (board[row][i]) used.add(board[row][i]);
      if (board[i][col]) used.add(board[i][col]);
    }
    const br = Math.floor(row / 3) * 3;
    const bc = Math.floor(col / 3) * 3;
    for (let r = br; r < br + 3; r++) {
      for (let c = bc; c < bc + 3; c++) {
        if (board[r][c]) used.add(board[r][c]);
      }
    }
    const candidates = [];
    for (let n = 1; n <= 9; n++) {
      if (!used.has(n)) candidates.push(n);
    }
    return candidates;
  }

  window.SudokuSolver = {
    generateSolved,
    countSolutions,
    solve,
    isValidPlacement,
    isPlacementLegalInBoard,
    getConflictsInBoard,
    getCandidates,
    deepCopy,
    emptyGrid,
    shuffle
  };
})();
