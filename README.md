# Inversiones JS — panel administrativo

Panel web privado para que Inversiones JS (tienda de celulares a crédito) edite su catálogo:
nombre, variante, inicial, cuota quincenal, número de cuotas y cantidad de cada equipo. El
**chatbot** del cliente lee la misma colección de Firestore, así que lo que se guarda aquí es lo
que el chatbot responde. Contrato con el chatbot: [`docs/chatbot.md`](docs/chatbot.md).

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 + shadcn/ui ·
Firebase Auth (correo y contraseña) + Firestore · bun · Biome.

## Desarrollo local

Todo corre contra los **emuladores** de Firebase (proyecto `demo-inversiones-js`): no hace falta
un proyecto real ni credenciales.

Requisitos: [bun](https://bun.sh) y Java 11+ (para los emuladores).

```bash
bun install
cp .env.example .env.local        # y deja NEXT_PUBLIC_USE_EMULATORS=true
bun run emulators                 # Auth :9099, Firestore :8080, UI http://localhost:4000
bun run seed:emulador             # en otra terminal: 23 productos + cuentas de prueba
bun run dev                       # http://localhost:3000
```

Con emuladores, `.env.local` solo necesita `NEXT_PUBLIC_USE_EMULATORS=true` y
`NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-inversiones-js` (el resto puede ir con valores de relleno).

**Cuentas de prueba:** un admin y una cuenta sin acceso. Sus correos y contraseñas están en
`CUENTAS_EMULADOR` dentro de [`scripts/seed-emulador.ts`](scripts/seed-emulador.ts); solo
existen en el emulador.

### Comandos

| Comando | Qué hace |
|---|---|
| `bun run dev` | Servidor de desarrollo |
| `bun run typecheck` | Tipos (incluye `next typegen`) |
| `bun run lint` / `bun run format` | Biome |
| `bun run test` | Tests puros (`tests/unit`) |
| `bun run emulators:test` | Tests de reglas (`tests/rules`), con los emuladores corriendo |
| `bun run build` | Build de producción |
| `bun run seed:emulador` | Carga el catálogo y las cuentas de prueba en el emulador |
| `bun run admin:crear <correo> --emulador` | Da acceso al panel a un correo (ver abajo) |
| `bun run seed:produccion --emulador --proyecto=demo-x` | Ensayo del seed de producción |

## Cómo funciona el acceso

- Solo entra quien tenga cuenta en Firebase Auth **y** un documento `admins/{uid}`.
- La barrera real son las reglas de Firestore (`firestore.rules`): sin documento en `admins`,
  no se puede leer ni escribir el catálogo aunque se tenga sesión.
- No hay registro público. Las cuentas se crean con `bun run admin:crear`.

## Puesta en producción

Paso a paso para el primer despliegue. Lo hace el dueño del proyecto (necesita acceso a la
consola de Firebase/Google Cloud y a Vercel).

### 1. Crear el proyecto de Firebase

1. [console.firebase.google.com](https://console.firebase.google.com) › Agregar proyecto.
   Anota el **ID del proyecto** (p. ej. `inversiones-js-1234`). Google Analytics no hace falta.
2. Configuración del proyecto › Tus apps › **App web** (`</>`). Copia la configuración
   (`apiKey`, `authDomain`, `projectId`, …): son las variables `NEXT_PUBLIC_FIREBASE_*`.

### 2. Authentication

1. Authentication › Comenzar › Método de acceso › **Correo electrónico/contraseña**: habilitar
   (sin "vínculo de correo").
2. Authentication › Configuración › **Acciones del usuario**: **desmarca "Habilitar la
   creación (registro)"** (y "Habilitar la eliminación"). Así nadie puede crearse una cuenta
   con la API key pública; las cuentas solo se crean con `admin:crear`.
3. Authentication › Configuración › **Dominios autorizados**: agrega el dominio de Vercel
   (`<proyecto>.vercel.app`) y el dominio propio si lo hay.

### 3. Firestore y reglas

1. Firestore Database › Crear base de datos › modo **producción** › región cercana a los
   clientes (no se puede cambiar después).
2. Desplegar las reglas del repo (sustituye `<id>`):

   ```bash
   bunx firebase login
   bunx firebase deploy --only firestore:rules --project <id>
   ```

   Pasa siempre `--project <id>`: el `default` de `.firebaserc` es el demo de los emuladores.

### 4. Cuenta de servicio para los scripts

Los scripts de alta y de carga usan el Admin SDK y necesitan una clave.

1. Configuración del proyecto › Cuentas de servicio › **Generar nueva clave privada**.
2. Guárdala **fuera del repo** (p. ej. `~/claves/inversiones-js-admin.json`) o, si la dejas en la
   carpeta, con nombre `service-account*.json` (ignorado por git). **Nunca la subas a git ni la
   compartas por chat.** Bórrala cuando termines o revócala desde la consola.
3. Apúntala en la terminal donde vas a correr los scripts:

   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS=~/claves/inversiones-js-admin.json   # bash
   $env:GOOGLE_APPLICATION_CREDENTIALS="C:\claves\inversiones-js-admin.json"  # PowerShell
   ```

   Asegúrate de que `FIRESTORE_EMULATOR_HOST` **no** esté definido en esa terminal (si lo
   está, los scripts asumen emulador y se niegan a usar `--prod`).

Esta clave es de administrador. El chatbot usa **otra**, de solo lectura
(ver [`docs/chatbot.md`](docs/chatbot.md)).

### 5. Cargar el catálogo inicial

```bash
bun run seed:produccion --prod
```

Muestra el proyecto de destino y un resumen. Carga los 23 equipos de la lista del 29/09 con
`cantidad = 0`. Si un producto ya existe (mismo id) **no lo toca**, para no pisar lo que el
cliente haya editado; `--forzar` los reescribe enteros (vuelve los precios a la lista y la
cantidad a 0). Se puede ensayar antes contra el emulador:
`bun run seed:produccion --emulador --proyecto=demo-ensayo`.

### 6. Crear la cuenta del cliente

```bash
bun run admin:crear correo@del-cliente.com --prod
```

Crea el usuario (o lo encuentra, si ya existe) y su documento `admins/{uid}`. Si es nuevo,
imprime **una sola vez** una contraseña temporal: pásala por un canal privado y pide que la
cambie (Authentication › Usuarios › Restablecer contraseña le envía el correo). Repite el
comando para cada persona que necesite acceso. Para quitar el acceso, borra su documento en
Firestore › `admins`.

### 7. Desplegar en Vercel

1. Importa el repo en Vercel (framework Next.js).
2. Variables de entorno (Production y Preview):

   | Variable | Valor |
   |---|---|
   | `NEXT_PUBLIC_FIREBASE_API_KEY` | de la app web (paso 1) |
   | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `<id>.firebaseapp.com` |
   | `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `<id>` |
   | `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | de la app web |
   | `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | de la app web |
   | `NEXT_PUBLIC_FIREBASE_APP_ID` | de la app web |
   | `NEXT_PUBLIC_USE_EMULATORS` | `false` (o no la definas) |

   **No** pongas `GOOGLE_APPLICATION_CREDENTIALS` en Vercel: el panel no usa el Admin SDK.
3. Deploy. Si usas dominio propio, agrégalo también en Authentication › Dominios autorizados.

### 8. Comprobar

- Entra con la cuenta del cliente: ve y edita el catálogo.
- Con una cuenta sin documento en `admins` (o sin sesión) no se ve nada.
- Conecta el chatbot siguiendo [`docs/chatbot.md`](docs/chatbot.md).

## Bot de WhatsApp (Gaby) en el VPS

Gaby corre en Docker en el VPS. Despliegue completo: [`bot/DESPLIEGUE.md`](bot/DESPLIEGUE.md).

**Entrar a la terminal del VPS** (desde PowerShell o Git Bash en tu PC):

```bash
ssh root@178.238.238.7
```

Pide la contraseña: está en `.env.vps` en la raíz del repo (`VPS_PASSWORD`). Ese archivo es
solo tuyo, está ignorado por git y **no se sube nunca**. Si no lo tienes, créalo así:

```bash
VPS_HOST=178.238.238.7
VPS_USUARIO=root
VPS_PASSWORD=
```

Ya dentro, todo se corre desde la carpeta del bot:

```bash
cd /opt/inversiones-js/bot
```

| Para… | Comando |
|---|---|
| Ver los logs | `docker compose logs -f --tail 100 gaby` (Ctrl+C para salir) |
| Ver los números de asesores que usa Gaby | `docker compose exec gaby printenv ASESOR_NUMEROS` |
| Ver los asesores del archivo `.env` | `grep ASESOR_NUMEROS .env` |
| Aplicar un cambio del `.env` | `docker compose up -d gaby` |
| Encender / apagar / ver estado | `./scripts/gaby.sh on` · `./scripts/gaby.sh off` · `./scripts/gaby.sh estado` |
| Salir del VPS | `exit` |

### Mejoras recomendadas después

- **App Check** (reCAPTCHA Enterprise) para que solo la web del panel pueda llamar a Firestore y
  Auth con la API key del proyecto.
- Alertas de presupuesto en Google Cloud (Facturación › Presupuestos).
- Exportaciones programadas de Firestore como respaldo.
