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
5. **Formularios de prueba configurados, pero entrega NO VERIFICADA**: Home y Contact envían por AJAX a FormSubmit, con destino temporal `atrezzostudiosv@gmail.com` y campo honeypot. La interacción no cambia de página cuando JavaScript funciona; el antispam/captcha del proveedor aún requiere prueba real. El propietario del correo debe enviar una solicitud de prueba, abrir el mensaje de activación de FormSubmit y confirmar el destinatario. Después, verificar que una segunda solicitud de prueba llega al buzón (también revisar spam). En tanto no ocurra, **no comunicar que los formularios ya reciben mensajes**. Los formularios no son una reserva de cita. Antes del lanzamiento oficial: aprobar proveedor, política de privacidad, destinatario comercial, medidas antispam y procedimiento de gestión de leads.
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

## Pendiente posterior al lanzamiento — Asistente IA (propuesta; NO implementado)
- **Prioridad:** después de completar SEO técnico, responsive y conexión y pruebas reales de los formularios. Requiere aprobación de Pronto Air antes de incorporarlo.
- Evaluar un asistente ligero para responder únicamente preguntas sobre servicios, horarios y cobertura **confirmados** de Pronto Air, y recoger solicitudes de servicio fuera de horario.
- Flujo de captación: tipo de problema HVAC, nombre, teléfono, ubicación aproximada y descripción; pedir consentimiento para transmitir los datos. No solicitar información sensible innecesaria.
- Ofrecer **solicitud de cita** (fecha preferida) sin confirmar disponibilidad. Reservar automáticamente solo cuando exista calendario conectado, permisos, disponibilidad real y proceso de confirmación probado.
- Prohibir al asistente inventar diagnósticos técnicos, precios, garantías, urgencias 24/7, servicios, zonas, tiempos de respuesta o citas confirmadas.
- Antes de activar: definir proveedor, costos y límites, fuente de conocimiento verificada, privacidad y almacenamiento de datos, traspaso a una persona y pruebas de seguridad y funcionamiento en móvil.
- Mantener el sitio actual como HTML/CSS/JS estático; un widget integrado **no exige Next.js**. No agregar scripts externos hasta confirmar que el negocio desea este servicio.

## Configuración temporal de correo — pendiente de activación
- Los formularios conservan `action=https://formsubmit.co/atrezzostudiosv@gmail.com` como alternativa HTML. Con JavaScript activo, usan `POST https://formsubmit.co/ajax/atrezzostudiosv@gmail.com` para mostrar el resultado dentro de la web y no salir a la página de FormSubmit. Sin JavaScript se utiliza el envío HTML del proveedor, que puede redirigir fuera del sitio. No hay SMTP ni claves en GitHub.
- Proveedor documentado: https://formsubmit.co/documentation y https://formsubmit.co/help . Requiere **correo de activación después del primer envío**. FormSubmit dice que los mensajes pueden mantenerse pendientes hasta la activación; no equivale a entrega verificada.
- El email de Pronto Air en header, footer y llamadas a contacto directo permanece intacto: `prontoairdenton@hotmail.com`.
- Para cambiar al correo empresarial **cuando el usuario lo autorice**, sustituir el email en los dos atributos `action` **y también en `assets/js/pronto-form-inline.js`**, repetir activación del nuevo destinatario y confirmar un envío real. Actualizar también los avisos de prueba y el borrador de privacidad. No cambiar destinatarios sin autorización.
- No publicar la demo como la web oficial del negocio: conservar `noindex, nofollow` y avisos de prueba hasta aprobación de negocio y verificación de entrega.

- **Estado AJAX:** el mensaje de éxito indica únicamente que el servicio aceptó la solicitud (respuesta JSON positiva); no confirma correo entregado, cita ni respuesta de Pronto Air. Si hay fallo, aparece aviso dentro de la página con el contacto directo de la empresa. La prueba de extremo a extremo en Gmail y antispam sigue pendiente.
