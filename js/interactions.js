(function(){
  'use strict';

  /* ---------- SERVICES RENDER ---------- */
  function renderServices(){
    const grid = document.getElementById('services-grid');
    const list = window.SIVEXO_SERVICES;
    if (!grid || !Array.isArray(list)) return;
    grid.innerHTML = list.map(s => `
      <article class="service-card" data-reveal tabindex="0">
        <span class="service-card__num">${s.num}</span>
        <div class="service-card__icon"><i class="${s.icon}" aria-hidden="true"></i></div>
        <h3>${s.title}</h3>
        <p>${s.desc}</p>
        <span class="service-card__arrow">Explore <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></span>
      </article>
    `).join('');
  }

  /* ---------- CARD GLOW + TILT ---------- */
  function initCardEffects(){
    const perf = window.SIVEXO_PERF || {};
    const cards = document.querySelectorAll('.service-card');
    cards.forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const mx = e.clientX - r.left;
        const my = e.clientY - r.top;
        card.style.setProperty('--mx', mx + 'px');
        card.style.setProperty('--my', my + 'px');

        if (!perf.isMobile && !perf.reducedMotion) {
          const rx = ((my / r.height) - 0.5) * -6;
          const ry = ((mx / r.width) - 0.5) * 6;
          card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-6px)`;
        }
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
      // Keyboard glow reset
      card.addEventListener('focus', () => card.style.transform = 'translateY(-4px)');
      card.addEventListener('blur', () => card.style.transform = '');
    });
  }

  /* ---------- FAQ ACCORDION ---------- */
  function initFAQ(){
    const items = document.querySelectorAll('.faq__item');
    items.forEach(item => {
      const btn = item.querySelector('.faq__q');
      const panel = item.querySelector('.faq__a');
      if (!btn || !panel) return;

      btn.addEventListener('click', () => {
        const isOpen = item.classList.contains('is-open');
        // Close all
        items.forEach(other => {
          if (other === item) return;
          other.classList.remove('is-open');
          const oBtn = other.querySelector('.faq__q');
          const oPanel = other.querySelector('.faq__a');
          if (oBtn) oBtn.setAttribute('aria-expanded', 'false');
          if (oPanel) oPanel.style.height = '0px';
        });

        if (isOpen) {
          item.classList.remove('is-open');
          btn.setAttribute('aria-expanded', 'false');
          panel.style.height = '0px';
        } else {
          item.classList.add('is-open');
          btn.setAttribute('aria-expanded', 'true');
          panel.style.height = panel.scrollHeight + 'px';
        }
      });

      // Ensure correct height on resize
      window.addEventListener('resize', () => {
        if (item.classList.contains('is-open') && panel) {
          panel.style.height = 'auto';
          const h = panel.scrollHeight;
          panel.style.height = h + 'px';
        }
      });
    });
  }

  /* ---------- CONTACT FORM ---------- */
  function initForm(){
    const form = document.getElementById('contact-form');
    if (!form) return;

    const fields = {
      name: form.querySelector('#cf-name'),
      email: form.querySelector('#cf-email'),
      phone: form.querySelector('#cf-phone'),
      service: form.querySelector('#cf-service'),
      message: form.querySelector('#cf-message')
    };

    function setError(name, msg){
      const input = fields[name];
      if (!input) return;
      const field = input.closest('.field');
      const err = field ? field.querySelector('.field__error') : null;
      if (field) field.classList.toggle('is-invalid', !!msg);
      if (err) err.textContent = msg || '';
    }

    function validate(){
      let ok = true;
      const { name, email, message } = fields;

      if (!name || !name.value.trim()) { setError('name', 'Please enter your name.'); ok = false; }
      else setError('name', '');

      const emailVal = email ? email.value.trim() : '';
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      if (!emailVal) { setError('email', 'Please enter your email.'); ok = false; }
      else if (!emailRe.test(emailVal)) { setError('email', 'Please enter a valid email address.'); ok = false; }
      else setError('email', '');

      if (!message || !message.value.trim()) { setError('message', 'Please enter a message.'); ok = false; }
      else setError('message', '');

      return ok;
    }

    // Live validation
    ['name','email','message'].forEach(k => {
      const f = fields[k];
      if (!f) return;
      f.addEventListener('blur', validate);
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!validate()) {
        const firstInvalid = form.querySelector('.field.is-invalid input, .field.is-invalid textarea');
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      const data = {
        name: fields.name.value.trim(),
        email: fields.email.value.trim(),
        phone: fields.phone ? fields.phone.value.trim() : '',
        service: fields.service ? fields.service.value : '',
        message: fields.message.value.trim()
      };

      const lines = [
        '*New Inquiry — SivexoSoft Website*',
        '',
        '*Name:* ' + data.name,
        '*Email:* ' + data.email,
        data.phone ? '*Phone:* ' + data.phone : null,
        data.service ? '*Service:* ' + data.service : null,
        '',
        '*Message:*',
        data.message
      ].filter(Boolean).join('\n');

      const url = 'https://wa.me/923357574906?text=' + encodeURIComponent(lines);
      window.open(url, '_blank', 'noopener');

      // Soft reset
      form.reset();
      Object.keys(fields).forEach(k => setError(k, ''));
    });
  }

  /* ---------- YEAR ---------- */
  function initYear(){
    const y = document.getElementById('year');
    if (y) y.textContent = new Date().getFullYear();
  }

  /* ---------- INIT ---------- */
  function boot(){
    renderServices();
    initCardEffects();
    initFAQ();
    initForm();
    initYear();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
