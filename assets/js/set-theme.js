const toggleButton = document.getElementById('themeToggle');
const htmlElement = document.documentElement;

function setTheme(theme) {
  htmlElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  updateToggleButton(theme);
}

function updateToggleButton(theme) {
  toggleButton.setAttribute('aria-checked', theme === 'dark');
}

function getPreferredTheme() {
  const storedTheme = localStorage.getItem('theme');
  if (storedTheme) {
    return storedTheme;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// Ensure the toggle button state is correct on load
document.addEventListener('DOMContentLoaded', () => {
  updateToggleButton(getPreferredTheme());
});

// Listen for toggle button clicks
toggleButton.addEventListener('click', () => {
  const currentTheme = htmlElement.getAttribute('data-theme') || getPreferredTheme();
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
});

// Listen for system preference changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  if (!localStorage.getItem('theme')) {
    const newTheme = e.matches ? 'dark' : 'light';
    setTheme(newTheme);
  }
});

setTheme(getPreferredTheme());