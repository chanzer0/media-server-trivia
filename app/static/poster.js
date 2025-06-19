let posterData = null;
let blur = 15;
let count = 3;

async function startPosterGame() {
  const res = await fetch('/api/trivia/poster');
  posterData = await res.json();
  if (!posterData.poster) {
    document.getElementById('posterResult').innerText = posterData.error;
    return;
  }
  document.getElementById('posterImage').src = posterData.poster;
  document.getElementById('posterSummary').innerText = posterData.summary.split(' ').slice(0, count).join(' ') + '...';
}

function revealMore() {
  if (blur > 0) {
    blur -= 3;
    if (blur < 0) blur = 0;
    document.getElementById('posterImage').style.filter = `blur(${blur}px)`;
  }
  const words = posterData.summary.split(' ');
  if (count < words.length) {
    count += 3;
    document.getElementById('posterSummary').innerText = words.slice(0, count).join(' ') + '...';
  }
  const progress = ((15 - blur) / 15) * 100;
  document.getElementById('posterProgress').style.width = progress + '%';
  if (blur === 0 && count >= words.length) {
    document.getElementById('posterReveal').disabled = true;
    document.getElementById('posterResult').innerText = `Answer: ${posterData.title}`;
  }
}

document.getElementById('posterReveal').addEventListener('click', revealMore);
document.addEventListener('DOMContentLoaded', startPosterGame);
