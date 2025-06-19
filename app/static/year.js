let yearData = null;

async function startYearGame() {
  const res = await fetch('/api/trivia/year');
  yearData = await res.json();
  if (!yearData.title) {
    document.getElementById('yearResult').innerText = yearData.error;
    return;
  }
  document.getElementById('yearQuestion').innerText = `What year did "${yearData.title}" release?`;
}

function guessYear() {
  const value = parseInt(document.getElementById('yearInput').value, 10);
  if (value === yearData.year) {
    document.getElementById('yearResult').innerHTML = `<span class='text-success'>Correct!</span>`;
  } else {
    document.getElementById('yearResult').innerHTML = `Nope, it was ${yearData.year}`;
  }
  document.getElementById('yearSubmit').disabled = true;
}

document.getElementById('yearSubmit').addEventListener('click', guessYear);
document.addEventListener('DOMContentLoaded', startYearGame);
