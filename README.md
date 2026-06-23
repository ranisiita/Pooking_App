# Pooking_App 📱

App **móvil** de Pooking construida con [Expo](https://expo.dev) (SDK 54) y React Native +
[Expo Router](https://docs.expo.dev/router/introduction). Pensada principalmente para correr en
**Expo Go** como demo en celular.

> **Nota sobre la web:** el proyecto web oficial de Pooking es **`Pooking_Interface` (Angular)**.
> `Pooking_App` mantiene compatibilidad con web (`npx expo start --web`), pero **no** es el
> reemplazo del sitio web oficial. La prioridad de este proyecto es funcionar como app móvil.

Ambos proyectos consumen el **mismo backend público** (API Gateway en Azure), así que login,
registro y reservas funcionan igual desde el celular.

---

## Requisitos

- **Node.js** 18 o superior.
- **App Expo Go** instalada en tu celular:
  - Android: [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)
  - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)
- El **celular y la computadora** conectados (ver modo túnel más abajo si están en redes distintas).

---

## 1. Instalar dependencias

```bash
npm install
```

## 2. Configurar variables de entorno

El repo ya incluye un `.env` con la URL pública del backend, así que normalmente **no tienes que
hacer nada**. Si tu `.env` no existe o quieres recrearlo:

```bash
cp .env.example .env
```

Variable usada por la app (ver detalle en [Variables de entorno](#variables-de-entorno)):

| Variable | Valor | Para qué sirve |
|---|---|---|
| `EXPO_PUBLIC_API_GATEWAY_URL` | `https://pooking-middleware.calmtree-6e178b01.centralus.azurecontainerapps.io` | URL pública del backend (login, registro, búsquedas, reservas) |

## 3. Levantar la app con Expo Go

```bash
npx expo start
```

Luego:

1. Se abre el **Metro bundler** y muestra un **código QR** en la terminal.
2. Abre la app **Expo Go** en tu celular y **escanea el QR**
   (Android: desde Expo Go · iOS: desde la cámara del sistema).
3. La app se descarga y abre en tu teléfono. Login y registro consumen el backend público
   directamente.

> Tip: si cambiaste el `.env` o ves comportamiento raro de caché, reinicia limpiando:
> ```bash
> npx expo start --clear
> ```

## 4. Modo túnel (celular y PC en redes distintas)

Si tu teléfono **no está en la misma red Wi-Fi** que tu computadora (o hay un firewall que
bloquea la conexión LAN), usa el modo túnel:

```bash
npx expo start --tunnel
```

Esto expone el bundler a través de un túnel público (ngrok) para que Expo Go pueda conectarse
desde cualquier red. La **API sigue siendo la URL pública del `.env`**, así que el login y el
registro funcionan igual.

> La primera vez con `--tunnel` puede pedir instalar `@expo/ngrok`; acepta la instalación.

Atajo útil combinando túnel + limpieza de caché:

```bash
npx expo start --tunnel --clear
```

---

## Variables de entorno

La app lee la URL del backend desde la variable pública de Expo:

```env
EXPO_PUBLIC_API_GATEWAY_URL=https://pooking-middleware.calmtree-6e178b01.centralus.azurecontainerapps.io
```

Reglas importantes:

- ✅ **Debe ser una URL pública HTTPS.** Expo Go corre en el **teléfono**, no en tu PC.
- ❌ **No uses `localhost` ni `127.0.0.1`.** Desde el celular, `localhost` apunta al propio
  teléfono y las llamadas a la API fallarían. (La app no usa `localhost` en ningún lado.)
- Las variables con prefijo `EXPO_PUBLIC_` se incrustan en el bundle en tiempo de build y están
  disponibles en móvil, web y builds nativos.
- Si cambias el `.env`, reinicia el bundler con `npx expo start --clear` para que tome el nuevo valor.

El archivo `.env` está versionado con la URL pública (para que la demo funcione al clonar).
`.env.example` documenta la variable como referencia.

---

## Comandos disponibles

| Comando | Descripción |
|---|---|
| `npx expo start` | Inicia el bundler para abrir en Expo Go (QR). |
| `npx expo start --tunnel` | Igual, pero accesible desde otra red (túnel ngrok). |
| `npx expo start --clear` | Inicia limpiando la caché de Metro. |
| `npm run android` | Abre en emulador/dispositivo Android. |
| `npm run ios` | Abre en simulador iOS (requiere macOS + Xcode). |
| `npm run web` | Abre en navegador (compatibilidad web; no reemplaza a `Pooking_Interface`). |
| `npm run lint` | Linter (Expo ESLint). |
| `npx expo-doctor` | Diagnóstico de salud del proyecto. |

---

## Estructura relevante

```
src/
├── app/                 # Pantallas (Expo Router, file-based routing)
│   ├── login.tsx        # Login
│   ├── signup.tsx       # Registro (wizard de 3 pasos)
│   └── ...
├── services/
│   ├── auth.service.ts  # Login, registro y disponibilidad (usa EXPO_PUBLIC_API_GATEWAY_URL)
│   └── storage.ts       # Sesión multiplataforma: AsyncStorage (nativo) / localStorage (web)
└── constants/           # Tema y constantes
```

La persistencia de sesión (`token`, `usuarioGuid`, `roles`, `guidCliente`) usa
`src/services/storage.ts`, que funciona tanto en **Expo Go (AsyncStorage)** como en **web
(localStorage)**, sin depender de APIs exclusivas del navegador.
