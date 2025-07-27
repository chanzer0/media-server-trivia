// Modern UI controls and navigation
function initLayoutControls() {
  const themeToggle = document.getElementById('themeToggle');
  const mobileMenuToggle = document.getElementById('mobileMenuToggle');
  const navMenu = document.querySelector('.nav-menu');
  const body = document.body;
  const sunIcon = document.querySelector('.sun-icon');
  const moonIcon = document.querySelector('.moon-icon');

  // Theme toggle functionality
  function setDarkMode(enabled) {
    body.classList.toggle('dark-mode', enabled);
    localStorage.setItem('darkMode', enabled ? '1' : '0');
    
    // Toggle icons
    if (enabled) {
      sunIcon.classList.add('hidden');
      moonIcon.classList.remove('hidden');
    } else {
      sunIcon.classList.remove('hidden');
      moonIcon.classList.add('hidden');
    }
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const isDark = body.classList.contains('dark-mode');
      setDarkMode(!isDark);
    });
  }

  // Load saved theme preference or default to dark mode
  const savedDarkMode = localStorage.getItem('darkMode');
  const isDarkMode = savedDarkMode === null ? true : savedDarkMode === '1';
  setDarkMode(isDarkMode);

  // Mobile menu toggle
  if (mobileMenuToggle && navMenu) {
    mobileMenuToggle.addEventListener('click', () => {
      navMenu.classList.toggle('active');
    });

    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!mobileMenuToggle.contains(e.target) && !navMenu.contains(e.target)) {
        navMenu.classList.remove('active');
      }
    });
  }

  // Active navigation highlighting
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll('.nav-link');
  
  navLinks.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') === currentPath) {
      link.classList.add('active');
    }
  });

  // Add smooth page transitions
  document.addEventListener('click', (e) => {
    if (e.target.matches('a[href^="/"]')) {
      const link = e.target;
      const href = link.getAttribute('href');
      
      // Skip if it's the current page
      if (href === currentPath) {
        e.preventDefault();
        return;
      }
    }
  });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initLayoutControls);