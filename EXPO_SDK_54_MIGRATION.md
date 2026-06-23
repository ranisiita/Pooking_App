# Migración a Expo SDK 54 — `Pooking_App`

## Resumen del objetivo

Bajar el proyecto de **Expo SDK 56** a **Expo SDK 54**, alineando todas las dependencias gestionadas por Expo a sus versiones oficiales del SDK 54, sin romper la app, la compatibilidad web ni las pantallas de Login/Registro. Gestor de paquetes: **npm** (`package-lock.json`).

---

## Versión anterior vs. final

| | Antes (SDK 56) | Ahora (SDK 54) |
|---|---|---|
| `expo` | ~56.0.9 | **~54.0.35** |
| `react` | 19.2.3 | **19.1.0** |
| `react-dom` | 19.2.3 | **19.1.0** |
| `react-native` | 0.85.3 | **0.81.5** |
| `react-native-web` | ~0.21.0 | **~0.21.0** (sin cambio) |

Las versiones objetivo se obtuvieron del mapa oficial `bundledNativeModules.json` del paquete `expo@54.0.35` (no se adivinó ninguna).

---

## Cambios en `package.json` (dependencias ajustadas)

> Nota: SDK 56 renombró todos los paquetes `expo-*` al esquema `56.x`; SDK 54 usa el versionado independiente tradicional.

| Paquete | Antes | Ahora (SDK 54) |
|---|---|---|
| `@expo/ui` | ~56.0.16 | ~0.2.0-beta.9 |
| `@expo/vector-icons` | ^15.1.1 | ^15.0.3 |
| `@react-native-async-storage/async-storage` | ^3.1.1 | **2.2.0** (downgrade mayor) |
| `expo-constants` | ~56.0.17 | ~18.0.13 |
| `expo-device` | ~56.0.4 | ~8.0.10 |
| `expo-font` | ~56.0.5 | ~14.0.12 |
| `expo-glass-effect` | ~56.0.4 | ~0.1.10 |
| `expo-image` | ~56.0.10 | ~3.0.11 |
| `expo-linear-gradient` | ^56.0.4 | ~15.0.8 |
| `expo-linking` | ~56.0.13 | ~8.0.12 |
| `expo-router` | ~56.2.9 | **~6.0.24** |
| `expo-splash-screen` | ~56.0.10 | ~31.0.13 |
| `expo-status-bar` | ~56.0.4 | ~3.0.9 |
| `expo-symbols` | ~56.0.6 | ~1.0.8 |
| `expo-system-ui` | ~56.0.5 | ~6.0.9 |
| `expo-video` | ~56.1.3 | ~3.0.16 |
| `expo-web-browser` | ~56.0.5 | ~15.0.11 |
| `react-native-gesture-handler` | ~2.31.1 | ~2.28.0 |
| `react-native-reanimated` | 4.3.1 | ~4.1.1 |
| `react-native-safe-area-context` | ~5.7.0 | ~5.6.0 |
| `react-native-screens` | 4.25.2 | ~4.16.0 |
| `react-native-worklets` | 0.8.3 | 0.5.1 |
| `@types/react` (dev) | ~19.2.2 | ~19.1.0 |
| `typescript` (dev) | ~6.0.3 | ~5.9.2 |

`axios ^1.17.0` se dejó sin cambios (no es gestionado por Expo y es compatible con web).

---

## Archivos modificados

| Archivo | Motivo |
|---|---|
| `package.json` | Versiones alineadas a SDK 54. |
| `package-lock.json` | **Regenerado** (ver justificación abajo). |
| `src/app/vuelos/resultados.tsx` | `...StyleSheet.absoluteFill` → `...StyleSheet.absoluteFillObject` (compat tipos RN 0.81). |
| `src/app/atracciones/[id].tsx` | idem (×2). |
| `src/app/atracciones/[id]/reservar.tsx` | idem (×2). |
| `src/app/autos/detalle/[id].tsx` | idem (×2). |
| `src/components/animated-icon.tsx` | idem (×1). |

**Justificación de regenerar el lockfile:** un downgrade mayor de SDK cambia ~25 dependencias directas y todos sus árboles transitivos. El `package-lock.json` previo estaba fijado a versiones de SDK 56, lo que provocaría conflictos de resolución. Se borró `node_modules` + `package-lock.json` y se reinstaló limpio para garantizar un árbol consistente de SDK 54 (práctica estándar en migraciones mayores). No se cambió de gestor: sigue siendo npm.

**No se modificó** `app.json`, `tsconfig.json`, ni los archivos de auth (`login.tsx`, `signup.tsx`, `auth.service.ts`, `signup-validators.ts`). No existen `babel.config.js` ni `metro.config.js` (se usan los defaults de Expo, válidos en SDK 54).

### Sobre `StyleSheet.absoluteFill`
En los tipos de RN 0.81 (SDK 54), `StyleSheet.absoluteFill` es un id de estilo opaco no "spreadeable"; el idiom correcto para hacer spread es `StyleSheet.absoluteFillObject`. En runtime ambos producen las mismas propiedades, por lo que **no hay cambio visual ni de comportamiento** (de hecho el build web ya funcionaba; esto solo corrige el tipo).

---

## Comandos ejecutados

