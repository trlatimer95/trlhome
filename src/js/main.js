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

// ===== Forms (Web3Forms) =====
// Any <form data-web3form data-subject="..."> is submitted by email. Each form needs a
// [data-form-status] element inside it for success/error messages.
document.querySelectorAll('form[data-web3form]').forEach(form => {
  const status = form.querySelector('[data-form-status]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    formData.append('access_key', '38361931-adfa-4bbf-96d1-1af4e518a8cf');
    formData.append('subject', form.dataset.subject || 'New Website Inquiry - TRL Home Solutions');
    formData.append('from_name', 'TRL Website');
    formData.append('page', window.location.pathname);

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;

    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();

      if (result.success) {
        showFormStatus(status, 'success', 'Thank you! We\'ll get back to you within 24 hours.');
        form.reset();
        applyServiceDefault(form);
      } else {
        showFormStatus(status, 'error', 'Something went wrong. Please call us at (208) 553-6162.');
      }
    } catch {
      showFormStatus(status, 'error', 'Network error. Please call us at (208) 553-6162.');
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });

  applyServiceDefault(form);
});

// Pre-select the project type on service pages (<select data-default="basement">)
function applyServiceDefault(form) {
  const select = form.querySelector('select[data-default]');
  if (select && select.dataset.default) select.value = select.dataset.default;
}

function showFormStatus(el, type, message) {
  if (!el) return;
  el.className = type === 'success'
    ? 'p-4 rounded-lg bg-green-50 text-green-700 text-sm font-medium'
    : 'p-4 rounded-lg bg-red-50 text-red-700 text-sm font-medium';
  el.textContent = message;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 8000);
}

// ===== Hero Carousel =====
document.querySelectorAll('[data-hero-carousel]').forEach(carousel => {
  const slides = [...carousel.querySelectorAll('.hero-slide')];
  const dots = [...carousel.querySelectorAll('.hero-dot')];
  const caption = carousel.querySelector('[data-hero-caption]');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let current = 0;
  let timer = null;

  // Lazy slides keep their image in data-src until they are needed
  function load(slide) {
    slide?.querySelectorAll('img[data-src]').forEach(img => {
      img.src = img.dataset.src;
      img.removeAttribute('data-src');
    });
  }

  function show(index) {
    slides[current].classList.remove('active');
    dots[current]?.classList.remove('active');
    current = (index + slides.length) % slides.length;
    load(slides[current]);
    slides[current].classList.add('active');
    dots[current]?.classList.add('active');
    if (caption) caption.textContent = slides[current].dataset.caption || '';
  }

  function start() {
    if (reduceMotion || timer) return;
    timer = setInterval(() => show(current + 1), 6000);
  }
  function stop() {
    clearInterval(timer);
    timer = null;
  }
  function restart() {
    stop();
    start();
  }

  dots.forEach((dot, i) => dot.addEventListener('click', () => { show(i); restart(); }));
  carousel.querySelector('[data-hero-prev]')?.addEventListener('click', () => { show(current - 1); restart(); });
  carousel.querySelector('[data-hero-next]')?.addEventListener('click', () => { show(current + 1); restart(); });

  carousel.addEventListener('mouseenter', stop);
  carousel.addEventListener('mouseleave', start);
  carousel.addEventListener('focusin', stop);
  carousel.addEventListener('focusout', start);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

  // Preload the second image once the page has loaded so the first fade is smooth
  window.addEventListener('load', () => load(slides[1]));

  start();
});

// ===== Project Filters =====
document.querySelectorAll('[data-project-filters]').forEach(bar => {
  const grid = document.querySelector('[data-project-grid]');
  if (!grid) return;
  const cards = [...grid.querySelectorAll('.project-card')];
  const buttons = [...bar.querySelectorAll('[data-filter]')];

  function apply(filter) {
    const wanted = filter === 'all' ? null : filter.split(' ');
    cards.forEach(card => {
      const tags = card.dataset.tags.split(' ');
      card.classList.toggle('hidden', wanted !== null && !wanted.some(t => tags.includes(t)));
    });
    buttons.forEach(b => {
      const on = b.dataset.filter === filter;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', on);
    });
  }

  buttons.forEach(b => b.addEventListener('click', () => apply(b.dataset.filter)));
});

// ===== Theme Switcher (dev only) =====
if (new URLSearchParams(window.location.search).has('theme')) {
  const switcher = document.getElementById('theme-switcher');
  switcher?.classList.remove('hidden');

  const validThemes = ['forest', 'slate-orange'];

  switcher?.querySelectorAll('[data-set-theme]').forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.setTheme;
      if (theme && validThemes.includes(theme)) {
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
  if (saved && validThemes.includes(saved)) {
    document.documentElement.setAttribute('data-theme', saved);
  }
}
