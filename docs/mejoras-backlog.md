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
  - 2026-04-08: auditoria estatica de produccion confirma que el patron sigue vivo en varias superficies (`boat-settings-dialog`, `season-access-panel`, `season-bar`, `visits-manager`, `member-first-access`, `user-settings-panel`, `timeline-visibility-panel`) y que convive con `revalidatePath()` amplios en server actions.

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
- Estado: en-evaluacion
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
  - 2026-04-05: implantacion parcial ejecutada en i18n, tipos y partes del flujo de planificacion.
  - 2026-04-05: detectados residuos de copy `tramo/tramos` en guest tour, guest page y textos auxiliares; pendiente cierre completo.
  - 2026-04-05: cierre completo de copy visible en app (`tramo/tramos` -> `escala/escalas`) y verificacion por busqueda en `src` sin resultados residuales.
  - 2026-04-08: auditoria senior detecta residuos visibles en `src/app/manual/page.tsx`, en copy inglesa `route segments` y en mensajes de validacion de `src/lib/planning.ts`; se reabre hasta cerrar manual, validaciones y copys auxiliares.

## M-011 - Alinear naming de datos entre `trip_segments` y `port_stops`

- Fecha: 2026-04-05
- Estado: implantada
- Fuente: copilot
- Area: arquitectura
- Contexto: server actions y acceso a datos tras migracion terminologica
- Problema u oportunidad: coexistencia de referencias a `trip_segments` y `port_stops` en distintas capas, con riesgo de inconsistencia y fallos segun el estado de migraciones aplicadas.
- Propuesta: completar migracion tecnica en capa de datos y acciones para usar un unico naming persistente (`port_stops`) o introducir una estrategia de compatibilidad temporal explicita.
- Riesgo:
  - Impacto: alto
  - Probabilidad: media
  - Notas: puede romper operaciones de escritura/reordenacion en entornos donde la tabla legacy ya no exista.
- Opinion de Copilot: deuda prioritaria porque afecta robustez funcional, no solo nomenclatura.
- Recomendacion: implantar ahora
- Relacionadas: M-010
- Historial:
  - 2026-04-05: detectada en revision post-build al encontrar acciones contra `trip_segments` tras renombre de esquema.
  - 2026-04-05: acciones de escritura/reordenacion y tablas de notas privadas alineadas a `port_stops` y `port_stop_private_notes`.

## M-012 - Sincronizar tipos generados de Supabase con migraciones activas

- Fecha: 2026-04-05
- Estado: implantada
- Fuente: copilot
- Area: DX
- Contexto: `src/types/database.ts` frente a funciones/tablas renombradas en migraciones
- Problema u oportunidad: tipos generados mantienen nombres legacy de funciones y tablas, forzando aliases manuales y reduciendo seguridad de tipos.
- Propuesta: regenerar tipos de base de datos y ajustar referencias para que el contrato tipado coincida con el esquema/migraciones vigentes.
- Riesgo:
  - Impacto: medio
  - Probabilidad: alta
  - Notas: aumenta deuda silenciosa y coste de mantenimiento en futuras refactorizaciones.
- Opinion de Copilot: mejora de bajo coste relativo y alto retorno en estabilidad del desarrollo.
- Recomendacion: preparar y luego implantar
- Relacionadas: M-011
- Historial:
  - 2026-04-05: propuesta creada tras detectar divergencia entre RPC tipado y RPC usado en runtime.
  - 2026-04-05: `src/types/database.ts` y referencias tipadas alineadas a `get_season_port_stops`, `port_stops` y `port_stop_private_notes`.

## M-013 - Consolidar i18n real en admin, onboarding y manual

- Fecha: 2026-04-08
- Estado: en-evaluacion
- Fuente: copilot
- Area: arquitectura
- Contexto: paneles de admin, bienvenida de miembros, manual operativo y navegacion principal
- Problema u oportunidad: existe un diccionario central robusto en `src/lib/i18n.ts`, pero varias superficies criticas siguen manteniendo textos bilingues con `locale === "es"` o mapas locales de copy dentro del componente.
- Propuesta: mover el copy visible de admin, onboarding y manual a una capa canonica de i18n y prohibir nuevos textos inline salvo casos excepcionales muy justificados.
- Riesgo:
  - Impacto: alto
  - Probabilidad: alta
  - Notas: hoy la paridad ES/EN depende de mantener dos sistemas de traduccion en paralelo, con riesgo directo de incoherencia terminologica y UX desigual segun la ruta.
