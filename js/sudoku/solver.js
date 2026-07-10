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

  // Backtracking iterativo (sin recursión profunda) con selección aleatoria.
  // Lanza excepción si supera el presupuesto de tiempo u operaciones.
  function fillRest(grid, budget) {
    const stack = [];
    // Empuja estados para celdas vacías, en orden de fila/columna
    while (true) {
      if (budget.timedOut()) {
        throw new Error('SudokuSolver: fillRest timeout');
      }
      // Buscar siguiente celda vacía
      let r = -1, c = -1;
      outer:
      for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
          if (grid[i][j] === 0) { r = i; c = j; break outer; }
        }
      }
      if (r === -1) return true; // grid llena
      // Probar candidatos
      const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      let placed = false;
      for (const n of nums) {
        budget.tick();
        if (isValidPlacement(grid, r, c, n)) {
          grid[r][c] = n;
          stack.push({ r, c, tried: 0, nums });
          placed = true;
          break;
        }
      }
      if (placed) continue;
      // Backtrack
      while (stack.length > 0) {
        if (budget.timedOut()) throw new Error('SudokuSolver: fillRest timeout');
        const frame = stack[stack.length - 1];
        grid[frame.r][frame.c] = 0;
        // Buscar siguiente candidato no probado
        let next = null;
        for (let i = frame.tried; i < frame.nums.length; i++) {
          budget.tick();
          if (isValidPlacement(grid, frame.r, frame.c, frame.nums[i])) {
            next = i;
            break;
          }
        }
        if (next !== null) {
          frame.tried = next + 1;
          grid[frame.r][frame.c] = frame.nums[next];
          break;
        }
        // Deshacer y subir un nivel
        stack.pop();
        if (stack.length === 0) return false; // no hay solución
      }
    }
  }

  // Presupuesto de tiempo: limita wall-clock y ticks.
  function makeBudget(maxMs) {
    const start = Date.now();
    const max = maxMs || 1000;
    let ticks = 0;
    return {
      tick() { ticks++; },
      timedOut() {
        if (ticks++ > 5_000_000) return true;
        return (Date.now() - start) > max;
      }
    };
  }

  // Genera una grid completamente resuelta y válida. Lanza si supera presupuesto.
  function generateSolved(maxMs) {
    const deadline = maxMs || 1000;
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        const grid = emptyGrid();
        fillDiagonalBoxes(grid);
        fillRest(grid, makeBudget(deadline));
        return grid;
      } catch (e) {
        if (attempt === 9) throw e;
        // Reintento
      }
    }
    throw new Error('SudokuSolver: generateSolved failed');
  }

  // Cuenta soluciones hasta `limit` (0 = ilimitado). Iterativo, sin recursión profunda.
  // No modifica `grid` (trabaja sobre copia interna).
  // Modelo: el frame activo es la ÚLTIMA decisión pendiente. El frame decide
  // para su celda (r,c). Cuando coloca, su `pos` avanza a la siguiente celda
  // vacía y continúa decidiendo. Cuando agota candidatos, hace pop (deshaciendo
  // su valor). Cuando un frame alcanza `pos === 81` (recorrió toda la grid sin
  // celdas vacías), ha encontrado una solución completa: count++ y pop.
  function countSolutions(grid, limit) {
    const maxSolutions = limit > 0 ? limit : Infinity;
    const work = deepCopy(grid);
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
        if (work[r][c] !== 0) used[r][c] = 1 << work[r][c];
      }
    }

    // Helper: dada work y used, encontrar siguiente celda vacía a partir de pos.
    // Retorna {r, c} o null.
    function findNextEmpty(fromPos) {
      for (let p = fromPos; p < 81; p++) {
        const r = Math.floor(p / 9);
        const c = p % 9;
        if (work[r][c] === 0) return { r, c, p };
      }
      return null;
    }

    // Stack: cada frame es { r, c, candidates, idx, nextPos }
    // - r, c: celda que este frame está decidiendo
    // - candidates, idx: candidatos y posición actual
    // - nextPos: siguiente celda a explorar si coloca el candidato (o null si no hay)
    const first = findNextEmpty(0);
    if (!first) {
      // Grid ya llena
      return work.every((row) => row.every((v) => v >= 1 && v <= 9)) ? 1 : 0;
    }
    const stack = [{
      r: first.r, c: first.c, p: first.p,
      candidates: null, idx: 0, nextPos: 0
    }];
    let ops = 0;

    while (stack.length > 0) {
      if (++ops > 5_000_000) break;
      if (count >= maxSolutions) break;
      const frame = stack[stack.length - 1];

      if (frame.candidates === null) {
        let mask = 0;
        for (let i = 0; i < 9; i++) {
          mask |= used[frame.r][i] | used[i][frame.c];
        }
        const br = Math.floor(frame.r / 3) * 3;
        const bc = Math.floor(frame.c / 3) * 3;
        for (let rr = br; rr < br + 3; rr++) {
          for (let cc = bc; cc < bc + 3; cc++) {
            mask |= used[rr][cc];
          }
        }
        const available = ALL_BITS & ~mask;
        const cands = [];
        for (let n = 1; n <= 9; n++) {
          if (available & (1 << n)) cands.push(n);
        }
        frame.candidates = cands;
        frame.idx = 0;
        // Calcular la siguiente celda vacía (la que verá el siguiente frame)
        const next = findNextEmpty(frame.p + 1);
        frame.next = next;
      }

      if (frame.idx < frame.candidates.length) {
        const n = frame.candidates[frame.idx++];
        used[frame.r][frame.c] = 1 << n;
        work[frame.r][frame.c] = n;
        if (!frame.next) {
          // No hay más celdas vacías: ¡solución encontrada!
          count++;
          // Deshacer el valor colocado por este frame
          work[frame.r][frame.c] = 0;
          used[frame.r][frame.c] = 0;
          // Pop del frame: el padre probará su siguiente candidato
          stack.pop();
        } else {
          // Empujar frame hijo para la siguiente celda vacía
          stack.push({
            r: frame.next.r, c: frame.next.c, p: frame.next.p,
            candidates: null, idx: 0, next: null
          });
        }
      } else {
        // Agotados candidatos sin éxito: deshacer (si había colocado algo)
        if (frame.idx > 0) {
          work[frame.r][frame.c] = 0;
          used[frame.r][frame.c] = 0;
        }
        stack.pop();
      }
    }
    return count;
  }

  // Solver simple: devuelve la primera solución encontrada o null.
  function solve(grid) {
    const work = deepCopy(grid);
    function findNextEmpty(fromPos) {
      for (let p = fromPos; p < 81; p++) {
        const r = Math.floor(p / 9);
        const c = p % 9;
        if (work[r][c] === 0) return { r, c, p };
      }
      return null;
    }
    const first = findNextEmpty(0);
    if (!first) return work; // ya resuelta
    const stack = [{ r: first.r, c: first.c, p: first.p, candidates: null, idx: 0, next: null }];
    let ops = 0;

    while (stack.length > 0) {
      if (++ops > 5_000_000) return null;
      const frame = stack[stack.length - 1];
      if (frame.candidates === null) {
        const cands = [];
        for (let n = 1; n <= 9; n++) {
          if (isValidPlacement(work, frame.r, frame.c, n)) cands.push(n);
        }
        frame.candidates = cands;
        frame.idx = 0;
        frame.next = findNextEmpty(frame.p + 1);
      }
      if (frame.idx < frame.candidates.length) {
        const n = frame.candidates[frame.idx++];
        work[frame.r][frame.c] = n;
        if (!frame.next) {
          return deepCopy(work); // solución completa
        }
        stack.push({ r: frame.next.r, c: frame.next.c, p: frame.next.p, candidates: null, idx: 0, next: null });
      } else {
        if (frame.idx > 0) {
          work[frame.r][frame.c] = 0;
        }
        stack.pop();
      }
    }
    return null;
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
