# Revisión de Mensajes al Usuario — Manejo de errores HTTP (especialmente 409)

> Centralizar y unificar los mensajes de error/éxito/validación/carga en `Pooking_App`
> (React Native/Expo), tomando `Pooking_Interface` (Angular) como referencia. Foco principal:
> en flujos de **reserva / disponibilidad / checkout / pago**, cualquier **HTTP 409** debe mostrar:
>
> **`Ya no existe disponibilidad en el horario escogido.`**

## 1. Objetivo del cambio

- Crear un **helper central** que mapee códigos HTTP a mensajes claros en español según el contexto.
- Garantizar que el **409 en reservas/disponibilidad/checkout/pago** muestre el mensaje de
  disponibilidad, y el **409 en auth (registro)** muestre el de usuario/correo existente.
- Eliminar mensajes genéricos/técnicos en esos flujos y dejarlos coherentes con la web Angular.
- Mantener compatibilidad móvil (Expo Go) y web, respetando safe area (ver `MOBILE_SAFE_AREA_FIX.md`).

## 2. Dónde se manejan los errores (estado previo)

- **No existía** ningún manejo de HTTP **409** en la app.
- Los servicios de reserva (`lodging.crearReserva`, `cars.crearReserva`,
  `atracciones.crearReserva`/`confirmarPago`) **devolvían `null`** ante cualquier error,
  **ocultando el status HTTP** → era imposible distinguir un 409 de un 500.
- Las pantallas mostraban mensajes **genéricos** (p. ej. *"Hubo un error al procesar tu reserva"*).
- `auth.service` y `flights.service` sí exponían el status (este último ya lanzaba `{status}`).

## 3. Archivos revisados

**Pooking_App:** `src/services/*` (auth, lodging, cars, flights, atracciones, storage),
`src/app/alojamiento/[id]/reservar.tsx`, `src/app/atracciones/[id]/reservar.tsx`,
`src/app/autos/pago/[id].tsx`, `src/app/autos/checkout/[id].tsx`, `src/app/vuelos/resultados.tsx`,
`src/app/checkout/[guid].tsx`, `src/app/checkout/[guid]/confirmacion.tsx`,
`src/app/login.tsx`, `src/app/signup.tsx`, `src/app/buscar.tsx`, `src/app/profile.tsx`.

**Pooking_Interface (referencia):** componentes de reserva de atracciones, checkout de autos,
resultados de vuelos, booking de alojamientos, login y signup; validadores; servicios.

## 4. Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/services/error-messages.ts` | **NUEVO.** Helper `getUserFriendlyErrorMessage(error, context)` + clase `ApiError` + textos `ERROR_MESSAGES`. |
| `src/services/lodging.service.ts` | `crearReserva` ahora **lanza `ApiError(status)`** en vez de devolver `null`. |
| `src/services/cars.service.ts` | `crearReserva` ahora **lanza `ApiError(status)`**. |
| `src/services/atracciones.service.ts` | `crearReserva` y `confirmarPago` ahora **lanzan `ApiError(status)`**. |
| `src/app/alojamiento/[id]/reservar.tsx` | `try/catch` alrededor de la reserva → `getUserFriendlyErrorMessage(err, 'booking')`. |
| `src/app/atracciones/[id]/reservar.tsx` | `catch` del pago/reserva → helper con context `'booking'`. |
| `src/app/autos/pago/[id].tsx` | `catch` de la reserva → helper con context `'booking'`. |
| `src/app/vuelos/resultados.tsx` | `catch` de iniciar reserva → 401 y **409** mapeados con el helper (se conserva el fallback a pasarela interna). |
| `src/app/signup.tsx` | **409 en registro** → "El usuario o correo ya se encuentra registrado." si el backend no mapeó a un campo. |

`flights.service.iniciarReservaVuelo` ya lanzaba `{ status }`, así que no se modificó el servicio,
solo la pantalla que lo consume.

## 5. Cómo se mapea el código 409 (y el resto)

Helper: `src/services/error-messages.ts`

```ts
getUserFriendlyErrorMessage(error, context)
// context: 'auth' | 'booking' | 'availability' | 'checkout' | 'payment' | 'generic'
```

`error` puede ser un número (status), un objeto `{ status }`, un `ApiError`, un `TypeError` de red,
o cualquier cosa. **Nunca** devuelve texto técnico ni JSON crudo.

| Situación | Mensaje devuelto |
|---|---|
| **409** en `booking` / `availability` / `checkout` / `payment` | **Ya no existe disponibilidad en el horario escogido.** |
| **409** en `auth` (u otro contexto) | El usuario o correo ya se encuentra registrado. |
| 400 | Revisa la información ingresada e inténtalo nuevamente. |
| 401 | Tu sesión ha expirado. Inicia sesión nuevamente. |
| 403 | No tienes permisos para realizar esta acción. |
| 404 | No se encontró la información solicitada. |
| 408 / 504 / timeout (AbortError) | La solicitud tardó demasiado. Inténtalo nuevamente. |
| 500+ | Ocurrió un problema en el servidor. Inténtalo más tarde. |
| Error de red / status 0 | No se pudo conectar con el servidor. Revisa tu conexión e inténtalo nuevamente. |

