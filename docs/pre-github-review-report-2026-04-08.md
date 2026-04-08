# Pre-GitHub Review Report

Fecha: 2026-04-08

Estado general: aprobado tras confirmar subida de versión a `0.4.4`.

## Resultado por bloque

- A1 Dashboard: PASS
  Nota: con sesion activa, la entrada operativa resuelve al workspace del barco activo y no se observaron restos de demo ni UI duplicada en el smoke test.
- A2 Resumen: PASS
  Nota: el resumen carga con metricas, secuencia, mapa y visitas sin el hero redundante ni el boton de exportacion.
- A3 Manual de usuario: PASS
  Nota: se reforzo la diferencia entre lectura y edicion en la ayuda de gestor y se anadio la referencia a Account > Role and permissions.
- A4 Diferencia entre lectores y resto: PASS
  Nota: se valido visualmente la informacion de alcance en Configuracion y el comportamiento de Compartidos sigue separado de visitas/disponibilidad.
- B1 Cumplimiento de guia de estilos: PASS
  Nota: los nuevos tooltips de mapa dejaron de usar colores hardcodeados y pasaron a tokens del sistema.
- B2 Consistencia visual en dashboard y resumen: PASS
  Nota: cabecera, resumen, mapa y configuracion usan el mismo lenguaje de cards, acciones y controles segmentados.
- B3 Responsive basico: PASS
  Nota: se revisaron workspace, resumen y configuracion en ancho movil sin roturas bloqueantes.
- C1 Cambio de version: PASS
  Nota: la entrega se publica como `0.4.4` y las referencias visibles de versión quedaron actualizadas.
- C2 README: PASS
  Nota: README actualizado con los cambios actuales de resumen, mapa y configuracion.
- C3 Manual y README sincronizados: PASS
  Nota: ambos reflejan la separacion entre consulta y edicion y el nuevo acceso a permisos desde configuracion.
- D1 Smoke test de rutas criticas: PASS
  Nota: comprobadas login, workspace, resumen, compartidos y configuracion. Admin visible en sesion activa.
- D2 Validacion tecnica minima: PASS
  Nota: `npm run lint`, `npm run typecheck` y `npm run build` completados sin errores.
- D3 Revision de textos y naming: PASS
  Nota: las nuevas etiquetas del workspace y del mapa quedaron cubiertas por i18n en ES/EN.
- D4 Migraciones, seeds y contratos: PASS
  Nota: esta entrega no introduce cambios de esquema ni contratos de datos.
- D5 Limpieza final: PASS
  Nota: el diff actual no deja exportaciones visibles, demos activas ni labels temporales en la UI revisada.

## Riesgos residuales no bloqueantes

- Google Maps sigue emitiendo un warning de deprecacion de `google.maps.Marker` cuando no entra la ruta de advanced markers.
- La publicación quedó desbloqueada tras fijar la entrega como `0.4.4`.