- Opinion de Copilot: deuda prioritaria porque mezcla problema de producto, mantenimiento y coherencia de estilo. Si no se corta ahora, cada ajuste funcional seguira anadiendo copy fuera del sistema.
- Recomendacion: preparar y luego implantar
- Relacionadas: M-010
- Historial:
  - 2026-04-08: alta inicial tras auditoria senior de produccion al detectar bypass del diccionario en `users-admin`, `boats-admin`, `member-welcome-modal`, `manual/page` y labels de layout.
  - 2026-04-09: primera pasada cuidadosa implantada en onboarding, bienvenida de miembros, sidebar/layout del barco y manual. El tour deja de depender de copy fijo en español desde `src/lib/onboarding.ts`, `member-welcome-modal` consume copy canonico, la sidebar y la entrada de configuracion del barco usan claves de `src/lib/i18n.ts`, y `manual/page` delega su contenido localizado a `src/lib/manual-content.ts` sin cambiar el renderizado. Quedan pendientes las superficies admin grandes (`users-admin`, `boats-admin` y afines), donde conviene entrar por fases para no mezclar consolidacion de copy con cambios funcionales.

## M-014 - Unificar estrategia de revalidacion y refresh post-mutacion

- Fecha: 2026-04-08
- Estado: en-evaluacion
- Fuente: copilot
- Area: rendimiento
- Contexto: server actions globales, admin, workspace de barco y handlers cliente posteriores a mutaciones
- Problema u oportunidad: el proyecto combina `revalidatePath()` amplios con `router.refresh()` defensivos en cliente y helpers duplicados de invalidez por ruta, lo que mantiene ruido de red, churn de loader y decisiones locales acumuladas.
- Propuesta: definir una estrategia unica por familia de mutacion: que invalida el servidor, cuando hace falta `router.refresh()` y que rutas exactas deben regenerarse. Donde sea viable, evolucionar a invalidacion mas fina y utilidades compartidas.
- Riesgo:
  - Impacto: alto
  - Probabilidad: alta
  - Notas: tocar esta zona sin estrategia comun puede seguir produciendo POST abortados, refrescos dobles y regresiones de navegacion como las ya vistas en login y loaders.
- Opinion de Copilot: es la mejora tecnica con mejor retorno sobre UX percibida ahora mismo, porque ataca simultaneamente rendimiento, estabilidad visual y mantenibilidad.
- Recomendacion: implantar ahora
- Relacionadas: M-004, M-006
- Historial:
  - 2026-04-08: alta inicial tras auditoria senior al confirmar invalidaciones amplias en `src/app/actions.ts`, `src/app/admin/actions.ts`, `src/app/boats/[boatId]/actions.ts` y multiples `router.refresh()` redundantes en cliente.
  - 2026-04-09: primera pasada implantada reduciendo refreshes redundantes en `timeline-visibility-panel`, `visits-manager`, `member-first-access` y cierre del tour guest; tambien se evita revalidar `/dashboard` y `/admin/users` cuando `recordCurrentUserAccess()` se llama con metodo `unknown`, y se recorta invalidacion innecesaria en `updateTimelineVisibility()` y `updateOwnPassword()`.
  - 2026-04-09: segunda pasada implantada en `season-access-panel`, sustituyendo los `router.refresh()` tras generar, revocar, borrar y purgar enlaces por estado local sincronizado con props para actualizar la UI al instante sin recargar la ruta completa.
  - 2026-04-09: validacion completa en verde tras ajustar el tipado del enlace sintetico local en `season-access-panel`; revision posterior deja como pendientes solo refreshes todavia ligados a contenido SSR amplio (`language-switcher`, guardado de perfil, `season-bar` y `boat-settings-dialog`), que requieren una reestructuracion mayor para retirarlos sin regresion.
  - 2026-04-09: tercera pasada parcial en `season-bar`, reemplazando el refresh ciego por una resolucion explicita de temporada post-mutacion desde server actions; ahora navega cuando cambia la temporada activa o la URL debe canonizarse, y conserva `router.refresh()` solo como fallback protegido para los casos en que el contenido SSR seguiria quedando obsoleto. Se anaden advertencias en desarrollo para visibilizar esos caminos conservadores.

