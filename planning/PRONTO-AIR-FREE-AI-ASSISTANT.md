# ATREZZO — Pronto Air: asistente IA gratuito antes de presentación

**Estado al 22 octubre 2026:** prototipo de guía local implementado en las ocho páginas; backend Cloudflare Workers AI escrito y probado de forma simulada, **NO desplegado ni conectado a una cuenta real**. La clasificación mediante IA de Cloudflare sigue desactivada hasta su configuración.

## Decisión propuesta

**Asistente híbrido de orientación HVAC y captación responsable.** Integra una interfaz propia, ligera y coherente con Pronto Air, sin plataformas de chatbot por suscripción. Responde primero con datos estructurados verificados y, si la pregunta necesita redacción flexible, usa una inferencia de IA a través de **Cloudflare Workers AI, plan Free**, sujeta a los límites gratuitos. Cuando el modelo no esté disponible o se alcance la cuota diaria, se ofrece navegación guiada, el teléfono y el formulario existente, no una respuesta inventada.

La experiencia debe aportar valor comercial genuino, no solo un botón de chat de decoración.

## Objetivos (propuesta de diseño, no promesas del negocio)

1. Orientar a los visitantes hacia las categorías **Residential Cooling, Residential Heating, Mobile Homes, Light Commercial** ya existentes; no diagnosticar averías ni ofrecer categorías ajenas al negocio.
2. Responder dudas sobre servicios **confirmados** citando y enlazando la página fuente; si no hay respaldo documental, reconocer la incertidumbre y derivar a contacto.
3. Facilitar «Request Service» → formulario existente con categoría seleccionada y descripción opcional. El asistente **no confirma citas, tiempos de llegada, precios ni disponibilidad**.
4. Ofrecer acceso directo al teléfono verificado `(940) 312-3081` y correo público `prontoairdenton@hotmail.com`, sin cambiar la cuenta temporal de pruebas de FormSubmit hasta la migración.
5. Brindar orientación en lenguaje natural, sin ocultar que la IA puede equivocarse; siempre permitir contacto humano.

## Estrategia de contenido e integridad

**HECHOS CONFIRMADOS — extraer solo de fuentes revisadas:**
- `index.html`: presentación, servicios reales, contacto.
- `residential-cooling.html`: alcance de cooling.
- `residential-heating.html`: alcance de heating.
- `mobile-homes.html`: alcance de mobile homes.
- `light-commercial.html`: alcance de light commercial.
- `service-agreement-faqs.html`: FAQ y acuerdo, sin inventar condiciones.
- `contact-us.html`: horarios y áreas únicamente donde estén verificados contra el sitio original.
- Fuente externa original para contraste: https://www.prontoairdenton.com/ y subpáginas correspondientes.

**Regla de respuesta:** no usar información de relleno por sector; no asegurar garantías, precios, reparaciones concretas no confirmadas, emergencia/24-7, zona de cobertura adicional, descuentos, testimonios, licencias nuevas, diagnósticos o reservas. Si pregunta algo no acreditado: «I can't confirm that from Pronto Air's website. Please contact the team directly.»

**Pendientes antes de activar IA:** decidir si se incluyen horarios/zonas que aparecen en la demo; confirmar condiciones de acuerdo de servicio; aprobar textos y consentimiento de privacidad/uso de un tercero.

## Experiencia UX propuesta

- Botón discreto inferior derecho **Ask Pronto Air** o **How can we help?**, sin ocultar menús, CTAs ni elementos existentes. Móvil: panel estrecho de desplazamiento vertical, cierre claro, accesibilidad de teclado, foco, `aria-live`, respeto a `prefers-reduced-motion`.
- Inicio con cuatro accesos: Cooling / Heating / Mobile Homes / Light Commercial. Además: Service Agreement & FAQs / Contact.
- Mensaje breve, botones de respuesta rápida y vínculos a páginas del sitio. No reemplazar el formulario actual.
- Después de orientar: **Request Service** abre `contact-us.html#contact-form-section`, pudiendo precargar el `select` de categoría por parámetro seguro controlado.
- **No recoger** nombre, teléfono ni email en el chat; esos datos se completan en el formulario vigente. Evita compartir datos personales con el modelo generativo. Si un usuario escribe PII en texto libre, bloquear/limitar y aconsejar usar el formulario.
- Sin reservar citas ni ofrecer diagnósticos peligrosos; ante olor a gas, humo u otra emergencia, indicar que no es un servicio de emergencias y remitir a los servicios de emergencia apropiados, sin suponer intervención propia.

## Integración técnica — sin cambiar GitHub Pages

```
GitHub Pages (las 8 páginas estáticas)
  └─ assets/js/pronto-assistant.js + assets/css/pronto-assistant.css
        ├─ Respuestas guiadas locales verificadas, siempre disponibles (sin API)
        ├─ Formulario y enlaces oficiales ya implementados (FormSubmit)
        └─ Pregunta libre autorizada → POST HTTPS (sin datos personales)
              └─ Cloudflare Worker propio en plan FREE
                    ├─ CORS restringido a demo y, después, dominio aprobado
                    ├─ Límites de longitud, tiempo, cantidad de consultas y abuso
                    ├─ Lista blanca de hechos permitidos + enlaces fuente
                    ├─ Workers AI binding, modelo accesible en Free
                    └─ Control de errores 429/cuota → fallback a ayuda guiada
```

**Modelo inicial a evaluar:** `@cf/meta/llama-3.1-8b-instruct-fp8-fast` o un modelo Free vigente de Workers AI. Instrucción de sistema estricta, temperatura baja, respuestas breves, tokens máximos limitados, no historial ilimitado. El modelo jamás es autoridad para nuevas afirmaciones comerciales. Para preguntas de hechos esenciales, preferir respuestas plantilladas basadas en la base validada; no fiarse solo del prompt.

