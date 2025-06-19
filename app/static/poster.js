// Poster Reveal game logic

document.addEventListener('DOMContentLoaded', () => {
  const img = document.getElementById('posterImg');
  const summary = document.getElementById('posterSummary');
  const revealBtn = document.getElementById('posterReveal');
  const result = document.getElementById('posterAnswer');
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

  init();
});
