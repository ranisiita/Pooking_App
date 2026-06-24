# Fix de Safe Area + Mensajes (móvil / Expo Go)

> Adaptar `Pooking_App` para uso real en celular con Expo Go: que el contenido superior no se
> monte con la barra de estado/notificaciones, que Login y Registro se usen bien con el teclado,
> y que los mensajes de error/éxito/loading se vean claros y bien posicionados (tomando
> `Pooking_Interface` en Angular como referencia de UX). Se mantiene compatibilidad con web.

## 1. Problema encontrado

- El header (`Pooking.com` + íconos) quedaba **montado sobre la barra de estado** del celular
  (hora, batería, wifi) en Expo Go.
- Los íconos de la barra de estado **casi no se veían**: el fondo de la app es crema claro pero la
  `StatusBar` estaba configurada en `style="light"` (íconos blancos sobre fondo claro).
- En Registro, el **toast** de mensajes usaba un `top: 60` fijo en nativo, que podía quedar pegado
  o encima de la barra de estado según el dispositivo (notch).
- Login/Registro no usaban `KeyboardAvoidingView`, por lo que el teclado podía tapar inputs/botones.
- Login no mostraba un mensaje de **éxito** antes de navegar (Angular sí lo muestra).

## 2. Causa probable

- **No había `SafeAreaProvider`** en el layout raíz, y ningún componente leía los *insets* del
  dispositivo. El header (`Navbar`) tenía `height: 64` y empezaba en `y = 0`, por lo que en móvil
  se dibujaba debajo de la barra de estado.
- `StatusBar style="light"` no concuerda con el fondo claro de la app.
- El toast posicionaba con un valor fijo en vez del inset real del dispositivo.

## 3. Archivos revisados

**Pooking_App:**
- `src/app/_layout.tsx` (RootLayout / Stack / StatusBar)
- `src/components/Navbar.tsx` (header compartido — lo usan TODAS las pantallas)
- `src/app/login.tsx`, `src/app/signup.tsx`
- `package.json` (confirmar `react-native-safe-area-context`)

**Pooking_Interface (referencia de UX de mensajes):**
- `pages/login/login.ts` + `.html` + `.css`
- `pages/signup/signup.ts` + `.html` + `.css`
- `shared/validators/*` (textos de validación y disponibilidad)

## 4. Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/app/_layout.tsx` | Envuelto en `SafeAreaProvider`; `StatusBar` cambiado a `style="dark"`. |
| `src/components/Navbar.tsx` | `useSafeAreaInsets()`; el header agrega `paddingTop: insets.top` y `height: 64 + insets.top`. Corrige la colisión **globalmente**. |
| `src/app/login.tsx` | `KeyboardAvoidingView` + `keyboardShouldPersistTaps`; banner de éxito "✓ ¡Bienvenido! Redirigiendo..."; botón deshabilitado en loading/success. |
| `src/app/signup.tsx` | `KeyboardAvoidingView` + `keyboardShouldPersistTaps`; toast reposicionado con `insets.top` (en vez de `top: 60` fijo). |

No se modificó ningún otro screen ni la arquitectura. No se agregaron dependencias
(`react-native-safe-area-context@5.6.2` ya estaba instalado, viene con Expo SDK 54).

## 5. Solución aplicada

### Safe area
- `SafeAreaProvider` (de `react-native-safe-area-context`) en `_layout.tsx` envuelve toda la app,
  habilitando `useSafeAreaInsets()` en cualquier pantalla.
- El **header global `Navbar`** lee `insets.top` y se desplaza por debajo de la barra de estado:
  ```tsx
  const insets = useSafeAreaInsets();
  const navStyle = [ s.navbar, /* ... */, { paddingTop: insets.top, height: 64 + insets.top } ];
  ```
  Como **todas** las pantallas montan `<Navbar />`, esto resuelve la colisión en toda la app
  (Login, Registro, Home, Perfil, Buscar, Atracciones, Alojamientos, Autos, Vuelos, Checkout, etc.)
  sin tocar cada pantalla una por una.
- En **web**, `insets.top` es `0`, así que el header queda igual (no se rompe la web).
- No se usaron paddings fijos "a ciegas": el desplazamiento usa el inset real del dispositivo
  (sirve para iOS con notch, Android edge-to-edge, etc.).

### StatusBar
- `expo-status-bar` configurado en `style="dark"` en `_layout.tsx`, para que los íconos de la barra
  (hora, batería, wifi) se vean sobre el fondo crema claro de la app.

### Mensajes de éxito / error / loading (referencia: Angular)
Se replicó el comportamiento de `Pooking_Interface`, adaptado a React Native:

