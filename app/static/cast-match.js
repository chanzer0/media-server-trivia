document.addEventListener('DOMContentLoaded', () => {
  const gameArea = document.getElementById('gameArea');
  const gameLoading = document.getElementById('gameLoading');
  const roundIndicator = document.getElementById('roundIndicator');
  const moviesGrid = document.getElementById('moviesGrid');
  const guessInput = document.getElementById('guessInput');
  const customDropdown = document.getElementById('customDropdown');
  const guessBtn = document.getElementById('guessBtn');
  const skipBtn = document.getElementById('skipBtn');
  const result = document.getElementById('result');
  const revealArea = document.getElementById('revealArea');

  let data = null;
  let currentRound = 0;
  let gameOver = false;
  let allActors = [];
  let selectedIndex = -1;
  let score = 0;

  const SCORE_PER_ROUND = [400, 300, 200, 100];

  console.log('[CastMatch] Game initialized');

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
    console.log('[CastMatch] Showing round:', roundIndex);
    currentRound = roundIndex;
    updateRoundIndicator();

    moviesGrid.innerHTML = '';

    data.movies.forEach((movie) => {
      const card = document.createElement('div');
      card.className = 'movie-card';

      const showTitle = roundIndex >= 0;
      const showPoster = roundIndex >= 1;
      const showDirector = roundIndex >= 2;
      const showCastAndAwards = roundIndex >= 3;

      let posterHTML = '';
      if (showPoster && movie.poster) {
        posterHTML = `<img src="${movie.poster}" alt="Movie poster" class="movie-poster">`;
      } else {
        posterHTML = '<div class="movie-poster hidden-placeholder">[Movie Poster hidden until round 2]</div>';
      }

      let titleHTML = '';
      if (showTitle) {
        titleHTML = `<h3 class="movie-title">${movie.title}${movie.year ? ` (${movie.year})` : ''}</h3>`;
      } else {
        titleHTML = '<div class="movie-title hidden-placeholder">[Movie Title hidden until round 1]</div>';
      }

      let directorHTML = '';
      if (showDirector && movie.director) {
        directorHTML = `<div class="movie-director">Directed by ${movie.director}</div>`;
      } else if (!showDirector) {
        directorHTML = '<div class="movie-director hidden-placeholder">[Director hidden until round 3]</div>';
      }

      let castHTML = '';
      if (showCastAndAwards && movie.cast && movie.cast.length > 0) {
        castHTML = '<div class="cast-section"><h4>Cast</h4><div class="cast-list">';
        movie.cast.forEach(actor => {
          if (actor.profile_path) {
            castHTML += `
              <div class="cast-member">
                <img src="${actor.profile_path}" alt="${actor.name}" class="cast-photo">
                <div class="cast-info">
                  <div class="cast-name">${actor.name}</div>
                  ${actor.character ? `<div class="cast-character">as ${actor.character}</div>` : ''}
                </div>
              </div>
            `;
          } else {
            const characterText = actor.character ? ` (as ${actor.character})` : '';
            castHTML += `<div class="cast-member-text">${actor.name}${characterText}</div>`;
          }
        });
        castHTML += '</div></div>';
      } else if (!showCastAndAwards) {
        castHTML = '<div class="cast-section-hidden hidden-placeholder">[Cast hidden until round 4]</div>';
      }

      let genresHTML = '';
      if (showCastAndAwards && movie.genres && movie.genres.length > 0) {
        genresHTML = `<div class="genres-section"><strong>Genres:</strong> ${movie.genres.join(', ')}</div>`;
      } else if (!showCastAndAwards) {
        genresHTML = '<div class="genres-section-hidden hidden-placeholder">[Genres hidden until round 4]</div>';
      }

      let ratingHTML = '';
      if (showCastAndAwards && movie.rating) {
        const roundedRating = Math.round(movie.rating * 10) / 10;
        ratingHTML = `<div class="rating-section"><strong>Rating:</strong> ⭐ ${roundedRating}/10</div>`;
      } else if (!showCastAndAwards) {
        ratingHTML = '<div class="rating-section-hidden hidden-placeholder">[Rating hidden until round 4]</div>';
      }

      let overviewHTML = '';
      if (showCastAndAwards && movie.overview) {
        overviewHTML = `<div class="overview-section"><strong>Plot:</strong> ${movie.overview}</div>`;
      } else if (!showCastAndAwards) {
        overviewHTML = '<div class="overview-section-hidden hidden-placeholder">[Plot Summary hidden until round 4]</div>';
      }

      card.innerHTML = `
        ${posterHTML}
        <div class="movie-info">
          ${titleHTML}
          ${directorHTML}
          ${genresHTML}
          ${ratingHTML}
          ${overviewHTML}
          ${castHTML}
        </div>
      `;

      moviesGrid.appendChild(card);
    });
  }

  function showDropdown(filteredActors) {
    console.log('[CastMatch] showDropdown called with', filteredActors.length, 'actors');
    customDropdown.innerHTML = '';
    const limitedActors = filteredActors.slice(0, 10);

    if (limitedActors.length > 0) {
      console.log('[CastMatch] Creating dropdown with actors:', limitedActors);
      limitedActors.forEach((actor) => {
        const option = document.createElement('div');
        option.className = 'dropdown-option';
        option.textContent = actor;
        option.addEventListener('click', () => selectOption(actor));
        customDropdown.appendChild(option);
      });
      customDropdown.classList.add('show');
      console.log('[CastMatch] Dropdown should now be visible with class "show"');
    } else {
      console.log('[CastMatch] No actors to show, hiding dropdown');
      hideDropdown();
    }
  }

  function hideDropdown() {
    customDropdown.classList.remove('show');
    selectedIndex = -1;
  }

  function selectOption(actor) {
    guessInput.value = actor;
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
    console.log('[CastMatch] Input event - query:', query, 'allActors.length:', allActors.length);

    if (query.length > 0) {
      const filtered = allActors.filter(actor =>
        actor.toLowerCase().includes(query)
      );
      console.log('[CastMatch] Filtered actors:', filtered.length, 'matches for query:', query);
      if (filtered.length > 0) {
        console.log('[CastMatch] Sample matches:', filtered.slice(0, 3));
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

  async function loadActors() {
    try {
      console.log('[CastMatch] Starting to load actors from /api/actors...');
      const res = await fetch('/api/actors');
      console.log('[CastMatch] Actors API response status:', res.status);

      const data = await res.json();
      console.log('[CastMatch] Actors API response data:', data);

      allActors = data.actors || [];
      console.log('[CastMatch] Loaded actors for autocomplete:', allActors.length);

      if (allActors.length > 0) {
        console.log('[CastMatch] Sample actors:', allActors.slice(0, 5));
      } else {
        console.warn('[CastMatch] No actors loaded! This will prevent autocomplete from working.');
      }
    } catch (error) {
      console.error('[CastMatch] Failed to load actors:', error);
      allActors = [];
    }
  }

  async function initGame() {
    try {
      console.log('[CastMatch] Initializing game...');
      gameLoading.style.display = 'flex';
      gameArea.style.display = 'none';
      revealArea.style.display = 'none';
      result.innerHTML = '';
      gameOver = false;
      currentRound = 0;
      score = 0;

      console.log('[CastMatch] Fetching /api/trivia/cast-match...');
      const res = await fetch('/api/trivia/cast-match');
      console.log('[CastMatch] Response status:', res.status);

      data = await res.json();
      console.log('[CastMatch] Received data:', data);

      if (data.error) {
        console.error('[CastMatch] API returned error:', data.error);
        result.innerHTML = `<div class='result error'>${data.error}</div>`;
        gameLoading.style.display = 'none';
        return;
      }

      if (!data.movies || data.movies.length === 0) {
        console.error('[CastMatch] No movies in response:', data);
        result.innerHTML = `<div class='result error'>No movies available</div>`;
        gameLoading.style.display = 'none';
        return;
      }

      console.log('[CastMatch] Game data loaded');
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
      console.error('[CastMatch] Failed to initialize game:', error);
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

    revealContent.innerHTML = `
      ${statusMessage}
      <div class="answer-reveal">
        <h2>The answer was: ${data.answer}</h2>
        <div class="movies-appeared">Appeared in ${data.movie_count} movie${data.movie_count > 1 ? 's' : ''}</div>
      </div>
    `;
  }

  guessBtn.addEventListener('click', () => {
    if (gameOver) return;

    const guess = guessInput.value.trim();
    if (!guess || !data) return;

    hideDropdown();

    const guessLower = guess.toLowerCase();
    const correctLower = data.answer.toLowerCase();

    if (guessLower === correctLower) {
      gameOver = true;
      guessInput.disabled = true;
      guessBtn.disabled = true;
      skipBtn.disabled = true;
      score = SCORE_PER_ROUND[currentRound] || 0;
      console.log('[CastMatch] Correct guess! Score:', score, 'Round:', currentRound);
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

    console.log('[CastMatch] Skip button clicked');
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
    console.log('[CastMatch] New game button clicked');
    newGameBtn.disabled = true;
    newGameBtn.innerHTML = '<span class="loading-spinner-small"></span> Loading...';
    initGame();
  });

  const homeBtn = document.getElementById('homeBtn');
  homeBtn.addEventListener('click', () => {
    window.location.href = '/';
  });

  loadActors();
  initGame();
});
