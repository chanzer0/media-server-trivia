// Frame Color Challenge game logic

document.addEventListener('DOMContentLoaded', () => {
  const loadingState = document.getElementById('loadingState');
  const colorBarContainer = document.getElementById('colorBarContainer');
  const multipleChoiceSection = document.getElementById('multipleChoiceSection');
  const colorBar = document.getElementById('colorBar');
  const frameCount = document.getElementById('frameCount');
  const sampleRate = document.getElementById('sampleRate');
  const choiceButtons = document.getElementById('choiceButtons');
  const result = document.getElementById('frameResult');
  
  let data = null;
  let ctx = null;
  let currentSessionId = null;
  let progressInterval = null;

  // Initialize canvas context
  function initCanvas() {
    ctx = colorBar.getContext('2d');
    
    // Set canvas size to match display size
    const rect = colorBar.getBoundingClientRect();
    colorBar.width = rect.width * window.devicePixelRatio || rect.width;
    colorBar.height = rect.height * window.devicePixelRatio || rect.height;
    
    // Scale context for high DPI displays
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
  }

  function drawColorBar(frameColors) {
    if (!ctx || !frameColors || frameColors.length === 0) return;
    
    const canvasWidth = colorBar.offsetWidth;
    const canvasHeight = colorBar.offsetHeight;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    // Calculate width per color bar
    const barWidth = canvasWidth / frameColors.length;
    
    frameColors.forEach((frameData, index) => {
      const x = index * barWidth;
      
      // Set color
      ctx.fillStyle = frameData.color;
      
      // Draw color bar
      ctx.fillRect(x, 0, Math.ceil(barWidth), canvasHeight);
    });
  }


  // Multiple choice functionality
  function createChoiceButtons(options, correctAnswer) {
    choiceButtons.innerHTML = '';
    
    options.forEach((option, index) => {
      const button = document.createElement('button');
      button.className = 'choice-button';
      button.textContent = option;
      button.addEventListener('click', () => handleChoiceClick(index, correctAnswer));
      choiceButtons.appendChild(button);
    });
  }

  function handleChoiceClick(selectedIndex, correctAnswer) {
    const buttons = choiceButtons.querySelectorAll('.choice-button');
    
    // Disable all buttons
    buttons.forEach(button => {
      button.classList.add('disabled');
    });
    
    // Show correct/incorrect styling
    buttons[selectedIndex].classList.add(selectedIndex === correctAnswer ? 'correct' : 'incorrect');
    if (selectedIndex !== correctAnswer) {
      buttons[correctAnswer].classList.add('correct');
    }
    
    // Show result
    if (selectedIndex === correctAnswer) {
      result.innerHTML = `<div class='result success'>🎉 Correct! It was "${data.title}"</div>`;
    } else {
      const correctTitle = data.options[correctAnswer];
      result.innerHTML = `<div class='result error'>❌ Wrong! The correct answer was "${correctTitle}"</div>`;
    }
  }

  function updateProgressBar(progress, message) {
    const loadingSpinner = loadingState.querySelector('.loading-spinner');
    const loadingText = loadingState.querySelector('p');
    const loadingSubtext = loadingState.querySelector('small');
    
    // Create progress bar if it doesn't exist
    let progressBar = loadingState.querySelector('.progress-bar-container');
    if (!progressBar) {
      progressBar = document.createElement('div');
      progressBar.className = 'progress-bar-container';
      progressBar.innerHTML = `
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" style="width: 0%"></div>
        </div>
        <div class="progress-text">0%</div>
      `;
      loadingState.appendChild(progressBar);
    }
    
    // Update progress bar
    const progressFill = progressBar.querySelector('.progress-bar-fill');
    const progressText = progressBar.querySelector('.progress-text');
    
    progressFill.style.width = `${progress}%`;
    progressText.textContent = `${progress}%`;
    
    // Update message
    if (message) {
      loadingText.textContent = message;
    }
  }

  async function pollProgress(sessionId) {
    try {
      const res = await fetch(`/api/trivia/frame/progress/${sessionId}`);
      if (!res.ok) {
        if (res.status === 404) {
          clearInterval(progressInterval);
          return;
        }
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const progress = await res.json();
      console.log('Progress update:', progress);
      
      updateProgressBar(progress.progress || 0, progress.message || 'Processing...');
      
      if (progress.status === 'completed' && progress.result) {
        // Processing completed successfully
        clearInterval(progressInterval);
        data = progress.result;
        showGameResults();
      } else if (progress.status === 'error') {
        // Processing failed
        clearInterval(progressInterval);
        showError(progress.message || 'Processing failed');
      }
      
    } catch (error) {
      console.error('Error polling progress:', error);
      clearInterval(progressInterval);
      showError('Error checking progress');
    }
  }

  function showGameResults() {
    // Hide loading and show game
    loadingState.style.display = 'none';
    colorBarContainer.style.display = 'block';
    multipleChoiceSection.style.display = 'block';
    
    // Initialize canvas and draw color bar
    initCanvas();
    drawColorBar(data.frame_colors);
    
    // Update info display
    frameCount.textContent = `${data.total_samples} color samples`;
    sampleRate.textContent = `Every ${data.sample_rate}th frame`;
    
    // Create multiple choice buttons
    createChoiceButtons(data.options, data.correct_answer);
    
    console.log(`Game loaded: ${data.total_samples} samples from "${data.title}"`);
  }

  function showError(message) {
    loadingState.style.display = 'none';
    result.innerHTML = `<div class='result error'>Error: ${message}</div>`;
  }

  async function initGame() {
    console.log('Initializing Frame Color Challenge...');
    
    try {
      // Reset UI
      loadingState.style.display = 'block';
      colorBarContainer.style.display = 'none';
      multipleChoiceSection.style.display = 'none';
      result.innerHTML = '';
      
      // Clear any existing progress interval
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      
      // Start frame processing
      const res = await fetch('/api/trivia/frame');
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const initResult = await res.json();
      console.log('Received init result:', initResult);
      
      if (initResult.error) {
        throw new Error(initResult.error);
      }
      
      // Check if we got cached data (no session_id means cached)
      if (!initResult.session_id && initResult.result) {
        console.log('Using cached data for:', initResult.movie_title);
        data = initResult.result;
        showGameResults();
        return;
      }
      
      if (!initResult.session_id) {
        throw new Error('No session ID received');
      }
      
      currentSessionId = initResult.session_id;
      
      // Start polling for progress
      updateProgressBar(0, "Starting video processing...");
      progressInterval = setInterval(() => pollProgress(currentSessionId), 1000);
      
    } catch (error) {
      console.error('Error initializing game:', error);
      showError(error.message);
    }
  }



  // Handle canvas clicks for frame inspection
  colorBar.addEventListener('click', (e) => {
    if (!data || !data.frame_colors) return;
    
    const rect = colorBar.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const frameIndex = Math.floor((x / rect.width) * data.frame_colors.length);
    
    if (frameIndex >= 0 && frameIndex < data.frame_colors.length) {
      const frameData = data.frame_colors[frameIndex];
      console.log(`Clicked frame ${frameIndex}:`, frameData);
      
      // Show frame info as tooltip or in result area temporarily
      result.innerHTML = `<div class='result'>Color sample ${frameIndex + 1}: ${frameData.color}</div>`;
      
      // Clear after 3 seconds
      setTimeout(() => {
        if (result.innerHTML.includes('Color sample')) {
          result.innerHTML = '';
        }
      }, 3000);
    }
  });

  // Handle window resize
  window.addEventListener('resize', () => {
    if (data && data.frame_colors) {
      initCanvas();
      drawColorBar(data.frame_colors);
    }
  });

  // Page unload cleanup
  function cancelCurrentSession() {
    if (currentSessionId) {
      // Use sendBeacon for reliable cleanup on page unload
      const cancelUrl = `/api/trivia/frame/cancel/${currentSessionId}`;
      if (navigator.sendBeacon) {
        navigator.sendBeacon(cancelUrl, new FormData());
      } else {
        // Fallback for browsers without sendBeacon
        try {
          fetch(cancelUrl, { method: 'POST', keepalive: true });
        } catch (e) {
          console.log('Could not cancel session on unload');
        }
      }
      
      // Clear progress interval
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }
      
      currentSessionId = null;
    }
  }

  // Handle page refresh/close events
  window.addEventListener('beforeunload', (e) => {
    if (currentSessionId) {
      cancelCurrentSession();
      // Some browsers show a confirmation dialog if returnValue is set
      // e.returnValue = 'Video processing is in progress. Are you sure you want to leave?';
      // return e.returnValue;
    }
  });

  window.addEventListener('unload', cancelCurrentSession);

  // Handle browser back/forward navigation
  window.addEventListener('pagehide', cancelCurrentSession);

  // Initialize the game
  console.log('Frame Color Challenge initialized');
  initGame();
});