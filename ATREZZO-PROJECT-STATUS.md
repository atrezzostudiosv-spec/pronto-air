# ATREZZO — Estado maestro del proyecto: Pronto Air

**Actualización:** 23 octubre 2026. **Tipo:** demo de rediseño comercial; NO sitio oficial ni entrega autorizada del cliente.

> Fuente de verdad para evitar repetir fases. Antes de proponer nuevas tareas, consultar este archivo y las decisiones ya aprobadas. **CERRADA no significa aprobada por el cliente final**; describe la fase de desarrollo de la demo.
>
> Estados: PENDIENTE · EN PROCESO · EN VALIDACIÓN · CERRADA · BLOQUEADA.
> Una prueba puntual de regresión no reabre una fase cerrada. Solo reabrir ante fallo reproducible, solicitud expresa, impacto posterior confirmado o requisito nuevo aprobado. Registrar motivo y limitar el alcance.

## Una sola fase activa
**EN PROCESO — Optimización del rendimiento móvil del website completo**, iniciada por Home. **No es trabajo sobre Ari**. No alterar diseño aprobado, tipografías, colores, iconos, secciones ni fotos sin autorización.

- **Home, corrección 01 incorporada:** PR #24, commit `fe6b5b507db956c80d2fbadc503e8bad18e67f71`. Precarga de la imagen mobile del hero con imágenes y tamaños actuales; conserva precarga desktop y apariencia.
- **Validación de código:** GitHub Actions run `39916714792` superada (regresión de layout 8 páginas × 375/768/1024/1440, comprobaciones automatizadas de accesibilidad, preload responsive y ausencia de doble descarga en prueba).
- **PENDIENTE:** una medición móvil PageSpeed posterior al cambio; comparar con informe anterior de Home (22 octubre 2026: rendimiento 84, LCP 3,5 s). **No declarar mejoras de puntuación o de LCP sin nueva medición.**
- **Después:** revisar resultados y optimizar únicamente los cuellos de botella acreditados, incluidos los de otras páginas si se comprueban.

## Fases cerradas: NO replantear sin incidencia nueva
| Fase | Estado | Evidencia y límite |
| --- | --- | --- |
| Arquitectura, copy y diseño aprobado de la demo | CERRADA (para demo) | Ocho páginas desarrolladas; conservar diseño aprobado, sin inventar afirmaciones o fotos de trabajos |
| Ari, asistente conversacional para demo | CERRADA (desarrollo funcional) | Nombre, voz corporativa, respuestas EN/ES, accesos rápidos y backend Cloudflare; PR #17, QA automatizada. No confundir con configuración contractual/producción |
| Ari, formulario de seguimiento en demo | CERRADA (prueba de flujo) | Usuario confirmó solicitud recibida en correo de prueba Atrezzo el 23 octubre 2026; Gmail la clasificó Spam. Corrección frontend PR #22. **No garantiza entregabilidad futura** |
| Prompt maestro reusable AI Assistant 1.1 | CERRADA (redacción) | Entregado en chat. Incorporar en futuros proyectos al llegar su fase de asistente; no recrearlo para Pronto Air |
| Responsive básico de widget y regresiones de layout | CERRADA (prueba automatizada) | 32 casos en cuatro anchos + 16 análisis axe. No equivale a auditoría manual WCAG completa |

## Pendientes reales, fuera de la fase activa
1. **Auditoría final integral del website:** verificar manualmente enlaces, formularios, navegación, imágenes, responsive y accesibilidad; documentar fallos verificables sin rediseñar.
2. **Preparación comercial y técnica de entrega:** revisión de privacidad (actualmente borrador), permisos sobre imágenes y claims, aprobación explícita del cliente, correo destinatario definitivo, tratamiento de datos con FormSubmit/Cloudflare, control de spam; DNS/hosting/dominio y pruebas posteriores a migración cuando el cliente autorice.
3. **SEO de producción:** validar datos de negocio, dominio, canónicos y esquema; retirar `noindex,nofollow` únicamente en publicación oficial autorizada. El informe de la demo no es objetivo SEO de indexación.

## Reglas operativas de continuidad
1. **EJECUTAR → PROBAR → REGISTRAR → CERRAR → AVANZAR.**
2. Antes de crear una tarea, revisar el estado; no repetir auditorías ni pedir aprobaciones ya aportadas.
3. Mantener **una fase activa**. La revisión de regresión de un componente cerrado no la convierte en fase activa.
4. Cada actualización: cambio realizado, evidencia comprobada, estado, **una sola siguiente acción**. No enumerar todos los pendientes en cada mensaje.
5. Nunca presentar pruebas simuladas, respuestas del proveedor o deploys como recepción real / mejora de rendimiento / cumplimiento WCAG completos.
6. Si una tarea nueva necesita cambio comercial, legal o de branding, exigir aprobación específica.

## Referencias
- PR #17: https://github.com/atrezzostudiosv-spec/pronto-air/pull/17
- PR #22: https://github.com/atrezzostudiosv-spec/pronto-air/pull/22
- PR #23: https://github.com/atrezzostudiosv-spec/pronto-air/pull/23
- PR #24: https://github.com/atrezzostudiosv-spec/pronto-air/pull/24
- Checklist detallado de entrega: `seo/LAUNCH-CHECKLIST.md`
