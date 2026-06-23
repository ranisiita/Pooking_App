# Integración de Auth (Login y Registro) — Pooking_App ⇄ Pooking_Interface

> Revisión de la autenticación de `Pooking_App` (React Native / Expo SDK 54, también web)
> usando como referencia el proyecto Angular `Pooking_Interface`.

## 1. Objetivo de la revisión

Verificar que **Login** y **Registro** en `Pooking_App` repliquen el mismo flujo, lógica,
endpoints, payloads, validaciones y comportamiento del proyecto Angular `Pooking_Interface`,
adaptados correctamente a React Native/Expo y compatibles con web, **sin** copiar Angular
literalmente, sin mocks, sin datos quemados y sin romper rutas existentes.

**Resultado en una línea:** la implementación de auth en `Pooking_App` ya era un *port fiel*
de Angular. La revisión **confirmó la equivalencia** y validó que compila/pasa checks. **No fue
necesario modificar código de auth** (se respetó la regla de "no cambios innecesarios").

---

## 2. Archivos revisados

### En `Pooking_Interface` (Angular — referencia)
| Archivo | Rol |
|---|---|
| `src/app/pages/login/login.ts` | Componente de Login (HttpClient directo) |
| `src/app/pages/signup/signup.ts` | Componente de Registro (wizard reactivo de pasos) |
| `src/app/shared/validators/usuario.validators.ts` | Validadores de username, correo, password (+ disponibilidad async) |
| `src/app/shared/validators/cliente.validators.ts` | Validadores de tipo/número de identificación, nombres, apellidos, razón social, teléfono |
| `src/app/shared/validators/password-match.validator.ts` | Validador de coincidencia de contraseñas |
| `src/environments/environment.ts` / `environment.development.ts` | URL del API Gateway |
| `src/app/app.config.ts` | `provideHttpClient()` (sin interceptores) |
| `src/app/app.routes.ts` | Rutas `login`, `signup`, `profile` (sin guards) |
| `src/app/components/navbar/navbar.component.ts` | Lectura de sesión / logout (localStorage) |

> Angular **no** tiene `AuthService` centralizado, ni guards, ni interceptores. Cada componente
> usa `HttpClient` directo y persiste en `localStorage`.

### En `Pooking_App` (React Native / Expo — destino)
| Archivo | Rol |
|---|---|
| `src/app/login.tsx` | Pantalla de Login |
| `src/app/signup.tsx` | Pantalla de Registro (wizard de 3 pasos) |
| `src/services/auth.service.ts` | **Servicio de auth centralizado** (login, registro, disponibilidad, guidCliente) con `fetch` |
| `src/services/storage.ts` | Persistencia de sesión multiplataforma (AsyncStorage nativo / localStorage web / memoria fallback) |
| `src/utils/signup-validators.ts` | Validadores portados 1:1 desde Angular |
| `src/app/_layout.tsx` | Stack de Expo Router (rutas `login`, `signup` registradas) |
| `src/components/Navbar.tsx` | Lectura de sesión / logout |
| `.env` | `EXPO_PUBLIC_API_GATEWAY_URL` |

---

## 3. Endpoints encontrados (idénticos en ambos proyectos)

**URL base** (misma en Angular `environment.ts` y en RN `.env`):
```
https://pooking-middleware.calmtree-6e178b01.centralus.azurecontainerapps.io
```
Base de booking: `${API_GATEWAY_URL}/api/v2/booking`

| Acción | Método | Endpoint |
|---|---|---|
| Login | `POST` | `/api/v2/booking/auth/login` |
| Registro | `POST` | `/api/v2/booking/auth/registro` |
| guidCliente (post-login) | `GET` | `/api/v2/booking/clientes/usuario-guid/{usuarioGuid}` |
| Disponibilidad usuario | `GET` | `/api/v2/booking/usuarios/disponibilidad/{username}` |
| Disponibilidad correo | `GET` | `/api/v2/booking/usuarios/disponibilidad-correo/{correo}` |
| Disponibilidad identificación | `GET` | `/api/v2/booking/clientes/disponibilidad/{ci\|ruc\|pasaporte\|extranjero}/{numero}` |

En RN el mapeo de tipo→segmento está en `auth.service.ts`:
`CI→ci`, `RUC→ruc`, `PASS→pasaporte`, `EXT→extranjero` (idéntico a Angular).

---

## 4. Payload de Login

**Angular** (`login.ts`) y **React Native** (`auth.service.ts → loginUsuario`) envían lo mismo:
```json
{ "identificador": "<usuario o correo>", "password": "<password>" }
```
Headers: `Content-Type: application/json`.

**Respuesta procesada** (ambos, con las mismas rutas defensivas):
- token: `response.data.token` ?? `response.token`
- usuarioGuid: `response.data.usuarioGuid` ?? `response.usuarioGuid` ?? `response.data.guid` ?? `response.guid`
- roles: `response.data.roles` ?? `response.roles` ?? `[]`
- Si hay token + usuarioGuid → segundo `GET /clientes/usuario-guid/{guid}` para `guidCliente`.

