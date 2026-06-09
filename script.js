const IMAGE_EXTENSIONS = ['JPG', 'jpg', 'JPEG', 'jpeg', 'PNG', 'png', 'WEBP', 'webp'];
const IMAGE_FOLDER = 'images/';

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function getCodeFromImage(img) {
  const holder = img.closest('[data-code]');
  if (holder?.dataset.code) return holder.dataset.code.trim();
  const file = (img.getAttribute('src') || '').split('/').pop() || '';
  return file.replace(/\.[^.]+$/, '').trim();
}

function imageCandidates(code) {
  const baseVariants = unique([code, code.toUpperCase(), code.toLowerCase(), code.charAt(0).toUpperCase() + code.slice(1).toLowerCase()]);
  const paths = [];
  baseVariants.forEach(base => {
    IMAGE_EXTENSIONS.forEach(ext => paths.push(`${IMAGE_FOLDER}${base}.${ext}`));
  });
  return unique(paths);
}

function markImageReady(img) {
  const holder = img.closest('.photo-card, .preview-item, .device-frame');
  img.dataset.loaded = 'true';
  if (holder) {
    holder.classList.remove('image-loading', 'image-missing');
    holder.classList.add('image-ready');
  }
}

function markImageMissing(img) {
  const holder = img.closest('.photo-card, .preview-item, .device-frame');
  if (holder) {
    holder.classList.remove('image-loading');
    holder.classList.add('image-missing');
  }
}

function protectImage(img) {
  if (!img || img.dataset.protected === 'true') return;
  img.dataset.protected = 'true';

  if ((img.getAttribute('src') || '').startsWith('blob:')) {
    markImageReady(img);
    return;
  }

  const holder = img.closest('.photo-card, .preview-item, .device-frame');
  if (holder) holder.classList.add('image-loading');

  const code = getCodeFromImage(img);
  const candidates = imageCandidates(code);
  let index = Math.max(0, candidates.indexOf(img.getAttribute('src')));
  if (!candidates.length) return;

  function tryNext() {
    if (index >= candidates.length) {
      markImageMissing(img);
      return;
    }
    const nextSrc = candidates[index++];
    img.dataset.resolvedSrc = nextSrc;
    img.src = nextSrc;
  }

  img.addEventListener('load', () => markImageReady(img));
  img.addEventListener('error', tryNext);

  if (img.complete && img.naturalWidth > 0) {
    markImageReady(img);
  } else {
    tryNext();
  }
}

document.querySelectorAll('img').forEach(protectImage);

const header = document.getElementById('header');
const navToggle = document.getElementById('navToggle');
const nav = document.getElementById('nav');
const progressBar = document.getElementById('progressBar');
const cursorGlow = document.getElementById('cursorGlow');

function onScroll() {
  if (header) header.classList.toggle('scrolled', window.scrollY > 22);
  if (progressBar) {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const percent = max > 0 ? (window.scrollY / max) * 100 : 0;
    progressBar.style.width = `${percent}%`;
  }
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

if (navToggle && nav) {
  navToggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('nav-open', open);
  });
  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('nav-open');
    });
  });
}

if (cursorGlow) {
  window.addEventListener('pointermove', e => {
    cursorGlow.style.left = `${e.clientX}px`;
    cursorGlow.style.top = `${e.clientY}px`;
  }, { passive: true });
}

const revealItems = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  revealItems.forEach(item => revealObserver.observe(item));
} else {
  revealItems.forEach(item => item.classList.add('visible'));
}

function setCardGlow(el, e) {
  const rect = el.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * 100;
  const y = ((e.clientY - rect.top) / rect.height) * 100;
  el.style.setProperty('--mx', `${x}%`);
  el.style.setProperty('--my', `${y}%`);
}

document.querySelectorAll('.glass-card, .price-card, .print-panel, .upload-panel, .photo-card').forEach(card => {
  card.addEventListener('pointermove', e => setCardGlow(card, e));
});

