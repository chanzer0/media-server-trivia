document.addEventListener('DOMContentLoaded', () => {
  const phase1 = document.getElementById('phase1');
  const phase2 = document.getElementById('phase2');
  const phaseStep1 = document.getElementById('phaseStep1');
  const phaseStep2 = document.getElementById('phaseStep2');
  const finalScoreDiv = document.getElementById('finalScore');

  const icons = document.getElementById('castIcons');
  const progress = document.getElementById('roundProgress');
  const guessBtn = document.getElementById('guessBtn');
  const skipBtn = document.getElementById('skipBtn');
  const guessInput = document.getElementById('guessInput');
  const result = document.getElementById('result');
  const customDropdown = document.getElementById('customDropdown');

  const directorGuessBtn = document.getElementById('directorGuess');
  const directorSkipBtn = document.getElementById('directorSkip');
  const directorInput = document.getElementById('directorInput');
  const directorDropdown = document.getElementById('directorDropdown');
  const directorResult = document.getElementById('directorResult');
  const movieTitle = document.getElementById('movieTitle');
  const movieYear = document.getElementById('movieYear');
  const movieSummary = document.getElementById('movieSummary');

  let data = null;
  let round = 1;
  let allTitles = [];
  let allDirectors = [];
  let selectedIndex = -1;
  let directorSelectedIndex = -1;
  let movieScore = 0;
  let directorScore = 0;

  const MOVIE_SCORE_PER_ROUND = [500, 400, 300, 200, 150, 100, 75, 50, 40, 30, 20, 10];

  async function loadTitles() {
    try {
      const res = await fetch('/api/library');
      const libData = await res.json();
      allTitles = libData.movies || [];
    } catch (error) {
      console.error('Failed to load movie titles:', error);
    }
  }

  async function loadDirectors() {
    try {
      const res = await fetch('/api/directors');
      const dirData = await res.json();
      allDirectors = dirData.directors || [];
      console.log('[Timeline] Loaded directors:', allDirectors.length);
    } catch (error) {
      console.error('Failed to load directors:', error);
    }
  }

  async function loadGame() {
    try {
      const res = await fetch('/api/trivia/timeline');
      data = await res.json();

      if (!data || !data.cast) {
        result.innerHTML = '<div class="result error">Failed to load game data</div>';
        return;
      }

      renderCast();
      updateProgress();
    } catch (error) {
      console.error('Failed to load game:', error);
      result.innerHTML = '<div class="result error">Failed to load game. Please try again.</div>';
    }
  }

  function renderCast() {
    icons.innerHTML = '';
    const visibleCast = data.cast.slice(0, round);

    visibleCast.forEach(actor => {
      const iconDiv = document.createElement('div');
      iconDiv.className = 'cast-icon';

      if (actor.profile_path) {
        iconDiv.innerHTML = `
          <img src="${actor.profile_path}" alt="${actor.name}" class="cast-photo">
          <div class="cast-name">${actor.name}</div>
          ${actor.character ? `<div class="cast-character">as ${actor.character}</div>` : ''}
        `;
      } else {
        iconDiv.innerHTML = `
          <div class="cast-placeholder">
            <svg class="placeholder-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
          <div class="cast-name">${actor.name}</div>
          ${actor.character ? `<div class="cast-character">as ${actor.character}</div>` : ''}
        `;
      }

      icons.appendChild(iconDiv);
    });
  }

  function updateProgress() {
    const progressPercent = (round / 12 * 100);
    progress.style.width = progressPercent + '%';
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
      hideDirectorDropdown();
    }
  });

  function showDirectorDropdown(filteredDirectors) {
    directorDropdown.innerHTML = '';
    const limitedDirectors = filteredDirectors.slice(0, 10);

    if (limitedDirectors.length > 0) {
      limitedDirectors.forEach((director) => {
        const option = document.createElement('div');
        option.className = 'dropdown-option';
        option.textContent = director;
        option.addEventListener('click', () => selectDirectorOption(director));
        directorDropdown.appendChild(option);
      });
      directorDropdown.classList.add('show');
    } else {
      hideDirectorDropdown();
    }
  }

  function hideDirectorDropdown() {
    directorDropdown.classList.remove('show');
    directorSelectedIndex = -1;
  }

  function selectDirectorOption(director) {
    directorInput.value = director;
    hideDirectorDropdown();
    directorInput.focus();
  }

  function highlightDirectorOption(index) {
    const options = directorDropdown.querySelectorAll('.dropdown-option');
    options.forEach((opt, i) => {
      opt.classList.toggle('highlighted', i === index);
    });
  }

  directorInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();

    if (query.length > 0) {
      const filtered = allDirectors.filter(director =>
        director.toLowerCase().includes(query)
      );
      showDirectorDropdown(filtered);
    } else {
      hideDirectorDropdown();
    }
    directorSelectedIndex = -1;
  });

  directorInput.addEventListener('keydown', (e) => {
    const options = directorDropdown.querySelectorAll('.dropdown-option');

    switch(e.key) {
      case 'ArrowDown':
        e.preventDefault();
        directorSelectedIndex = Math.min(directorSelectedIndex + 1, options.length - 1);
        highlightDirectorOption(directorSelectedIndex);
        break;
      case 'ArrowUp':
        e.preventDefault();
        directorSelectedIndex = Math.max(directorSelectedIndex - 1, -1);
        highlightDirectorOption(directorSelectedIndex);
        break;
      case 'Enter':
        e.preventDefault();
        if (directorSelectedIndex >= 0 && options[directorSelectedIndex]) {
          selectDirectorOption(options[directorSelectedIndex].textContent);
        } else {
          directorGuessBtn.click();
        }
        break;
      case 'Escape':
        hideDirectorDropdown();
        break;
    }
  });

  guessBtn.addEventListener('click', () => {
    const guess = guessInput.value.trim();

    if (!guess || !data) {
      if (round < 12) {
        round++;
        renderCast();
        updateProgress();
        result.innerHTML = '<div class="result">⏭️ Skipped round. Showing more cast...</div>';
      }
      return;
    }

    hideDropdown();

    const guessLower = guess.toLowerCase().replace(/\s*\(.*?\)\s*/g, '').trim();
    const correctLower = data.title.toLowerCase();

    if (guessLower === correctLower) {
      movieScore = MOVIE_SCORE_PER_ROUND[round - 1] || 10;
      result.innerHTML = `<div class="result success">✅ Correct! Movie guessed in round ${round}! (+${movieScore} points)</div>`;
      guessInput.disabled = true;
      guessBtn.disabled = true;
      skipBtn.disabled = true;

      setTimeout(() => {
        phase1.style.display = 'none';
        phase2.style.display = 'block';
        phaseStep1.classList.remove('active');
        phaseStep2.classList.add('active');

        movieTitle.textContent = data.title;
        movieYear.textContent = data.year ? `Released in ${data.year}` : '';
        movieSummary.textContent = data.summary || 'No summary available';
        directorInput.focus();
      }, 1500);
    } else {
      if (round < 12) {
        round++;
        renderCast();
        updateProgress();
        result.innerHTML = '<div class="result error">❌ Incorrect. Showing more cast...</div>';
        guessInput.value = '';
      } else {
        result.innerHTML = `<div class="result error">❌ Game Over! The answer was: ${data.title}</div>`;
        guessInput.disabled = true;
        guessBtn.disabled = true;
        skipBtn.disabled = true;

        setTimeout(() => {
          phase1.style.display = 'none';
          phase2.style.display = 'block';
          phaseStep1.classList.remove('active');
          phaseStep2.classList.add('active');

          movieTitle.textContent = data.title;
          movieYear.textContent = data.year ? `Released in ${data.year}` : '';
          movieSummary.textContent = data.summary || 'No summary available';
          directorInput.focus();
        }, 2000);
      }
    }
  });

  skipBtn.addEventListener('click', () => {
    if (!data) return;

    hideDropdown();

    if (round < 12) {
      round++;
      renderCast();
      updateProgress();
      result.innerHTML = '<div class="result">⏭️ Skipped! Showing more cast...</div>';
      guessInput.value = '';
      guessInput.focus();
    } else {
      result.innerHTML = `<div class="result error">❌ Game Over! The answer was: ${data.title}</div>`;
      guessInput.disabled = true;
      guessBtn.disabled = true;
      skipBtn.disabled = true;

      setTimeout(() => {
        phase1.style.display = 'none';
        phase2.style.display = 'block';
        phaseStep1.classList.remove('active');
        phaseStep2.classList.add('active');

        movieTitle.textContent = data.title;
        movieYear.textContent = data.year ? `Released in ${data.year}` : '';
        movieSummary.textContent = data.summary || 'No summary available';
        directorInput.focus();
      }, 2000);
    }
  });

  directorGuessBtn.addEventListener('click', () => {
    const guess = directorInput.value.trim();
    if (!guess || !data) return;

    hideDirectorDropdown();

    if (!data.director) {
      directorResult.innerHTML = `<div class="result error">⚠️ No director information available for this movie</div>`;
      directorInput.disabled = true;
      directorGuessBtn.disabled = true;
      directorSkipBtn.disabled = true;
      setTimeout(() => showFinalScore(), 2000);
      return;
    }

    const guessLower = guess.toLowerCase();
    const correctLower = data.director.toLowerCase();

    if (guessLower === correctLower) {
      directorScore = 300;
      directorResult.innerHTML = `<div class="result success">🎬 Perfect! Correct director! (+${directorScore} points)</div>`;
    } else {
      directorScore = 0;
      directorResult.innerHTML = `<div class="result error">🎬 Not quite. The director was ${data.director}</div>`;
    }

    directorInput.disabled = true;
    directorGuessBtn.disabled = true;
    directorSkipBtn.disabled = true;

    setTimeout(() => showFinalScore(), 2000);
  });

  directorSkipBtn.addEventListener('click', () => {
    if (!data) return;

    hideDirectorDropdown();

    directorScore = 0;
    const directorText = data.director ? `The director was ${data.director}` : 'No director information available';
    directorResult.innerHTML = `<div class="result">⏭️ Skipped! ${directorText}</div>`;

    directorInput.disabled = true;
    directorGuessBtn.disabled = true;
    directorSkipBtn.disabled = true;

    setTimeout(() => showFinalScore(), 2000);
  });

  function showFinalScore() {
    phase2.style.display = 'none';
    finalScoreDiv.style.display = 'block';

    document.getElementById('movieScore').textContent = `${movieScore} points`;
    document.getElementById('directorScore').textContent = `${directorScore} points`;
    document.getElementById('totalScore').textContent = `${movieScore + directorScore} points`;
  }

  loadTitles();
  loadDirectors();
  loadGame();
});
