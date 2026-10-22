# Estilos CSS de Pronto Air

La web permanece en HTML, CSS y JavaScript estáticos. El Tailwind CDN de desarrollo fue reemplazado por CSS compilado independiente para cada una de las 8 páginas, porque sus temas tienen ligeras diferencias de color y tipografía.

## Editar y reconstruir

1. Edita HTML normalmente.
2. Si cambias o agregas clases Tailwind, ejecuta `npm install` y luego `npm run build:css` desde la raíz del repositorio.
3. Revisa los ocho archivos de `assets/css/` y confirma que la web sigue viéndose bien en móvil, tablet y escritorio antes de publicar.
4. El código fuente de los temas se conserva en `tools/tailwind-themes/` (extraído sin modificar de cada página original). Actualiza los temas allí cuando cambies colores o utilidades.
5. El compilador usa Tailwind v3.4.17 y conserva el orden de CSS tras Font Awesome, necesario para mantener las dimensiones originales de iconos y tarjetas.

## Control aplicado en la migración

- GitHub Actions compiló las 8 hojas estáticas y comparó la versión con CDN con la nueva versión en 375, 768, 1024 y 1440 px.
- Resultado: las 32 comparaciones visuales y de estructura pasaron, incluyendo navegación móvil y comprobación de desbordamiento horizontal nuevo.
- Estado de publicación: **demo**; conserva `noindex,nofollow`. El cambio de SEO a producción requiere autorización del negocio.
- Esta prueba de regresión no equivale a medir PageSpeed ni Web Vitals sobre el dominio oficial.

La automatización de prueba inicial se ejecutó sobre una rama temporal para impedir que versiones con diferencias visuales llegaran a `main`.