## M-015 - Descomponer superficies monoliticas de admin y manual

- Fecha: 2026-04-08
- Estado: propuesta
- Fuente: copilot
- Area: DX
- Contexto: `UsersAdmin`, `BoatsAdmin` y `manual/page`
- Problema u oportunidad: varias superficies de alto cambio concentran demasiadas responsabilidades en un solo archivo: copy, estado UI, mutaciones, filtros, seleccion, formularios y reglas de permiso.
- Propuesta: dividir estas superficies por concern y mover el contenido estatico del manual a un modulo de contenido o estructura basada en diccionario para reducir friccion de cambios.
- Riesgo:
  - Impacto: medio
  - Probabilidad: alta
  - Notas: el riesgo no es funcional inmediato, pero si de velocidad y seguridad de cambio; cada parche futuro es mas caro de revisar y probar.
- Opinion de Copilot: conviene hacerlo despues de fijar i18n e invalidacion, porque esos dos temas marcan el mejor corte para una refactorizacion limpia.
- Recomendacion: preparar y luego implantar
- Relacionadas: M-013, M-014
- Historial:
  - 2026-04-08: alta inicial tras auditoria senior al medir aprox. 1700 lineas en `UsersAdmin`, 500+ en `BoatsAdmin` y casi 400 en `manual/page`.

## M-016 - Centralizar utilidades duplicadas de storage y errores en server actions

- Fecha: 2026-04-09
- Estado: implantada
- Fuente: copilot
- Area: arquitectura
- Contexto: `src/app/boats/[boatId]/actions.ts`, `src/app/admin/actions.ts`, `src/app/actions.ts`
- Problema u oportunidad: tres funciones están duplicadas entre ficheros de acciones: `getImageExtension()` (en boats/actions y admin/actions), `removeStoragePaths()` (ídem) y `throwIfError` (en app/actions y en server-action-helpers, donde ya existe). Cualquier cambio hay que aplicarlo en múltiples sitios con riesgo de divergencia.
- Propuesta: extraer `getImageExtension` y `removeStoragePaths` a `src/lib/storage-helpers.ts` (nuevo módulo) y eliminar la redefinición de `throwIfError` en `app/actions.ts` importando desde `server-action-helpers`.
- Riesgo:
  - Impacto: bajo
  - Probabilidad: baja
  - Notas: refactorizacion mecanica sin cambio de comportamiento; el riesgo es olvidar alguna referencia si no se hace con busqueda global.
- Opinion de Copilot: deuda de bajo coste y alto retorno en mantenibilidad; conviene hacerlo antes de ampliar la superficie de acciones.
- Recomendacion: implantar ahora
- Relacionadas: M-005
- Historial:
  - 2026-04-09: detectada en auditoria de produccion.

## M-017 - Descomponer BoatWorkspaceShell y extraer estado a hook propio

- Fecha: 2026-04-09
- Estado: propuesta
- Fuente: copilot
- Area: arquitectura
- Contexto: `src/components/planning/boat-workspace-shell.tsx`
- Problema u oportunidad: el componente tiene 748 lineas, 7 useState, 5 useEffect y 3 useMemo. Gestiona a la vez: capas del timeline, seleccion de entidad, modo de layout, escala de tiempo, apertura de secciones colapsables, lazy-load del mapa y sincronizacion con searchParams. Es el fichero mas costoso de leer, probar y modificar del proyecto.
- Propuesta: (1) extraer todo el estado y efectos a un hook `useWorkspaceState()`; (2) dividir el JSX en sub-componentes `WorkspaceControlBar`, `WorkspaceTablePanel`, `WorkspaceMapPanel`; (3) valorar Context API para evitar prop-drilling de 14 props hacia TripSegmentsManager, VisitsManager y Timeline.
- Riesgo:
  - Impacto: alto
  - Probabilidad: media
  - Notas: cambio estructural amplio; requiere tests de regresion manual en todos los modos de layout y vista antes de mergear.
