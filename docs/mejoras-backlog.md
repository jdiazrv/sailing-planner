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
