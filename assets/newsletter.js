(() => {
  const newsletterForms = document.querySelectorAll('[data-newsletter-form]');

  const enhanceCompactForm = (newsletterForm) => {
    const newsletter = newsletterForm.closest('.newsletter--compact');
    if (!newsletter) return;

    const emailInput = newsletterForm.querySelector('input[type="email"]');
    const formId = 'article-newsletter-form';
    const toggleButton = document.createElement('button');
    const closeButton = document.createElement('button');

    newsletter.classList.add('newsletter-widget');
    newsletter.setAttribute('aria-label', 'subscribe to my writing');
    newsletterForm.id = formId;
    newsletterForm.hidden = true;

    toggleButton.type = 'button';
    toggleButton.className = 'newsletter-widget-toggle';
    toggleButton.textContent = 'subscribe';
    toggleButton.setAttribute('aria-controls', formId);
    toggleButton.setAttribute('aria-expanded', 'false');

    closeButton.type = 'button';
    closeButton.className = 'newsletter-widget-close';
    closeButton.textContent = '×';
    closeButton.setAttribute('aria-label', 'close subscription form');

    const openForm = () => {
      newsletter.classList.add('is-open');
      newsletter.setAttribute('role', 'dialog');
      newsletterForm.hidden = false;
      toggleButton.hidden = true;
      toggleButton.setAttribute('aria-expanded', 'true');
      newsletterForm.prepend(closeButton);
      emailInput.focus();
    };

    const closeForm = () => {
      newsletter.classList.remove('is-open');
      newsletter.removeAttribute('role');
      newsletterForm.hidden = true;
      toggleButton.hidden = false;
      toggleButton.setAttribute('aria-expanded', 'false');
      closeButton.remove();
      toggleButton.focus();
    };

    toggleButton.addEventListener('click', openForm);
    closeButton.addEventListener('click', closeForm);
    newsletter.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && newsletter.classList.contains('is-open')) {
        closeForm();
      }
    });

    newsletter.prepend(toggleButton);
  };

  newsletterForms.forEach((newsletterForm) => {
    const subscribeButton = newsletterForm.querySelector('button[type="submit"]');
    const originalLabel = subscribeButton.textContent;

    newsletterForm.addEventListener('submit', () => {
      if (!newsletterForm.checkValidity()) return;

      subscribeButton.disabled = true;
      subscribeButton.textContent = 'subscribing…';

      if (typeof window.gtag === 'function') {
        window.gtag('event', 'newsletter_subscribe_submit', {
          location: newsletterForm.dataset.location
        });
      }
    });

    window.addEventListener('pageshow', () => {
      subscribeButton.disabled = false;
      subscribeButton.textContent = originalLabel;
    });

    enhanceCompactForm(newsletterForm);
  });
})();
