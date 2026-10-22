# Pronto Air — SEO: preparación para producción (22 oct 2026)

**ESTADO: DEMO / PROSPECTO.** GitHub Pages es una vista previa del rediseño, no la web oficial del negocio. Las ocho páginas deben seguir con `noindex, nofollow` hasta el lanzamiento autorizado. No colocar robots.txt ni sitemap.xml de producción en la raíz de la demo.

## Rutas actuales verificadas en la web oficial
- https://www.prontoairdenton.com/  → `index.html`
- https://www.prontoairdenton.com/residential-cooling → `residential-cooling.html`
- https://www.prontoairdenton.com/residential-heating → `residential-heating.html`
- https://www.prontoairdenton.com/mobile-homes → `mobile-homes.html`
- https://www.prontoairdenton.com/light-commercial → `light-commercial.html`
- https://www.prontoairdenton.com/contact-us → `contact-us.html`
- El destino definitivo de `service-agreement-faqs.html` y `privacy-policy.html` permanece pendiente de aprobación.

## Para realizar el cambio a la web oficial
1. Obtener autorización del cliente, acceso al dominio y conocer el hosting definitivo. **Mantener las URLs originales** siempre que sea viable. Si cambian a rutas con `.html`, configurar verdaderas redirecciones HTTP 301/308 por cada ruta antigua. GitHub Pages no ofrece control general de redirecciones 301 del servidor.
2. Una vez servidas las nuevas páginas en el dominio oficial, poner `rel=canonical` hacia sus URLs definitivas y retirar `noindex` solo en producción. **Nunca** eliminar `noindex` del preview de GitHub Pages ni poner canonical que lo haga pasar por la web oficial.
3. Publicar los dos archivos de ejemplo de este directorio como `/robots.txt` y `/sitemap.xml` **en la raíz del dominio oficial**, después de aprobar la lista de URLs. Son ejemplos, no archivos activos. robots.txt no sustituye noindex.
4. Confirmar información para JSON-LD: tipo de negocio, dirección real si es pública, horarios vigentes, área de servicio y licencia. El JSON de este directorio es preliminar y no asegura rich results; no incluye dirección ni reseñas ficticias.
5. **Formularios configurados y probados por el usuario (22 oct 2026):** Home y Contact envían vía AJAX a FormSubmit, con destino temporal `atrezzostudiosv@gmail.com` y campo honeypot. El usuario ha confirmado que funcionan. Se retiraron las advertencias amarillas de prueba y se presenta un mensaje breve de confirmación únicamente cuando el proveedor responde positivamente. Esta comprobación declarada por el usuario no sustituye una auditoría independiente del buzón, tratamiento de datos ni antispam. Los formularios no reservan citas. Antes del lanzamiento oficial: aprobar proveedor, política de privacidad, destinatario comercial, medidas antispam y procedimiento de gestión de leads.
6. **Completado en la demo (2026-10-22):** Tailwind compilado en ocho archivos CSS estáticos con pruebas visuales en 375, 768, 1024 y 1440 px. Se mantienen fuentes e iconos aprobados. Revisar métricas PageSpeed y rendimiento de producción cuando se migre.
7. Revisar SEO final con Google Search Console, prueba de resultados enriquecidos, PageSpeed Insights, HTTP/HTTPS, enlaces, formularios y redirecciones.

## Cambios seguros ya preparados en el HTML de esta fase
- `noindex, nofollow` conservado en 8/8 páginas.
- Títulos, descripciones, H1 y todos los textos comerciales conservados.
- Favicon basado en el logo existente, `theme-color`, metadatos de vista previa social (la imagen social apunta temporalmente a la demo), atributos width/height y decoding para imágenes, hints de preload de hero en desktop.
- No hay nuevas afirmaciones comerciales, ofertas, testimonios, zonas o datos de contacto.

## Documentación
- https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag
- https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- https://developers.google.com/search/docs/appearance/google-images
- https://v3.tailwindcss.com/docs/installation/play-cdn

