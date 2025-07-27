// Guess the Year game logic

document.addEventListener('DOMContentLoaded', () => {
  const movieTitle = document.getElementById('movieTitle');
  const movieSummary = document.getElementById('movieSummary');
  const movieCastSection = document.getElementById('movieCastSection');
  const movieCast = document.getElementById('movieCast');
  const guessInput = document.getElementById('yearInput');
  const guessBtn = document.getElementById('yearGuess');
  const result = document.getElementById('yearResult');
  const nextBtn = document.getElementById('nextBtn');
  let data = null;

  async function newQuestion() {
    console.log('Starting new question...');
    
    try {
      movieTitle.textContent = 'Loading...';
      movieSummary.textContent = '';
      movieCastSection.style.display = 'none';
      movieCast.innerHTML = '';
      result.innerHTML = '';
      guessInput.value = '';
      
      console.log('Fetching trivia data...');
      const res = await fetch('/api/trivia/year');
      
      if (!res.ok) {
        console.error('API response not OK:', res.status, res.statusText);
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      console.log('Parsing JSON response...');
      data = await res.json();
      console.log('Received data:', data);
      
      if (!data) {
        console.error('No data received from API');
        movieTitle.textContent = 'Error: No data received';
        return;
      }
      
      if (!data.title) {
        console.error('Missing title in data:', data);
        movieTitle.textContent = 'Error: Missing movie title';
        return;
      }
      
      if (!data.year) {
        console.error('Missing year in data:', data);
      }
      
      console.log('Updating UI with movie data...');
      movieTitle.textContent = data.title;
      
      if (data.summary) {
        movieSummary.textContent = data.summary;
        console.log('Set summary:', data.summary.substring(0, 100) + '...');
      } else {
        movieSummary.textContent = 'No summary available.';
        console.log('No summary available in data');
      }
      
      // Display cast if available
      if (data.cast && data.cast.length > 0) {
        console.log('Displaying cast:', data.cast.length, 'actors');
        displayCast(data.cast);
        movieCastSection.style.display = 'block';
      } else {
        console.log('No cast data available');
        movieCastSection.style.display = 'none';
      }
      
      console.log('Question loaded successfully for:', data.title, '(' + data.year + ')');
      
    } catch (error) {
      console.error('Error in newQuestion():', error);
      movieTitle.textContent = 'Error loading movie';
      movieSummary.textContent = 'Please try refreshing the page.';
      result.innerHTML = `<div class='result error'>Error: ${error.message}</div>`;
    }
  }

  function displayCast(castData) {
    movieCast.innerHTML = '';
    
    castData.slice(0, 4).forEach(actor => {
      const castMember = document.createElement('div');
      castMember.className = 'movie-cast-member';
      
      if (actor.profile_path) {
        // Show actor photo
        const img = document.createElement('img');
        img.src = actor.profile_path;
        img.alt = actor.name;
        img.className = 'movie-cast-photo';
        castMember.appendChild(img);
      } else {
        // Show placeholder
        const placeholder = document.createElement('div');
        placeholder.className = 'movie-cast-placeholder';
        placeholder.textContent = '👤';
        castMember.appendChild(placeholder);
      }
      
      const nameDiv = document.createElement('div');
      nameDiv.className = 'movie-cast-name';
      nameDiv.textContent = actor.name;
      castMember.appendChild(nameDiv);
      
      movieCast.appendChild(castMember);
    });
  }

  function showResult(isCorrect, correctYear) {
    if (isCorrect) {
      result.innerHTML = `<div class='result success'>🎉 Correct! It was released in ${correctYear}</div>`;
    } else {
      result.innerHTML = `<div class='result error'>❌ Not quite! It was released in ${correctYear}</div>`;
    }
    
    // Show next button
    if (nextBtn) {
      nextBtn.style.display = 'inline-flex';
    }
  }

  guessBtn.addEventListener('click', () => {
    console.log('Guess button clicked');
    
    if (!data) {
      console.error('No data available for comparison');
      result.innerHTML = `<div class='result error'>Error: No movie data loaded</div>`;
      return;
    }
    
    const guess = parseInt(guessInput.value, 10);
    console.log('User guess:', guess, 'Correct year:', data.year);
    
    if (isNaN(guess)) {
      result.innerHTML = `<div class='result error'>Please enter a valid year</div>`;
      return;
    }
    
    const isCorrect = guess === data.year;
    showResult(isCorrect, data.year);
  });

  // Next button functionality
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      console.log('Next button clicked');
      nextBtn.style.display = 'none';
      newQuestion();
    });
  }

  // Enter key support
  guessInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      guessBtn.click();
    }
  });

  console.log('Year game initialized, loading first question...');
  newQuestion();
});