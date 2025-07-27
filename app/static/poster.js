// Poster Reveal game logic

document.addEventListener('DOMContentLoaded', () => {
  const img = document.getElementById('posterImg');
  const summary = document.getElementById('posterSummary');
  const revealBtn = document.getElementById('posterReveal');
  const result = document.getElementById('posterAnswer');
  const guessBtn = document.getElementById('guessBtn');
  const guessInput = document.getElementById('guessInput');
  const customDropdown = document.getElementById('customDropdown');
  
  let data = null;
  let blur = 15;
  let count = 3;
  let allTitles = [];
  let selectedIndex = -1;

  async function init() {
    const res = await fetch('/api/trivia/poster');
    data = await res.json();
    if (data.poster) {
      img.src = data.poster;
    }
    summary.textContent = data.summary.split(' ').slice(0, count).join(' ') + '...';
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

  revealBtn.addEventListener('click', () => {
    if (blur > 0) {
      blur -= 3;
      if (blur < 0) blur = 0;
      img.style.filter = `blur(${blur}px)`;
    }
    const words = data.summary.split(' ');
    if (count < words.length) {
      count += 3;
      summary.textContent = words.slice(0, count).join(' ') + '...';
    }
    if (blur === 0 && count >= words.length) {
      revealBtn.disabled = true;
      result.textContent = `Answer: ${data.title}`;
    }
  });

  guessBtn.addEventListener('click', () => {
    const guess = guessInput.value.trim().toLowerCase();
    if (!data) return;
    
    // Extract title from "Title (Year)" format if present
    const guessTitle = guess.replace(/\s*\(\d{4}\)\s*$/, '').trim();
    
    if (guessTitle === data.title.toLowerCase()) {
      result.innerHTML = `<div class='alert alert-success'>Correct! It was ${data.title}</div>`;
      revealBtn.disabled = true;
      guessBtn.disabled = true;
    } else {
      result.innerHTML = `<div class='alert alert-danger'>Try again!</div>`;
    }
  });

  loadTitles();
  init();
});
