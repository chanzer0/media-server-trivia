// Cast Reveal Game logic

document.addEventListener('DOMContentLoaded', () => {
  const icons = document.getElementById('castIcons');
  const progress = document.getElementById('roundProgress');
  const guessBtn = document.getElementById('guessBtn');
  const guessInput = document.getElementById('guessInput');
  const result = document.getElementById('result');
  const titleList = document.getElementById('titleList');
  const posterImg = document.getElementById('moviePoster');
  const tagline = document.getElementById('movieTagline');
  let data = null;
  let round = 1;
  let blur = 10;

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
    blur = 10;
    if (posterImg) {
      posterImg.style.filter = `blur(${blur}px)`;
      posterImg.src = data.poster || '';
    }
    if (tagline) tagline.textContent = data.tagline || '';
    for (let i = 0; i < 7; i++) {
      const d = document.createElement('div');
      d.className = 'cast-circle';
      if (i === 0 && data.cast.length > 0) {
        if (data.cast[0].profile) {
          const img = document.createElement('img');
          img.src = data.cast[0].profile;
          img.className = 'cast-img';
          img.alt = data.cast[0].name;
          d.appendChild(img);
        } else {
          d.textContent = data.cast[0].name;
        }
      } else {
        d.textContent = '?';
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
      if (round <= data.cast.length) {
        const elem = document.querySelectorAll('.cast-circle')[round-1];
        const castMember = data.cast[round-1];
        if (castMember.profile) {
          const img = document.createElement('img');
          img.src = castMember.profile;
          img.className = 'cast-img';
          img.alt = castMember.name;
          elem.textContent = '';
          elem.appendChild(img);
        } else {
          elem.textContent = castMember.name;
        }
        if (blur > 0 && posterImg) {
          blur -= 2;
          if (blur < 0) blur = 0;
          posterImg.style.filter = `blur(${blur}px)`;
        }
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
