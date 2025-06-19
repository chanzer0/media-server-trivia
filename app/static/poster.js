// Poster Reveal game logic

document.addEventListener('DOMContentLoaded', () => {
  const img = document.getElementById('posterImg');
  const summary = document.getElementById('posterSummary');
  const revealBtn = document.getElementById('posterReveal');
  const result = document.getElementById('posterAnswer');
  const guessInput = document.getElementById('posterGuessInput');
  const guessBtn = document.getElementById('posterGuessBtn');
  const titleList = document.getElementById('posterTitleList');
  let data = null;
  let blur = 15;
  let count = 3;

  async function init() {
    const res = await fetch('/api/trivia/poster');
    data = await res.json();
    if (data.poster) {
      img.src = data.poster;
    }
    summary.textContent = data.summary.split(' ').slice(0, count).join(' ') + '...';
  }

  revealBtn.addEventListener('click', () => {
    if (blur > 0) {
      blur -= 3;
      if (blur < 0) blur = 0;
      img.style.filter = `blur(${blur}px)`;
    }
    const words = data.summary.split(' ');
    if (count < words.length) {
      count += 3;
      summary.textContent = words.slice(0, count).join(' ') + '...';
    }
    if (blur === 0 && count >= words.length) {
      revealBtn.disabled = true;
      result.textContent = `Answer: ${data.title}`;
    }
  });

  guessBtn.addEventListener('click', () => {
    const guess = guessInput.value.trim().toLowerCase();
    if (!data) return;
    if (guess === data.title.toLowerCase()) {
      result.innerHTML = `<div class='alert alert-success'>Correct! It was ${data.title}</div>`;
      revealBtn.disabled = true;
      guessBtn.disabled = true;
    } else {
      result.innerHTML = `<div class='alert alert-danger'>Try again!</div>`;
    }
  });

  async function loadTitles() {
    const res = await fetch('/api/library');
    const library = await res.json();
    [...library.movies, ...library.shows].forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      titleList.appendChild(opt);
    });
  }

  loadTitles();
  init();
});
