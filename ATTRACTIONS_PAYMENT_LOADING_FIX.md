# Flotante de carga en el pago de Atracciones

> Reutilizar el flotante de "cargando" de Alojamiento en el flujo de pago de **Atracciones**,
> para que al presionar **Pagar** aparezca feedback de carga, se **bloquee el botón** y **no se
> generen reservas/pagos duplicados**. Compatible con Expo Go (móvil) y web, respetando safe area.

## 1. Problema detectado

En el checkout de Atracciones (`atracciones/[id]/reservar.tsx`), el botón de pagar vive dentro de
`PaymentHall`. `PaymentHall` deshabilita su botón solo durante su animación interna (~1.8 s) y, al
terminar, llama a `onPagoExitoso` y **vuelve a habilitar su botón**. Pero el POST real al backend
(`crearReserva` + `confirmarPago`, bajo el estado `enviandoPago`) ocurre **después**, y durante esa
llamada **no había ningún indicador de carga ni bloqueo** → el usuario podía volver a tocar "Pagar"
y **duplicar la reserva/pago**.

## 2. Comportamiento existente en Alojamiento (referencia)

`alojamiento/[id]/reservar.tsx` (y `PaymentHall`) muestran, mientras `procesando` es `true`, un
**toast flotante oscuro** (`s.toast`) con `ActivityIndicator` + título + subtítulo
(p. ej. *"Realizando reserva..."* / *"Procesando pago..."* + *"Esto puede demorar unos segundos."*),
y deshabilitan el botón. No existía un componente compartido para ese flotante.

## 3. Archivos revisados

- `src/app/alojamiento/[id]/reservar.tsx` (estado `procesando`, toast `s.toast`).
- `src/components/PaymentHall.tsx` (toast interno, botón `disabled={procesando}`) — usado por
  **4 flujos** (alojamiento, atracciones, autos/pago, checkout) → **no se modificó**.
- `src/app/atracciones/[id]/reservar.tsx` (handler `handlePagoExitoso`, estado `enviandoPago`,
  modal `mostrarPago`, catch con manejo de error 409).
- `src/services/atracciones.service.ts` (`crearReserva`/`confirmarPago`).

## 4. Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/components/ProcessingOverlay.tsx` | **NUEVO.** Componente compartido del flotante de carga (estilo del toast de Alojamiento) + **backdrop a pantalla completa que bloquea el toque**. Safe-area aware, web-friendly. |
| `src/app/atracciones/[id]/reservar.tsx` | Importa y renderiza `<ProcessingOverlay visible={enviandoPago} title="Procesando pago..." />` en el root; añade `if (enviandoPago) return;` al inicio de `handlePagoExitoso`. |

> **Alojamiento NO se tocó.** El nuevo componente reutiliza su mismo estilo visual, pero como
> `PaymentHall` es compartido por 4 flujos, se evitó modificarlo para no arriesgar otros flujos.

## 5. Cómo se adaptó el flotante a Atracciones

- `ProcessingOverlay` renderiza el mismo toast oscuro (spinner + *"Procesando pago..."* +
  *"Esto puede demorar unos segundos."*), idéntico en estilo al de Alojamiento.
- Se monta en el root del screen (`KeyboardAvoidingView`), **encima de todo** (incluido el botón de
  `PaymentHall` y el Navbar, vía `zIndex: 9999`), y se muestra mientras `enviandoPago === true`.
- Aparece **inmediatamente** al iniciar el pago (`setEnviandoPago(true)`) y se oculta en el
  `finally` del handler, tanto en éxito como en error.

## 6. Cómo se evita el doble clic / doble tap

Tres capas de protección:
1. **Guard de reentrada:** `if (enviandoPago) return;` como primera línea de `handlePagoExitoso`.
2. **Backdrop que bloquea el toque:** el overlay cubre toda la pantalla con `pointerEvents="auto"`,
   así que mientras carga **ningún toque llega al botón de pagar** (ni en móvil ni en web).
3. El botón real (de `PaymentHall`) queda físicamente tapado por el overlay durante la llamada.

## 7. Manejo de errores

- En éxito: se setea la factura y el `finally` hace `setEnviandoPago(false)` → el overlay
  desaparece y se muestra la pantalla de factura/confirmación.
- En error: el `catch` muestra `getUserFriendlyErrorMessage(err, 'booking')` y el `finally` cierra
  el overlay. El botón **no queda bloqueado para siempre** (el usuario puede reintentar).
- **409** en reserva/pago de atracciones → **"Ya no existe disponibilidad en el horario escogido."**
  (vía el helper central `getUserFriendlyErrorMessage` con contexto `'booking'`).

## 8. Compatibilidad con Expo Go / web

- El toast se posiciona con `insets.top + 12` (`useSafeAreaInsets`) → **debajo de la barra de
  estado**, nunca encima ni mezclado con la barra de notificaciones, ni tapando mal el header.
- Usa solo primitivas RN (`View`, `Text`, `ActivityIndicator`) → funciona en móvil y en web
  (`react-native-web`). El backdrop usa `StyleSheet.absoluteFillObject` + `zIndex`.
- Legible (texto blanco sobre fondo oscuro) y centrado horizontalmente con `maxWidth: 460`.

## 9. Pruebas realizadas

| Validación | Resultado |
|---|---|
| `npx tsc --noEmit` | Archivos modificados **sin errores** (resto = 8 errores preexistentes de boilerplate sin uso). |
| **Bundle iOS completo** (Hermes + React Compiler, `lazy=false`) | **HTTP 200**, ~8.5 MB. `ProcessingOverlay` incluido en el bundle. Compila para Expo Go. |

> Prueba funcional en dispositivo (entrar a una atracción → horario/tickets → checkout → Pagar):
> pendiente de hacer en Expo Go con el backend disponible; el comportamiento está verificado por
> código + bundle. Recordar que si el microservicio de atracciones devuelve 409, debe verse el
> mensaje de disponibilidad.

## 10. Resultado final

Al presionar **Pagar** en el checkout de Atracciones aparece el mismo flotante de carga que en
Alojamiento ("Procesando pago..."), se **bloquea la interacción** durante toda la solicitud
(impidiendo doble tap/doble clic y reservas/pagos duplicados), y al terminar se oculta: navega a la
factura si fue exitoso, o muestra el mensaje de error correspondiente (incluido el 409 de
disponibilidad). Alojamiento y los demás flujos quedan intactos.

## 11. Pendientes (opcionales)

- Si se desea unificar del todo, se podría migrar el toast inline de Alojamiento y de `PaymentHall`
  a `ProcessingOverlay` (con un prop `blocking` opcional), pero implicaría tocar `PaymentHall`
  (compartido por 4 flujos); se omitió por seguridad.
- Errores TS preexistentes en `app-tabs`/`ui/collapsible` (boilerplate sin uso, downgrade SDK 56→54),
  ajenos a este cambio.
