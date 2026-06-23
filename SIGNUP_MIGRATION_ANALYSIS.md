# Migración de Sign Up: Angular (`Pooking_Interface`) → React Native (`Pooking_App`)

## 1. Resumen del objetivo

Extraer toda la lógica, diseño, validaciones y comportamiento del flujo de **registro de usuario (Sign Up)** del proyecto Angular `Pooking_Interface` y adaptarlo a la app React Native / Expo `Pooking_App`, respetando su arquitectura actual (Expo Router, `fetch`, `useState`, tokens de diseño existentes) sin romper Login ni la navegación.

El registro Angular es un **wizard de 3 pasos** con validaciones síncronas, verificación de disponibilidad asíncrona (debounce 500 ms), validadores condicionales según el tipo de identificación, fuerza de contraseña y un único POST al gateway que crea usuario + cliente. Se replicó ese comportamiento 1:1.

---

## 2. Estructura encontrada en `Pooking_App`

| Aspecto | Hallazgo |
|---|---|
| **Navegación** | **Expo Router** (file-based). Rutas registradas en `src/app/_layout.tsx` con `<Stack.Screen>`. Ya existían `login` y `signup`. |
| **Pantallas auth** | `src/app/login.tsx` y `src/app/signup.tsx` (esta última era una versión simulada con `setTimeout`). |
| **Cliente HTTP** | `fetch` nativo (no Axios, aunque está en deps). BaseURL desde `.env` → `process.env.EXPO_PUBLIC_API_GATEWAY_URL`. Patrón en `src/services/*.service.ts`. |
| **Estado** | `useState` local. **No** hay Redux/Zustand/Context ni AuthContext. |
| **Formularios** | `useState` manual + función `validate()` con regex inline (visto en `login.tsx`). No usan react-hook-form ni formik. |
| **Almacenamiento** | `src/services/storage.ts` (abstracción `localStorage` en web / memoria en nativo). |
| **UI reutilizable** | Componente local `IconInput` (replicado en login/signup), `Navbar`, `Footer`. Tokens de diseño en `src/constants/theme.ts` (`Colors`, `Spacing`, `BorderRadius`, `Shadow`). |
| **Web** | Soportado vía `react-native-web`; se usan archivos `.web.tsx` y `Platform.select()` donde aplica. |

**Dónde debía ir el registro:** reemplazar `src/app/signup.tsx` (ya estaba registrado en el Stack y enlazado desde Login). Sin cambios de navegación global.

---

## 3. Archivos revisados en `Pooking_Interface`

- `src/app/pages/signup/signup.ts` — componente, FormGroups, validadores condicionales, submit, mapeo de errores backend.
- `src/app/pages/signup/signup.html` / `signup.css` — estructura de 3 pasos, stepper, toast, fuerza de contraseña.
- `src/app/shared/validators/usuario.validators.ts` — `username`, `correo`, `password` (sync + async disponibilidad).
- `src/app/shared/validators/cliente.validators.ts` — `tipo`/`numero` identificación, `nombres`, `apellidos`, `razon_social`, `telefono`.
- `src/app/shared/validators/password-match.validator.ts` — coincidencia de contraseñas.
- `src/app/shared/data/country-codes.ts` — 20 países con bandera y prefijo.
- `src/environments/environment.ts` — `apiGatewayUrl`.

---

## 4. Archivos creados / modificados en `Pooking_App`

| Archivo | Estado | Contenido |
|---|---|---|
| `src/services/auth.service.ts` | **Nuevo** | `registrarUsuario()`, `checkUsernameDisponible()`, `checkCorreoDisponible()`, `checkIdentificacionDisponible()`, tipos y `extractErrorMessages()`. Patrón `fetch` idéntico al resto de servicios. |
| `src/utils/signup-validators.ts` | **Nuevo** | Validadores síncronos portados 1:1, `passwordStrength`, `passwordRules`, helpers `isPersonaNatural`/`isRUC` y `mapBackendErrors`. |
| `src/constants/country-codes.ts` | **Nuevo** | Catálogo de países (portado tal cual). |
| `src/app/signup.tsx` | **Modificado** | Reescrito como wizard de 3 pasos con validación, disponibilidad async, fuerza de contraseña, toast, modal de prefijo y llamada real al endpoint. |

**No se tocó** `login.tsx`, `_layout.tsx`, ni ningún otro módulo.

---

## 5. Endpoint usado para el registro

```
POST {EXPO_PUBLIC_API_GATEWAY_URL}/api/v2/booking/auth/registro
```

Endpoints de verificación de disponibilidad (async, debounce 500 ms):

```
GET .../api/v2/booking/usuarios/disponibilidad/{username}
GET .../api/v2/booking/usuarios/disponibilidad-correo/{correo}
GET .../api/v2/booking/clientes/disponibilidad/{ci|ruc|pasaporte|extranjero}/{numero}
```

BaseURL: `https://pooking-middleware.calmtree-6e178b01.centralus.azurecontainerapps.io` (ya presente en `.env`, idéntica al `environment.ts` de Angular).

---

## 6. Campos del formulario

**Paso 1 — Datos de acceso:** `username`, `correo`, `password` (con barra de fuerza + checklist), `confirmar`.

**Paso 2 — Datos personales:** `tipo_identificacion` (CI/RUC/PASS/EXT), `numero_identificacion`, condicionalmente `nombres`+`apellidos` (Persona Natural) o `razon_social` (RUC), `prefijo_telefono` (modal de países), `telefono` (opcional), `direccion` (opcional).

