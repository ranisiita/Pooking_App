# Revisión de Autenticación — `Pooking_App` (Login + Registro)

## 1. Resumen del objetivo

Revisar que el **Login** y el **Registro** estén correctamente implementados en la app React Native / Expo `Pooking_App` (que también corre en web), respetando la arquitectura actual (Expo Router, `fetch`, `useState`, `AsyncStorage`/`localStorage`, tokens de diseño), sin romper navegación, servicios, diseño ni compatibilidad web, y sin tocar pantallas ajenas a autenticación.

---

## 2. Archivos revisados

| Archivo | Rol |
|---|---|
| `src/app/login.tsx` | Pantalla de Login |
| `src/app/signup.tsx` | Pantalla de Registro (wizard de 3 pasos) |
| `src/services/auth.service.ts` | Servicio de autenticación (registro + disponibilidad) |
| `src/services/storage.ts` | Persistencia de sesión (`AsyncStorage` nativo / `localStorage` web) |
| `src/utils/signup-validators.ts` | Validadores del registro |
| `src/constants/country-codes.ts` | Catálogo de prefijos telefónicos |
| `src/app/_layout.tsx` | Registro de rutas (Stack) |
| Referencia Angular: `Pooking_Interface/src/app/pages/login/login.ts` | Contrato de login original |

---

## 3. Estado del Login

**Antes de la revisión:**
- Implementación correcta en lo funcional (campos `identificador` + `password`, endpoint real, guardado de token), pero con **lógica HTTP inline** en el componente: hacía `fetch`, parseaba errores y consultaba el segundo endpoint (`guidCliente`) directamente, **duplicando** lógica que ya vive en `auth.service.ts`. Inconsistente con el Registro, que sí usa el servicio.
- El campo "Usuario o Correo" usaba `keyboardType="email-address"`, icono de correo y placeholder `correo@ejemplo.com`, engañoso porque también acepta nombre de usuario; sin `autoCapitalize="none"` (el teclado capitalizaba, rompiendo usuarios/correos).
- Navegación post-login con `router.push('/')` (dejaba Login en el back-stack).

**Después:**
- El login consume `loginUsuario()` de `auth.service.ts`. El componente solo valida, persiste la sesión y navega.
- Campo corregido: icono `person-outline`, teclado por defecto, `autoCapitalize="none"`, `autoCorrect={false}`, placeholder `Tu usuario o correo`.
- `router.replace('/')` tras login exitoso (no se puede volver a Login con el botón atrás).
- Validación: `identificador` (con `trim`) y `password` requeridos; no permite enviar vacíos.

**Estado: ✅ Correcto.**

---

## 4. Estado del Registro

- Wizard de 3 pasos fiel al Sign Up de Angular: **Datos de acceso → Datos personales → Confirmación**.
- Campos y validaciones completas (username 4–50 + disponibilidad, correo con regex + disponibilidad, password ≥8 con número/especial + barra de fuerza y checklist, confirmación, tipo de identificación CI/RUC/PASS/EXT con reglas por tipo + disponibilidad, nombres/apellidos vs razón social condicional, teléfono opcional con prefijo, dirección opcional).
- Usa `auth.service.ts` (`registrarUsuario`, `checkUsernameDisponible`, `checkCorreoDisponible`, `checkIdentificacionDisponible`).
- Manejo de errores backend mapeados a campos (`mapBackendErrors`) + toast + bloque general; maneja usuario/correo/identificación ya existentes y errores de conexión.
- Loading en el botón "Confirmar registro"; tras éxito → toast + `router.replace('/login')` a los 2.5 s.
- Sin mocks ni datos quemados.

**Estado: ✅ Correcto.** (Ver nota de lint en §11.)

---

## 5. Servicios / API utilizados

Servicio único `src/services/auth.service.ts`, mismo patrón que el resto del proyecto (`fetch`, `process.env.EXPO_PUBLIC_API_GATEWAY_URL`, funciones async que devuelven objetos resultado). Tras la revisión, **Login y Registro comparten el mismo servicio y el mismo helper de extracción de errores** (`extractErrorMessages`), eliminando la duplicación previa.

Persistencia vía `storage.ts` (abstracción `AsyncStorage` en nativo / `localStorage` en web).

---

## 6. Endpoints identificados

| Acción | Método | Endpoint |
|---|---|---|
| Login | POST | `{API_GATEWAY}/api/v2/booking/auth/login` |
| GUID cliente (post-login) | GET | `{API_GATEWAY}/api/v2/booking/clientes/usuario-guid/{usuarioGuid}` |
| Registro | POST | `{API_GATEWAY}/api/v2/booking/auth/registro` |
| Disponibilidad usuario | GET | `.../usuarios/disponibilidad/{username}` |
| Disponibilidad correo | GET | `.../usuarios/disponibilidad-correo/{correo}` |
| Disponibilidad identificación | GET | `.../clientes/disponibilidad/{ci\|ruc\|pasaporte\|extranjero}/{numero}` |

`API_GATEWAY = https://pooking-middleware.calmtree-6e178b01.centralus.azurecontainerapps.io` (desde `.env`, idéntico al `environment.ts` de Angular).

---

## 7. Payloads enviados

