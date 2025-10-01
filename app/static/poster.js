// Tile-based Poster Reveal game logic

document.addEventListener('DOMContentLoaded', () => {
  const img = document.getElementById('posterImg');
  const scratchOverlay = document.getElementById('scratchOverlay');
  const scratchBtn = document.getElementById('scratchBtn');
  const scratchCount = document.getElementById('scratchCount');
  const result = document.getElementById('posterAnswer');
  const guessBtn = document.getElementById('guessBtn');
  const guessInput = document.getElementById('guessInput');
  const customDropdown = document.getElementById('customDropdown');

  let data = null;
  let revealsLeft = 5;
  let allTitles = [];
  let selectedIndex = -1;
  let score = 0;
  let tiles = [];
  let revealedCount = 0;
  const GRID_ROWS = 6;
  const GRID_COLS = 4;
  const TOTAL_TILES = GRID_ROWS * GRID_COLS;
  const TILES_PER_REVEAL = 4;

  async function initGame() {
    console.log('Initializing tile-reveal poster game...');

    try {
      const res = await fetch('/api/trivia/poster');
      data = await res.json();
      console.log('Received poster data:', data);

      if (data.poster) {
        img.src = data.poster;
        img.onload = () => {
          console.log('Poster image loaded successfully');
          setupTileOverlay();
          resetGame();
        };
      } else {
        console.error('No poster URL in data');
        result.innerHTML = `<div class='result error'>No poster available for this movie</div>`;
      }

    } catch (error) {
      console.error('Error initializing game:', error);
      result.innerHTML = `<div class='result error'>Error loading game: ${error.message}</div>`;
    }
  }

  function setupTileOverlay() {
    scratchOverlay.innerHTML = '';
    tiles = [];
    revealedCount = 0;

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const tile = document.createElement('div');
        tile.className = 'poster-tile';
        tile.style.gridRow = row + 1;
        tile.style.gridColumn = col + 1;
        tile.dataset.index = row * GRID_COLS + col;
        scratchOverlay.appendChild(tile);
        tiles.push(tile);
      }
    }

    console.log(`Created ${tiles.length} tiles in ${GRID_ROWS}x${GRID_COLS} grid`);
  }

  function resetGame() {
    revealsLeft = 5;
    score = 0;
    revealedCount = 0;
    updateRevealCounter();
    scratchBtn.disabled = false;
    scratchBtn.classList.remove('scratch-btn-disabled');
    guessInput.value = '';
    result.innerHTML = '';
    hideDropdown();

    tiles.forEach(tile => {
      tile.classList.remove('revealed');
    });

    setTimeout(() => {
      revealRandomTiles(TILES_PER_REVEAL);
      revealsLeft--;
      updateRevealCounter();
    }, 300);
  }

  function updateRevealCounter() {
    scratchCount.textContent = `(${revealsLeft} left)`;

    if (revealsLeft === 0) {
      scratchBtn.disabled = true;
      scratchBtn.classList.add('scratch-btn-disabled');
      scratchBtn.innerHTML = `
        <svg class="btn-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        All Revealed
      `;
    }
  }

  function revealRandomTiles(count) {
    const hiddenTiles = tiles.filter(tile => !tile.classList.contains('revealed'));

    if (hiddenTiles.length === 0) return;

    const tilesToReveal = Math.min(count, hiddenTiles.length);
    const shuffled = hiddenTiles.sort(() => Math.random() - 0.5);

    for (let i = 0; i < tilesToReveal; i++) {
      setTimeout(() => {
        shuffled[i].classList.add('revealed');
        revealedCount++;
      }, i * 80);
    }

    console.log(`Revealed ${tilesToReveal} tiles, total revealed: ${revealedCount}/${TOTAL_TILES}`);
  }

  // Custom dropdown functionality (reused from cast game)
  function showDropdown(filteredTitles) {
    customDropdown.innerHTML = '';
    const limitedTitles = filteredTitles.slice(0, 10);
    
    if (limitedTitles.length > 0) {
      limitedTitles.forEach((title, index) => {
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

  // Input event handlers
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

  // Click outside to close dropdown
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
      console.log(`Loaded ${allTitles.length} titles for autocomplete`);
    } catch (error) {
      console.error('Failed to load titles:', error);
      allTitles = [];
    }
  }

  // Event listeners
  scratchBtn.addEventListener('click', () => {
    if (revealsLeft > 0) {
      revealRandomTiles(TILES_PER_REVEAL);
      revealsLeft--;
      updateRevealCounter();

      // Auto-reveal answer after all reveals
      if (revealsLeft === 0) {
        setTimeout(() => {
          result.innerHTML = `<div class='result'>🎭 Answer: "${data.title}"</div>`;
        }, 1000);
      }
    }
  });

  guessBtn.addEventListener('click', () => {
    const guess = guessInput.value.trim();
    if (!data || !guess) return;

    hideDropdown();

    const guessTitle = guess.toLowerCase().replace(/\s*\(\d{4}\)\s*$/, '').trim();

    if (guessTitle === data.title.toLowerCase()) {
      score = revealsLeft * 100;
      result.innerHTML = `<div class='result success'>🎉 Correct! It was "${data.title}"<br><strong>Score: ${score} points</strong> (${revealsLeft} reveals remaining)</div>`;
      scratchBtn.disabled = true;
      scratchBtn.classList.add('scratch-btn-disabled');
      guessBtn.disabled = true;
      tiles.forEach(tile => tile.classList.add('revealed'));
    } else {
      if (revealsLeft > 0) {
        revealRandomTiles(TILES_PER_REVEAL);
        revealsLeft--;
        updateRevealCounter();
        result.innerHTML = `<div class='result error'>❌ Try again! ${revealsLeft} reveals remaining</div>`;
      } else {
        result.innerHTML = `<div class='result error'>😔 Wrong! It was "${data.title}"<br><strong>Score: 0 points</strong></div>`;
        tiles.forEach(tile => tile.classList.add('revealed'));
      }
    }
  });

  // Initialize the game
  console.log('Poster scratch-off game initialized');
  loadTitles();
  initGame();
});