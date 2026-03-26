// ===== Mobile Menu =====
const mobileToggle = document.getElementById('mobile-toggle');
const mobileMenu = document.getElementById('mobile-menu');

mobileToggle?.addEventListener('click', () => {
  mobileMenu.classList.toggle('open');
  const icon = mobileToggle.querySelector('i');
  icon.classList.toggle('fa-bars');
  icon.classList.toggle('fa-times');
});

// Close mobile menu on link click
mobileMenu?.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    mobileMenu.classList.remove('open');
    const icon = mobileToggle.querySelector('i');
    icon.classList.add('fa-bars');
    icon.classList.remove('fa-times');
  });
});

// ===== Header Scroll Effect =====
const header = document.getElementById('header');
window.addEventListener('scroll', () => {
  if (window.scrollY > 50) {
    header.classList.add('header-glass');
  } else {
    header.classList.remove('header-glass');
  }
});

// ===== Smooth Scroll for Anchor Links =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', (e) => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (target) {
      e.preventDefault();
      const headerHeight = header.offsetHeight;
      const targetPosition = target.offsetTop - headerHeight;
      window.scrollTo({ top: targetPosition, behavior: 'smooth' });
    }
  });
});

// ===== Scroll Animations (Intersection Observer) =====
const animatedElements = document.querySelectorAll('.animate-on-scroll');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

animatedElements.forEach(el => observer.observe(el));

// ===== Lightbox =====
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxClose = document.getElementById('lightbox-close');

document.querySelectorAll('[data-lightbox]').forEach(item => {
  item.addEventListener('click', () => {
    const img = item.querySelector('img');
    if (img) {
      lightboxImg.src = img.src;
      lightboxImg.alt = img.alt;
      lightbox.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  });
});

function closeLightbox() {
  lightbox.classList.remove('active');
  document.body.style.overflow = '';
}

lightboxClose?.addEventListener('click', closeLightbox);
lightbox?.addEventListener('click', (e) => {
  if (e.target === lightbox) closeLightbox();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeLightbox();
});

// ===== Before/After Slider (reusable) =====
function initSlider(slider) {
  const handle = slider.querySelector('.ba-handle');
  const afterWrap = slider.querySelector('.ba-after');
  if (!handle || !afterWrap) return;

  let dragging = false;

  function setPosition(x) {
    const rect = slider.getBoundingClientRect();
    let pct = ((x - rect.left) / rect.width) * 100;
    pct = Math.max(0, Math.min(100, pct));
    handle.style.left = pct + '%';
    afterWrap.style.width = pct + '%';
  }

  handle.addEventListener('mousedown', (e) => { dragging = true; e.preventDefault(); });
  handle.addEventListener('touchstart', () => { dragging = true; }, { passive: true });

  window.addEventListener('mousemove', (e) => { if (dragging) setPosition(e.clientX); });
  window.addEventListener('touchmove', (e) => { if (dragging) setPosition(e.touches[0].clientX); }, { passive: true });
  window.addEventListener('mouseup', () => { dragging = false; });
  window.addEventListener('touchend', () => { dragging = false; });

  slider.addEventListener('click', (e) => {
    if (e.target === handle) return;
    setPosition(e.clientX);
  });

  afterWrap.style.width = '50%';
  handle.style.left = '50%';
}

// Init all standalone sliders (not inside carousels)
document.querySelectorAll('.ba-slider:not(.ba-carousel-slide .ba-slider)').forEach(initSlider);

// ===== Carousel with Before/After Slides =====
document.querySelectorAll('.ba-carousel').forEach(carousel => {
  const slides = carousel.querySelectorAll('.ba-carousel-slide');
  const dots = carousel.querySelectorAll('.ba-carousel-dot');
  const prevBtn = carousel.querySelector('.ba-carousel-prev');
  const nextBtn = carousel.querySelector('.ba-carousel-next');
  let current = 0;

  function goTo(index) {
    slides[current].classList.remove('active');
    dots[current]?.classList.remove('active');
    current = (index + slides.length) % slides.length;
    slides[current].classList.add('active');
    dots[current]?.classList.add('active');
    // Reset slider handle to 50% when switching slides
    const slider = slides[current].querySelector('.ba-slider');
    if (slider) {
      const h = slider.querySelector('.ba-handle');
      const a = slider.querySelector('.ba-after');
      if (h) h.style.left = '50%';
      if (a) a.style.width = '50%';
    }
  }

  // Init all sliders inside carousel
  carousel.querySelectorAll('.ba-slider').forEach(initSlider);

  // Wire up dots
  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => goTo(i));
  });

  // Wire up arrows
  prevBtn?.addEventListener('click', () => goTo(current - 1));
  nextBtn?.addEventListener('click', () => goTo(current + 1));

  // Touch swipe support on the carousel track
  const track = carousel.querySelector('.ba-carousel-track');
  if (track) {
    let startX = 0;
    let startY = 0;
    let swiping = false;
    track.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      swiping = true;
    }, { passive: true });
    track.addEventListener('touchend', (e) => {
      if (!swiping) return;
      swiping = false;
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      // Only swipe if horizontal movement > vertical (avoid hijacking slider drag)
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx < 0) goTo(current + 1);
        else goTo(current - 1);
      }
    }, { passive: true });
  }
});

// ===== Contact Form =====
// Form handled by embedded QuickBooks Online form (Intuit script in index.html)

// ===== Theme Switcher (dev only) =====
if (new URLSearchParams(window.location.search).has('theme')) {
  const switcher = document.getElementById('theme-switcher');
  switcher?.classList.remove('hidden');

  switcher?.querySelectorAll('[data-set-theme]').forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.setTheme;
      if (theme) {
        document.documentElement.setAttribute('data-theme', theme);
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
      // Update active state
      switcher.querySelectorAll('[data-set-theme]').forEach(b => b.classList.remove('border-white'));
      btn.classList.add('border-white');
      localStorage.setItem('trl-theme', theme);
    });
  });

  // Restore saved theme
  const saved = localStorage.getItem('trl-theme');
  if (saved) {
    document.documentElement.setAttribute('data-theme', saved);
  }
}
