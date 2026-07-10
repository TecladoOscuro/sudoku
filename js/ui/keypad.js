// Teclado numérico 1-9 + borrado.

(function () {
  'use strict';

  function render(onNumber, onErase) {
    const wrap = document.createElement('div');
    wrap.className = 'keypad';

    for (let n = 1; n <= 9; n++) {
      const btn = document.createElement('button');
      btn.className = 'keypad-btn';
      btn.textContent = String(n);
      btn.addEventListener('click', () => onNumber(n));
      wrap.appendChild(btn);
    }
    return wrap;
  }

  function renderEraseButton(onErase) {
    const btn = document.createElement('button');
    btn.className = 'keypad-btn keypad-erase';
    btn.innerHTML = '&#9003;';
    btn.setAttribute('aria-label', 'Borrar');
    btn.addEventListener('click', onErase);
    return btn;
  }

  window.SudokuUIKeypad = { render, renderEraseButton };
})();
