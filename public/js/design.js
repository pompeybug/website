// Menu button for the design preview. Without this file the whole menu is
// simply shown under the logo, so every link still works.

const header = document.querySelector('.top');
const menu = document.querySelector('#site-menu');
const toggle = document.querySelector('#site-menu-toggle');

function setMenu(open) {
  menu.classList.toggle('open', open);
  toggle.setAttribute('aria-expanded', String(open));
}

function toggleMenu() {
  setMenu(toggle.getAttribute('aria-expanded') !== 'true');
}

function closeOnEscape(event) {
  if (event.key !== 'Escape' || toggle.getAttribute('aria-expanded') !== 'true') return;
  setMenu(false);
  toggle.focus();
}

if (header && menu && toggle) {
  header.classList.add('has-toggle');
  toggle.hidden = false;
  toggle.addEventListener('click', toggleMenu);
  document.addEventListener('keydown', closeOnEscape);
}
