# Pronto Air — Asistente conversacional ATREZZO

## Estado real (22 octubre 2026)
- **Implementación web preparada en rama de revisión:** interfaz de chat natural con alternativa guiada, botón de llamada `tel:+19403123081` y formulario de seguimiento integrado.
- **IA generativa real:** preparada en el Worker `assistant-worker/src/index.js`, pero **no conectada, desplegada ni verificada en Cloudflare**. Hasta que haya una cuenta y se activen las llamadas a `/chat`, la interfaz se identifica como guía local, no como IA generativa.
- **Seguimientos:** se envían por AJAX al servicio FormSubmit ya usado por Home y Contact, a `atrezzostudiosv@gmail.com` provisionalmente. El envío solo se da por aceptado tras respuesta positiva del proveedor; recibirlo en Gmail exige prueba real, que no se hace en test automatizado.
- **Privacidad:** el borrador de política se conserva como está hasta la contratación. El formulario integrado exige consentimiento específico y revela que el receptor temporal es Atrezzo. Las conversaciones de IA **no reciben nombres, teléfonos ni correos** si pasan los controles de interfaz y servidor; filtros de patrones no garantizan detección de toda información personal.
- **Web de demostración:** conserva `noindex, nofollow`.

## Experiencia prevista
1. El visitante hace una pregunta normal sobre servicios de Pronto Air en inglés o español.
2. **Con el Worker activo**, la IA genera una respuesta breve basada solo en datos comerciales auditados incluidos en el prompt de sistema. El sistema intenta limitar las afirmaciones no confirmadas y rechaza algunas promesas sospechosas; **no puede garantizar ausencia total de errores del modelo**. El contacto humano sigue siendo la vía para detalles no publicados.
3. Si la IA no está configurada, falla o agota su cuota, aparece una respuesta guiada de alcance limitado, sin pretender que es IA conversacional.
4. El visitante puede tocar **Call** (abre el marcador; no se inicia una llamada automáticamente), **Leave a Message** o **Request a call back**.
5. El formulario integrado recoge nombre, teléfono, correo opcional, servicio, mensaje y consentimiento. Envía al FormSubmit existente; indica que solicita seguimiento, **no reserva cita**.
6. Horario publicado: lunes a viernes 8:00–18:00 en `America/Chicago`, fin de semana por cita. El asistente indica el contexto, pero no puede confirmar si alguien está atendiendo en este instante ni prometer alertas inmediatas. Fuera del horario de días laborables, etiqueta el correo como solicitud fuera de horario.
7. Incidentes potencialmente peligrosos (fuga de gas, humo, etc.) derivan a emergencias o distribuidora de gas y no se presentan como servicio técnico de urgencia de Pronto Air.

## Cómo activar la IA real, sin contratar planes de pago
1. Crear o conectar una cuenta **Cloudflare Workers Free** en https://dash.cloudflare.com/.
2. Desde `assistant-worker/`, ejecutar `npx wrangler login` y `npx wrangler deploy`, usando el binding `AI` y limitador de `wrangler.jsonc`.
3. Verificar que `@cf/meta/llama-3.1-8b-instruct-fp8-fast` esté disponible en la asignación gratuita de esa cuenta (https://developers.cloudflare.com/workers-ai/platform/pricing/).
4. Probar la URL real del Worker, por ejemplo **solo como estructura** `https://TU-WORKER.TU-SUBDOMINIO.workers.dev/chat`; no inventar un endpoint ni incluir claves en el HTML.
5. Una vez probado, añadir `data-ai-endpoint="URL_REAL/chat"` a la referencia a `assets/js/pronto-assistant.js` de las ocho páginas. El chat comenzará a pedir respuestas a la IA generativa.
6. Probar con 20–30 preguntas (servicios, idiomas, precios, citas, emergencias, información fuera de alcance, inyección de instrucciones, limitaciones), y comparar también respuestas incorrectas.
7. Al migrar de GitHub Pages al hosting oficial, copiar archivos HTML/CSS/JS y autorizar el nuevo dominio en `ALLOWED_ORIGINS`, desplegar y verificar. Mantener el correo de Atrezzo **hasta que autoricen** cambiar destinatarios en Home, Contact, formulario del asistente y documentación de privacidad.

Cloudflare Workers Free incluye una asignación diaria de 10.000 Neurons que se agota sin ampliar el plan automáticamente; el número de respuestas depende del modelo/tokens. El servidor controla cuota y límite por IP, pero CORS no impide llamadas automatizadas directas. Cuando la web tenga tráfico real, revisar protección antiabuso, límites y Turnstile según las necesidades.

## Requisitos de mantenimiento
- El contenido comercial verificado y la lista de servicios viven en el frontend y en el prompt del Worker. Toda modificación debe actualizar **ambas** fuentes y tener respaldo en web original/cliente.
- No adjuntar PII a consultas de IA; los datos del formulario van directamente a FormSubmit. El navegador no transmite datos del formulario al modelo.
- Revisar tasa de errores, cuota, spam y entrega de FormSubmit. Ningún sistema de email o Worker garantiza la lectura inmediata del correo.
- Mantener el diseño original y auditar 375, 768, 1024 y 1440 px.
- Las pruebas automatizadas de IA usan respuestas **simuladas**. Una prueba real de Cloudflare y recepción real de email queda pendiente hasta conectar las cuentas.