document.querySelectorAll('.tilt').forEach(card => {
  card.addEventListener('pointermove', e => {
    if (window.innerWidth < 820) return;
    const r = card.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const rotateY = ((x / r.width) - 0.5) * 9;
    const rotateX = ((0.5 - y / r.height)) * 9;
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-2px)`;
  });
  card.addEventListener('pointerleave', () => {
    card.style.transform = '';
  });
});

document.querySelectorAll('.magnetic').forEach(el => {
  el.addEventListener('pointermove', e => {
    if (window.innerWidth < 820) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left - r.width / 2) * 0.18;
    const y = (e.clientY - r.top - r.height / 2) * 0.18;
    el.style.transform = `translate(${x}px, ${y}px)`;
  });
  el.addEventListener('pointerleave', () => {
    el.style.transform = '';
  });
});

const canvas = document.getElementById('heroCanvas');
if (canvas) {
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, particles = [];

  function particleAmount() {
    return Math.min(95, Math.max(36, Math.floor(window.innerWidth / 16)));
  }

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.width = Math.floor(canvas.offsetWidth * ratio);
    h = canvas.height = Math.floor(canvas.offsetHeight * ratio);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  function makeParticles() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    particles = Array.from({ length: particleAmount() }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.35 * ratio,
      vy: (Math.random() - 0.5) * 0.35 * ratio,
      r: (Math.random() * 1.8 + 0.55) * ratio
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    for (const p of particles) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i], b = particles[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        const max = 150 * ratio;
        if (d < max) {
          ctx.strokeStyle = `rgba(143,140,255,${(1 - d / max) * 0.18})`;
          ctx.lineWidth = 1 * ratio;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }

  resize();
  makeParticles();
  draw();
  window.addEventListener('resize', () => { resize(); makeParticles(); }, { passive: true });
}

const printSize = document.getElementById('printSize');
const finish = document.getElementById('finish');
const extraOption = document.getElementById('extraOption');
const quantity = document.getElementById('quantity');
const printTotal = document.getElementById('printTotal');
const printTotalHidden = document.getElementById('printTotalHidden');

function selectedPrice(select) {
  if (!select) return 0;
  const option = select.options[select.selectedIndex];
  return Number(option.dataset.price || 0);
}

function updatePrintTotal() {
  if (!printTotal) return;
  const qty = Math.max(1, Number(quantity?.value || 1));
  const total = (selectedPrice(printSize) + selectedPrice(finish) + selectedPrice(extraOption)) * qty;
  const formatted = `$${total}`;
  printTotal.textContent = formatted;
  if (printTotalHidden) printTotalHidden.value = formatted;
}
[printSize, finish, extraOption, quantity].forEach(el => el?.addEventListener('input', updatePrintTotal));
[printSize, finish, extraOption, quantity].forEach(el => el?.addEventListener('change', updatePrintTotal));
updatePrintTotal();

const filterButtons = document.querySelectorAll('.filter-button');
const photoCards = Array.from(document.querySelectorAll('.photo-card'));
filterButtons.forEach(button => {
  button.addEventListener('click', () => {
    filterButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    const filter = button.dataset.filter;
    photoCards.forEach(card => {
      const show = filter === 'all' || card.dataset.category === filter;
      card.classList.toggle('is-hidden', !show);
    });
  });
});

const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxText = document.getElementById('lightboxText');
const lightboxClose = document.getElementById('lightboxClose');
const lightboxPrev = document.getElementById('lightboxPrev');
const lightboxNext = document.getElementById('lightboxNext');
let activeIndex = 0;

function visibleCards() {
  return photoCards.filter(card => !card.classList.contains('is-hidden') && !card.classList.contains('image-missing'));
}

function imageSourceFromCard(card) {
  const img = card?.querySelector('img');
  return img?.dataset.resolvedSrc || img?.currentSrc || img?.src || '';
}

function showLightboxCard(card) {
  if (!lightbox || !lightboxImg || !card) return;
  const src = imageSourceFromCard(card);
  const label = card.querySelector('.photo-meta span')?.textContent || card.dataset.code || '';
  const category = card.querySelector('.photo-meta p')?.textContent || '';

  lightbox.classList.add('loading');
  lightboxImg.onload = () => lightbox.classList.remove('loading');
  lightboxImg.onerror = () => lightbox.classList.remove('loading');
  lightboxImg.removeAttribute('src');
  lightboxImg.src = src;
  lightboxText.textContent = category ? `${label} • ${category}` : label;
}

function openLightbox(card) {
  if (!lightbox || !lightboxImg || card.classList.contains('image-missing')) return;
  const cards = visibleCards();
  activeIndex = Math.max(0, cards.indexOf(card));
  showLightboxCard(cards[activeIndex]);
  lightbox.classList.add('active');
  lightbox.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  if (!lightbox) return;
  lightbox.classList.remove('active', 'loading');
  lightbox.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function moveLightbox(direction) {
  const cards = visibleCards();
  if (!cards.length) return;
  activeIndex = (activeIndex + direction + cards.length) % cards.length;
  showLightboxCard(cards[activeIndex]);
}

photoCards.forEach(card => card.querySelector('.photo-open')?.addEventListener('click', () => openLightbox(card)));
lightboxClose?.addEventListener('click', closeLightbox);
lightbox?.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
lightboxPrev?.addEventListener('click', () => moveLightbox(-1));
lightboxNext?.addEventListener('click', () => moveLightbox(1));
window.addEventListener('keydown', e => {
  if (!lightbox?.classList.contains('active')) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') moveLightbox(-1);
  if (e.key === 'ArrowRight') moveLightbox(1);
});

const imageUploader = document.getElementById('imageUploader');
const uploadPreview = document.getElementById('uploadPreview');
if (imageUploader && uploadPreview) {
  imageUploader.addEventListener('change', () => {
    uploadPreview.innerHTML = '';
    Array.from(imageUploader.files || []).slice(0, 24).forEach((file, index) => {
      const url = URL.createObjectURL(file);
      const card = document.createElement('article');
      card.className = 'photo-card image-ready';
      card.innerHTML = `
        <button class="photo-open" type="button">
          <img src="${url}" alt="" data-loaded="true" />
          <span class="photo-shine"></span>
        </button>
        <div class="photo-meta"><span>FILE ${String(index + 1).padStart(3, '0')}</span><p>READY</p></div>
      `;
      uploadPreview.appendChild(card);
    });
  });
}
