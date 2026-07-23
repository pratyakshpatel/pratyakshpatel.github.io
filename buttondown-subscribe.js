(() => {
  const endpoint =
    "https://buttondown.com/api/emails/embed-subscribe/pratyaksh";

  function connectForm(form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (!form.reportValidity()) {
        return;
      }

      const input = form.querySelector('input[name="email"]');
      const button = form.querySelector('button[type="submit"]');
      const status = form.querySelector(".subscribe-status");
      const originalLabel = button.textContent;

      button.disabled = true;
      button.textContent = "Subscribing…";
      status.textContent = "";

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: input.value,
            embed: 1,
          }),
        });

        if (!response.ok) {
          throw new Error("Subscription failed");
        }

        form.reset();
        status.textContent = "Check your inbox.";
      } catch {
        status.textContent = "Couldn’t subscribe. Try again.";
      } finally {
        button.disabled = false;
        button.textContent = originalLabel;
      }
    });
  }

  document.querySelectorAll(".buttondown-form").forEach(connectForm);

  const triggers = document.querySelectorAll(
    'a[href="#subscribe"]'
  );

  if (!triggers.length) {
    return;
  }

  const dialog = document.createElement("dialog");
  dialog.className = "subscribe-dialog";
  dialog.setAttribute("aria-label", "Subscribe");
  dialog.innerHTML = `
    <button type="button" class="subscribe-dialog-close" aria-label="Close">×</button>
    <form class="buttondown-form">
      <label class="visually-hidden" for="dialog-subscribe-email">Email address</label>
      <input
        id="dialog-subscribe-email"
        type="email"
        name="email"
        placeholder="Email address"
        autocomplete="email"
        required
      />
      <button type="submit">Subscribe</button>
      <p class="subscribe-status" aria-live="polite"></p>
    </form>
  `;
  document.body.appendChild(dialog);

  const dialogForm = dialog.querySelector(".buttondown-form");
  const dialogInput = dialog.querySelector('input[name="email"]');
  const dialogStatus = dialog.querySelector(".subscribe-status");
  connectForm(dialogForm);

  dialog
    .querySelector(".subscribe-dialog-close")
    .addEventListener("click", () => dialog.close());

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });

  triggers.forEach((trigger) => {
    trigger.setAttribute("aria-haspopup", "dialog");
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      dialogStatus.textContent = "";
      dialog.showModal();
      dialogInput.focus();
    });
  });
})();
