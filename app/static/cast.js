// Cast Reveal Game logic

document.addEventListener('DOMContentLoaded', () => {
  const icons = document.getElementById('castIcons');
  const progress = document.getElementById('roundProgress');
  const guessBtn = document.getElementById('guessBtn');
  const guessInput = document.getElementById('guessInput');
  const result = document.getElementById('result');
  const titleList = document.getElementById('titleList');
  const posterImg = document.getElementById('castPoster');
  const tagline = document.getElementById('castTagline');
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

  function setCast(el, info) {
    el.innerHTML = '';
    if (!info) {
      el.textContent = '?';
      return;
    }
    if (info.profile_path) {
      const img = document.createElement('img');
      img.src = 'https://image.tmdb.org/t/p/w185' + info.profile_path;
      img.alt = info.name;
      img.className = 'cast-img';
      el.appendChild(img);
    } else {
      el.textContent = info.name || '?';
    }
  }

  async function initGame() {
    const res = await fetch('/api/trivia/cast');
    data = await res.json();
    icons.innerHTML = '';
    posterImg.src = data.poster || '';
    tagline.textContent = data.tagline || '';
    for (let i = 0; i < 7; i++) {
      const d = document.createElement('div');
      d.className = 'cast-circle';
      if (i === 0) {
        setCast(d, data.tmdb_cast[i] || {name: data.cast[i]});
      } else {
        setCast(d, null);
      }
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
      if (round <= data.tmdb_cast.length || round <= data.cast.length) {
        const info = data.tmdb_cast[round-1] || {name: data.cast[round-1]};
        setCast(document.querySelectorAll('.cast-circle')[round-1], info);
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
