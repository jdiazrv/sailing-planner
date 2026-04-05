# Backlog de Mejoras

Este archivo se usa para registrar propuestas de mejora funcional, UX y tecnica antes de decidir si se implantan.

## Reglas de uso

- Cada mejora se registra con un ID numerico incremental: `M-001`, `M-002`, etc.
- Si una propuesta nueva encaja con una ya existente, no se duplica: se anade como actualizacion en la entrada existente.
- Cada entrada incluye: riesgo, opinion tecnica, alcance y recomendacion.
- Fuente obligatoria: `usuario` o `copilot`.
- Si durante una auditoria detecto una mejora funcional o UX, la anoto yo con fuente `copilot`.

## Estados

- `propuesta`: idea registrada, aun sin validar.
- `en-evaluacion`: analizada, pendiente de decision final.
- `aprobada`: decidida para implantar.
- `implantada`: ya implementada.
- `descartada`: no se va a implantar.

## Plantilla de entrada

```md
## M-XXX - Titulo breve

- Fecha: YYYY-MM-DD
- Estado: propuesta | en-evaluacion | aprobada | implantada | descartada
- Fuente: usuario | copilot
- Area: funcional | ux | rendimiento | arquitectura | DX | seguridad
- Contexto: pantalla/flujo afectado
- Problema u oportunidad: descripcion breve
- Propuesta: cambio sugerido
- Riesgo:
  - Impacto: bajo | medio | alto
  - Probabilidad: baja | media | alta
  - Notas: riesgos concretos (regresion, complejidad, dependencia, etc.)
- Opinion de Copilot: criterio tecnico y conveniencia
- Recomendacion: implantar ahora | preparar y luego implantar | no implantar
- Relacionadas: M-00X, M-00Y (si aplica)
- Historial:
  - YYYY-MM-DD: alta inicial.
```

## Entradas

## M-001 - Estandarizar backlog de mejoras

- Fecha: 2026-04-04
- Estado: implantada
- Fuente: usuario
- Area: DX
- Contexto: proceso de seguimiento de mejoras entre auditorias
- Problema u oportunidad: las mejoras se discutian en chat y se dispersaban en el tiempo.
- Propuesta: mantener un backlog unico, numerado y fusionable en este archivo.
- Riesgo:
  - Impacto: bajo
  - Probabilidad: baja
  - Notas: riesgo de disciplina de actualizacion si no se mantiene al dia.
- Opinion de Copilot: muy recomendable porque reduce perdida de contexto y facilita priorizacion.
- Recomendacion: implantar ahora
- Relacionadas: ninguna
- Historial:
  - 2026-04-04: alta inicial y puesta en uso.

## M-002 - Mensaje explicito al redirigir a login

- Fecha: 2026-04-04
- Estado: propuesta
- Fuente: copilot
- Area: ux
- Contexto: acceso directo a `/dashboard` sin sesion activa
- Problema u oportunidad: actualmente el usuario acaba en login sin contexto explicito de por que fue redirigido.
- Propuesta: mostrar una nota breve en login (por ejemplo, "Tu sesion no esta activa. Inicia sesion para continuar") cuando la entrada venga de una ruta protegida.
- Riesgo:
  - Impacto: bajo
  - Probabilidad: baja
  - Notas: riesgo minimo de ruido visual si el mensaje se muestra cuando no toca; se controla con query param o estado de redireccion.
- Opinion de Copilot: mejora UX clara para reducir confusion en redirecciones de autenticacion.
- Recomendacion: preparar y luego implantar
- Relacionadas: ninguna
- Historial:
  - 2026-04-04: detectada en auditoria de arranque y registrada.

## M-003 - Coherencia entre filtro y panel de usuario seleccionado

- Fecha: 2026-04-04
- Estado: implantada
- Fuente: copilot
- Area: ux
- Contexto: pantalla de admin usuarios con busqueda activa
- Problema u oportunidad: al filtrar por un usuario inexistente se puede mostrar un detalle de otro usuario en el panel inferior, generando incoherencia visual.
- Propuesta: cuando no haya resultados del filtro, limpiar seleccion activa y ocultar panel de detalle o mostrar estado vacio consistente.
- Riesgo:
  - Impacto: medio
  - Probabilidad: media
  - Notas: puede provocar ediciones en el usuario equivocado por confusion contextual.
- Opinion de Copilot: mejora UX/seguridad operacional importante en admin porque evita acciones sobre un registro no intencionado.
- Recomendacion: implantar ahora
- Relacionadas: ninguna
- Historial:
  - 2026-04-04: detectada durante prueba E2E de creacion y limpieza de usuario.
  - 2026-04-04: implantada en `UsersAdmin` y `SearchableSelect` con limpieza de seleccion al no haber coincidencias.