---

## 5. Payload de Registro

**Angular** (`signup.ts`) y **React Native** (`signup.tsx → onSubmit`) construyen el **mismo payload plano**:
```json
{
  "username": "<usuario>",
  "identificador": "<usuario>",        // = username
  "correo": "<correo>",
  "password": "<password>",
  "nombreRol": "CLIENTE",              // ← VALOR FIJO (hardcoded en ambos)
  "tipoIdentificacion": "CI|RUC|PASS|EXT",
  "numeroIdentificacion": "<numero>",
  "nombres": "<nombres o \"\">",
  "apellidos": "<apellidos o \"\">",
  "razonSocial": "<razon social o \"\">",
  "telefono": "<\"{prefijo}{telefono}\" o \"\">",
  "direccion": "<direccion o \"\">"
}
```

**Valores fijos enviados:** únicamente `nombreRol: "CLIENTE"`.
No existen otros campos quemados (sin `id_rol`, `estado`, `activo`, `canal`, etc.) en ninguno
de los dos proyectos.

**Tras éxito:** Angular `router.navigate(['/login'])` (2.5 s); RN `router.replace('/login')` (2.5 s).
Ninguno hace auto-login: el usuario va a Login después de registrarse.

---

## 6. Payload final implementado en React Native

Idéntico al de Angular (ver §4 y §5). Verificado en:
- Login: `src/services/auth.service.ts:146-181` (`loginUsuario`)
- Registro: `src/app/signup.tsx:195-208` + `src/services/auth.service.ts:183-205` (`registrarUsuario`)

No se cambió ningún nombre de campo ni se añadió/quitó propiedad respecto a Angular.

---

## 7. Validaciones aplicadas (portadas 1:1 — `src/utils/signup-validators.ts`)

**Login** (`login.tsx`): ambos campos requeridos, `trim()` en identificador, sin envío vacío.

**Registro:**
| Campo | Regla |
|---|---|
| username | requerido, 4–50 caracteres, disponibilidad async |
| correo | requerido, formato `^[^\s@]+@[^\s@]+\.[^\s@]+$`, máx 120, disponibilidad async |
| password | requerido, ≥8, ≥1 número, ≥1 carácter especial |
| confirmar | requerido, debe coincidir con password |
| tipo_identificacion | requerido |
| numero_identificacion | CI=10 dígitos · RUC=13 dígitos y termina en `001` · PASS=6–9 alfanum · EXT=6–13 alfanum; disponibilidad async |
| nombres / apellidos | requeridos **solo** si Persona Natural (CI/PASS/EXT) |
| razon_social | requerida **solo** si RUC |
| telefono | opcional; si se llena: solo dígitos, 7–15 |
| direccion | opcional |

Disponibilidad async con **debounce de 500 ms** y cancelación de la petición anterior
(hook `useAvailability` en `signup.tsx`), equivalente a los async validators de Angular.

---

## 8. Manejo de errores

Replicado desde Angular en `auth.service.ts` (`extractErrorMessages`, `extractLoginFieldErrors`)
y `signup-validators.ts` (`mapBackendErrors`):
- Cuerpo string → intenta `JSON.parse`.
- `body.errors` array → lista de mensajes; `body.errors` objeto → `Object.values().flat()`.
- Fallback: `body.message ?? body.title ?? body.detail ?? "Error {status}: ..."`.
- **Login:** mapea errores a los campos `identificador` / `password`. Mensaje por defecto:
  *"Credenciales inválidas. Por favor intenta de nuevo."*
- **Registro:** `mapBackendErrors` mapea por palabras clave (usuario/correo/identificación/…) al
  campo y **regresa al paso** correspondiente (1 ó 2). Maneja usuario/correo/identificación ya
  existentes.
- **Error de conexión:** *"No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo."*

---

## 9. Manejo de sesión / token

`src/services/storage.ts` — multiplataforma y **compatible con web**:
- Web → `localStorage`
- Nativo (iOS/Android) → `AsyncStorage`
- Fallback → `memoryStorage` (en memoria) si las anteriores fallan

Claves guardadas tras login (idénticas a Angular): `token`, `usuarioGuid`, `roles`
(JSON string), y `guidCliente` (si el segundo endpoint lo devuelve).
Logout (`Navbar.tsx`) elimina esas claves. **No se usa SecureStore** (no funciona en web).

---

## 10. Navegación final (Expo Router)

| Desde | Acción | Destino |
|---|---|---|
| Login | "Regístrate aquí" (`login.tsx:127`) | `router.push('/signup')` |
| Registro | "¿Ya tienes cuenta? Inicia sesión" (`signup.tsx:439`) | `router.push('/login')` |
| Login OK | `login.tsx:82` | `router.replace('/')` (home) |
| Registro OK | `signup.tsx:213` | `router.replace('/login')` |