## Asistente Ari — implementado en la demo, no autorizado para producción
- **Completado en código:** IA conversacional real con Cloudflare Workers AI, nombre Ari, voz de Pronto Air, idioma según pregunta, orientación de servicios auditados y opciones de llamada/formulario.
- **Completado y validado en CI:** acceso rápido de 5 categorías a través del flujo de IA (PR #17), 32 comprobaciones en cuatro anchos por ocho páginas, 16 análisis automatizados de accesibilidad del widget y pruebas simuladas de formulario. Las comprobaciones no equivalen a auditoría manual WCAG completa.
- **Pendiente:** prueba real de entrega y recepción del formulario integrado de Ari, 20–30 preguntas de IA más exigentes, aprobación de privacidad y tratamientos con Cloudflare/FormSubmit y revisión comercial del cliente.
- **Regla comercial:** no presentar al asistente como técnico humano ni confirmar precios, garantías, urgencias, citas o tiempos de respuesta sin datos acreditados.

## Configuración temporal de correo — pendiente de activación
- Los formularios conservan `action=https://formsubmit.co/atrezzostudiosv@gmail.com` como alternativa HTML. Con JavaScript activo, usan `POST https://formsubmit.co/ajax/atrezzostudiosv@gmail.com` para mostrar el resultado dentro de la web y no salir a la página de FormSubmit. Sin JavaScript se utiliza el envío HTML del proveedor, que puede redirigir fuera del sitio. No hay SMTP ni claves en GitHub.
- Proveedor documentado: https://formsubmit.co/documentation y https://formsubmit.co/help . Requiere **correo de activación después del primer envío**. FormSubmit dice que los mensajes pueden mantenerse pendientes hasta la activación; no equivale a entrega verificada.
- El email de Pronto Air en header, footer y llamadas a contacto directo permanece intacto: `prontoairdenton@hotmail.com`.
- Para cambiar al correo empresarial **cuando el usuario lo autorice**, sustituir el email en los dos atributos `action` **y también en `assets/js/pronto-form-inline.js`**, repetir activación del nuevo destinatario y confirmar un envío real. Actualizar la información de privacidad y la documentación técnica. No cambiar destinatarios sin autorización.
- No publicar la demo como la web oficial del negocio: conservar `noindex, nofollow` hasta aprobación del negocio. Los avisos amarillos se retiraron solo de los formularios; el borrador de privacidad conserva las notas de revisión comercial.

- **Estado AJAX:** mensaje de confirmación breve debajo del botón únicamente cuando FormSubmit responde con éxito; este estado no reserva una cita. Si hay fallo, aviso dentro de la página con el contacto directo de la empresa. El usuario confirmó funcionamiento, sin acceso independiente al buzón para verificar entrega.

## Asistente IA Cloudflare — estado de demo (22 oct 2026)
- Worker Free verificado: `https://pronto-air-assistant.atrezzostudiosv.workers.dev/chat`, health/CORS/IA real OK; siete preguntas seguras EN/ES superadas. La conexión de ocho páginas y las acciones rápidas de Ari ya están integradas en main tras pasar QA automatizada; faltan pruebas reales de correo del asistente y revisión legal/comercial.
- El chat declara que las preguntas se procesan mediante Cloudflare Workers AI y recomienda no compartir datos personales. Los datos del formulario de seguimiento van directamente a FormSubmit, no al modelo.
- **Pendiente antes de entregar oficialmente:** aprobación empresarial y jurídica de la información de privacidad, test exhaustivo 20–30 prompts, revisión manual WCAG y correo definitivo para Home, Contact y el formulario del asistente.
- Al migrar dominio/hosting: actualizar `ALLOWED_ORIGINS` en Cloudflare, URLs del frontend si cambian, el correo FormSubmit **en las tres entradas** y sus activaciones; repetir pruebas.
- Evitar que el acceso público a la demo se confunda con sitio oficial: conservar `noindex, nofollow` y no presentar una IA como garantía de diagnóstico o reserva.
