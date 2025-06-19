let castData = null;
let index = 0;
let titles = [];

async function loadLibrary() {
  const res = await fetch('/api/library');
  const data = await res.json();
  titles = data.titles || [];
  const list = document.getElementById('titlesList');
  list.innerHTML = titles.map(t => `<option value="${t}"></option>`).join('');
}

async function startGame() {
  const res = await fetch('/api/trivia/cast');
  castData = await res.json();
  if (!castData.cast) {
    document.getElementById('castResult').innerText = castData.error;
    return;
  }
  renderCircles();
}

function renderCircles() {
  const container = document.getElementById('castCircles');
  container.innerHTML = '';
  const total = 7;
  for (let i = 0; i < total; i++) {
    const div = document.createElement('div');
    div.className = 'cast-circle d-flex align-items-center justify-content-center';
    div.textContent = i <= index ? (castData.cast[i] || '?') : '?';
    container.appendChild(div);
  }
  const pct = (index / (total - 1)) * 100;
  document.getElementById('castProgress').style.width = pct + '%';
}

function handleGuess() {
  const guess = document.getElementById('castGuess').value.trim().toLowerCase();
  if (!guess) return;
  if (guess === castData.title.toLowerCase()) {
    document.getElementById('castResult').innerHTML = `<span class='text-success'>Correct! It was ${castData.title}.</span>`;
    document.getElementById('castGuessBtn').disabled = true;
  } else {
    if (index < 6) {
      index++;
      renderCircles();
      document.getElementById('castGuess').value = '';
    } else {
      document.getElementById('castResult').innerHTML = `Answer: ${castData.title}`;
      document.getElementById('castGuessBtn').disabled = true;
    }
  }
}

document.getElementById('castGuessBtn').addEventListener('click', handleGuess);
document.addEventListener('DOMContentLoaded', () => {
  loadLibrary();
  startGame();
});
