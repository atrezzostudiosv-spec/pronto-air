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
- **VERIFICADO el 23 oct 2026:** Lighthouse móvil en navegador real del runner CI, en las ocho URLs públicas (run [39921717840](https://github.com/atrezzostudiosv-spec/pronto-air/actions/runs/39921717840), PR #25). Ejecutado dos veces; 8/8 URLs con resultado, sin errores. `tools/audit-mobile-performance.cjs` deja una forma reproducible de medir sin intervenir en la web.
- **Rangos observados en las dos ejecuciones de Lighthouse CI (laboratorio propio, no PSI):** Home 79/100 y LCP 4,0–4,2 s; Cooling 96–98; Heating 95–98; Mobile Homes 90–97; Light Commercial 94–98; Contact 91; Agreement FAQs 99; Privacy 99.
- **Diagnóstico específico:** Home LCP es la imagen principal móvil; están identificados como bloqueantes Google Fonts Inter y la hoja de estilos de Font Awesome externa. También se identificaron CSS locales, con menor impacto. No retirar, sustituir ni retrasar tipografía/iconos sin validar previamente identidad visual y ausencia de flash. La métrica TBT de Home varió entre 325 y 0 ms en dos ejecuciones: no tratarla como regresión estable.
- **NO COMPROBADO:** una nueva medición de **Google PageSpeed Insights** con idénticas condiciones al informe anterior (22 oct 2026: Home 84/100; LCP 3,5 s). Las puntuaciones CI y PSI no son equivalentes. No afirmar aceleración debida a PR #24 basándose en esta prueba.
- **Home, corrección 02 incorporada y validada:** PR #27, commit `0b950211e1f905b92e8ea15ed65b849b63927547`, carga no bloqueante de las hojas CSS externas de **Inter** y **Font Awesome** en Home, con fallback sin JavaScript y sin sustituir fuentes, iconos, fotografías, contenidos ni estilos. CI de regresión #39925239213: correcto en 8 páginas/4 anchos, comprobaciones del asistente y activación final de tipografía/iconos; geometría aprobada sin alteraciones. El cambio en Home está CERRADO, salvo que aparezca un fallo nuevo.
- **A/B medido antes de aprobar (entorno local controlado):** ensayo #39924591791 (PR #26 cerrado sin fusionar). Base 89/100 y LCP 3,17–3,19 s; optimización doble 96–97/100 y LCP 2,41–2,48 s; navegador con caché reiniciada, orden invertido en segunda ronda. No confundir con puntuación pública.
- **Verificación de demo pública tras despliegue:** run #39925661275, PR #28; código optimizado detectado en GitHub Pages, 9/9 mediciones sin errores. Home 81 y 82/100, LCP 4,04 y 3,95 s. Hoja Font Awesome y Google Fonts **ya no aparecen como render blockers** de Home; aún queda CSS local `index.min.css`. Las siete páginas internas fluctuaron ampliamente respecto al run #39921717840, indicio de variación entre ejecuciones/infraestructura: no afirmar mejora porcentual sostenida comparando runs.
- **NO COMPROBADO:** nueva prueba en Google PageSpeed Insights equivalente a informe previo (22 oct: Home 84 y LCP 3,5 s), ni captura manual del primer instante de carga para descartar transiciones visibles de iconos o fuentes en redes lentas. No confundir el test de geometría final con inspección del primer fotograma.
- **Siguiente acción técnica única:** optimizar el resto del rendimiento móvil basándose en problemas reproducibles, iniciando por dimensionado/compresión de imágenes de Home aún señalado en el informe PSI y priorizando las otras páginas solo si nuevas pruebas confirman un problema estable. Conservar diseño aprobado y no reabrir corrección CSS ya validada sin motivo.

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
