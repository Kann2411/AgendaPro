# Memoria del proyecto — AgendaPro Mobile

> Registro vivo de tareas recientes, fixes y próximos pasos. **Máximo 100 líneas.**
> Al pasar el límite, resumir o borrar lo más antiguo de "Hecho" y "Fixes".
> Formato de fecha: AAAA-MM-DD. Lo más reciente va primero en cada sección.

## Contexto rápido

- Expo SDK 58 · React Native 0.88 · Expo Router (`src/app`) · TypeScript strict.
- Offline-first: SQLite local (`expo-sqlite`), **sin backend**. Tabla `outbox` lista para sync futuro.
- Estado: React Query (datos) + Zustand con kv-store (preferencias).
- UI propia en `src/ui/`: `components.tsx`, `forms.tsx`, `pickers.tsx`, `motion.tsx`, `Fab.tsx`, `haptics.ts`, `theme.ts`.
- Servicios en `src/services/` (backup, reminders, contact); UI por funcionalidad en `src/features/`.
- Repo: github.com/Kann2411/AgendaPro, rama `main`.
- Dispositivo de prueba: Realme RMX3710 (Android) por USB.
- Roadmap completo (local, ignorado por git): `ROADMAP.md`.

## En curso

- Fase 1 probada por el usuario ("todo bien"). Build **release** instalada en el
  celular (funciona sin PC). Fase 1 sin commit.

## Próximos pasos

1. Probar en el celular: crear y restaurar un respaldo, recibir un recordatorio,
   abrir WhatsApp desde una cita y usar el FAB. Después, commit de la Fase 1.
2. Fase 2 del roadmap: agenda en línea de tiempo, gestos, deslizar tarjetas,
   choques en vivo, listas virtualizadas.
3. Deuda técnica: listas con `FlatList`, agregados en SQL, invalidación selectiva
   de queries, IDs con `expo-crypto`, quitar dependencias sin uso.

## Hecho

- 2026-11-21 — Fase 1 (código listo, falta probarla en el celular):
  respaldo (`VACUUM INTO` + compartir) y restauración validada (`backupDatabaseAsync`)
  en Ajustes; recordatorios locales con `expo-notifications` (aviso X min antes,
  resumen diario, se reprograman en `invalidateAll()`, al tocar abren la cita);
  WhatsApp/Llamar con mensajes listos en cita y cliente; FAB con Cita/Cliente/Gasto
  en Inicio y Agenda.

- 2026-11-21 — Creado `ROADMAP.md` (35 mejoras en 4 fases) y esta memoria.
- 2026-11-21 — Formularios interactivos: `DateField` (tira de días + calendario
  nativo), `TimeField` (horarios sugeridos + reloj), `DurationField` (stepper + chips),
  `ChipGroup` de estado/pago, `DateInput`/`TimeInput` compactos, inputs con ícono,
  foco y prefijo, `PressableScale` con resorte + háptica, sheets animados,
  transiciones de stack y tabs con háptica.
- 2026-11-21 — Libs Fase 1: `expo-notifications`, `expo-sharing`, `expo-file-system`,
  `expo-document-picker`.
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
- `printf` de bash rompe las barras invertidas de `local.properties`; escríbelo con un editor.
- ESLint (`import/namespace`) no ve los enums re-exportados de `expo-notifications`:
  impórtalos por nombre (`import { AndroidImportance } from "expo-notifications"`).
- Si `expo run:android` falla con "Port 8081 became busy", el APK ya está compilado:
  `adb install -r android/app/build/outputs/apk/debug/app-debug.apk` y `npx expo start`.
- Release local (sin Metro): `cd android && ./gradlew assembleRelease
  -PreactNativeArchitectures=arm64-v8a` y `adb install -r app/build/outputs/apk/release/app-release.apk`
  (~28 min la primera vez). Se firma con `debug.keystore`, así que se instala encima de la
  debug sin perder datos. Para Play Store hará falta un keystore propio.
- Si ADB se cuelga ("ADB server ... not responding"): `adb kill-server && adb start-server`.
- Antes de dar algo por terminado: `npx tsc --noEmit` y `npx expo lint`.
