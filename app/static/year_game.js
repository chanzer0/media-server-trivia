(async function() {
  const res = await fetch('/api/trivia/year');
  const data = await res.json();
  if (!data.title) {
    document.getElementById('question').innerText = data.error || 'No media found';
    document.getElementById('yearGuess').disabled = true;
    return;
  }
  document.getElementById('question').innerText = `What year was "${data.title}" released?`;
  const answer = data.year;

  document.getElementById('yearGuess').addEventListener('click', () => {
    const guess = parseInt(document.getElementById('yearInput').value, 10);
    if (guess === answer) {
      document.getElementById('yearResult').innerHTML = `<span class='text-success'>Correct!</span>`;
    } else {
      document.getElementById('yearResult').innerHTML = `Nope, it was ${answer}`;
    }
  });
})();
