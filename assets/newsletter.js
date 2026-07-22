(() => {
  const newsletterForms = document.querySelectorAll('[data-newsletter-form]');

  const enhanceCompactForm = (newsletterForm) => {
    const newsletter = newsletterForm.closest('.newsletter--compact');
    if (!newsletter) return;

    const emailInput = newsletterForm.querySelector('input[type="email"]');
    const navigation = document.querySelector('.nav-links');
    const formId = 'article-newsletter-form';
    const toggleButton = document.createElement('button');
    const closeButton = document.createElement('button');

    newsletter.classList.add('newsletter-widget');
    newsletter.setAttribute('aria-label', 'subscribe to my writing');
    newsletter.hidden = true;
    newsletterForm.id = formId;

    toggleButton.type = 'button';
    toggleButton.className = 'newsletter-nav-toggle';
    toggleButton.textContent = 'subscribe';
    toggleButton.setAttribute('aria-controls', formId);
    toggleButton.setAttribute('aria-expanded', 'false');

    closeButton.type = 'button';
    closeButton.className = 'newsletter-widget-close';
    closeButton.textContent = '×';
    closeButton.setAttribute('aria-label', 'close subscription form');

    const openForm = () => {
      newsletter.hidden = false;
      newsletter.classList.add('is-open');
      newsletter.setAttribute('role', 'dialog');
      newsletter.setAttribute('aria-modal', 'true');
      toggleButton.setAttribute('aria-expanded', 'true');
      newsletterForm.prepend(closeButton);
      document.documentElement.classList.add('newsletter-dialog-open');
      emailInput.focus();
    };

    const closeForm = (restoreFocus = true) => {
      newsletter.classList.remove('is-open');
      newsletter.removeAttribute('role');
      newsletter.removeAttribute('aria-modal');
      newsletter.hidden = true;
      toggleButton.setAttribute('aria-expanded', 'false');
      closeButton.remove();
      document.documentElement.classList.remove('newsletter-dialog-open');
      if (restoreFocus) toggleButton.focus();
    };

    toggleButton.addEventListener('click', openForm);
    closeButton.addEventListener('click', closeForm);
    newsletter.addEventListener('click', (event) => {
      if (event.target === newsletter) closeForm();
    });
    newsletter.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && newsletter.classList.contains('is-open')) {
        closeForm();
      }

      if (event.key === 'Tab' && newsletter.classList.contains('is-open')) {
        const focusableElements = newsletterForm.querySelectorAll(
          'button:not([disabled]), input:not([disabled])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    });

    window.addEventListener('pageshow', () => closeForm(false));

    if (navigation?.lastElementChild) {
      navigation.insertBefore(toggleButton, navigation.lastElementChild);
    } else {
      document.body.prepend(toggleButton);
    }
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
