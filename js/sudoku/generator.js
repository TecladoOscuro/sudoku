// Generador de puzzles por dificultad.
// Algoritmo:
//   1) Generar grid resuelta con SudokuSolver.generateSolved().
//   2) Crear lista de celdas a vaciar (con/sin simetría 180° según dificultad).
//   3) Recorrer la lista en orden aleatorio, intentando vaciar cada celda.
//   4) Tras cada vaciado, verificar unicidad con countSolutions(..., 2).
//   5) Si la grid sigue teniendo 1 única solución, mantener vacía la celda.
//      Si tiene 2+, revertir y seguir.
//   6) Parar al alcanzar el target de pistas; si se acaban las celdas antes, devolver el mejor.
//
// Referencia: 101computing.net/sudoku-generator-algorithm/ + trekhleb/javascript-algorithms.

(function () {
  'use strict';

  const DIFFICULTY = {
    easy:   { targetGivens: 42, symmetric: true,  label: 'Fácil'   },
    medium: { targetGivens: 33, symmetric: true,  label: 'Medio'   },
    hard:   { targetGivens: 30, symmetric: true,  label: 'Difícil' },
    extreme:{ targetGivens: 25, symmetric: false, label: 'Extremo' }
  };

  function difficultyLabel(level) {
    return (DIFFICULTY[level] && DIFFICULTY[level].label) || 'Medio';
  }

  // Construye la lista de celdas a intentar vaciar.
  // Modo simétrico: devuelve un array de PARES [[r1,c1], [r2,c2]] (celda y su opuesta 180°)
  //   que se procesan juntos (vaciar/revertir ambas a la vez para preservar simetría).
  //   La celda central (4,4) es un singleton.
  // Modo asimétrico: devuelve array de celdas individuales [r,c].
  function buildRemovalOrder(symmetric) {
    const cells = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        cells.push([r, c]);
      }
    }
    if (symmetric) {
      const pairs = [];
      const seen = new Set();
      for (const [r, c] of cells) {
        const k = r * 9 + c;
        if (seen.has(k)) continue;
        const rr = 8 - r;
        const cc = 8 - c;
        const k2 = rr * 9 + cc;
        if (k === k2) {
          pairs.push([[r, c]]);
        } else {
          pairs.push([[r, c], [rr, cc]]);
        }
        seen.add(k);
        seen.add(k2);
      }
      return SudokuSolver.shuffle(pairs);
    } else {
      return SudokuSolver.shuffle(cells);
    }
  }

  // Cuenta pistas actuales (celdas no nulas) en el puzzle.
  function countGivens(puzzle) {
    let n = 0;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (puzzle[r][c] !== 0) n++;
      }
    }
    return n;
  }

  // Intenta generar un puzzle del nivel dado. Retorna { puzzle, solution }.
  // `timeoutMs` acota la generación para no bloquear la UI.
  function generate(level, timeoutMs) {
    const cfg = DIFFICULTY[level] || DIFFICULTY.medium;
    const start = Date.now();
    const deadline = timeoutMs || 3000;

    const solution = SudokuSolver.generateSolved();
    const puzzle = SudokuSolver.deepCopy(solution);

    const order = buildRemovalOrder(cfg.symmetric);
    const totalCells = 81;

    for (const cellOrPair of order) {
      if (Date.now() - start > deadline) break;
      if (countGivens(puzzle) <= cfg.targetGivens) break;

      // Modo asimétrico: cellOrPair = [r,c] (números planos).
      // Modo simétrico: cellOrPair = [[r1,c1]] (singleton) o [[r1,c1],[r2,c2]] (par).
      // Diferenciamos mirando el primer elemento: si es número → asimétrico; si es array → simétrico.
      let cells;
      if (typeof cellOrPair[0] === 'number') {
        cells = [cellOrPair];
      } else {
        cells = cellOrPair;
      }

      // Saltar si alguna celda ya está vacía
      let allFilled = true;
      for (const [r, c] of cells) {
        if (puzzle[r][c] === 0) { allFilled = false; break; }
      }
      if (!allFilled) continue;

      // Backup y vaciado temporal
      const backup = cells.map(([r, c]) => puzzle[r][c]);
      for (const [r, c] of cells) puzzle[r][c] = 0;

      // Verificar unicidad
      const solutions = SudokuSolver.countSolutions(puzzle, 2);
      if (solutions !== 1) {
        // Revertir todas las celdas del par
        for (let i = 0; i < cells.length; i++) {
          puzzle[cells[i][0]][cells[i][1]] = backup[i];
        }
      }
    }

    return { puzzle, solution };
  }

  // Genera un puzzle válido con unicidad garantizada. Más lento pero estricto.
  // Usado en reintentos si generate() falla en alcanzar el target.
  function generateStrict(level, maxRetries) {
    const retries = maxRetries || 5;
    for (let i = 0; i < retries; i++) {
      const { puzzle, solution } = generate(level, 5000);
      const givens = countGivens(puzzle);
      if (givens >= ((DIFFICULTY[level] || DIFFICULTY.medium).targetGivens - 2)) {
        return { puzzle, solution };
      }
    }
    return generate(level, 8000);
  }

  window.SudokuGenerator = {
    DIFFICULTY,
    difficultyLabel,
    generate,
    generateStrict,
    countGivens
  };
})();
