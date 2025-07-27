// Cast Reveal Game logic

document.addEventListener('DOMContentLoaded', () => {
  const icons = document.getElementById('castIcons');
  const progress = document.getElementById('roundProgress');
  const guessBtn = document.getElementById('guessBtn');
  const guessInput = document.getElementById('guessInput');
  const result = document.getElementById('result');
  const customDropdown = document.getElementById('customDropdown');
  
  let data = null;
  let round = 1;
  let allTitles = [];
  let selectedIndex = -1;

  function updateButtonText() {
    const hasInput = guessInput.value.trim().length > 0;
    
    if (hasInput) {
      guessBtn.innerHTML = `
        Submit Guess
        <svg class="btn-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
        </svg>
      `;
    } else {
      guessBtn.innerHTML = `
        Skip
        <svg class="btn-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
        </svg>
      `;
    }
  }

  function updateProgress() {
    const progressPercent = (round / 12 * 100);
    progress.style.width = progressPercent + '%';
    progress.setAttribute('aria-valuenow', round);
  }

  // Custom dropdown functionality
  function showDropdown(filteredTitles) {
    customDropdown.innerHTML = '';
    
    // Limit to top 10 results
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
    updateButtonText();
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
    } catch (error) {
      console.error('Failed to load titles:', error);
      allTitles = [];
    }
  }

  async function initGame() {
    try {
      const res = await fetch('/api/trivia/cast');
      data = await res.json();
      icons.innerHTML = '';
      
      // Create 12 cast circles
      for (let i = 0; i < 12; i++) {
        const d = document.createElement('div');
        d.className = 'cast-circle';
        
        if (i === 0 && data.cast.length > 0) {
          // Reveal first cast member
          const actor = data.cast[0];
          createCastMember(d, actor);
          d.classList.add('revealed');
        } else {
          d.textContent = '?';
        }
        
        icons.appendChild(d);
      }
      updateProgress();
    } catch (error) {
      console.error('Failed to initialize game:', error);
      result.innerHTML = `<div class='result error'>Failed to load game. Please try again.</div>`;
    }
  }

  function createCastMember(element, actor) {
    element.innerHTML = '';
    
    if (actor.profile_path) {
      // Show actor photo
      const img = document.createElement('img');
      img.src = actor.profile_path;
      img.alt = actor.name;
      img.className = 'cast-photo';
      element.appendChild(img);
      
      const nameDiv = document.createElement('div');
      nameDiv.className = 'cast-name';
      nameDiv.textContent = actor.name;
      element.appendChild(nameDiv);
    } else {
      // Fallback to text name
      element.textContent = actor.name || actor;
    }
  }

  async function startNewGame() {
    // Reset game state
    round = 1;
    guessBtn.disabled = false;
    guessInput.value = '';
    result.innerHTML = '';
    hideDropdown();
    updateButtonText();
    
    // Load new game
    await initGame();
  }

  guessBtn.addEventListener('click', async () => {
    const guess = guessInput.value.trim();
    if (!data) return;
    
    hideDropdown();
    
    // If no input (skip mode), just reveal next cast member
    if (!guess) {
      round++;
      const maxRounds = Math.min(12, data.cast.length);
      
      if (round <= maxRounds) {
        const castCircles = document.querySelectorAll('.cast-circle');
        const castCircle = castCircles[round-1];
        const actor = data.cast[round-1];
        
        createCastMember(castCircle, actor);
        castCircle.classList.add('revealed');
        
        const remaining = maxRounds - round + 1;
        result.innerHTML = `<div class='result'>⏭️ Skipped! ${remaining} hints remaining</div>`;
      } else {
        result.innerHTML = `<div class='result error'>😔 Out of guesses! It was "${data.title}"</div>`;
        guessBtn.disabled = true;
        guessBtn.innerHTML = 'Game Over';
        
        // Offer to start new game
        setTimeout(() => {
          result.innerHTML += `
            <button class="btn btn-primary mt-3" onclick="window.location.reload()">
              Play Again
            </button>
          `;
        }, 1500);
      }
      updateProgress();
      return;
    }
    
    // Extract title from "Title (Year)" format if present
    const guessTitle = guess.toLowerCase().replace(/\s*\(\d{4}\)\s*$/, '').trim();
    
    if (guessTitle === data.title.toLowerCase()) {
      result.innerHTML = `<div class='result success'>🎉 Correct! It was "${data.title}"</div>`;
      guessBtn.disabled = true;
      guessBtn.innerHTML = '<span class="loading"></span> Loading new game...';
      
      // Start new game after a delay
      setTimeout(async () => {
        await startNewGame();
      }, 2000);
    } else {
      round++;
      const maxRounds = Math.min(12, data.cast.length);
      
      if (round <= maxRounds) {
        const castCircles = document.querySelectorAll('.cast-circle');
        const castCircle = castCircles[round-1];
        const actor = data.cast[round-1];
        
        createCastMember(castCircle, actor);
        castCircle.classList.add('revealed');
        
        const remaining = maxRounds - round + 1;
        result.innerHTML = `<div class='result error'>❌ Try again! ${remaining} hints remaining</div>`;
      } else {
        result.innerHTML = `<div class='result error'>😔 Out of guesses! It was "${data.title}"</div>`;
        guessBtn.disabled = true;
        guessBtn.innerHTML = 'Game Over';
        
        // Offer to start new game
        setTimeout(() => {
          result.innerHTML += `
            <button class="btn btn-primary mt-3" onclick="window.location.reload()">
              Play Again
            </button>
          `;
        }, 1500);
      }
      updateProgress();
    }
  });

  // Initialize the game
  loadTitles();
  initGame();
  updateButtonText();
});