- Opinion de Copilot: la mejora tecnica con mayor retorno en velocidad de cambio y legibilidad. Relacionada con M-015 pero independiente.
- Recomendacion: preparar y luego implantar
- Relacionadas: M-015, M-004
- Historial:
  - 2026-04-09: detectada en auditoria de produccion. Componente ya identificado en M-015 pero este ticket cubre especificamente el shell de planificacion.

## M-018 - Añadir error boundaries en rutas criticas

- Fecha: 2026-04-09
- Estado: implantada
- Fuente: copilot
- Area: arquitectura
- Contexto: `src/app/`, `src/app/boats/[boatId]/`, `src/app/admin/`
- Problema u oportunidad: no existe ningun fichero `error.tsx` en las rutas principales. Un error de render en el timeline, el mapa o cualquier componente del workspace hace caer toda la pantalla sin fallback. El usuario ve una pagina rota sin mensaje accionable.
- Propuesta: crear `error.tsx` en `src/app/`, `src/app/boats/[boatId]/` y `src/app/admin/` con mensaje de error amigable, boton de reintento (`reset()`) y enlace de escape al dashboard.
- Riesgo:
  - Impacto: bajo
  - Probabilidad: baja
  - Notas: los error boundaries de Next.js son aislados por ruta; no hay riesgo de regresion funcional.
- Opinion de Copilot: mejora defensiva de bajo coste y alta percepcion de calidad en produccion.
- Recomendacion: implantar ahora
- Relacionadas: ninguna
- Historial:
  - 2026-04-09: detectada en auditoria de produccion.

## M-019 - Validar inputs de FormData en server actions antes de operar en DB

- Fecha: 2026-04-09
- Estado: propuesta
- Fuente: copilot
- Area: seguridad
- Contexto: `src/app/boats/[boatId]/actions.ts`, `src/app/admin/actions.ts`
- Problema u oportunidad: varios valores de FormData se usan directamente sin validacion: coordenadas lat/lng sin rango (-90/90, -180/180), año sin verificar que sea numero valido, boat_id con fallback a string vacio que llega a la query. Un input malformado puede producir errores silenciosos o datos corruptos en DB.
- Propuesta: añadir una capa de validacion ligera (con Zod o validacion manual) antes de cualquier escritura en DB. Minimo: (1) coordenadas con rango, (2) IDs no vacios, (3) año como entero positivo, (4) fechas con formato ISO.
- Riesgo:
  - Impacto: medio
  - Probabilidad: media
  - Notas: los server actions son solo accesibles desde cliente autenticado pero eso no garantiza datos validos; un bug en cliente o un request directo pueden enviar valores fuera de rango.
- Opinion de Copilot: mejora de seguridad y robustez necesaria antes de abrir el producto a mas usuarios.
- Recomendacion: preparar y luego implantar
- Relacionadas: M-005
- Historial:
  - 2026-04-09: detectada en auditoria de produccion.

## M-020 - Validar MIME type y tamaño en uploads de imagen

- Fecha: 2026-04-09
- Estado: implantada
- Fuente: copilot
- Area: seguridad
- Contexto: `src/app/boats/[boatId]/actions.ts` — `uploadBoatProfileImage()` y equivalente en admin
- Problema u oportunidad: el servidor acepta cualquier fichero en el upload sin verificar MIME type ni tamaño maximo en codigo. Aunque `sharp` procesa la imagen y Supabase tiene limites de storage, un fichero no-imagen o muy pesado puede causar errores inesperados o consumo de recursos.
- Propuesta: antes de pasar el buffer a `sharp`, verificar: (1) MIME type en lista blanca (image/jpeg, image/png, image/webp, image/gif), (2) tamaño maximo (p.ej. 10 MB). Rechazar con error claro si no cumple.
- Riesgo:
  - Impacto: bajo
  - Probabilidad: baja
  - Notas: actualmente solo usuarios autenticados con permisos pueden subir imagenes; el riesgo es bajo pero la validacion es trivial de añadir.
