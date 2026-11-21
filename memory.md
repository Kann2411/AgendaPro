# Memoria del proyecto — AgendaPro Mobile

> Registro vivo de tareas recientes, fixes y próximos pasos. **Máximo 100 líneas.**
> Al pasar el límite, resumir o borrar lo más antiguo de "Hecho" y "Fixes".
> Formato de fecha: AAAA-MM-DD. Lo más reciente va primero en cada sección.

## Contexto rápido

- Expo SDK 58 · React Native 0.88 · Expo Router (`src/app`) · TypeScript strict.
- Offline-first: SQLite local (`expo-sqlite`), **sin backend**. Tabla `outbox` lista para sync futuro.
- Estado: React Query (datos) + Zustand con kv-store (preferencias).
- UI propia en `src/ui/`: `components.tsx`, `forms.tsx`, `pickers.tsx`, `motion.tsx`, `haptics.ts`, `theme.ts`.
- Repo: github.com/Kann2411/AgendaPro, rama `main`.
- Dispositivo de prueba: Realme RMX3710 (Android) por USB.
- Roadmap completo (local, ignorado por git): `ROADMAP.md`.

## En curso

- (nada)

## Próximos pasos

1. Push del commit `8b29604` (mejoras de formularios), que sigue sin subir.
2. Fase 1 del roadmap: respaldo/restauración de la BD, notificaciones locales,
   WhatsApp en un toque y FAB "Nueva cita".
3. Deuda técnica: listas con `FlatList`, agregados en SQL, invalidación selectiva
   de queries, IDs con `expo-crypto`, quitar dependencias sin uso.

## Hecho

- 2026-11-21 — Creado `ROADMAP.md` (35 mejoras en 4 fases) y esta memoria.
- 2026-11-21 — Formularios interactivos: `DateField` (tira de días + calendario
  nativo), `TimeField` (horarios sugeridos + reloj), `DurationField` (stepper + chips),
  `ChipGroup` de estado/pago, `DateInput`/`TimeInput` compactos, inputs con ícono,
  foco y prefijo, `PressableScale` con resorte + háptica, sheets animados,
  transiciones de stack y tabs con háptica.
- 2026-11-21 — Libs: `@react-native-community/datetimepicker`, `expo-haptics`,
  `react-native-reanimated` 4.7.1, `react-native-worklets`, `react-native-gesture-handler`.
- 2026-11-21 — Tema claro/oscuro/sistema (`expo-system-ui`, selector en Ajustes).
- 2026-11-21 — Nuevo repo git en `main` conectado a origin.
- 2026-11-21 — Primera build debug instalada en el celular.

## Fixes

- 2026-11-21 — Onboarding: "Crear mi agenda" no navegaba → `router.replace("/(tabs)")`.
- 2026-11-21 — `toUtcIso` sumaba el desfase en lugar de restarlo; migración v2
  recalcula `starts_at`/`ends_at`. El desfase ahora considera el horario de verano.
- 2026-11-21 — Migraciones dentro de una transacción; `getDb()` permite reintentar si falla.
- 2026-11-21 — Si falla la carga del negocio, se muestra un error con reintento
  (antes mandaba al onboarding).
- 2026-11-21 — Query keys de dashboard/notificaciones sin la hora actual
  (la caché crecía cada minuto); ahora usan `refetchInterval`.

## Notas de build / entorno

- Si cambias `app.json` o agregas un módulo nativo: `npx expo prebuild --platform android`
  y después `npx expo run:android --device`. La build tarda ~17 min (caché de Gradle en C:,
  proyecto en D:).
- `android/local.properties` necesita `sdk.dir` (SDK en `%LOCALAPPDATA%\Android\Sdk`);
  `prebuild --clean` lo borra.
- Realme: activar "Instalar vía USB" en Opciones de desarrollador o la instalación falla
  (`INSTALL_FAILED_VERIFICATION_FAILURE`).
- Cambios solo en JS/TS: basta `npx expo start` (recarga en caliente) +
  `adb reverse tcp:8081 tcp:8081`.
- Antes de dar algo por terminado: `npx tsc --noEmit` y `npx expo lint`.