Rutas `login` y `signup` registradas en `src/app/_layout.tsx`. No se tocaron rutas existentes
(admin, profile, buscar, alojamiento, atracciones, autos, vuelos, checkout).

---

## 11. Diferencias entre Angular y React Native (adaptaciones necesarias)

| Aspecto | Angular | React Native / Expo | ¿Correcto? |
|---|---|---|---|
| Cliente HTTP | `HttpClient` (Observables) | `fetch` (Promises) | ✅ adaptación natural |
| Estructura | Lógica en el componente | Servicio centralizado `auth.service.ts` | ✅ mejora, sin cambiar contrato |
| Almacenamiento | `localStorage` (solo web) | `storage.ts` (AsyncStorage + localStorage + memoria) | ✅ necesario para móvil + web |
| Navegación | `Router` Angular | Expo Router (`useRouter`) | ✅ equivalente |
| Formularios | Reactive Forms + validators | `useState` + funciones validadoras | ✅ equivalente |
| Redirección post-login | `navigate(['/'])` tras 2 s de estado "success" | `replace('/')` inmediato | ✅ equivalente (UX ligeramente distinta) |
| Disponibilidad async | RxJS debounce | hook `useAvailability` con debounce 500 ms | ✅ equivalente |
| Payload / endpoints / valores fijos | — | **idénticos** | ✅ |

---

## 12. Archivos modificados

**Ninguno en el flujo de auth.** Tras el análisis comparativo, Login y Registro ya cumplían
con el contrato de Angular (endpoints, payloads, `nombreRol: "CLIENTE"`, validaciones, manejo de
errores, sesión y navegación). Modificar habría violado la regla de "no cambios innecesarios /
no refactor masivo".

Único archivo creado en esta revisión: **este documento** (`AUTH_INTERFACE_INTEGRATION.md`).

---

## 13. Comandos ejecutados

```bash
# Gestor de paquetes del proyecto: npm (existe package-lock.json; no hay yarn.lock ni pnpm-lock.yaml)
npx tsc --noEmit -p tsconfig.json   # typecheck
npx expo lint                        # lint (instaló eslint/eslint-config-expo en el primer run)
npx expo-doctor                      # diagnóstico del proyecto
```

---

## 14. Resultados de validación

| Check | Resultado | Relación con auth |
|---|---|---|
| `expo-doctor` | ✅ **18/18 checks passed** | — |
| `tsc --noEmit` (auth) | ✅ **Sin errores** en `login.tsx`, `signup.tsx`, `auth.service.ts`, `storage.ts`, `signup-validators.ts` | ✅ |
| `expo lint` (auth) | ✅ **Sin errores** en archivos de auth | ✅ |

**Hallazgos NO relacionados con auth (preexistentes):**
- `tsc` reporta 8 errores en `src/components/app-tabs.tsx`, `app-tabs.web.tsx` y
  `src/components/ui/collapsible.tsx` → secuela del **downgrade SDK 56→54** (API `NativeTabs.Trigger.Label/Icon`
  y tipos `SFSymbols7_0` de iconos). **Estos componentes son código muerto del boilerplate: no se
  importan en ninguna parte**, por lo que no afectan la app en ejecución.
- `expo lint` reporta 2 errores en `src/app/profile.tsx:1092` (`react/no-unescaped-entities`,
  comillas sin escapar) y 67 warnings de estilo en todo el proyecto (variables sin usar, etc.).

Ninguno de estos hallazgos toca Login ni Registro.

---

## 15. Pendientes (fuera del alcance de auth)

1. **(Opcional, downgrade SDK)** Corregir o eliminar los componentes boilerplate sin uso
   `src/components/app-tabs.tsx`, `app-tabs.web.tsx` y `src/components/ui/collapsible.tsx`
   para limpiar los 8 errores de TypeScript. No afectan auth ni el runtime actual.
2. **(Opcional, lint)** Escapar las comillas en `src/app/profile.tsx:1092` y limpiar warnings
   de variables sin usar.
3. **Verificación funcional en vivo** (no ejecutable desde esta revisión): correr
   `npx expo start --web` / `--tunnel -c` y probar Login y Registro contra el backend real.

---

## 16. Conclusión final

Login y Registro de `Pooking_App` **ya están integrados y son un port fiel de
`Pooking_Interface`**: mismos endpoints, mismos payloads (incluido el valor fijo
`nombreRol: "CLIENTE"`), mismas validaciones, mismo manejo de errores, misma persistencia de
sesión y una navegación equivalente — adaptados correctamente a React Native/Expo y
compatibles con móvil y web. No hay mocks ni datos quemados, no se rompió ninguna ruta y no se
modificó el backend ni la arquitectura. La revisión se limitó a **verificar y validar**; los
únicos problemas detectados (typecheck en componentes boilerplate sin uso y lint en `profile.tsx`)
son **preexistentes y ajenos a la autenticación**, derivados del downgrade de SDK.