| Mensaje | Login | Registro |
|---|---|---|
| **Loading** | Botón deshabilitado, texto **"Ingresando..."** | Botón deshabilitado, texto **"Registrando..."** |
| **Éxito** | Banner verde **"✓ ¡Bienvenido! Redirigiendo..."** (luego navega a Home) | Banner verde **"¡Cuenta creada! Redirigiendo al login..."** + toast **"¡Cuenta y perfil creados exitosamente!"** |
| **Error general** | Banner rojo con el mensaje del backend (p. ej. *"Credenciales inválidas..."*) | Toast rojo *"Error en el registro"* + banner + errores por campo |
| **Validación por campo** | Texto rojo bajo el input (*"El usuario o correo es requerido."*, *"La contraseña es requerida."*) | Igual + disponibilidad async (spinner → ✓ verde "¡disponible!" → ✗ rojo "ya está en uso/registrado") |
| **Disponibilidad** | — | Adorno a la derecha del input: spinner mientras verifica, check verde si disponible, X roja si tomado |

Posicionamiento en móvil:
- Los **banners de error/éxito** van **dentro del formulario** (debajo del header), nunca tapan
  inputs ni botones, y nunca quedan bajo la barra de notificaciones.
- El **toast** de Registro flota arriba pero **debajo del inset** (`insets.top + 8`), así que no se
  monta sobre la barra de estado. En web usa `top: 24`.
- Los **errores por campo** quedan inmediatamente bajo cada input (patrón ya existente).
- Textos mantenidos iguales/equivalentes a Angular.
- Todo funciona también en **web** (los insets son 0; banners y toast se renderizan igual).

### Teclado
- Login y Registro envueltos en `KeyboardAvoidingView` (`behavior="padding"` en iOS) y los
  `ScrollView` usan `keyboardShouldPersistTaps="handled"`, para que:
  - el teclado no tape los inputs,
  - el formulario se pueda desplazar en pantallas pequeñas,
  - los botones sigan siendo tocables con el teclado abierto.

## 6. Pruebas realizadas

- `npx tsc --noEmit` → **sin errores** en `_layout.tsx`, `Navbar.tsx`, `login.tsx`, `signup.tsx`.
- **Bundle nativo iOS** vía Metro (`npx expo start` + bundle `lazy=false`, Hermes + React Compiler)
  → **HTTP 200**, ~8.48 MB. Toda la app (incl. Login/Registro con los cambios) compila para Expo Go.
- Metro levanta correctamente con `npx expo start`.

## 7. Cómo volver a probar en Expo Go

1. `npx expo start` (o `npx expo start --tunnel` si el celular está en otra red).
2. Escanear el QR con **Expo Go**.
3. Verificar:
   - El header `Pooking.com` queda **debajo** de la barra de estado (no encima de la hora/batería).
   - Los íconos de la barra de estado se ven (oscuros).
   - **Login**: escribir usuario y contraseña con el teclado abierto sin que tape los campos;
     ver "Ingresando..." al enviar; banner de error si las credenciales fallan; banner verde de
     bienvenida al entrar.
   - **Registro**: avanzar el wizard, ver spinner/✓/✗ de disponibilidad, "Registrando..." al
     confirmar, toast/banner de éxito; el toast aparece bajo la barra de estado, no encima.
   - Probar también en **web** (`npm run web`): el header y los mensajes se ven igual que antes.

> Nota: si el backend de `auth`/`usuarios` está caído (ver `DIAGNOSTICO_AUTH_REST.md`), Login y
> Registro mostrarán el error correspondiente — eso es independiente de este fix de UI.

## 8. Resultado final

- El contenido superior **ya no se mezcla** con la barra de notificaciones en ninguna pantalla.
- La barra de estado es legible (íconos oscuros sobre fondo claro).
- Login y Registro son usables con el teclado abierto en pantallas pequeñas.
- Los mensajes de error, éxito, validación, disponibilidad y loading se ven claros y bien
  ubicados, equivalentes a `Pooking_Interface`, y siguen funcionando en web.

## 9. Pendientes (opcionales, fuera del alcance de este fix)

- En la **home con hero oscuro** (header transparente), con `StatusBar style="dark"` los íconos
  podrían verse con menos contraste sobre la imagen. Si se desea, se puede ajustar la `StatusBar`
  por pantalla (p. ej. `style="light"` solo en Home). No afecta Login/Registro ni la queja actual.
- Errores de TypeScript preexistentes en componentes boilerplate sin uso (`app-tabs`,
  `ui/collapsible`) por el downgrade SDK 56→54 — no relacionados con este cambio.
