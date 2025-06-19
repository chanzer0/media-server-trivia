// Cast Reveal Game logic

document.addEventListener('DOMContentLoaded', () => {
  const icons = document.getElementById('castIcons');
  const progress = document.getElementById('roundProgress');
  const guessBtn = document.getElementById('guessBtn');
  const guessInput = document.getElementById('guessInput');
  const result = document.getElementById('result');
  const titleList = document.getElementById('titleList');
  let data = null;
  let round = 1;

  function updateProgress() {
    progress.style.width = (round / 7 * 100) + '%';
    progress.setAttribute('aria-valuenow', round);
  }

  async function loadTitles() {
    const res = await fetch('/api/library');
    const library = await res.json();
    [...library.movies, ...library.shows].forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      titleList.appendChild(opt);
    });
  }

  async function initGame() {
    const res = await fetch('/api/trivia/cast');
    data = await res.json();
    icons.innerHTML = '';
    for (let i = 0; i < 7; i++) {
      const d = document.createElement('div');
      d.className = 'cast-circle';
      d.textContent = i === 0 && data.cast.length > 0 ? data.cast[0] : '?';
      icons.appendChild(d);
    }
    updateProgress();
  }

  guessBtn.addEventListener('click', () => {
    const guess = guessInput.value.trim().toLowerCase();
    if (!data) return;
    if (guess === data.title.toLowerCase()) {
      result.innerHTML = `<div class='alert alert-success'>Correct! It was ${data.title}</div>`;
      guessBtn.disabled = true;
    } else {
      round++;
      if (round <= data.cast.length) {
        document.querySelectorAll('.cast-circle')[round-1].textContent = data.cast[round-1];
        result.innerHTML = `<div class='alert alert-danger'>Try again!</div>`;
      } else {
        result.innerHTML = `<div class='alert alert-info'>Out of guesses. It was ${data.title}</div>`;
        guessBtn.disabled = true;
      }
      updateProgress();
    }
  });

  loadTitles();
  initGame();
});
