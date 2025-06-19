(function() {
  const body = document.getElementById('body');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const darkToggle = document.getElementById('darkModeToggle');

  function applySettings() {
    if (localStorage.getItem('darkMode') === 'true') {
      body.classList.add('dark-mode');
    }
    if (localStorage.getItem('sidebarCollapsed') === 'true') {
      body.classList.add('sidebar-collapsed');
    }
  }

  sidebarToggle && sidebarToggle.addEventListener('click', () => {
    body.classList.toggle('sidebar-collapsed');
    localStorage.setItem('sidebarCollapsed', body.classList.contains('sidebar-collapsed'));
  });

  darkToggle && darkToggle.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', body.classList.contains('dark-mode'));
  });

  applySettings();
})();