## 6. Diferencia entre 409 de disponibilidad y 409 de auth

El significado del 409 **depende del flujo**, por eso el helper recibe un `context`:

- **Reservas / disponibilidad / checkout / pago** (`'booking'`, `'availability'`, `'checkout'`,
  `'payment'`): un 409 es un **conflicto de cupo/horario** →
  **"Ya no existe disponibilidad en el horario escogido."**
- **Autenticación** (`'auth'`, en registro): un 409 es **usuario/correo ya registrado** →
  "El usuario o correo ya se encuentra registrado." (si el backend devuelve un mensaje específico
  por campo, se conserva ese y se resalta el campo correspondiente).

Así **no** se aplica el mensaje de disponibilidad de forma ciega a todos los 409.

## 7. Mensajes finales definidos

Ver tabla en §5. El texto crítico solicitado queda exactamente como:

```
Ya no existe disponibilidad en el horario escogido.
```

## 8. Mensajes revisados en Pooking_Interface (referencia)

Angular maneja el 409 por flujo con textos específicos:
- Atracciones (reserva): *"El horario ya no tiene cupos disponibles. Elige otro horario."*
- Autos (checkout): *"Lo sentimos, el vehículo ya no está disponible para estas fechas."*
- 400: *"Hay datos inválidos en la reserva..."* · 404: *"La atracción o el horario ya no están disponibles."*
- 500 (pago): *"Error interno del servidor de pagos. Intenta más tarde."*
- Red/timeout (status 0): *"El proveedor X no está disponible en este momento."*
- Registro (disponibilidad async): *"Este usuario ya está en uso." / "Este correo ya está registrado."*
- Sin resultados: *"No se encontraron alojamientos" / "No se encontraron vuelos disponibles..." /
  "Sin disponibilidad por el momento"*.

## 9. Mensajes adaptados en Pooking_App

- Se **unificó** el 409 de reservas al texto solicitado por el negocio
  (**"Ya no existe disponibilidad en el horario escogido."**), en vez de un texto distinto por flujo,
  para mantener un único mensaje coherente en toda la plataforma.
- El resto de status sigue la guía de §5 (equivalente, en español, sin códigos ni detalles técnicos).
- **Auth** (login/registro): se conservan los mensajes de campo y de credenciales del backend que ya
  funcionaban; el 409 de registro cae al mensaje de usuario/correo existente si el backend no es
  específico. (Login mantiene "Credenciales inválidas" para 401, que es lo correcto al iniciar sesión.)
- **Estados vacíos** ("sin horarios", "sin tickets", "sin habitaciones", etc.) ya existían con textos
  claros en español y **se dejaron tal cual** (no son errores y están bien redactados).
- Todos los mensajes se muestran con los componentes existentes (banners inline, `alert`, toasts)
  que respetan safe area en Expo Go (ver `MOBILE_SAFE_AREA_FIX.md`); no tapan inputs ni headers.

## 10. Pruebas realizadas

| Validación | Resultado |
|---|---|
| `npx tsc --noEmit` | Archivos modificados **sin errores**; total del proyecto = solo 8 errores **preexistentes** en boilerplate sin uso (`app-tabs`, `ui/collapsible`), ajenos a este cambio. |
| `npx expo-doctor` | **18/18 checks passed.** |
| `npx expo start` + **bundle iOS** (`lazy=false`, Hermes + React Compiler) | **HTTP 200**, ~8.49 MB. El helper y el mensaje 409 se incluyen en el bundle. Compila para Expo Go. |

> Prueba funcional del 409: requiere que el backend devuelva 409 en una reserva real (o simularlo).
> No se pudo forzar un 409 real del gateway desde aquí; el mapeo está verificado por código + bundle.

## 11. Resultado final

- En **reservas / disponibilidad / checkout / pago**, cualquier **409** muestra
  **"Ya no existe disponibilidad en el horario escogido."** (alojamientos, atracciones, autos, vuelos).
- En **registro**, un **409** muestra un mensaje de usuario/correo ya registrado.
- Los demás errores (400/401/403/404/500/red/timeout) tienen mensajes claros, en español, sin texto
  técnico, centralizados en un único helper reutilizable (`getUserFriendlyErrorMessage`).
- Sin cambios de backend, sin dependencias nuevas, sin romper Login/Registro/reservas/checkout.

## 12. Pendientes (opcionales)

- Migrar progresivamente otros servicios que aún devuelven `[]`/`null` en error
  (`lodging.buscarLodgings`, `cars.buscarVehiculos`, etc.) para que también puedan mostrar
  mensajes de red/servidor diferenciados. No es necesario para el 409 de reservas.
- Considerar reemplazar los `alert(...)` de los flujos de pago por un banner/toast con safe area
  para una UX más consistente con Login/Registro (cosmético).
- Errores TS preexistentes en `app-tabs`/`ui/collapsible` (boilerplate sin uso, downgrade SDK 56→54),
  ajenos a este cambio.
