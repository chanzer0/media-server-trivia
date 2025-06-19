// Controls sidebar collapse and dark mode toggle
function initLayoutControls() {
  const sidebar = document.querySelector('.sidebar');
  const toggleSidebar = document.getElementById('toggleSidebar');
  const darkSwitch = document.getElementById('darkSwitch');
  const body = document.body;

  toggleSidebar.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
  });

  function setDark(enabled) {
    body.classList.toggle('dark-mode', enabled);
    localStorage.setItem('darkMode', enabled ? '1' : '0');
    darkSwitch.checked = enabled;
  }

  darkSwitch.addEventListener('change', () => {
    setDark(darkSwitch.checked);
  });

  // load saved mode
  const saved = localStorage.getItem('darkMode') === '1';
  setDark(saved);
}

document.addEventListener('DOMContentLoaded', initLayoutControls);