## M-005 - Normalizar errores lanzados en server actions de admin

- Fecha: 2026-04-04
- Estado: implantada
- Fuente: copilot
- Area: arquitectura
- Contexto: server actions de admin para usuarios (alta, invitacion, password, borrado)
- Problema u oportunidad: algunos flujos lanzaban `throw error` con objetos no `Error`, lo que puede romper el parseo de errores en cliente/RSC.
- Propuesta: lanzar siempre instancias `Error` con mensaje estable (`throw new Error(...)`).
- Riesgo:
  - Impacto: medio
  - Probabilidad: media
  - Notas: evita payloads de error no serializables y reduce probabilidad de overlays confusos en dev.
- Opinion de Copilot: mejora defensiva recomendable para estabilidad del canal de errores.
- Recomendacion: implantar ahora
- Relacionadas: ninguna
- Historial:
  - 2026-04-04: implantada en `src/app/admin/actions.ts`.

## M-004 - Reducir rafaga de POST abortados tras acciones de edicion

- Fecha: 2026-04-04
- Estado: en-evaluacion
- Fuente: copilot
- Area: rendimiento
- Contexto: flujos de alta/borrado en barcos, temporadas, tramos y visitas
- Problema u oportunidad: se observan multiples POST abortados por accion de UI aunque la operacion finaliza correctamente.
- Propuesta: revisar secuencia de refresh/revalidate/navigation para evitar peticiones redundantes y cancelaciones en cascada.
- Riesgo:
  - Impacto: medio
  - Probabilidad: alta
  - Notas: incrementa carga de red y puede ocultar errores reales en medio del ruido.
- Opinion de Copilot: conviene resolverlo para estabilidad percibida y trazabilidad de errores en dev/prod.
- Recomendacion: preparar y luego implantar
- Relacionadas: ninguna
- Historial:
  - 2026-04-04: detectada de forma repetida en auditorias de navegacion y CRUD.
  - 2026-04-04: piloto aplicado en admin usuarios eliminando `router.refresh()` redundantes en cliente; pendiente medir impacto antes de extender.
  - 2026-04-04: medicion puntual en `admin/users` (guardar perfil) con resultado 1 POST, 0 POST abortados y 0 respuestas 500.
  - 2026-04-04: durante la medicion aparecio redireccion a login con aviso `NEXT_REDIRECT`; se congela extension del piloto hasta aclarar causa.
  - 2026-04-04: paso 2 aplicado de forma acotada en `admin/boats`, retirando `router.refresh()` redundantes tras save/upload/remove/delete; pendiente medicion con sesion activa.
  - 2026-04-04: nueva medicion en `admin/users` con sesion activa (Maria BH): 1 POST, 0 POST abortados, 0 respuestas 500; flujo completo sin redireccion a login.
  - 2026-04-04: no se pudo medir `admin/boats` en la misma sesion por falta de permisos (la ruta retorna al espacio de barco).

## M-006 - Evitar redireccion inesperada a login tras guardar perfil en admin usuarios

- Fecha: 2026-04-04
- Estado: en-evaluacion
- Fuente: copilot
- Area: funcional
- Contexto: `admin/users` al ejecutar guardado de perfil
- Problema u oportunidad: tras una accion de guardado se observa redireccion a `/login` y notificacion `NEXT_REDIRECT`, interrumpiendo el flujo de administracion.
- Propuesta: instrumentar el flujo de guardado para distinguir expiracion real de sesion frente a redireccion no controlada, y evitar que el cliente trate `NEXT_REDIRECT` como error generico.
- Riesgo:
  - Impacto: alto
  - Probabilidad: media
  - Notas: puede cortar tareas administrativas y esconder el error real bajo un mensaje poco accionable.
- Opinion de Copilot: antes de extender mas cambios de M-004 conviene aislar este comportamiento porque afecta estabilidad de sesion percibida.
- Recomendacion: implantar ahora
- Relacionadas: M-004, M-005
- Historial:
  - 2026-04-04: detectada durante medicion controlada posterior al piloto M-004 en admin usuarios.
  - 2026-04-04: mitigacion parcial implantada en cliente (`UsersAdmin`) para no mostrar `NEXT_REDIRECT` como error generico en toast.
  - 2026-04-04: intento de reproduccion en sesion activa (Maria BH) no reproduce redireccion a login tras `Guardar perfil`.

## M-007 - Desactivar guardado de barco sin cambios

