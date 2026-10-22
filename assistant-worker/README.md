# Pronto Air — Asistente portable ATREZZO

## Estado real
**Versión integrada:** guía interactiva local basada en servicios verificados; funciona sin suscripciones y sin conexión a una API de IA.
**IA real:** backend Cloudflare Workers AI preparado en `assistant-worker/`, **no desplegado ni conectado**; no existe acceso a una cuenta Cloudflare del cliente o ATREZZO en este proyecto. La interfaz no debe presentarse como IA generativa ya operativa hasta habilitar y probar el Worker.

Esta solución es portable: funciona en GitHub Pages, hosting HTML estático, VPS u otro dominio que permita archivos HTML/CSS/JS. El sitio actual mantiene `noindex, nofollow`.

## Qué hace el widget
- Se añade de forma aislada a las ocho páginas con `assets/css/pronto-assistant.css` y `assets/js/pronto-assistant.js`; no toca el CSS compilado, fuentes, iconos, secciones ni formularios.
- Seis botones de orientación, entrada de pregunta en inglés/español básico, respuestas deterministas y links a servicios auténticos.
- Las respuestas se basan exclusivamente en `residential-cooling.html`, `residential-heating.html`, `mobile-homes.html`, `light-commercial.html`, `service-agreement-faqs.html` y `contact-us.html`.
- Ofrece `Request Service` hacia `contact-us.html#contact-form-section` y botón de llamada `(940) 312-3081`.
- No diagnostica, no ofrece citas, precios o disponibilidad ni inventa condiciones comerciales.
- Bloquea formatos evidentes de correo, teléfono o direcciones antes de procesar un texto. No guarda historial en navegador ni servidor, no solicita datos personales y limita a 12 mensajes por sesión de widget. Estos filtros no sustituyen auditoría de privacidad.
- Funciona sin API externa. El modo local reconoce términos y orienta; **NO es IA generativa**.

## Conectar IA real — cuando el titular autorice el Worker

1. Crear o conectar una cuenta **Cloudflare Workers Free**. No cambiar a plan de pago ni activar facturación de consumo sin autorización.
2. Entrar en `assistant-worker/`, instalar Wrangler (puede usarse `npx wrangler` sin dependencia local persistente), ejecutar `npx wrangler login` y `npx wrangler deploy`.
3. Comprobar en la cuenta que el modelo `@cf/meta/llama-3.1-8b-instruct-fp8-fast` está disponible en Free; algunas ofertas/modelos cambian o tienen restricciones. `wrangler.jsonc` incluye `AI` y `REQUEST_LIMITER` (10 peticiones/minuto por IP aproximadas).
4. Obtener la URL real `https://<nombre>.<subdominio>.workers.dev/classify`. Solo entonces añadir `data-ai-endpoint="https://.../classify"` a los **ocho** scripts `assets/js/pronto-assistant.js` en HTML. **No inventar ni adivinar una URL o clave**.
5. Probar `/health` y `/classify`, confirmar el modelo y la cuota, 20–30 preguntas, rechazo de PII y funcionamiento sin IA.
6. Actualizar la divulgación de privacidad (el chat mandará la pregunta sin nombre/contacto a Cloudflare cuando se configure) y obtener aprobación del negocio antes de la publicación final.
7. Al cambiar a dominio/hosting oficial, añadir el nuevo origen a `ALLOWED_ORIGINS` del Worker y redesplegar. El JS/CSS se traslada sin reconstruirlo. Probar CORS y enlaces relativos.
8. Si Free agota cuota o hay un error, el widget vuelve a ayuda local. No hay facturación automática en Workers Free, pero límites y políticas cambian; monitorizarlos en Cloudflare.

**Nota de seguridad:** CORS protege solicitudes de sitios no autorizados en navegadores, pero no equivale a autenticación de servidor. El Worker además tiene limitación aproximada por IP, un límite de longitud, rechazo básico de PII y presupuesto de cuota Free; para exposición pública seria, evaluar Turnstile, protección antiabuso y supervisión.

**La IA solo clasifica intención** entre 11 etiquetas permitidas. No genera texto comercial al visitante. La respuesta visible sigue saliendo de la tabla de hechos local; esto reduce considerablemente la posibilidad de inventar servicios.

## Pruebas mínimas antes de presentación
- 8 páginas, 375 / 768 / 1024 / 1440 px; launcher abre/cierra, tecla Escape, controles de 44px, foco y overlay.
- Estado cerrado no altera el diseño ni genera scroll horizontal.
- Preguntas sobre cooling/heating/mobile/commercial/mantenimiento/FAQ enlazan página correcta.
- Consultas ajenas ("plumbing", "roofing") no inventan servicios; precio y citas no tienen promesas.
- PII no se envía al endpoint, incluso cuando se configure. Servidor bloquea datos personales evidentes.
- Probar con IA conectada y desconectada, errores 429 / 503 / red.
- No publicar como chatbot de IA conectado mientras no se despliegue el Worker; no presentar un falso modelo.

## Coste de referencia (Cloudflare oficial, 22 octubre 2026)
- Workers AI Free: **10.000 Neurons/día**; al llegar al límite, falla la inferencia; continuar con modo local. No equivalen a un número fijo de conversaciones.
- Workers Free: hasta **100.000 requests/día**, separado de cuota IA.
- Modelos seleccionados exigen Paid; verificar siempre el modelo exacto y estado de la cuenta.
- Fuentes: https://developers.cloudflare.com/workers-ai/platform/pricing/ , https://developers.cloudflare.com/workers/platform/limits/ , https://developers.cloudflare.com/workers-ai/models/llama-3.1-8b-instruct-fp8/ , https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/

## Puntos pendientes de aprobación
- Política de privacidad: se conserva como borrador hasta que el negocio contrate; el chat local no sustituye consentimiento del cliente al procesamiento externo cuando haya Worker.
- Correo FormSubmit temporal `atrezzostudiosv@gmail.com` sin cambios. Cambiar al del cliente solo al migrar con aprobación.
- Endpoint Worker y prueba real IA de Cloudflare: **pendiente de conexión a cuenta gratuita**.
