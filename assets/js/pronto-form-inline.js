/* Pronto Air demo forms: remain on-page; no third-party thank-you navigation.
 * FormSubmit may accept a request without confirming actual inbox delivery.
 * No credentials are stored in this script.
 */
(function () {
  'use strict';

  const AJAX_ENDPOINT = 'https://formsubmit.co/ajax/atrezzostudiosv@gmail.com';

  function showStatus(element, type, message) {
    element.classList.remove('hidden');
    element.classList.add('block');
    element.setAttribute('role', 'status');
    element.setAttribute('aria-live', 'polite');
    element.style.backgroundColor = type === 'success' ? '#ECFDF5' :
      type === 'error' ? '#FEF2F2' : '#FFFBEB';
    element.style.border = '1px solid ' + (
      type === 'success' ? '#A7F3D0' :
      type === 'error' ? '#FECACA' : '#FDE68A'
    );
    element.style.color = type === 'success' ? '#065F46' :
      type === 'error' ? '#991B1B' : '#92400E';
    element.textContent = message;
  }

  window.prontoSubmitInline = async function (form, statusElement) {
    if (!form || !statusElement) return;
    const button = form.querySelector('button[type="submit"]');
    if (!button || button.disabled) return;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.style.opacity = '0.7';

    showStatus(statusElement, 'pending', 'Sending your request…');

    try {
      const fields = Object.fromEntries(new FormData(form).entries());
      // The honeypot is deliberately never sent if filled by an automated bot.
      if (fields._honey) {
        showStatus(statusElement, 'error',
          'We could not confirm your submission. Please contact Pronto Air directly.');
        return;
      }

      const response = await fetch(AJAX_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(fields)
      });

      const result = await response.json();
      const accepted = result && (result.success === true || result.success === 'true');
      if (!response.ok || !accepted) {
        throw new Error('Form service did not confirm acceptance');
      }

      // "Accepted" is not proof an email reached the inbox or that a booking exists.
      showStatus(statusElement, 'success',
        'Your request was accepted by the form service. This does not confirm email delivery or an appointment. For urgent help, please call Pronto Air at (940) 312-3081.');
      form.reset();
    } catch (_error) {
      showStatus(statusElement, 'error',
        'We could not verify that your message was sent. Please try again or contact Pronto Air directly at (940) 312-3081 or prontoairdenton@hotmail.com.');
    } finally {
      button.disabled = false;
      button.removeAttribute('aria-busy');
      button.style.opacity = '';
    }
  };
})();
