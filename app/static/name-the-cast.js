document.addEventListener('DOMContentLoaded', () => {
  const gameLoading = document.getElementById('gameLoading');
  const gameArea = document.getElementById('gameArea');
  const revealArea = document.getElementById('revealArea');
  const revealContent = document.getElementById('revealContent');
  const roundIndicator = document.getElementById('roundIndicator');
  const movieCard = document.getElementById('movieCard');
  const actorSlots = document.getElementById('actorSlots');
  const result = document.getElementById('result');
  const guessInput = document.getElementById('guessInput');
  const guessBtn = document.getElementById('guessBtn');
  const skipBtn = document.getElementById('skipBtn');
  const customDropdown = document.getElementById('customDropdown');
  const roundLabel = document.getElementById('roundLabel');
  const solvedLabel = document.getElementById('solvedLabel');
  const scoreLabel = document.getElementById('scoreLabel');
  const newGameBtn = document.getElementById('newGameBtn');
  const homeBtn = document.getElementById('homeBtn');

  let gameData = null;
  let allActors = [];
  let currentRound = 1;
  let gameOver = false;
  let score = 0;
  let selectedIndex = -1;
  const solvedSlots = new Set();

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizeName(value) {
    if (!value) return '';

    const transliterationMap = {
      'ß': 'ss',
      'ẞ': 'ss',
      'ø': 'o',
      'Ø': 'o',
      'ð': 'd',
      'Ð': 'd',
      'þ': 'th',
      'Þ': 'th',
      'ł': 'l',
      'Ł': 'l',
      'æ': 'ae',
      'Æ': 'ae',
      'œ': 'oe',
      'Œ': 'oe',
    };

    const transliterated = String(value).replace(
      /[ßẞøØðÐþÞłŁæÆœŒ]/g,
      (char) => transliterationMap[char] || char
    );

    return transliterated
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function compactName(value) {
    return String(value || '').replace(/\s+/g, '');
  }

  function levenshteinDistance(a, b) {
    const s = compactName(a);
    const t = compactName(b);
    const m = s.length;
    const n = t.length;

    if (m === 0) return n;
    if (n === 0) return m;

    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i += 1) dp[i][0] = i;
    for (let j = 0; j <= n; j += 1) dp[0][j] = j;

    for (let i = 1; i <= m; i += 1) {
      for (let j = 1; j <= n; j += 1) {
        const cost = s[i - 1] === t[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost
        );
      }
    }

    return dp[m][n];
  }

  function showResult(message, type = '') {
    const css = type ? `result ${type}` : 'result';
    result.innerHTML = `<div class="${css}">${message}</div>`;
  }

  function updateScoreRow() {
    if (!gameData) return;
    roundLabel.textContent = `${currentRound} / ${gameData.total_rounds}`;
    solvedLabel.textContent = `${solvedSlots.size} / ${gameData.required_count}`;
    scoreLabel.textContent = `${score}`;
  }

  function buildRoundDots() {
    roundIndicator.innerHTML = '';
    for (let i = 0; i < gameData.total_rounds; i++) {
      const dot = document.createElement('div');
      dot.className = 'round-dot';
      roundIndicator.appendChild(dot);
    }
  }

  function updateRoundIndicator() {
    const dots = roundIndicator.querySelectorAll('.round-dot');
    dots.forEach((dot, idx) => {
      const roundNumber = idx + 1;
      if (roundNumber < currentRound) {
        dot.classList.add('used');
        dot.classList.remove('active');
      } else if (roundNumber === currentRound) {
        dot.classList.add('active');
        dot.classList.remove('used');
      } else {
        dot.classList.remove('active', 'used');
      }
    });
  }

  function renderMovieCard() {
    if (!gameData) return;

    const year = gameData.year ? `(${gameData.year})` : '';
    const director = gameData.director ? `Director: ${gameData.director}` : 'Director: Unknown';
    const genres = (gameData.genres && gameData.genres.length > 0)
      ? `Genres: ${gameData.genres.join(', ')}`
      : 'Genres: Unknown';

    const posterHtml = gameData.poster
      ? `<img class="movie-poster-large" src="${escapeHtml(gameData.poster)}" alt="${escapeHtml(gameData.title)} poster">`
      : '<div class="movie-poster-placeholder">Poster unavailable</div>';

    movieCard.innerHTML = `
      ${posterHtml}
      <div class="movie-meta">
        <h3>${escapeHtml(gameData.title)} ${escapeHtml(year)}</h3>
        <div class="movie-facts">${escapeHtml(director)} | ${escapeHtml(genres)}</div>
        <p class="movie-summary">${escapeHtml(gameData.summary || 'No summary available')}</p>
      </div>
    `;
  }

  function renderActorSlots() {
    if (!gameData) return;

    actorSlots.innerHTML = '';
    gameData.targets.forEach((target) => {
      const solved = solvedSlots.has(target.slot);
      const card = document.createElement('div');
      card.className = solved ? 'actor-slot solved' : 'actor-slot';

      if (solved) {
        card.innerHTML = `
          ${target.profile_path ? `<img class="actor-photo" src="${escapeHtml(target.profile_path)}" alt="${escapeHtml(target.name)}">` : ''}
          <h4>${escapeHtml(target.name)}</h4>
          <div class="actor-hint"><strong>Character:</strong> ${escapeHtml(target.hints.character || 'Unknown')}</div>
          <div class="actor-hint"><strong>Initials:</strong> ${escapeHtml(target.hints.initials || 'Unknown')}</div>
        `;
        actorSlots.appendChild(card);
        return;
      }

      const hintParts = [];
      hintParts.push('<div class="actor-hint"><strong>Status:</strong> Hidden cast member</div>');

      if (currentRound >= 2) {
        hintParts.push(`<div class="actor-hint"><strong>Initials:</strong> ${escapeHtml(target.hints.initials || 'Unknown')}</div>`);
      }

      if (currentRound >= 3) {
        hintParts.push(`<div class="actor-hint"><strong>Birth:</strong> ${escapeHtml(target.hints.birth || 'Birth date unavailable')}</div>`);
      }

      if (currentRound >= 4) {
        const firstMovie = (target.hints.other_movies && target.hints.other_movies[0]) || 'No known title available';
        hintParts.push(`<div class="actor-hint"><strong>Other Movie:</strong> ${escapeHtml(firstMovie)}</div>`);
      }

      if (currentRound >= 5) {
        const secondMovie = (target.hints.other_movies && target.hints.other_movies[1]) || 'No second title available';
        hintParts.push(`<div class="actor-hint"><strong>Another Movie:</strong> ${escapeHtml(secondMovie)}</div>`);
        hintParts.push(`<div class="actor-hint"><strong>Character:</strong> ${escapeHtml(target.hints.character || 'Character unavailable')}</div>`);
      }

      const profileHtml = (currentRound >= 6 && target.profile_path)
        ? `<img class="actor-photo" src="${escapeHtml(target.profile_path)}" alt="Hidden cast member photo">`
        : '';

      card.innerHTML = `
        ${profileHtml}
        <h4>Actor #${target.slot}</h4>
        ${hintParts.join('')}
      `;
      actorSlots.appendChild(card);
    });
  }

  function showDropdown(filteredActors) {
    customDropdown.innerHTML = '';
    const options = filteredActors.slice(0, 10);
    if (options.length === 0) {
      hideDropdown();
      return;
    }

    options.forEach((actor) => {
      const option = document.createElement('div');
      option.className = 'dropdown-option';
      option.textContent = actor;
      option.addEventListener('click', () => {
        guessInput.value = actor;
        hideDropdown();
        guessInput.focus();
      });
      customDropdown.appendChild(option);
    });
    customDropdown.classList.add('show');
  }

  function hideDropdown() {
    customDropdown.classList.remove('show');
    selectedIndex = -1;
  }

  function highlightOption(index) {
    const options = customDropdown.querySelectorAll('.dropdown-option');
    options.forEach((opt, idx) => {
      opt.classList.toggle('highlighted', idx === index);
    });
  }

  function getUnsolvedTargets() {
    return gameData.targets.filter((target) => !solvedSlots.has(target.slot));
  }

  function findMatch(guess) {
    const normalizedGuess = normalizeName(guess);
    if (!normalizedGuess) return null;

    const unsolved = getUnsolvedTargets();
    const exact = unsolved.find((target) => normalizedGuess === target.normalized_name);
    if (exact) return exact;

    const compactGuess = compactName(normalizedGuess);
    const compactExact = unsolved.find(
      (target) => compactGuess === compactName(target.normalized_name)
    );
    if (compactExact) return compactExact;

    const fuzzyMatches = unsolved.filter((target) => {
      const distance = levenshteinDistance(normalizedGuess, target.normalized_name);
      const maxLen = Math.max(
        compactGuess.length,
        compactName(target.normalized_name).length
      );
      const threshold = maxLen >= 12 ? 2 : 1;
      return distance <= threshold;
    });
    if (fuzzyMatches.length === 1) {
      return fuzzyMatches[0];
    }

    const lastNameMatches = unsolved.filter((target) => {
      const parts = target.normalized_name.split(' ');
      if (parts.length < 2) return false;
      return normalizedGuess === parts[parts.length - 1];
    });

    if (lastNameMatches.length === 1) {
      return lastNameMatches[0];
    }

    return null;
  }

  function disableGameInputs() {
    guessInput.disabled = true;
    guessBtn.disabled = true;
    skipBtn.disabled = true;
  }

  function advanceRound(reasonText) {
    if (currentRound >= gameData.total_rounds) {
      endGame(false);
      return;
    }

    currentRound += 1;
    updateRoundIndicator();
    updateScoreRow();
    renderActorSlots();
    showResult(reasonText, 'error');
    guessInput.value = '';
    guessInput.focus();
  }

  function endGame(won) {
    gameOver = true;
    disableGameInputs();
    gameArea.style.display = 'none';
    revealArea.style.display = 'block';

    const message = won
      ? `<div class="success-message">You solved all cast members! Final score: ${score}</div>`
      : `<div class="fail-message">Out of rounds. Final score: ${score}</div>`;

    const revealCards = gameData.targets.map((target) => {
      const solved = solvedSlots.has(target.slot);
      const cardClass = solved ? 'actor-slot solved' : 'actor-slot missed';
      const statusText = solved ? 'Solved' : 'Missed';
      const firstMovie = (target.hints.other_movies && target.hints.other_movies[0]) || 'No known title available';
      const secondMovie = (target.hints.other_movies && target.hints.other_movies[1]) || 'No second title available';

      return `
        <div class="${cardClass}">
          ${target.profile_path ? `<img class="actor-photo" src="${escapeHtml(target.profile_path)}" alt="${escapeHtml(target.name)}">` : ''}
          <h4>${escapeHtml(target.name)}</h4>
          <div class="actor-hint"><strong>Status:</strong> ${escapeHtml(statusText)}</div>
          <div class="actor-hint"><strong>Initials:</strong> ${escapeHtml(target.hints.initials || 'Unknown')}</div>
          <div class="actor-hint"><strong>Birth:</strong> ${escapeHtml(target.hints.birth || 'Birth date unavailable')}</div>
          <div class="actor-hint"><strong>Other Movie:</strong> ${escapeHtml(firstMovie)}</div>
          <div class="actor-hint"><strong>Another Movie:</strong> ${escapeHtml(secondMovie)}</div>
          <div class="actor-hint"><strong>Character:</strong> ${escapeHtml(target.hints.character || 'Character unavailable')}</div>
        </div>
      `;
    }).join('');

    revealContent.innerHTML = `
      ${message}
      <div class="answer-reveal">
        <h3>${escapeHtml(gameData.title)} ${gameData.year ? `(${escapeHtml(gameData.year)})` : ''}</h3>
        <p>Required cast members: ${gameData.required_count}</p>
      </div>
      <div class="actor-slots">${revealCards}</div>
    `;
  }

  function handleGuess() {
    if (gameOver || !gameData) return;

    const guess = guessInput.value.trim();
    if (!guess) {
      showResult('Enter a cast name or use Skip Round.', 'error');
      return;
    }

    hideDropdown();

    const match = findMatch(guess);
    if (!match) {
      advanceRound(`Incorrect guess. Moving to round ${Math.min(currentRound + 1, gameData.total_rounds)} for more hints.`);
      return;
    }

    if (solvedSlots.has(match.slot)) {
      showResult(`${escapeHtml(match.name)} is already solved.`, 'error');
      return;
    }

    solvedSlots.add(match.slot);
    score += gameData.score_by_round[currentRound - 1] || 0;
    renderActorSlots();
    updateScoreRow();
    showResult(`Correct: ${escapeHtml(match.name)} (+${gameData.score_by_round[currentRound - 1] || 0} points)`, 'success');
    guessInput.value = '';
    guessInput.focus();

    if (solvedSlots.size === gameData.required_count) {
      endGame(true);
    }
  }

  async function loadActorAutocomplete() {
    try {
      const res = await fetch('/api/actors');
      const data = await res.json();
      allActors = data.actors || [];
    } catch (error) {
      console.error('[NameTheCast] Failed to load actors:', error);
      allActors = [];
    }
  }

  async function initGame() {
    try {
      gameOver = false;
      gameLoading.style.display = 'flex';
      gameArea.style.display = 'none';
      revealArea.style.display = 'none';
      result.innerHTML = '';
      guessInput.value = '';
      guessInput.disabled = false;
      guessBtn.disabled = false;
      skipBtn.disabled = false;
      solvedSlots.clear();
      currentRound = 1;
      score = 0;

      const res = await fetch('/api/trivia/name-the-cast');
      gameData = await res.json();

      if (!res.ok || gameData.error) {
        throw new Error(gameData.error || 'Failed to load game');
      }

      buildRoundDots();
      updateRoundIndicator();
      renderMovieCard();
      renderActorSlots();
      updateScoreRow();

      gameLoading.style.display = 'none';
      gameArea.style.display = 'block';
      guessInput.focus();
    } catch (error) {
      console.error('[NameTheCast] init failed:', error);
      gameLoading.style.display = 'none';
      gameArea.style.display = 'block';
      showResult(error.message || 'Failed to load game.', 'error');
      disableGameInputs();
    }
  }

  guessInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    if (!query) {
      hideDropdown();
      return;
    }
    const filtered = allActors.filter((actor) => actor.toLowerCase().includes(query));
    showDropdown(filtered);
    selectedIndex = -1;
  });

  guessInput.addEventListener('keydown', (e) => {
    const options = customDropdown.querySelectorAll('.dropdown-option');
    switch (e.key) {
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
          guessInput.value = options[selectedIndex].textContent || '';
          hideDropdown();
        } else {
          handleGuess();
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

  guessBtn.addEventListener('click', handleGuess);
  skipBtn.addEventListener('click', () => {
    if (gameOver || !gameData) return;
    hideDropdown();
    advanceRound(`Round skipped. Moving to round ${Math.min(currentRound + 1, gameData.total_rounds)} for more hints.`);
  });

  newGameBtn.addEventListener('click', () => {
    newGameBtn.disabled = true;
    initGame().finally(() => {
      newGameBtn.disabled = false;
    });
  });

  homeBtn.addEventListener('click', () => {
    window.location.href = '/';
  });

  loadActorAutocomplete();
  initGame();
});
