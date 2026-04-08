# Pre-GitHub Review Checklist

Objetivo: revisar cambios funcionales, visuales y documentales antes de publicar nada en GitHub.

Usar esta checklist como puerta de salida. Si un punto crítico falla, no subir cambios.

## Cuándo usarla

- Antes de abrir PR.
- Antes de hacer push directo a `main`.
- Antes de pedir revisión externa.
- Después de cambios amplios de navegación, dashboard, resumen, onboarding, manual o estilos.

## Regla de bloqueo

Parar y alertar inmediatamente si ocurre cualquiera de estas condiciones:

- La UI no cumple la guía de estilos en [docs/style-guide.md](docs/style-guide.md).
- Hay diferencias no resueltas entre experiencia de lectores y resto de usuarios.
- Dashboard y resumen no reflejan el comportamiento real actual del producto.
- README o manual describen un flujo distinto al implementado.
- Hay duda sobre si el cambio requiere subida de versión.

---

## A. Revisión funcional del producto

### A1. Dashboard

- Repasar el dashboard completo con datos reales o semilla representativa.
- Confirmar que navegación, copies, estados vacíos, métricas y CTAs son coherentes con el comportamiento actual.
- Verificar que no queden restos de UI antigua, demos, labels temporales o componentes duplicados.
- Resultado: [ ] PASS [ ] FAIL
- Notas:

### A2. Resumen

- Revisar la vista de resumen de barco/temporada.
- Confirmar que layout, métricas, mapa, secuencia operativa, visitas y textos reflejan el producto real.
- Verificar que el resumen no promete edición donde solo hay consulta.
- Resultado: [ ] PASS [ ] FAIL
- Notas:

### A3. Manual de usuario

- Repasar el manual completo.
- Mantener explícitamente la diferencia entre lectores y el resto de perfiles.
- Confirmar que los flujos descritos para lectores no enseñan acciones de edición o gestión que ya no les correspondan.
- Confirmar que los flujos del resto de usuarios siguen alineados con la navegación actual.
- Ajustar capturas, nombres de pantallas y textos si han cambiado dashboard o resumen.
- Resultado: [ ] PASS [ ] FAIL
- Notas:

### A4. Diferencia entre lectores y resto

- Verificar navegación, permisos visibles, CTAs, onboarding y manual para ambos perfiles.
- Confirmar que el lector entra por los puntos correctos y no ve acciones de edición, invitación o administración si no le corresponden.
- Confirmar que managers/superusers sí conservan accesos y contexto operativo completos.
- Resultado: [ ] PASS [ ] FAIL
- Notas:

---

## B. Revisión visual y de sistema de diseño

### B1. Cumplimiento de guía de estilos

- Revisar los cambios contra [docs/style-guide.md](docs/style-guide.md).
- Confirmar uso correcto de tokens, tipografía, espaciado, controles segmentados, cards, pills, tablas y modales.
- Confirmar que no se han introducido colores hardcodeados, estilos inline evitables o patrones visuales fuera del sistema.
- Si algo no cumple, parar y alertar antes de seguir.
- Resultado: [ ] PASS [ ] FAIL
- Notas:

### B2. Consistencia visual en dashboard y resumen

- Comparar dashboard, workspace y resumen para verificar jerarquía, naming y componentes equivalentes.
- Confirmar que pills, badges, headers, acciones y bloques informativos mantienen el mismo lenguaje visual.
- Resultado: [ ] PASS [ ] FAIL
- Notas:

### B3. Responsive básico

- Revisar al menos desktop y tablet/móvil en dashboard, workspace, resumen y manual.
- Confirmar que no se rompen controles, tablas, pills, mapas ni bloques de acciones.
- Resultado: [ ] PASS [ ] FAIL
- Notas:

---

## C. Documentación previa a GitHub

### C1. Cambio de versión

- Preguntar explícitamente: ¿hay cambio de versión en esta entrega?
- Si la respuesta es sí, actualizar versión, referencias visibles, release notes y documentación afectada.
- Si la respuesta es no, dejar constancia breve de que la entrega no cambia versión.
- Resultado: [ ] PASS [ ] FAIL
- Respuesta:
- Notas:

### C2. README

- Repasar [README.md](README.md).
- Confirmar que descripción del producto, arquitectura, flujos principales, versión actual y notas de release siguen siendo correctas.
- Ajustar especialmente si han cambiado dashboard, resumen, navegación, onboarding, manual o roles.
- Resultado: [ ] PASS [ ] FAIL
- Notas:

### C3. Manual y README sincronizados

- Confirmar que manual y README no se contradicen.
- Verificar naming consistente: dashboard, resumen, plan, visitas, lectores, invitados, compartidos, etc.
- Resultado: [ ] PASS [ ] FAIL
- Notas:

---

## D. Comprobaciones adicionales recomendadas

### D1. Smoke test de rutas críticas

- Probar login.
- Probar dashboard.
- Probar workspace de barco.
- Probar resumen.
- Probar compartidos.
- Probar admin si el cambio toca permisos o navegación.
- Resultado: [ ] PASS [ ] FAIL
- Notas:

### D2. Validación técnica mínima

- Ejecutar typecheck/lint/build o el subconjunto mínimo razonable para el cambio.
- Confirmar que no quedan errores introducidos por la entrega.
- Resultado: [ ] PASS [ ] FAIL
- Notas:

### D3. Revisión de textos y naming

- Revisar etiquetas nuevas, copies, botones, estados vacíos y textos de ayuda.
- Confirmar coherencia entre español e inglés si el cambio afecta i18n.
- Resultado: [ ] PASS [ ] FAIL
- Notas:

### D4. Migraciones, seeds y contratos

- Si el cambio toca datos, revisar migraciones, seeds, tipos y documentación asociada.
- Confirmar que README/manual no omiten pasos nuevos de setup o comportamiento derivado.
- Resultado: [ ] PASS [ ] FAIL
- Notas:

### D5. Limpieza final

- Confirmar que no quedan demos, flags temporales, comentarios de trabajo, etiquetas de prueba o archivos huérfanos.
- Confirmar que el diff final solo contiene lo que realmente se quiere publicar.
- Resultado: [ ] PASS [ ] FAIL
- Notas:

---

## Criterio de salida

Solo se puede publicar a GitHub cuando:

- Todos los puntos críticos están en PASS.
- Si hay cambio de versión, está decidido y reflejado donde corresponda.
- Manual y README están actualizados.
- Dashboard y resumen reflejan el producto real.
- La diferencia entre lectores y resto está revisada y documentada.
- La guía de estilos se cumple; si no, la publicación se bloquea.

## Sugerencias extra

Además de tus puntos, conviene añadir siempre estas tres preguntas antes de publicar:

- ¿Hay alguna ruta crítica que haya cambiado y no esté mencionada en documentación?
- ¿Hay alguna diferencia entre permisos reales y permisos explicados en UI/manual?
- ¿El diff contiene algo experimental, provisional o demasiado local para subirlo?