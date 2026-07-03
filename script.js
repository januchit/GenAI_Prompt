// Navbar scroll effect
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 50);
});

// Mobile nav toggle
const navToggle = document.getElementById('navToggle');
const navLinks = document.querySelector('.nav-links');
navToggle.addEventListener('click', () => {
  navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
  if (navLinks.style.display === 'flex') {
    navLinks.style.flexDirection = 'column';
    navLinks.style.position = 'absolute';
    navLinks.style.top = '100%';
    navLinks.style.left = '0'; navLinks.style.right = '0';
    navLinks.style.background = 'rgba(255,255,255,0.98)';
    navLinks.style.padding = '1rem 1.5rem 1.5rem';
    navLinks.style.borderBottom = '1px solid rgba(15,23,42,0.08)';
  }
});

// Close mobile nav on link click
document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', () => {
    if (window.innerWidth < 900) navLinks.style.display = 'none';
  });
});

// Fade-in on scroll
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.card, .module-card, .tool-card').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(20px)';
  el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  observer.observe(el);
});

// 3D hero scene: tilt follows the cursor (desktop pointers only)
const heroScene = document.getElementById('heroScene');
if (heroScene && window.matchMedia('(pointer: fine)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const hero = document.querySelector('.hero');
  const BASE_Y = -14, BASE_X = 8; // resting tilt (deg), matches CSS
  hero.addEventListener('mousemove', (e) => {
    const r = hero.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    heroScene.style.transform =
      `rotateY(${BASE_Y + nx * 16}deg) rotateX(${BASE_X - ny * 12}deg)`;
  });
  hero.addEventListener('mouseleave', () => { heroScene.style.transform = ''; });
}
