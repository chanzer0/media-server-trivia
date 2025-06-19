(async function() {
  const res = await fetch('/api/trivia/cast');
  const data = await res.json();
  const titlesRes = await fetch('/api/titles');
  const titleData = await titlesRes.json();
  const dataList = document.getElementById('titles');
  titleData.titles.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t;
    dataList.appendChild(opt);
  });

  let cast = data.cast || [];
  const title = data.title || '';
  let round = 0;

  function updateProgress() {
    const width = ((round + 1) / cast.length) * 100;
    document.getElementById('roundProgress').style.width = width + '%';
  }

  if (cast.length) {
    document.getElementById('cast0').innerText = cast[0];
    updateProgress();
  }

  document.getElementById('guessBtn').addEventListener('click', () => {
    const guessInput = document.getElementById('guessInput');
    const guess = guessInput.value.trim().toLowerCase();
    if (!guess) return;
    if (guess === title.toLowerCase()) {
      document.getElementById('gameMessage').innerHTML = `<span class='text-success'>Correct! ${title}</span>`;
      cast.forEach((c, i) => {
        document.getElementById('cast' + i).innerText = c;
      });
      document.getElementById('guessBtn').disabled = true;
      document.getElementById('roundProgress').style.width = '100%';
      return;
    }
    round++;
    guessInput.value = '';
    if (round < cast.length) {
      document.getElementById('cast' + round).innerText = cast[round];
      updateProgress();
    } else {
      document.getElementById('gameMessage').innerHTML = `Out of clues! The answer was <strong>${title}</strong>`;
      document.getElementById('guessBtn').disabled = true;
      updateProgress();
    }
  });
})();