- Opinion de Copilot: mejora defensiva recomendable antes de escalar usuarios.
- Recomendacion: implantar ahora
- Relacionadas: M-019
- Historial:
  - 2026-04-09: detectada en auditoria de produccion.

## M-021 - Auditar y documentar politicas RLS de Supabase

- Fecha: 2026-04-09
- Estado: propuesta
- Fuente: copilot
- Area: seguridad
- Contexto: tablas `seasons`, `port_stops`, `visits`, `user_boat_permissions`, `season_access_links`
- Problema u oportunidad: el codigo asume que RLS esta activo y correctamente configurado para todas las tablas criticas, pero no existe documentacion ni test que lo verifique. Un cambio de migracion o un error de configuracion en Supabase podria exponer datos de otros usuarios o barcos sin que el codigo lo detecte.
- Propuesta: (1) documentar en `docs/` las politicas RLS esperadas por tabla; (2) añadir al menos un test de integracion que verifique que un usuario sin permisos no puede leer datos de otro barco; (3) revisar acceso de invitados (season_access_links) con usuario anonimo.
- Riesgo:
  - Impacto: alto
  - Probabilidad: media
  - Notas: si RLS falla, el impacto es critico en privacidad y seguridad de datos de todos los usuarios.
- Opinion de Copilot: la deuda de seguridad con mayor impacto potencial del proyecto. Debe resolverse antes de crecer en usuarios.
- Recomendacion: implantar ahora
- Relacionadas: ninguna
- Historial:
  - 2026-04-09: detectada en auditoria de produccion.

## M-022 - Ajustar umbral combo vs cards en BoatSelector a >10 barcos

- Fecha: 2026-04-09
- Estado: implantada
- Fuente: usuario + copilot
- Area: ux
- Contexto: `src/components/boats/boat-selector.tsx`
- Problema u oportunidad: el `BoatSelector` ya implementa un modo compacto (lista + buscador en lugar de cards) cuando hay muchos barcos, pero el umbral actual es >12 en desktop y >6 en movil. La decision de producto es que el cambio ocurra a partir de >10 en todos los viewports para que la experiencia sea predecible.
- Propuesta: cambiar `useCompactList` para que use el umbral 10 de forma uniforme: `boats.length > 10`.
- Riesgo:
  - Impacto: bajo
  - Probabilidad: baja
  - Notas: cambio de una constante; sin riesgo de regresion funcional.
- Opinion de Copilot: decision de producto correcta; la vista en cards con >10 elementos es densa y dificil de escanear.
- Recomendacion: implantar ahora
- Relacionadas: ninguna
- Historial:
  - 2026-04-09: revisada en auditoria; auditoria inicial identifico mal el problema como falta de paginacion; el mecanismo ya existe, solo el umbral es incorrecto.

## M-023 - Cachear URLs firmadas de imagenes de Supabase Storage

- Fecha: 2026-04-09
- Estado: propuesta
- Fuente: copilot
- Area: rendimiento
- Contexto: `src/lib/boat-data-core.ts` — `getVisitImageUrls()`
- Problema u oportunidad: por cada render de pagina que incluya visitas con imagen, se generan URLs firmadas de Supabase Storage sin ninguna capa de cache. Si la misma imagen se solicita en multiples renders (resumen, plan, PDF), se consumen llamadas a la API de storage de forma redundante.
- Propuesta: usar `unstable_cache` de Next.js o un Map server-side con TTL para cachear las URLs firmadas durante el tiempo de expiracion del token (actualmente configurado en 3600s). Alternativamente, cambiar a URLs publicas permanentes si la politica de privacidad lo permite.
- Riesgo:
  - Impacto: bajo
  - Probabilidad: media
  - Notas: las URLs firmadas tienen expiracion; la cache debe respetar ese TTL para no servir URLs caducadas.
