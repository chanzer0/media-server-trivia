(async function() {
  const res = await fetch('/api/trivia/poster');
  const data = await res.json();
  if (!data.poster) {
    document.getElementById('posterAnswer').innerText = data.error || 'No media found';
    document.getElementById('posterReveal').disabled = true;
    return;
  }
  document.getElementById('posterImg').src = data.poster;
  const words = data.summary.split(' ');
  let blur = 15;
  let count = 3;
  document.getElementById('posterSummary').innerText = words.slice(0, count).join(' ') + '...';
  let title = data.title;

  document.getElementById('posterReveal').addEventListener('click', () => {
    if (blur > 0) {
      blur -= 3;
      if (blur < 0) blur = 0;
      document.getElementById('posterImg').style.filter = `blur(${blur}px)`;
    }
    if (count < words.length) {
      count += 3;
      document.getElementById('posterSummary').innerText = words.slice(0, count).join(' ') + '...';
    }
    if (blur === 0 && count >= words.length) {
      document.getElementById('posterReveal').disabled = true;
      document.getElementById('posterAnswer').innerText = `Answer: ${title}`;
    }
  });
})();
