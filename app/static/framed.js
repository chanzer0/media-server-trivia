document.addEventListener('DOMContentLoaded', () => {
  const frameImage = document.getElementById('frameImage');
  const frameLoading = document.getElementById('frameLoading');
  const roundIndicator = document.getElementById('roundIndicator');
  const guessBtn = document.getElementById('guessBtn');
  const skipBtn = document.getElementById('skipBtn');
  const guessInput = document.getElementById('guessInput');
  const result = document.getElementById('result');
  const customDropdown = document.getElementById('customDropdown');
  const movieDetails = document.getElementById('movieDetails');
  const gameArea = document.getElementById('gameArea');

  let data = null;
  let currentRound = 0;
  let allTitles = [];
  let selectedIndex = -1;
  let gameOver = false;

  console.log('[Framed] Game initialized');

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

  function showFrame(roundIndex) {
    if (!data || !data.frames || roundIndex >= data.frames.length) {
      console.error('[Framed] Cannot show frame:', {data, roundIndex});
      return;
    }

    const frame = data.frames[roundIndex];
    const frameUrl = `/api/framed/frames/${frame.filename}`;

    console.log('[Framed] Loading frame:', {roundIndex, frame, frameUrl});

    // Show loading indicator
    frameLoading.style.display = 'flex';
    frameImage.style.display = 'none';

    frameImage.onload = () => {
      console.log('[Framed] Frame loaded successfully');
      frameLoading.style.display = 'none';
      frameImage.style.display = 'block';
    };

    frameImage.onerror = (error) => {
      console.error('[Framed] Frame failed to load:', error, frameUrl);
      frameLoading.querySelector('.loading-text').textContent = 'Failed to load frame';
    };

    frameImage.src = frameUrl;
    frameImage.alt = `Frame ${roundIndex + 1}`;
    currentRound = roundIndex;
    updateRoundIndicator();
  }

  function showDropdown(filteredTitles) {
    customDropdown.innerHTML = '';
    const limitedTitles = filteredTitles.slice(0, 10);

    if (limitedTitles.length > 0) {
      limitedTitles.forEach((title) => {
        const option = document.createElement('div');
        option.className = 'dropdown-option';
        option.textContent = title;
        option.addEventListener('click', () => selectOption(title));
        customDropdown.appendChild(option);
      });
      customDropdown.classList.add('show');
    } else {
      hideDropdown();
    }
  }

  function hideDropdown() {
    customDropdown.classList.remove('show');
    selectedIndex = -1;
  }

  function selectOption(title) {
    guessInput.value = title;
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

    if (query.length > 0) {
      const filtered = allTitles.filter(title =>
        title.toLowerCase().includes(query)
      );
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

  async function loadTitles() {
    try {
      const res = await fetch('/api/library');
      const library = await res.json();
      allTitles = [...library.movies, ...library.shows];
    } catch (error) {
      console.error('Failed to load titles:', error);
      allTitles = [];
    }
  }

  async function initGame() {
    try {
      console.log('[Framed] Initializing game...');
      frameLoading.style.display = 'flex';
      frameLoading.querySelector('.loading-text').textContent = 'Loading game...';
      frameImage.style.display = 'none';
      result.innerHTML = '';
      gameOver = false;
      currentRound = 0;

      console.log('[Framed] Fetching /api/trivia/framed...');
      const res = await fetch('/api/trivia/framed');
      console.log('[Framed] Response status:', res.status);

      data = await res.json();
      console.log('[Framed] Received data:', data);

      if (data.error) {
        console.error('[Framed] API returned error:', data.error);
        result.innerHTML = `<div class='result error'>${data.error}</div>`;
        frameLoading.style.display = 'none';
        return;
      }

      if (!data.frames || data.frames.length === 0) {
        console.error('[Framed] No frames in response:', data);
        result.innerHTML = `<div class='result error'>No frames available</div>`;
        frameLoading.style.display = 'none';
        return;
      }

      console.log('[Framed] Game data loaded, showing first frame');
      result.innerHTML = '';
      gameArea.style.display = 'block';
      movieDetails.style.display = 'none';
      guessInput.value = '';
      guessInput.disabled = false;
      guessBtn.disabled = false;
      skipBtn.disabled = false;

      // Reset new game button if it was used
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

      showFrame(0);
    } catch (error) {
      console.error('[Framed] Failed to initialize game:', error);
      result.innerHTML = `<div class='result error'>Failed to load game. Please try again.</div>`;
      frameLoading.style.display = 'none';
    }
  }

  function showMovieDetails(won) {
    gameArea.style.display = 'none';
    movieDetails.style.display = 'block';

    const detailsContent = document.getElementById('detailsContent');
    const statusMessage = won
      ? `<div class="success-message">🎉 Congratulations! You guessed it in round ${currentRound + 1}!</div>`
      : `<div class="fail-message">😔 Better luck next time! The movie was:</div>`;

    let castHTML = '';
    if (data.cast && data.cast.length > 0) {
      castHTML = '<div class="cast-section"><h3>Cast</h3><div class="cast-list">';
      data.cast.forEach(actor => {
        if (actor.profile_path) {
          castHTML += `
            <div class="cast-member">
              <img src="${actor.profile_path}" alt="${actor.name}" class="cast-photo">
              <div class="cast-name">${actor.name}</div>
            </div>
          `;
        } else {
          castHTML += `<div class="cast-member-text">${actor.name}</div>`;
        }
      });
      castHTML += '</div></div>';
    }

    const awardsHTML = data.awards && data.awards.length > 0
      ? `<div class="awards-section"><h3>🏆 Awards</h3><ul>${data.awards.map(a => `<li>${a}</li>`).join('')}</ul></div>`
      : '';

    detailsContent.innerHTML = `
      ${statusMessage}
      <div class="movie-title-reveal">
        <h2>${data.title}</h2>
        ${data.year ? `<div class="movie-year">(${data.year})</div>` : ''}
        ${data.director ? `<div class="movie-director">Directed by ${data.director}</div>` : ''}
      </div>
      ${castHTML}
      ${awardsHTML}
    `;
  }

  guessBtn.addEventListener('click', async () => {
    if (gameOver) return;

    const guess = guessInput.value.trim();
    if (!guess || !data) return;

    hideDropdown();

    const guessTitle = guess.toLowerCase().replace(/\s*\(\d{4}\)\s*$/, '').trim();
    const correctTitle = data.title.toLowerCase();

    if (guessTitle === correctTitle) {
      gameOver = true;
      guessInput.disabled = true;
      guessBtn.disabled = true;
      skipBtn.disabled = true;
      showMovieDetails(true);
    } else {
      currentRound++;

      if (currentRound < data.total_rounds) {
        showFrame(currentRound);
        result.innerHTML = `<div class='result error'>❌ Incorrect. Try again! (${data.total_rounds - currentRound} attempts left)</div>`;
        guessInput.value = '';
        guessInput.focus();
      } else {
        gameOver = true;
        guessInput.disabled = true;
        guessBtn.disabled = true;
        skipBtn.disabled = true;
        result.innerHTML = `<div class='result error'>❌ Game Over!</div>`;
        setTimeout(() => showMovieDetails(false), 1000);
      }
    }
  });

  skipBtn.addEventListener('click', () => {
    if (gameOver) return;
    if (!data) return;

    console.log('[Framed] Skip button clicked');
    hideDropdown();
    currentRound++;

    if (currentRound < data.total_rounds) {
      showFrame(currentRound);
      result.innerHTML = `<div class='result'>⏭️ Skipped! (${data.total_rounds - currentRound} attempts left)</div>`;
      guessInput.value = '';
      guessInput.focus();
    } else {
      gameOver = true;
      guessInput.disabled = true;
      guessBtn.disabled = true;
      skipBtn.disabled = true;
      result.innerHTML = `<div class='result error'>❌ Game Over!</div>`;
      setTimeout(() => showMovieDetails(false), 1000);
    }
  });

  const newGameBtn = document.getElementById('newGameBtn');
  newGameBtn.addEventListener('click', () => {
    console.log('[Framed] New game button clicked');
    newGameBtn.disabled = true;
    newGameBtn.innerHTML = '<span class="loading-spinner-small"></span> Loading...';
    initGame();
  });

  const homeBtn = document.getElementById('homeBtn');
  homeBtn.addEventListener('click', () => {
    window.location.href = '/';
  });

  loadTitles();
  initGame();
});