- Opinion de Copilot: mejora de rendimiento y reduccion de consumo de API de storage; especialmente relevante cuando el numero de visitas con imagen crece.
- Recomendacion: preparar y luego implantar
- Relacionadas: ninguna
- Historial:
  - 2026-04-09: detectada en auditoria de produccion.

## M-024 - Añadir cache server-side para geometria de zonas costeras

- Fecha: 2026-04-09
- Estado: propuesta
- Fuente: copilot
- Area: rendimiento
- Contexto: `src/lib/coastal-zones-runtime.ts`
- Problema u oportunidad: la geometria de zonas costeras se descarga en cada cliente de forma independiente, con solo un Map en memoria como cache de sesion. No hay cache server-side ni header `cache: "force-cache"`. Cada usuario descarga los mismos datos estaticos desde cero.
- Propuesta: servir la geometria como asset estatico desde `/public/` o añadir `cache: "force-cache"` en el fetch, de forma que el CDN de Vercel/Next.js cachee el recurso y los clientes lo reciban desde el edge.
- Riesgo:
  - Impacto: bajo
  - Probabilidad: baja
  - Notas: si la geometria cambia, hay que invalidar la cache manualmente o usar un parametro de version en la URL.
- Opinion de Copilot: quick win de rendimiento si la geometria es estatica o cambia muy raramente.
- Recomendacion: preparar y luego implantar
- Relacionadas: ninguna
- Historial:
  - 2026-04-09: detectada en auditoria de produccion.

## M-025 - Paralelizar checks de permisos en requireBoatEditor

- Fecha: 2026-04-09
- Estado: implantada
- Fuente: copilot
- Area: rendimiento
- Contexto: `src/app/boats/[boatId]/actions.ts` — `requireBoatEditor()`
- Problema u oportunidad: la funcion hace dos queries secuenciales a Supabase (perfil de superuser + permisos de barco) con await encadenado. Podrian ejecutarse en paralelo con `Promise.all()`, reduciendo la latencia de cada server action que requiere autorizacion.
- Propuesta: convertir las dos queries en `Promise.all([profileQuery, permissionQuery])` y evaluar el resultado combinado.
- Riesgo:
  - Impacto: bajo
  - Probabilidad: baja
  - Notas: cambio mecanico; hay que asegurarse de que ambas queries son independientes (lo son).
- Opinion de Copilot: micro-optimizacion de latencia facil de implantar; especialmente util en acciones frecuentes como guardar escalas o visitas.
- Recomendacion: implantar ahora
- Relacionadas: ninguna
- Historial:
  - 2026-04-09: detectada en auditoria de produccion.

## M-026 - Memoizar filtros de regularVisits y blockedIntervals en WorkspaceShell

- Fecha: 2026-04-09
- Estado: implantada
- Fuente: copilot
- Area: rendimiento
- Contexto: `src/components/planning/boat-workspace-shell.tsx` lineas 116-121
- Problema u oportunidad: `regularVisits` y `blockedIntervals` se calculan filtrando el array de visitas en cada render sin useMemo. Con listas largas de visitas y renders frecuentes (interaccion con timeline, cambio de seleccion), esto es trabajo redundante en el hilo principal.
- Propuesta: envolver ambos filtros en `useMemo` con `[visits]` como dependencia.
- Riesgo:
  - Impacto: bajo
  - Probabilidad: baja
  - Notas: cambio trivial de dos lineas; sin riesgo de regresion.
- Opinion de Copilot: quick win de rendimiento; aunque el impacto es bajo hoy, se vuelve relevante cuando el numero de visitas crece.
- Recomendacion: implantar ahora
- Relacionadas: M-017
- Historial:
  - 2026-04-09: detectada en auditoria de produccion.

## M-027 - ~~Eliminar componente huerfano DashboardOpenBoatPanel~~

- Fecha: 2026-04-09
- Estado: descartada
- Fuente: copilot
- Area: DX
- Contexto: `src/components/dashboard/dashboard-open-boat-panel.tsx`
- Problema u oportunidad: falso positivo de la auditoria automatica. El componente si esta en uso: es importado en el flujo del dashboard de barcos abiertos.
- Historial:
  - 2026-04-09: detectada en auditoria de produccion.
  - 2026-04-09: descartada tras verificacion manual — el componente si tiene usos activos en el proyecto.

