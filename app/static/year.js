// Guess the Year game logic

document.addEventListener('DOMContentLoaded', () => {
  const question = document.getElementById('yearQuestion');
  const guessInput = document.getElementById('yearInput');
  const guessBtn = document.getElementById('yearGuess');
  const result = document.getElementById('yearResult');
  const posterImg = document.getElementById('yearPoster');
  const tagline = document.getElementById('yearTagline');
  let data = null;

  async function newQuestion() {
    const res = await fetch('/api/trivia/year');
    data = await res.json();
    question.textContent = `What year did ${data.title} release?`;
    guessInput.value = '';
    result.textContent = '';
    posterImg.src = data.poster || '';
    tagline.textContent = data.tagline || '';
  }

  guessBtn.addEventListener('click', () => {
    const guess = parseInt(guessInput.value, 10);
    if (guess === data.year) {
      result.innerHTML = `<span class='text-success'>Correct!</span>`;
    } else {
      result.innerHTML = `<span class='text-danger'>Nope, it was ${data.year}</span>`;
    }
  });

  newQuestion();
});
