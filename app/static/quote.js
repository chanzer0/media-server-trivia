document.addEventListener('DOMContentLoaded', () => {
  const gameArea = document.getElementById('gameArea');
  const gameLoading = document.getElementById('gameLoading');
  const roundIndicator = document.getElementById('roundIndicator');
  const quoteDisplay = document.getElementById('quoteDisplay');
  const guessInput = document.getElementById('guessInput');
  const customDropdown = document.getElementById('customDropdown');
  const guessBtn = document.getElementById('guessBtn');
  const skipBtn = document.getElementById('skipBtn');
  const result = document.getElementById('result');
  const revealArea = document.getElementById('revealArea');

  let data = null;
  let currentRound = 0;
  let gameOver = false;
  let allMovies = [];
  let selectedIndex = -1;
  let score = 0;

  const SCORE_PER_ROUND = [500, 300, 100];

  console.log('[Quote] Game initialized');

  function updateRoundIndicator() {
    const rounds = document.querySelectorAll('.round-dot');
    rounds.forEach((dot, index) => {
      if (index < currentRound) {
        dot.classList.add('used');
      } else if (index === currentRound) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active', 'used');
      }
    });
  }

  function showRound(roundIndex) {
    console.log('[Quote] Showing round:', roundIndex);
    currentRound = roundIndex;
    updateRoundIndicator();

    if (data && data.quotes && data.quotes[roundIndex]) {
      const quoteBlock = data.quotes[roundIndex];

      // Display as single paragraph block
      quoteDisplay.innerHTML = `<div class="quote-text"><div class="quote-paragraph">${quoteBlock}</div></div>`;
    }
  }

  function showDropdown(filteredMovies) {
    console.log('[Quote] showDropdown called with', filteredMovies.length, 'movies');
    customDropdown.innerHTML = '';
    const limitedMovies = filteredMovies.slice(0, 10);

    if (limitedMovies.length > 0) {
      console.log('[Quote] Creating dropdown with movies:', limitedMovies);
      limitedMovies.forEach((movie) => {
        const option = document.createElement('div');
        option.className = 'dropdown-option';
        option.textContent = movie;
        option.addEventListener('click', () => selectOption(movie));
        customDropdown.appendChild(option);
      });
      customDropdown.classList.add('show');
      console.log('[Quote] Dropdown should now be visible with class "show"');
    } else {
      console.log('[Quote] No movies to show, hiding dropdown');
      hideDropdown();
    }
  }

  function hideDropdown() {
    customDropdown.classList.remove('show');
    selectedIndex = -1;
  }

  function selectOption(movie) {
    guessInput.value = movie;
    hideDropdown();
    guessInput.focus();
  }

  function highlightOption(index) {
    const options = customDropdown.querySelectorAll('.dropdown-option');
    options.forEach((opt, i) => {
      opt.classList.toggle('highlighted', i === index);
    });
  }

  guessInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    console.log('[Quote] Input event - query:', query, 'allMovies.length:', allMovies.length);

    if (query.length > 0) {
      const filtered = allMovies.filter(movie =>
        movie.toLowerCase().includes(query)
      );
      console.log('[Quote] Filtered movies:', filtered.length, 'matches for query:', query);
      if (filtered.length > 0) {
        console.log('[Quote] Sample matches:', filtered.slice(0, 3));
      }
      showDropdown(filtered);
    } else {
      hideDropdown();
    }
    selectedIndex = -1;
  });

  guessInput.addEventListener('keydown', (e) => {
    const options = customDropdown.querySelectorAll('.dropdown-option');

    switch(e.key) {
      case 'ArrowDown':
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, options.length - 1);
        highlightOption(selectedIndex);
        break;
      case 'ArrowUp':
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, -1);
        highlightOption(selectedIndex);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && options[selectedIndex]) {
          selectOption(options[selectedIndex].textContent);
        } else {
          guessBtn.click();
        }
        break;
      case 'Escape':
        hideDropdown();
        break;
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.input-container')) {
      hideDropdown();
    }
  });

  async function loadMovies() {
    try {
      console.log('[Quote] Starting to load movies from /api/library...');
      const res = await fetch('/api/library');
      console.log('[Quote] Library API response status:', res.status);

      const data = await res.json();
      console.log('[Quote] Library API response data:', data);

      allMovies = data.movies || [];
      console.log('[Quote] Loaded movies for autocomplete:', allMovies.length);

      if (allMovies.length > 0) {
        console.log('[Quote] Sample movies:', allMovies.slice(0, 5));
      } else {
        console.warn('[Quote] No movies loaded! This will prevent autocomplete from working.');
      }
    } catch (error) {
      console.error('[Quote] Failed to load movies:', error);
      allMovies = [];
    }
  }

  async function initGame() {
    try {
      console.log('[Quote] Initializing game...');
      gameLoading.style.display = 'flex';
      gameArea.style.display = 'none';
      revealArea.style.display = 'none';
      result.innerHTML = '';
      gameOver = false;
      currentRound = 0;
      score = 0;

      console.log('[Quote] Fetching /api/trivia/quote...');
      const res = await fetch('/api/trivia/quote');
      console.log('[Quote] Response status:', res.status);

      data = await res.json();
      console.log('[Quote] Received data:', data);

      if (data.error) {
        console.error('[Quote] API returned error:', data.error);
        result.innerHTML = `<div class='result error'>${data.error}</div>`;
        gameLoading.style.display = 'none';
        return;
      }

      if (!data.quotes || data.quotes.length === 0) {
        console.error('[Quote] No quotes in response:', data);
        result.innerHTML = `<div class='result error'>No quotes available</div>`;
        gameLoading.style.display = 'none';
        return;
      }

      console.log('[Quote] Game data loaded');
      gameLoading.style.display = 'none';
      gameArea.style.display = 'block';
      guessInput.value = '';
      guessInput.disabled = false;
      guessBtn.disabled = false;
      skipBtn.disabled = false;

      const newGameBtn = document.getElementById('newGameBtn');
      if (newGameBtn) {
        newGameBtn.disabled = false;
        newGameBtn.innerHTML = `
          <svg class="btn-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
          </svg>
          New Game
        `;
      }

      showRound(0);
    } catch (error) {
      console.error('[Quote] Failed to initialize game:', error);
      result.innerHTML = `<div class='result error'>Failed to load game. Please try again.</div>`;
      gameLoading.style.display = 'none';
    }
  }

  function showReveal(won) {
    gameArea.style.display = 'none';
    revealArea.style.display = 'block';

    const revealContent = document.getElementById('revealContent');
    const statusMessage = won
      ? `<div class="success-message">🎉 Congratulations! You guessed it in round ${currentRound + 1}!<br><div class="score-display">Score: ${score} points</div></div>`
      : `<div class="fail-message">😔 Better luck next time!<br><div class="score-display">Score: 0 points</div></div>`;

    let posterHTML = '';
    if (data.tmdb && data.tmdb.poster_path) {
      posterHTML = `<img src="${data.tmdb.poster_path}" alt="${data.title}" class="answer-poster">`;
    }

    revealContent.innerHTML = `
      ${statusMessage}
      <div class="answer-reveal">
        ${posterHTML}
        <h2>The answer was: ${data.title}</h2>
        ${data.year ? `<div class="answer-year">${data.year}</div>` : ''}
      </div>
    `;
  }

  guessBtn.addEventListener('click', () => {
    if (gameOver) return;

    const guess = guessInput.value.trim();
    if (!guess || !data) return;

    hideDropdown();

    const guessLower = guess.toLowerCase().replace(/\s*\(.*?\)\s*/g, '').trim();
    const correctLower = data.title.toLowerCase();

    if (guessLower === correctLower) {
      gameOver = true;
      guessInput.disabled = true;
      guessBtn.disabled = true;
      skipBtn.disabled = true;
      score = SCORE_PER_ROUND[currentRound] || 0;
      console.log('[Quote] Correct guess! Score:', score, 'Round:', currentRound);
      showReveal(true);
    } else {
      currentRound++;

      if (currentRound < data.total_rounds) {
        showRound(currentRound);
        result.innerHTML = `<div class='result error'>❌ Incorrect. Try again! (${data.total_rounds - currentRound} attempts left)</div>`;
        guessInput.value = '';
        guessInput.focus();
      } else {
        gameOver = true;
        guessInput.disabled = true;
        guessBtn.disabled = true;
        skipBtn.disabled = true;
        result.innerHTML = `<div class='result error'>❌ Game Over!</div>`;
        setTimeout(() => showReveal(false), 1000);
      }
    }
  });

  skipBtn.addEventListener('click', () => {
    if (gameOver) return;
    if (!data) return;

    console.log('[Quote] Skip button clicked');
    hideDropdown();
    currentRound++;

    if (currentRound < data.total_rounds) {
      showRound(currentRound);
      result.innerHTML = `<div class='result'>⏭️ Skipped! (${data.total_rounds - currentRound} attempts left)</div>`;
      guessInput.value = '';
      guessInput.focus();
    } else {
      gameOver = true;
      guessInput.disabled = true;
      guessBtn.disabled = true;
      skipBtn.disabled = true;
      result.innerHTML = `<div class='result error'>❌ Game Over!</div>`;
      setTimeout(() => showReveal(false), 1000);
    }
  });

  const newGameBtn = document.getElementById('newGameBtn');
  newGameBtn.addEventListener('click', () => {
    console.log('[Quote] New game button clicked');
    newGameBtn.disabled = true;
    newGameBtn.innerHTML = '<span class="loading-spinner-small"></span> Loading...';
    initGame();
  });

  const homeBtn = document.getElementById('homeBtn');
  homeBtn.addEventListener('click', () => {
    window.location.href = '/';
  });

  loadMovies();
  initGame();
});