## M-028 - Centralizar estrategia de revalidatePath por familia de mutacion

- Fecha: 2026-04-09
- Estado: en-evaluacion
- Fuente: copilot
- Area: arquitectura
- Contexto: `src/app/boats/[boatId]/actions.ts`, `src/app/actions.ts`, `src/app/admin/actions.ts`
- Problema u oportunidad: cada fichero de acciones llama a `revalidatePath()` con rutas ligeramente distintas y sin coordinacion: algunos invalidan `/dashboard`, otros no; algunos usan la ruta con parametros interpolados, otros con patrones. Esto produce invalidaciones excesivas o incompletas segun la accion.
- Propuesta: crear una funcion `revalidateBoatRoutes(boatId)` centralizada que invalide exactamente las rutas necesarias para ese barco, y usarla en todas las acciones de mutacion de barco. Equivalente para admin.
- Riesgo:
  - Impacto: medio
  - Probabilidad: alta
  - Notas: ya identificado en M-014; este ticket es el seguimiento especifico de la estrategia de revalidacion, separado de los router.refresh() de cliente.
- Opinion de Copilot: necesario para cerrar M-014 completamente y evitar regressiones de cache en produccion.
- Recomendacion: preparar y luego implantar
- Relacionadas: M-014, M-004
- Historial:
  - 2026-04-09: detectada en auditoria de produccion como extension de M-014.

## M-029 - Consolidar strings hardcodeados en componentes de admin y auth

- Fecha: 2026-04-09
- Estado: propuesta
- Fuente: copilot
- Area: arquitectura
- Contexto: `boat-settings-dialog.tsx`, `set-password-form.tsx`, `users-admin.tsx`, `boats-admin.tsx`, `season-access-panel.tsx`, `blocked-intervals-manager.tsx`
- Problema u oportunidad: al menos 6 componentes tienen strings de UI hardcodeados en ingles o español fuera del sistema i18n: labels de botones ("Save changes", "Save password", "Save access", "Delete"), mensajes de error ("Error al guardar", "Error al eliminar") y textos de confirmacion multilinea en ingles. Usuarios en español ven mezcla de idiomas.
- Propuesta: mapear cada string hardcodeado a una clave existente en i18n (la mayoria ya existen: `common.save`, `common.delete`, `planning.saveSegmentError`, etc.) o añadir las claves que falten. Extensi­on natural de M-013.
- Riesgo:
  - Impacto: bajo
  - Probabilidad: baja
  - Notas: cambio mecanico de sustitucion de strings; sin riesgo funcional si se verifica en ambos idiomas.
- Opinion de Copilot: cierre natural de M-013 para las superficies que quedaron pendientes.
- Recomendacion: preparar y luego implantar
- Relacionadas: M-013
- Historial:
  - 2026-04-09: detectada en auditoria de produccion.

## M-030 - Validar variables de entorno requeridas en tiempo de build

- Fecha: 2026-04-09
- Estado: implantada
- Fuente: copilot
- Area: DX
- Contexto: configuracion de entorno — `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, etc.
- Problema u oportunidad: si una variable de entorno requerida no esta definida, el error ocurre en runtime (primera llamada que la usa) en lugar de en build time. Esto puede causar fallos silenciosos en produccion dificiles de diagnosticar.
- Propuesta: añadir un modulo `src/lib/env.ts` que valide en startup todas las variables requeridas con un mensaje de error claro, o usar una libreria como `@t3-oss/env-nextjs` que integra validacion con Zod en el build.
- Riesgo:
  - Impacto: bajo
  - Probabilidad: baja
  - Notas: mejora de DX pura; sin riesgo funcional.
- Opinion de Copilot: especialmente util en deploys automatizados donde un env var olvidado puede pasar desapercibido hasta que un usuario tropieza con el error.
- Recomendacion: implantar ahora
- Relacionadas: ninguna
- Historial:
  - 2026-04-09: detectada en auditoria de produccion.
