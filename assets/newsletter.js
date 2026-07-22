(() => {
  const newsletterForms = document.querySelectorAll('[data-newsletter-form]');

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
  });
})();
