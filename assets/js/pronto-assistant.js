/* Pronto Air Service Guide — portable, source-grounded, no dependencies.
 * AI intent classification is optional. Without a real configured endpoint,
 * every button and text query uses the verified local guide.
 * Do not collect names, phone numbers, email or addresses in this widget.
 */
(function () {
  'use strict';
  const loader = document.currentScript;
  const endpoint = (loader && loader.dataset.aiEndpoint || '').trim();
  const sourcePages = {
    cooling: 'residential-cooling.html',
    heating: 'residential-heating.html',
    mobile: 'mobile-homes.html',
    commercial: 'light-commercial.html',
    maintenance: 'service-agreement-faqs.html',
    faqs: 'service-agreement-faqs.html',
    contact: 'contact-us.html'
  };
  const answers = {
    cooling: {
      title: 'Residential Cooling',
      body: 'Pronto Air lists residential air-conditioning repair, maintenance and installation, including central air and ductless systems.',
      page: 'cooling'
    },
    heating: {
      title: 'Residential Heating',
      body: 'Pronto Air provides residential heating inspections, repairs, maintenance and installation of new heating systems.',
      page: 'heating'
    },
    mobile: {
      title: 'Mobile Home HVAC',
      body: 'Pronto Air provides heating and air-conditioning inspections, repairs and system replacement for mobile homes.',
      page: 'mobile'
    },
    commercial: {
      title: 'Light Commercial HVAC',
      body: 'Pronto Air lists heating and cooling repairs, servicing and new equipment installation for light commercial applications.',
      page: 'commercial'
    },
    maintenance: {
      title: 'Maintenance & Service Agreement',
      body: 'Pronto Air describes a service agreement that includes two tune-ups each year for heating and air-conditioning systems.',
      page: 'maintenance'
    },
    faqs: {
      title: 'Common Questions',
      body: 'Pronto Air has FAQs about air conditioning, equipment efficiency, maintenance and indoor air quality.',
      page: 'faqs'
    },
    contact: {
      title: 'Contact Pronto Air',
      body: 'For questions about services or to request an appointment, contact the Pronto Air team directly. This guide cannot confirm availability.',
      page: 'contact'
    },
    pricing: {
      title: 'Pricing & Estimates',
      body: 'I cannot confirm a price for your request from the website. Contact Pronto Air for details.',
      page: 'contact'
    },
    booking: {
      title: 'Appointment Requests',
      body: 'You can send a service request or call Pronto Air. An appointment is not booked or confirmed through this guide.',
      page: 'contact'
    },
    urgent: {
      title: 'Urgent Safety Concern',
      body: 'If there is immediate danger, such as a possible gas leak, leave the area and contact local emergency services or the gas utility. This guide is not an emergency-response service.',
      page: 'contact'
    },
    unknown: {
      title: 'Let Us Help',
      body: 'I cannot confirm that information from Pronto Air’s published services. The team can answer your specific question directly.',
      page: 'contact'
    }
  };
  const options = [
    ['cooling', 'Cooling'],
    ['heating', 'Heating'],
    ['mobile', 'Mobile Homes'],
    ['commercial', 'Light Commercial'],
    ['maintenance', 'Maintenance'],
    ['faqs', 'FAQs']
  ];
  const outOfScope = /\b(plumb(?:ing|er)|roof(?:ing|er)?|electrical wiring|pest control|landscap(?:ing|er)|septic|pool cleaning|garage door)\b/i;
  const personallyIdentifying = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|(?:\+?\d[\d ()-]{7,}\d)|\b(?:address|my address|i live at|i'm at|street address|ssn|social security)\b/i;
  const patterns = [
    ['urgent', /\b(gas leak|smell gas|gas odor|carbon monoxide|co detector|fire|smoke from)\b|olor a gas|fuga de gas|mon[oó]xido/i],
    ['pricing', /\b(price|pricing|cost|quote|estimate|how much|discount|payment)\b|precio|cu[aá]nto cuesta|presupuesto/i],
    ['booking', /\b(book|booking|appointment|available|availability|schedule|today|tomorrow|weekend|24.?7|open now|emergency service)\b|cita|disponib|horario|urgente/i],
    ['mobile', /\b(mobile home|mobile homes|manufactured home|trailer home)\b|casa m[oó]vil|casa prefabricada/i],
    ['commercial', /\b(commercial|store|business|office|retail|rooftop unit)\b|comercial|negocio|oficina/i],
    ['maintenance', /\b(maintenance|tune.?up|service agreement|seasonal check|annual check|preventive|filter)\b|mantenimiento|revisi[oó]n/i],
    ['heating', /\b(heat|heater|heating|furnace|cold air|heat pump|winter)\b|calefacci[oó]n|calentador/i],
    ['cooling', /\b(ac|a\/c|air conditioner|air conditioning|cool|cooling|ductless|summer|not cold|warm air)\b|aire acondicionado|enfri|refrigeraci[oó]n/i],
    ['faqs', /\b(faq|frequently asked|question|air quality|efficiency|seer|lifespan)\b|preguntas frecuentes|calidad del aire/i],
    ['contact', /\b(contact|email|phone|call|talk to|reach you)\b|contactar|tel[eé]fono|llamar/i]
  ];
  function localIntent(input) {
    if (outOfScope.test(input)) return 'unknown';
    for (const [key, rx] of patterns) if (rx.test(input)) return key;
    return 'unknown';
  }
  const root = document.createElement('div');
  root.className = 'pa-guide';
  root.innerHTML = [
    '<button type="button" class="pa-guide-launcher" aria-haspopup="dialog" aria-expanded="false" aria-controls="pa-guide-panel">',
    '<span class="pa-guide-launcher-mark" aria-hidden="true"><i class="fa-regular fa-comments"></i></span>',
    '<span>Ask Pronto Air</span>',
    '</button>',
    '<section id="pa-guide-panel" class="pa-guide-panel" role="dialog" aria-label="Pronto Air service guide" aria-modal="false" hidden>',
    ' <header class="pa-guide-top">',
    '   <span class="pa-guide-brand-icon" aria-hidden="true"><i class="fa-regular fa-comments"></i></span>',
    '   <span class="pa-guide-heading"><strong>How can we help?</strong><small id="pa-guide-mode">Pronto Air service guide</small></span>',
    '   <button type="button" class="pa-guide-close" aria-label="Close service guide"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>',
    ' </header>',
    ' <div class="pa-guide-scroll" tabindex="0">',
    '   <div class="pa-guide-intro">Explore verified services or ask a general question. For appointments and personal details, contact the Pronto Air team.</div>',
    '   <div class="pa-guide-messages" aria-live="polite" aria-relevant="additions text"></div>',
    '   <div class="pa-guide-options" aria-label="Service topics"></div>',
    ' </div>',
    ' <form class="pa-guide-form" novalidate>',
    '   <label class="pa-guide-input-label" for="pa-guide-question">Your question <span>(no personal information)</span></label>',
    '   <div class="pa-guide-input-wrap">',
    '     <input id="pa-guide-question" type="text" maxlength="220" autocomplete="off" placeholder="E.g. Do you service mobile homes?" />',
    '     <button type="submit" class="pa-guide-send" aria-label="Ask question"><i class="fa-solid fa-arrow-right" aria-hidden="true"></i></button>',
    '   </div>',
    '   <div id="pa-guide-warning" class="pa-guide-warning" role="status"></div>',
    '   <div class="pa-guide-footer-links"><a href="contact-us.html#contact-form-section">Request Service</a><a href="tel:+19403123081">Call (940) 312-3081</a></div>',
    '   <p class="pa-guide-footnote">Service guidance only · No diagnosis or confirmed booking</p>',
    ' </form>',
    '</section>'
  ].join('\n');
  document.body.appendChild(root);
  const launcher = root.querySelector('.pa-guide-launcher');
  const panel = root.querySelector('.pa-guide-panel');
  const close = root.querySelector('.pa-guide-close');
  const messages = root.querySelector('.pa-guide-messages');
  const choices = root.querySelector('.pa-guide-options');
  const question = root.querySelector('#pa-guide-question');
  const warning = root.querySelector('#pa-guide-warning');
  const form = root.querySelector('.pa-guide-form');
  const send = root.querySelector('.pa-guide-send');
  root.querySelector('#pa-guide-mode').textContent = endpoint ? 'AI-assisted service navigation' : 'Guided service navigation';
  let activeRequest = null;
  let messagesSent = 0;
  function openGuide() {
    panel.hidden = false;
    launcher.setAttribute('aria-expanded', 'true');
    launcher.classList.add('is-open');
    question.focus({ preventScroll: true });
  }
  function closeGuide() {
    panel.hidden = true;
    launcher.setAttribute('aria-expanded', 'false');
    launcher.classList.remove('is-open');
    if (activeRequest) { activeRequest.abort(); activeRequest = null; }
    send.disabled = false;
    launcher.focus({ preventScroll: true });
  }
  launcher.addEventListener('click', () => panel.hidden ? openGuide() : closeGuide());
  close.addEventListener('click', closeGuide);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !panel.hidden) closeGuide();
  });
  function addMessage(kind, title, message, page) {
    const item = document.createElement('div');
    item.className = 'pa-guide-message ' + (kind === 'visitor' ? 'is-visitor' : 'is-guide');
    if (title) {
      const head = document.createElement('strong');
      head.textContent = title;
      item.appendChild(head);
    }
    const body = document.createElement('p');
    body.textContent = message;
    item.appendChild(body);
    if (kind === 'guide') {
      const link = document.createElement('a');
      link.href = sourcePages[page || 'contact'];
      link.textContent = page === 'contact' ? 'Contact Pronto Air' : 'View service details';
      item.appendChild(link);
    }
    messages.appendChild(item);
    item.scrollIntoView({block:'nearest',behavior:'instant'});
  }
  function answer(intent) {
    const result = answers[intent] || answers.unknown;
    addMessage('guide', result.title, result.body, result.page);
  }
  for (const [id, label] of options) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', () => {addMessage('visitor', '', label);answer(id);});
    choices.appendChild(button);
  }
  async function getIntent(input, signal) {
    // An unconfigured Worker is never disguised as working AI.
    if (!endpoint) return localIntent(input);
    const response = await fetch(endpoint, {
      method: 'POST',
      mode: 'cors',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({question:input}),
      signal
    });
    if (!response.ok) throw new Error('Assistant classification service unavailable');
    const parsed = await response.json();
    const allowed = Object.prototype.hasOwnProperty.call(answers, parsed.intent);
    if (!allowed) throw new Error('Invalid classification');
    return parsed.intent;
  }
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const input = question.value.trim();
    warning.textContent = '';
    if (!input) {question.focus();return;}
    if (input.length > 220) {warning.textContent = 'Please shorten your question.';return;}
    if (personallyIdentifying.test(input)) {
      warning.textContent = 'Please do not enter names, phone numbers, email or addresses here. Use the contact form instead.';
      return;
    }
    if (messagesSent >= 12) {
      warning.textContent = 'For more questions, please contact Pronto Air directly.';
      return;
    }
    addMessage('visitor','',input);
    question.value = '';
    messagesSent++;
    const controller = new AbortController();
    activeRequest = controller;
    send.disabled = true;
    const timeout = setTimeout(() => controller.abort(), 6500);
    try {
      const intent = outOfScope.test(input) ? 'unknown' : await getIntent(input,controller.signal);
      if (!controller.signal.aborted) answer(intent);
    } catch (_) {
      if (!controller.signal.aborted) {
        answer(localIntent(input));
        if (endpoint) warning.textContent = 'AI assistance is temporarily unavailable. Guided information is still available.';
      }
    } finally {
      clearTimeout(timeout);
      if (activeRequest === controller) activeRequest = null;
      send.disabled = false;
    }
  });
})();
