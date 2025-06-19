// Controls sidebar collapse and dark mode toggle
function initLayoutControls() {
  const sidebar = document.querySelector('.sidebar');
  const toggleSidebar = document.getElementById('toggleSidebar');
  const toggleDark = document.getElementById('toggleDark');
  const body = document.body;

  toggleSidebar.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
  });

  function setDark(enabled) {
    body.classList.toggle('dark-mode', enabled);
    localStorage.setItem('darkMode', enabled ? '1' : '0');
    toggleDark.checked = enabled;
  }

  toggleDark.addEventListener('change', () => {
    setDark(toggleDark.checked);
  });

  // load saved mode
  if (localStorage.getItem('darkMode') === '1') {
    setDark(true);
  } else {
    setDark(false);
  }
}

document.addEventListener('DOMContentLoaded', initLayoutControls);