**Paso 3 — Confirmación:** resumen de datos + botón "Confirmar registro".

**Payload enviado (plano, idéntico a Angular):**
```jsonc
{
  "username", "identificador" (= username), "correo", "password",
  "nombreRol": "CLIENTE",
  "tipoIdentificacion", "numeroIdentificacion",
  "nombres", "apellidos", "razonSocial",
  "telefono": "{prefijo}{telefono}" | "",
  "direccion"
}
```

---

## 7. Validaciones implementadas (portadas 1:1)

- **username:** requerido, 4–50 caracteres, disponibilidad async.
- **correo:** requerido, `@`, dominio, punto, regex `^[^\s@]+@[^\s@]+\.[^\s@]+$`, máx 120, disponibilidad async.
- **password:** requerido, mín 8, ≥1 número, ≥1 carácter especial. Fuerza (Débil/Regular/Buena/Fuerte) y checklist (8 chars, número, especial, mayúscula).
- **confirmar:** requerido + coincidencia con password.
- **tipo_identificacion:** requerido.
- **numero_identificacion:** reglas por tipo — CI: 10 dígitos; RUC: 13 dígitos numéricos terminados en `001`; PASS: alfanumérico 6–9; EXT: alfanumérico 6–13. Disponibilidad async según tipo.
- **nombres / apellidos:** requeridos solo si Persona Natural (CI/PASS/EXT).
- **razon_social:** requerida solo si RUC.
- **telefono:** opcional; si se ingresa, solo dígitos, 7–15.
- **direccion:** opcional.

Cada paso bloquea el avance si hay errores síncronos, disponibilidad en `taken` o verificación aún en curso (`checking`), equivalente al estado `PENDING/INVALID` de Angular.

---

## 8. Flujo de navegación

- **Login → Sign Up:** ya existía (`router.push('/signup')`); intacto.
- **Sign Up → Login:** enlace "Inicia sesión" (`router.push('/login')`) + botón "Atrás" entre pasos.
- **Registro exitoso:** toast de éxito + `router.replace('/login')` tras 2.5 s (mismo comportamiento que Angular; sin auto-login, igual que el original).
- **Error de backend:** se mapean los mensajes a sus campos por palabras clave, se vuelve al paso correspondiente y se muestra toast + bloque general.

---

## 9. Decisiones técnicas

- **`fetch` + Promise** en lugar de `HttpClient`/RxJS, siguiendo el patrón de los servicios existentes (`lodging.service.ts`, etc.).
- **Debounce async** reimplementado con un hook `useAvailability` (timer 500 ms + control de carrera por `reqId`), equivalente a `timer(500).pipe(switchMap)`.
- **Validadores como funciones puras** que devuelven el string de error (o `''`), espejo directo de los `ValidatorFn` de Angular; reutilizables y testeables.
- **`<select>` HTML → chips** para el tipo de identificación, y **dropdown custom → `Modal` + `FlatList`** para el prefijo telefónico (cross-platform sin dependencias nuevas).
- **Toast Angular → overlay absoluto** con auto-dismiss a 5 s.
- **Manejo de errores backend** (`extractErrorMessages` + `mapBackendErrors`) portado fielmente, incluyendo formatos `errors[]`, `errors{}`, `message/title/detail`.

---

## 10. Qué se reutilizó / qué se adaptó

**Reutilizado de `Pooking_App`:** Expo Router y el registro del Stack, `Navbar`/`Footer`, tokens de `theme.ts`, patrón `IconInput`, estilo de tarjeta de `login.tsx`, patrón `fetch` de servicios, `process.env.EXPO_PUBLIC_API_GATEWAY_URL` desde `.env`.

**Adaptado de Angular:** ReactiveForms → `useState` + validadores puros; RxJS async validators → hook con debounce; `<select>`/dropdown → chips/`Modal`; toast/stepper/fuerza de contraseña → componentes RN; payload y endpoint idénticos.

**Dependencias nuevas:** ninguna.

---

## 11. Pruebas realizadas

- ✅ **Typecheck** (`npx tsc --noEmit`): los 4 archivos nuevos/modificados compilan **sin errores**. (El único error reportado, `absoluteFillObject` en `src/app/autos/pago/[id].tsx`, es **preexistente** y ajeno a este cambio.)
- ✅ **Login intacto:** `login.tsx` no fue modificado; la navegación Login↔Sign Up sigue funcionando.
- ✅ **Sin impacto colateral:** solo se crearon 3 archivos y se reescribió `signup.tsx`.

### Pendiente de verificación manual (requiere entorno corriendo)
- Ejecutar `npm run web` / `npm run ios|android` y probar el flujo completo de 3 pasos contra el gateway real (disponibilidad + registro).

---

## 12. Estado final

**Completado.** El Sign Up de Angular quedó replicado en React Native con los mismos campos, validaciones, verificación de disponibilidad, manejo de errores, endpoint y flujo de navegación, compatible con web y móvil, sin romper Login ni introducir dependencias.

### Pendientes / mejoras opcionales
- Verificación manual en runtime contra el backend (formato real de respuestas de disponibilidad).
- Opcional: auto-login tras registro si el backend llegara a devolver token (hoy, igual que Angular, redirige a Login).
- `storage.ts` no es persistente en nativo (solo memoria); irrelevante para Sign Up pero a considerar para sesión.