**Login** (coincide con Angular):
```json
{ "identificador": "usuario_o_correo", "password": "•••" }
```

**Registro** (plano, coincide con Angular):
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

**Respuesta de login procesada:** `token` (o `data.token`), `usuarioGuid`/`guid` (o anidado), `roles` (o anidado); luego `guidCliente` vía segundo endpoint. Se guardan en storage las claves `token`, `usuarioGuid`, `roles`, `guidCliente` (mismos nombres que Angular).

---

## 8. Validaciones revisadas

- **Login:** `identificador` y `password` requeridos (no vacíos, con `trim`). Mapeo de errores de campo del backend a `identificador`/`password`.
- **Registro:** todas las reglas portadas 1:1 de Angular (longitudes, regex de correo, reglas de cédula/RUC/pasaporte/extranjero, fuerza de contraseña, coincidencia de contraseñas, validadores condicionales por tipo). Bloqueo de avance si hay errores síncronos, disponibilidad `taken` o verificación en curso.

---

## 9. Problemas encontrados y correcciones realizadas

| # | Problema | Severidad | Corrección |
|---|---|---|---|
| 1 | Login duplicaba lógica HTTP/errores/`guidCliente` inline en vez de usar el servicio (inconsistente con Registro). | Media | Añadidos `loginUsuario()` y `fetchGuidCliente()` a `auth.service.ts`; `login.tsx` ahora los consume. |
| 2 | Helper `extractErrorMessages` con mensaje por defecto fijo de registro. | Baja | Parametrizado con `defaultMsg`; login usa "Credenciales inválidas…", registro su mensaje propio. |
| 3 | Campo "Usuario o Correo" con teclado `email-address`, icono de correo y placeholder engañoso; sin `autoCapitalize`. | Baja | Icono `person-outline`, teclado por defecto, `autoCapitalize="none"`, `autoCorrect={false}`, placeholder `Tu usuario o correo`. |
| 4 | Navegación post-login con `push` (Login quedaba en el historial). | Baja | `router.replace('/')`. |
| 5 | `validate()` no recortaba espacios en `identificador`. | Baja | `identificador.trim()`. |
| 6 | Import `Platform` sin usar en `login.tsx` (warning lint). | Trivial | Eliminado. |
| 7 | Estilo `Array<T>` en `signup-validators.ts` (warning lint). | Trivial | Cambiado a `T[]`. |

No se encontraron problemas de payload, endpoint, contrato, navegación Login↔Registro ni mocks/datos quemados.

---

## 10. Archivos modificados

- `src/services/auth.service.ts` — `loginUsuario()`, `fetchGuidCliente()`, `extractLoginFieldErrors()`, `extractErrorMessages()` parametrizado.
- `src/app/login.tsx` — consume el servicio, campo corregido, `replace`, `trim`, import limpio.
- `src/utils/signup-validators.ts` — estilo de tipo (`T[]`).

**No se modificó** `signup.tsx`, `storage.ts`, `_layout.tsx` ni ninguna pantalla ajena a auth.

---

## 11. Pruebas ejecutadas y resultados

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ Sin errores en archivos de auth. Único error: `StyleSheet.absoluteFillObject` en `src/app/autos/pago/[id].tsx` — **preexistente y ajeno a auth** (definición de tipo de `react-native-web`; la API existe en runtime, por eso el build web pasa). |
| `npx expo lint` | Un único hallazgo en auth: `set-state-in-effect` en `signup.tsx:64` (hook `useAvailability`). **No bloquea el build** y replica el patrón ya presente en `src/components/AirportAutocomplete.tsx`. Es código previamente commiteado, funcional; no se modifica para evitar refactor/cambio de comportamiento. El resto de hallazgos del proyecto son ajenos a auth. |
| `npx expo export --platform web` | ✅ **Build web exitoso** (`Exported: dist`, exit 0). Rutas `/login` y `/signup` generadas correctamente junto con todo el proyecto. |

> Nota: `expo lint` auto-instaló ESLint (devDependency + `eslint.config.js`). Como no es parte de auth ni fue solicitado, se **revirtió** para no introducir dependencias; el árbol final solo contiene cambios de auth.

---

## 12. Pendientes

- **Verificación manual en runtime** contra el gateway real (login con credenciales válidas/ inválidas; registro completo de los 3 pasos). Requiere entorno corriendo y credenciales.
- **Opcional (no bloqueante):** refactorizar el hook `useAvailability` para eliminar el warning `set-state-in-effect`; convendría hacerlo junto con `AirportAutocomplete.tsx` para mantener un patrón único, fuera del alcance de esta revisión de auth.
- **Opcional:** no hay pantalla de "olvidé mi contraseña" (el enlace existe sin acción) — fuera de alcance.

---

## 13. Conclusión

**Login y Registro quedaron correctamente implementados y consistentes entre sí.** Ambos usan el mismo servicio (`auth.service.ts`) y el mismo patrón del proyecto, con los endpoints y payloads correctos según el backend (idénticos a Angular), validaciones completas, manejo de loading y errores (credenciales, campos, conexión/servidor), navegación correcta (Login↔Registro, `replace` tras éxito) y compatibilidad web confirmada por el build. No se tocaron pantallas ajenas a autenticación ni se agregaron dependencias.