- Fecha: 2026-04-04
- Estado: implantada
- Fuente: usuario
- Area: ux
- Contexto: panel admin de barcos, tarjetas de edicion
- Problema u oportunidad: el boton de guardar aparece activo aunque no haya cambios en el formulario, generando ruido y posibilidad de acciones inutiles.
- Propuesta: deshabilitar el boton de guardar mientras el formulario este limpio, habilitandolo solo si hay cambios reales.
- Riesgo:
  - Impacto: medio
  - Probabilidad: alta
  - Notas: sin control de cambios se inducen guardados redundantes y confusion sobre el estado de edicion.
- Opinion de Copilot: mejora UX clara y de bajo riesgo si se implementa con deteccion de dirty state por formulario.
- Recomendacion: implantar ahora
- Relacionadas: M-004
- Historial:
  - 2026-04-04: reportada por usuario durante revision de panel de barcos.
  - 2026-04-04: implantada en `BoatsAdmin` con deteccion de dirty state por formulario y boton de guardado deshabilitado sin cambios.
  - 2026-04-04: evolucionada a barra global de cambios (Guardar/Descartar) para un unico barco activo con cambios pendientes.

## M-008 - Reubicar accion anadir barco fuera del card de busqueda

- Fecha: 2026-04-04
- Estado: implantada
- Fuente: usuario
- Area: ux
- Contexto: cabecera del card de busqueda en admin de barcos
- Problema u oportunidad: la accion de anadir barco comparte espacio con la busqueda y pierde sentido contextual dentro del mismo bloque.
- Propuesta: mover la accion a una zona global mas estable (por ejemplo, menu lateral o bloque de acciones del layout).
- Riesgo:
  - Impacto: medio
  - Probabilidad: media
  - Notas: riesgo de cambio de habito de uso; requiere validar nuevo punto de entrada para no ocultar la accion.
- Opinion de Copilot: separa mejor intenciones (buscar vs crear) y mejora claridad de la interfaz.
- Recomendacion: preparar y luego implantar
- Relacionadas: ninguna
- Historial:
  - 2026-04-04: reportada por usuario en feedback UX de admin barcos.
  - 2026-04-04: implantada moviendo la accion `Añadir barco` a un bloque de acciones independiente encima del card de busqueda.

## M-009 - Resaltar la tarjeta completa del barco en edicion

- Fecha: 2026-04-04
- Estado: implantada
- Fuente: usuario
- Area: ux
- Contexto: listado de tarjetas de barcos en modo edicion
- Problema u oportunidad: actualmente solo se percibe el foco en el campo activo; falta una senal visual fuerte del barco completo que se esta editando.
- Propuesta: aplicar un estado visual de tarjeta activa (borde, fondo o glow) cuando cualquier campo interno tenga foco.
- Riesgo:
  - Impacto: bajo
  - Probabilidad: media
  - Notas: debe mantenerse contraste adecuado para accesibilidad y no competir con estados de error.
- Opinion de Copilot: mejora orientacion espacial en formularios largos y reduce errores de contexto.
- Recomendacion: implantar ahora
- Relacionadas: M-007
- Historial:
  - 2026-04-04: reportada por usuario durante sesion de edicion de barcos.
  - 2026-04-04: implantada con estado visual de tarjeta activa (`:focus-within`) para resaltar el barco completo en edicion.
  - 2026-04-04: reforzada con estado `is-active-editor` persistente (fondo + marco) aunque se pierda foco de campo.

## M-010 - Unificar terminologia nautica de "tramo" a "escala"

- Fecha: 2026-04-05
- Estado: propuesta
- Fuente: usuario
- Area: ux
- Contexto: terminologia visible en toda la app (planificacion, botones, labels, tour guiado, docs y help text)
- Problema u oportunidad: el termino `tramo` se esta usando para un bloque temporal en lugar de representar solo navegacion entre puntos, lo que genera confusion conceptual. Se fija `escala` como termino oficial para ese bloque temporal.
- Propuesta: sustituir de forma global y consistente referencias de `tramo` por `escala` donde corresponda al bloque temporal, evitando coexistencia de ambos terminos para el mismo concepto.
- Riesgo:
  - Impacto: alto
  - Probabilidad: alta
  - Notas: cambio transversal con riesgo de inconsistencias parciales si no se migra de forma integral (UI, i18n, tour, README, mensajes, tests y copys residuales).
- Opinion de Copilot: decision correcta a nivel de dominio; debe ejecutarse como migracion terminologica completa y no por cambios aislados para evitar deuda de lenguaje y confusion de usuario.
- Recomendacion: preparar y luego implantar
- Relacionadas: ninguna
- Historial:
  - 2026-04-05: decision conceptual del usuario: termino oficial `escala`; pendiente plan de sustitucion global.
