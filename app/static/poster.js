// Scratch-off Poster Reveal game logic

document.addEventListener('DOMContentLoaded', () => {
  const img = document.getElementById('posterImg');
  const scratchOverlay = document.getElementById('scratchOverlay');
  const scratchSurface = document.querySelector('.scratch-surface');
  const scratchHolesSvg = document.querySelector('.scratch-holes');
  const scratchBtn = document.getElementById('scratchBtn');
  const scratchCount = document.getElementById('scratchCount');
  const result = document.getElementById('posterAnswer');
  const guessBtn = document.getElementById('guessBtn');
  const guessInput = document.getElementById('guessInput');
  const customDropdown = document.getElementById('customDropdown');
  
  let data = null;
  let scratchesLeft = 5;
  let scratchHoles = [];
  let allTitles = [];
  let selectedIndex = -1;
  let usedPositions = []; // Track used positions to prevent overlap

  // Tiger/lion claw scratch patterns - MASSIVE SVG paths that cover large poster areas
  const scratchPatterns = [
    // Enormous three-claw diagonal scratch (covers half the poster diagonally)
    {
      type: 'path',
      d: 'M-50,-50 Q50,50 150,150 Q250,250 350,350 Q450,450 550,550 M-30,-70 Q70,30 170,130 Q270,230 370,330 Q470,430 570,530 M-10,-90 Q90,10 190,110 Q290,210 390,310 Q490,410 590,510',
      transform: 'rotate(45)',
      strokeWidth: '35'
    },
    // Massive horizontal claw marks (span entire width)
    {
      type: 'path', 
      d: 'M-100,80 Q0,100 100,120 Q200,100 300,80 Q400,100 500,120 Q600,100 700,80 M-100,140 Q0,160 100,180 Q200,160 300,140 Q400,160 500,180 Q600,160 700,140 M-100,200 Q0,220 100,240 Q200,220 300,200 Q400,220 500,240 Q600,220 700,200',
      transform: 'rotate(0)',
      strokeWidth: '32'
    },
    // Enormous vertical scratch marks (span entire height)
    {
      type: 'path',
      d: 'M80,-100 Q100,0 120,100 Q100,200 80,300 Q100,400 120,500 Q100,600 80,700 M140,-100 Q160,0 180,100 Q160,200 140,300 Q160,400 180,500 Q160,600 140,700 M200,-100 Q220,0 240,100 Q220,200 200,300 Q220,400 240,500 Q220,600 200,700',
      transform: 'rotate(90)',
      strokeWidth: '34'
    },
    // Gigantic curved claw swipe (massive arc across poster)
    {
      type: 'path',
      d: 'M-50,-50 Q100,150 250,350 Q400,550 550,750 Q700,950 850,1150 M-10,-90 Q140,110 290,310 Q440,510 590,710 Q740,910 890,1110 M30,-130 Q180,70 330,270 Q480,470 630,670 Q780,870 930,1070',
      transform: 'rotate(-30)',
      strokeWidth: '38'
    },
    // Colossal single gash (diagonal slash across entire poster)
    {
      type: 'path',
      d: 'M-100,0 Q0,100 100,200 Q200,300 300,400 Q400,500 500,600 Q600,700 700,800 Q800,900 900,1000',
      transform: 'rotate(60)',
      strokeWidth: '45'
    },
    // Gigantic X-pattern claw marks (corner to corner)
    {
      type: 'path',
      d: 'M-100,-100 Q0,0 100,100 Q200,200 300,300 Q400,400 500,500 Q600,600 700,700 M700,-100 Q600,0 500,100 Q400,200 300,300 Q200,400 100,500 Q0,600 -100,700',
      transform: 'rotate(0)',
      strokeWidth: '40'
    },
    // Massive jagged claw tear (irregular ripping pattern)
    {
      type: 'path',
      d: 'M-50,100 L50,80 L150,120 L250,90 L350,130 L450,100 L550,140 L650,110 M-30,160 L70,140 L170,180 L270,150 L370,190 L470,160 L570,200 L670,170 M-10,220 L90,200 L190,240 L290,210 L390,250 L490,220 L590,260 L690,230',
      transform: 'rotate(15)',
      strokeWidth: '28'
    }
  ];

  async function initGame() {
    console.log('Initializing scratch-off poster game...');
    
    try {
      const res = await fetch('/api/trivia/poster');
      data = await res.json();
      console.log('Received poster data:', data);
      
      if (data.poster) {
        img.src = data.poster;
        img.onload = () => {
          console.log('Poster image loaded successfully');
          setupScratchOverlay();
        };
      } else {
        console.error('No poster URL in data');
        result.innerHTML = `<div class='result error'>No poster available for this movie</div>`;
      }
      
      resetGame();
      
    } catch (error) {
      console.error('Error initializing game:', error);
      result.innerHTML = `<div class='result error'>Error loading game: ${error.message}</div>`;
    }
  }

  function setupScratchOverlay() {
    // Set up SVG with proper viewBox for coordinate system
    scratchHolesSvg.style.width = '100%';
    scratchHolesSvg.style.height = '100%';
    scratchHolesSvg.setAttribute('viewBox', '0 0 400 600'); // Standard poster aspect ratio
    scratchHolesSvg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    
    // Create mask for the scratch surface
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const mask = document.createElementNS('http://www.w3.org/2000/svg', 'mask');
    mask.id = 'scratchMask';
    
    // White background (shows the surface)
    const maskRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    maskRect.setAttribute('width', '400');
    maskRect.setAttribute('height', '600');
    maskRect.setAttribute('fill', 'white');
    mask.appendChild(maskRect);
    
    defs.appendChild(mask);
    scratchHolesSvg.appendChild(defs);
    
    // Apply mask to scratch surface
    scratchSurface.style.mask = 'url(#scratchMask)';
    scratchSurface.style.webkitMask = 'url(#scratchMask)';
    
    console.log('Scratch overlay setup complete with viewBox 400x600');
  }

  function resetGame() {
    scratchesLeft = 4; // Start with 4 left since we'll add initial scratch
    scratchHoles = [];
    usedPositions = []; // Reset used positions
    updateScratchCounter();
    clearScratchHoles();
    scratchBtn.disabled = false;
    scratchBtn.classList.remove('scratch-btn-disabled');
    guessInput.value = '';
    result.innerHTML = '';
    hideDropdown();
    
    // Add initial scratch after a brief delay
    setTimeout(() => {
      addInitialScratch();
    }, 500);
  }

  function updateScratchCounter() {
    scratchCount.textContent = `(${scratchesLeft} left)`;
    
    if (scratchesLeft === 0) {
      scratchBtn.disabled = true;
      scratchBtn.classList.add('scratch-btn-disabled');
      scratchBtn.innerHTML = `
        <svg class="btn-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        All Scratched
      `;
    }
  }

  function clearScratchHoles() {
    // Clear all holes from SVG
    const holes = scratchHolesSvg.querySelectorAll('.scratch-hole');
    holes.forEach(hole => hole.remove());
    
    // Reset mask
    const mask = scratchHolesSvg.querySelector('#scratchMask');
    if (mask) {
      const holes = mask.querySelectorAll('.mask-hole');
      holes.forEach(hole => hole.remove());
    }
  }

  function getRandomPosition() {
    // Define grid zones to ensure scratches are spread across the poster
    const zones = [
      { x: 10, y: 10, w: 35, h: 35 },  // Top-left
      { x: 55, y: 10, w: 35, h: 35 },  // Top-right
      { x: 10, y: 55, w: 35, h: 35 },  // Bottom-left
      { x: 55, y: 55, w: 35, h: 35 },  // Bottom-right
      { x: 32, y: 32, w: 36, h: 36 }   // Center
    ];
    
    // Find an unused zone
    let availableZones = zones.filter((zone, index) => !usedPositions.includes(index));
    
    // If all zones are used, reset and use any zone
    if (availableZones.length === 0) {
      usedPositions = [];
      availableZones = zones;
    }
    
    // Pick random zone from available ones
    const zoneIndex = Math.floor(Math.random() * availableZones.length);
    const zone = availableZones[zoneIndex];
    
    // Mark this zone as used
    const originalIndex = zones.indexOf(zone);
    usedPositions.push(originalIndex);
    
    // Generate position within the chosen zone
    const x = zone.x + Math.random() * zone.w;
    const y = zone.y + Math.random() * zone.h;
    
    console.log(`Placing scratch in zone ${originalIndex + 1} at ${x}%, ${y}%`);
    
    return { x: `${x}%`, y: `${y}%` };
  }

  function addInitialScratch() {
    // Add the first scratch automatically when game starts
    const pattern = scratchPatterns[0]; // Use first pattern for initial scratch
    const position = getRandomPosition();
    
    console.log('Adding initial scratch:', pattern, 'at position:', position);
    
    const mask = scratchHolesSvg.querySelector('#scratchMask');
    const maskHole = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    maskHole.classList.add('mask-hole');
    maskHole.setAttribute('d', pattern.d);
    maskHole.setAttribute('fill', 'black');
    maskHole.setAttribute('stroke', 'black');
    maskHole.setAttribute('stroke-width', pattern.strokeWidth || '4');
    maskHole.setAttribute('stroke-linecap', 'round');
    maskHole.setAttribute('stroke-linejoin', 'round');
    
    // Apply position and rotation - MUCH larger scale for massive scratches
    const randomRotation = Math.random() * 360;
    const scale = 0.8 + Math.random() * 0.6; // Much larger scale (0.8-1.4) for massive scratches
    
    // Convert percentage to viewBox coordinates (assuming 400x600 viewBox)
    const x = parseFloat(position.x) * 4; // 400px width
    const y = parseFloat(position.y) * 6; // 600px height
    
    maskHole.setAttribute('transform', `translate(${x}, ${y}) scale(${scale}) rotate(${randomRotation})`);
    
    mask.appendChild(maskHole);
    
    // Show reveal animation
    setTimeout(() => {
      maskHole.classList.add('scratch-hole-appear');
    }, 100);
  }

  function addScratchHole() {
    if (scratchesLeft <= 0) return;
    
    // Use random pattern and position for each scratch
    const patternIndex = Math.floor(Math.random() * scratchPatterns.length);
    const pattern = scratchPatterns[patternIndex];
    const position = getRandomPosition();
    
    console.log(`Adding scratch hole ${5 - scratchesLeft}:`, pattern, 'at position:', position);
    
    // Add hole to mask (black path = transparent area)
    const mask = scratchHolesSvg.querySelector('#scratchMask');
    const maskHole = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    maskHole.classList.add('mask-hole');
    maskHole.setAttribute('d', pattern.d);
    maskHole.setAttribute('fill', 'black');
    maskHole.setAttribute('stroke', 'black');
    maskHole.setAttribute('stroke-width', pattern.strokeWidth || '4');
    maskHole.setAttribute('stroke-linecap', 'round');
    maskHole.setAttribute('stroke-linejoin', 'round');
    
    // Apply position and rotation - MUCH larger scale for massive scratches
    const randomRotation = Math.random() * 360;
    const scale = 0.8 + Math.random() * 0.6; // Much larger scale (0.8-1.4) for massive scratches
    
    // Convert percentage to viewBox coordinates (assuming 400x600 viewBox)
    const x = parseFloat(position.x) * 4; // 400px width
    const y = parseFloat(position.y) * 6; // 600px height
    
    maskHole.setAttribute('transform', `translate(${x}, ${y}) scale(${scale}) rotate(${randomRotation})`);
    
    mask.appendChild(maskHole);
    
    scratchesLeft--;
    updateScratchCounter();
    
    // Show reveal animation
    setTimeout(() => {
      maskHole.classList.add('scratch-hole-appear');
    }, 100);
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
    if (scratchesLeft > 0) {
      addScratchHole();
      
      // Auto-reveal answer after all scratches
      if (scratchesLeft === 0) {
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
    
    // Extract title from "Title (Year)" format if present
    const guessTitle = guess.toLowerCase().replace(/\s*\(\d{4}\)\s*$/, '').trim();
    
    if (guessTitle === data.title.toLowerCase()) {
      result.innerHTML = `<div class='result success'>🎉 Correct! It was "${data.title}"</div>`;
      scratchBtn.disabled = true;
      scratchBtn.classList.add('scratch-btn-disabled');
      guessBtn.disabled = true;
    } else {
      // Wrong guess - automatically scratch off another area
      if (scratchesLeft > 0) {
        addScratchHole();
        result.innerHTML = `<div class='result error'>❌ Try again! ${scratchesLeft} scratches remaining</div>`;
      } else {
        result.innerHTML = `<div class='result error'>😔 Wrong! It was "${data.title}"</div>`;
      }
    }
  });

  // Initialize the game
  console.log('Poster scratch-off game initialized');
  loadTitles();
  initGame();
});