**Alojamiento:** permanece GitHub Pages; Cloudflare hospeda únicamente el endpoint serverless. No incrustar secretos, tokens ni claves privadas en el JavaScript público.

## Límite y coste (consultado el 22 de octubre de 2026)

Documentación oficial Cloudflare:
- Workers AI Free: **10 000 Neurons/día** gratuitos. Al agotarse, las solicitudes adicionales fallan; **no se cobra automáticamente en Free**. No prometer número fijo de conversaciones por día: depende del modelo, tamaño de respuestas e historial.
  Fuente: https://developers.cloudflare.com/workers-ai/platform/pricing/
- Workers Free: hasta **100 000 solicitudes/día** (límite separado de la cuota de IA), sujeto a otros límites.
  Fuente: https://developers.cloudflare.com/workers/platform/limits/
- Algunos modelos pesados requieren Workers Paid (desde USD 5/mes); **no usarlos**.
  Fuente: https://developers.cloudflare.com/changelog/post/2026-07-28-models-require-workers-paid/
- Verificar condiciones del modelo y cuota en la **cuenta concreta** antes de comprometer coste cero: el catálogo/planes cambian.
- Al agotarse la cuota o fallar inferencia, fallback local inmediato y enlaces de contacto; jamás cambiar de plan sin autorización.
- Cloudflare indica que no utiliza contenido de clientes procesado por Workers AI para entrenar modelos.
  Fuente: https://developers.cloudflare.com/workers-ai/platform/data-usage/
- Cuenta gratuita de Cloudflare necesaria; no hay acceso ni autorización actuales para desplegar el Worker. Ningún endpoint productivo se ha creado todavía.

**Alternativas consideradas:**
- Solo FAQ/árbol local: coste cero y robusto; **no es IA generativa**. Excelente fallback.
- Gemini API Free + proxy serverless: puede servir, pero añade dependencia y condiciones específicas de cuota/tratamiento de datos; no es necesario como primera elección para este proyecto.
- Chatbot comercial SaaS: no cumple la preferencia de no pagar suscripción; descartar salvo cambio de requisitos.

## Riesgos y controles

- **Alucinaciones:** prompts no bastan; responder desde registro de hechos o rechazar preguntas fuera de alcance. Pruebas con consultas negativas («Do you do plumbing?», «Are you open 24/7?», «How much is my repair?», «Can you book for tomorrow?»).
- **Privacidad:** no capturar contactos/PII en el chat; divulgar procesamiento de Cloudflare y obtener aprobación del cliente para cualquier tratamiento nuevo. No modificar ahora el borrador de política sin autorización.
- **Abuso y cuota:** tamaño máximo por mensaje, límite de conversaciones, cooldown y/o desafío gratuito Turnstile si necesario. Restringir CORS no detiene por sí solo los abusos automatizados.
- **Calidad y accesibilidad:** probar 375, 768, 1024, 1440 px; teclado, foco, contraste, velocidad, no bloquear carga inicial ni alterar CLS, y cerrar con tecla Escape.
- **SEO:** conservar `noindex, nofollow` de la demo. No crear página de servicios ni afirmaciones nuevas desde el asistente.

## Criterios de aceptación antes de presentar al cliente

1. Diseño propio de ATREZZO y contraste correctos, ningún componente del sitio original alterado.
2. Las preguntas sobre 4 servicios apuntan a páginas fuente correctas.
3. Precios, citas, diagnósticos y servicios no confirmados se rechazan apropiadamente.
4. Funciona el modo FAQ local incluso sin conexión/IA/cuota.
5. Si se conecta Worker real, probar 20–30 preguntas y respuestas adversariales; medir consumo de cuota y latencia.
6. No pedir ni transferir datos personales al modelo; contacto mediante FormSubmit existente.
7. Comprobar funcionamiento en 4 breakpoints y navegación teclado.
8. Aviso transparente de asistencia IA, tratamiento de datos aprobado y transferencia al contacto real.
9. Cliente debe autorizar antes del lanzamiento oficial.

## Pruebas completadas en prototipo
- **32/32:** ocho páginas en 375, 768, 1024 y 1440 px con launcher, panel, tecla Escape, ausencia de cambios de geometría del sitio y sin nuevos desbordamientos.
- **16 análisis axe automatizados:** widget sin infracciones detectadas en 375 y 1440 px. No sustituye auditoría WCAG manual completa.
- Consultas básicas, fuera de alcance, precios, citas, bloqueo de PII y CTA de contacto, todas probadas con respuestas locales.
- Worker verificado **solo con IA simulada**, incluyendo whitelist de respuestas, CORS, rate limit, rechazo de datos personales y cuota agotada; no se ha probado el modelo externo con una cuenta Cloudflare.
- Consulta el detalle técnico y la configuración en `assistant-worker/README.md`.

## Siguientes pasos técnicos

1. **Completado:** integrar una guía local en las ocho páginas con información procedente de la web confirmada; no presentarla como IA generativa mientras no exista endpoint real.
2. Crear endpoint Worker, protección de abuso y binding Workers AI en una cuenta Cloudflare Free conectada por su titular.
3. Conectar únicamente al endpoint desplegado, auditar 20–30 preguntas, rendimiento/privacidad, presentar al cliente.
4. Mantener FormSubmit con correo temporal hasta contrato y migración aprobados.

**El prototipo local sí está implementado. La IA generativa en Cloudflare todavía NO está desplegada ni se han medido costes/cuotas en una cuenta real.**