| Comando | Resultado |
|---|---|
| `rm -rf node_modules package-lock.json && npm install` | ✅ 747 paquetes instalados, sin errores (solo warnings de deprecación transitivos). |
| `npx expo install --fix` | ✅ "Dependencies are up to date" (mis versiones coinciden exactamente con el mapa SDK 54). |
| `npx expo-doctor` | ✅ **18/18 checks passed. No issues detected!** |
| `npx tsc --noEmit` | ⚠️ 8 errores restantes, **todos en boilerplate sin usar** (ver abajo). Auth y todas las pantallas en uso: limpias. |
| `npx expo export --platform web` | ✅ **Build web exitoso** (`Exported: dist`, exit 0). 23 rutas generadas, incluidas `/login` y `/signup`. |

> `npm run lint` (`expo lint`) y `expo start --web` no se ejecutaron: el primero auto-instalaría ESLint (no es parte de la migración SDK 54 ni estaba instalado); el segundo es un servidor interactivo de larga duración. El `expo export` (que empaqueta el mismo bundle web) es la verificación de build definitiva y pasó. `tsc` cubre el typecheck.

---

## Resultado de `expo-doctor`

```
Running 18 checks on your project...
18/18 checks passed. No issues detected!
```

## Resultado de ejecución web

`npx expo export --platform web` → **exit 0**, `Exported: dist`. Bundle web (~2.02 MB) y 23 rutas estáticas generadas correctamente (`/login`, `/signup`, `/`, etc.).

---

## Errores encontrados y correcciones

| # | Error | Archivo(s) | Acción |
|---|---|---|---|
| 1 | TS2698 "Spread types may only be created from object types" (`...StyleSheet.absoluteFill`) | 4 pantallas en uso + `animated-icon` | ✅ Corregido → `absoluteFillObject`. |
| 2 | TS2339 `NativeTabs.Trigger.Label`/`.Icon` no existen (API de native-tabs cambió en expo-router 6) | `src/components/app-tabs.tsx` | ⏳ Sin tocar — **archivo boilerplate sin usar** (no se importa en ningún lado). |
| 3 | TS2322 `SymbolView name` espera string `SFSymbols7_0`, no objeto `{ios,android,web}` | `src/components/app-tabs.web.tsx`, `src/components/ui/collapsible.tsx` | ⏳ Sin tocar — boilerplate sin usar. |

Se verificó con `grep` que `app-tabs.tsx`, `app-tabs.web.tsx`, `animated-icon.tsx` y `collapsible.tsx` **no se importan en ninguna parte de `src/`**: son componentes del template inicial. Sus 8 errores de tipo son por APIs de SDK 56 y **no afectan a la app ni al build web**. Migrarlos requeriría reescribir contra las APIs de expo-router 6 / expo-symbols sobre código muerto, lo que excede el alcance ("no refactor masivo / no destructivo").

No aparecieron errores de peer dependencies, Metro, Babel, imports rotos, navegación ni de `react-native-web`.

---

## Compatibilidad web

- `react-native-web ~0.21.0` se mantiene (misma versión que en SDK 56 → sin riesgo).
- `react-dom` alineado a 19.1.0 (par con `react`).
- Build web (`expo export`) exitoso; `/login` y `/signup` generadas.
- No se detectaron librerías incompatibles con web.

## Login y Registro

- Archivos de auth **no modificados** y **sin errores de tipo** bajo SDK 54.
- Navegación Login ↔ Registro intacta (Expo Router / `expo-router` 6).
- Servicios/API (`auth.service.ts`, `fetch`, `storage.ts` con AsyncStorage 2.2.0) sin cambios funcionales.
- Inputs, botones y estilos sin cambios.

---

## Pendientes

1. **Boilerplate sin usar incompatible con SDK 54** (`app-tabs.tsx`, `app-tabs.web.tsx`, `collapsible.tsx`): 8 errores de tipo. Recomendación: eliminarlos si no se van a usar, o migrarlos a las APIs de expo-router 6 (`<NativeTabs>` con `Label`/`Icon` como elementos) y `SymbolView` (prop `name` como string) si se planean usar. No bloquean app ni web.
2. **`AGENTS.md`** referencia los docs de Expo v56 ("Read the exact versioned docs at .../v56.0.0/"). Tras el downgrade conviene actualizarlo a `.../v54.0.0/`. No se modificó por ser archivo de instrucciones del proyecto (fuera del alcance técnico de dependencias).
3. **Verificación en runtime nativo** (iOS/Android) y `expo start --web` interactivo: requieren entorno/dispositivo; aquí se validó vía `expo-doctor` + `expo export`.
4. `npm audit` reporta 21 vulnerabilidades moderadas (en dependencias transitivas); no relacionadas con la migración SDK 54.

---

## Conclusión

✅ **El proyecto quedó correctamente en Expo SDK 54.** `expo-doctor` pasa 18/18, el build web compila y genera todas las rutas (incluidas Login y Registro), todas las dependencias coinciden con el mapa oficial del SDK 54, y `expo install --fix` confirma que no hay desajustes. Los únicos errores de TypeScript restantes están en componentes boilerplate del template que no se usan y no afectan la ejecución. Login, Registro, navegación, servicios y compatibilidad web se mantienen funcionando.
