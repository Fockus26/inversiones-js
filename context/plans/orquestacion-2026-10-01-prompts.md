# Prompts por unidad — orquestación 2026-10-01

Carpeta principal: `C:\Users\Admin\Documents\Work\inversiones-js`.
Brief común: `context/plans/orquestacion-2026-10-01.md` (léelo primero, entero).

---

## W1 — `feat/auth-login`

Eres el worker **W1**. Decisiones: `context/decisions/02-auth.md`, rango **D010–D014**.
Filas de CONTENT_CHECKLIST: **4–6**. Te condicionan D003 (acceso por `admins/{uid}` en reglas)
y D004 (SDK cliente + emulador): `grep -A6 "^# D003\|^# D004" context/decisions/01-base.md`.

### Qué pide el dueño
> "debemos asegurarnos de que haya un panel de login para impedir que otros puedan entrar"

### Dónde está
- `app/login/page.tsx` — placeholder (solo un h1).
- `app/(panel)/layout.tsx` — placeholder: `<main>` sin protección. Envuelve `/productos` (W2).
- `lib/firebase/client.ts` — `firebaseAuth()`, `firestore()`.
- `lib/catalogo/tipos.ts:17` — `COLECCION_ADMINS = "admins"`.
- `firestore.rules` — reglas definitivas; `admins/{uid}` legible solo por su dueño.
- `scripts/seed-emulador.ts` — `CUENTAS_EMULADOR.admin` (es admin) y `.sinAcceso` (no lo es).

### Enfoque decidido
- `lib/auth/`: un `SesionProvider` cliente (`onAuthStateChanged` + `getDoc(admins/{uid})`) que
  expone `{ estado: "cargando" | "fuera" | "sin-acceso" | "admin", usuario, salir() }` y un hook
  `useSesion()`. Montarlo en `app/(panel)/layout.tsx` y en `/login` (no en el layout raíz).
- `app/(panel)/layout.tsx` (cliente): `cargando` → skeleton de cabecera + contenido;
  `fuera` → `router.replace("/login?siguiente=<ruta>")`; `sin-acceso` → `signOut` y a `/login`
  con aviso "Esta cuenta no tiene acceso al panel"; `admin` → cabecera + `children`.
- Cabecera (`components/panel/cabecera.tsx`): fondo `bg-sidebar` (tinta) con el nombre
  "Inversiones JS" y una barra/chip amarillo, correo del usuario (truncado en móvil),
  conmutador de tema (claro/oscuro/sistema) y botón "Cerrar sesión". En 320 px no desborda.
- `/login`: tarjeta centrada con logo-texto, correo + contraseña (`autocomplete` correctos,
  mostrar/ocultar contraseña), botón "Entrar" con estado de carga y anti doble clic,
  "¿Olvidaste tu contraseña?" → `sendPasswordResetEmail` con mensaje neutro (no revelar si el
  correo existe). Si ya es admin, redirige a `siguiente` (solo rutas internas que empiecen por
  `/` y no `//`) o a `/productos`. **Sin** registro.
- Errores de Firebase traducidos (`auth/invalid-credential`, `auth/too-many-requests`,
  `auth/network-request-failed`, `auth/user-disabled`, genérico). Mensajes en `role="alert"`.
- `tests/rules/reglas.test.ts` con `@firebase/rules-unit-testing` contra el **emulador ya
  corriendo** (127.0.0.1:8080) usando un `projectId` propio `demo-reglas-w1` (las reglas se
  cargan por proyecto: no pisa al de desarrollo). Casos: anónimo no lee productos; usuario sin
  doc admin no lee ni escribe; admin lee, crea y actualiza con huella válida; update sin
  `actualizadoEn == request.time` falla; campo extra falla; `cantidad` negativa o decimal
  falla; `marca` fuera de lista falla; nadie escribe en `admins`; usuario lee solo su propio
  `admins/{uid}`. `bun run emulators:test` ya apunta a `tests/rules`. Si `rules-unit-testing`
  no corre bajo `bun test`, prueba con node y ajusta el script; dilo en el PR.

### Trampas conocidas
- Next 16: lee `node_modules/next/dist/docs/` para `useSearchParams` (necesita `<Suspense>` en
  build) y la navegación de cliente antes de escribir.
- El guard del front no es seguridad: la barrera son las reglas. No metas `middleware` ni
  cookies de sesión: no hay servidor que las verifique (D004).
- `components/ui/` no se edita.
- W2 renderiza dentro de tu layout: no le pongas `max-w` estrecho ni padding grande; deja
  `<main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">` como está.

### Cómo verificar
- Con el server en tu puerto: sin sesión, `/productos` lleva a `/login?siguiente=%2Fproductos`;
  login con la cuenta admin → `/productos` con cabecera; recargar mantiene sesión; "Cerrar
  sesión" → `/login`; la cuenta sin acceso ve el aviso y queda fuera; contraseña mala → error
  legible; `siguiente=//evil.com` no redirige fuera.
- a11y: claro y oscuro, 320 px, todo por teclado, foco visible (verde azulado en claro).
- `bun run emulators:test` en verde.

### Cierre
Changeset: ninguno. En el PR, "Decisión tomada / alternativa" para: dónde vive el provider,
textos de error. Acciones manuales (para la guía de W3, solo nómbralas): desactivar el alta
pública de usuarios en la consola, crear la cuenta del cliente.

---

## W2 — `feat/catalogo-crud`

Eres el worker **W2**. Decisiones: `context/decisions/03-catalogo.md`, rango **D015–D019**.
Filas de CONTENT_CHECKLIST: **7–9**. Te condicionan D001 (paleta), D002 (modelo):
`grep -A8 "^# D001\|^# D002" context/decisions/01-base.md`. Lee `context/DESIGN_RULES.md`.

### Qué pide el dueño
> "el quiere poder cambiar el nombre, precio y cantidad de sus productos, el tiene un catalogo"

Entiendo "precio" = inicial **y** cuota quincenal (la lista los da juntos: "Inic 125$. 6
quincenas 63$"), más el número de cuotas. Y además crear, ocultar (activo) y borrar productos.

### Dónde está
- `app/(panel)/productos/page.tsx` — placeholder. Ya va dentro del layout del panel (W1 le pone
  el guard; tú no lo tocas). Durante tu desarrollo el layout aún NO tiene guard: tu página
  debe funcionar igual cuando haya usuario (para probar, inicia sesión desde tu propia página
  de depuración o con `signInWithEmailAndPassword` en la consola del navegador usando
  `CUENTAS_EMULADOR.admin`; no lo dejes en el código).
- `lib/catalogo/tipos.ts` — `Producto`, `ProductoConId`, `CamposEditables`, `MARCAS`.
- `firestore.rules:20-50` — validación que tu escritura debe cumplir (keys permitidas, tipos,
  `numeroCuotas`/`cantidad` enteros, huella `actualizadoPor` + `actualizadoEn`).
- Emulador ya tiene los 23 productos del seed.

### Enfoque decidido
- `lib/catalogo/repositorio.ts`: `escucharProductos(cb)` con `onSnapshot` ordenado por
  `marca`, `orden` (si pide índice compuesto, ordena en cliente); `crearProducto`,
  `actualizarProducto(id, cambios)` (siempre agrega `actualizadoPor: uid`,
  `actualizadoEn: serverTimestamp()`), `borrarProducto`. Convierte `Timestamp` → `Date`.
- `lib/catalogo/validacion.ts` puro (sin Firebase) + tests en `tests/unit/`: parsea entradas
  ("125", "125,50", "125$", " 63 ") a número; `cantidad` y `numeroCuotas` enteros ≥ 0/≥ 1;
  nombre 1–80; variante ≤ 20 con patrón sugerido `N/N`. Mismos límites que las reglas.
- UI `/productos` **mobile-first**:
  - Barra superior: buscador (nombre/variante), filtro por marca (chips con contador, amarillo
    el activo), resumen "23 productos · 3 agotados".
  - Agrupado por marca. Desktop (≥ md): tabla con Producto, Inicial, Cuota (6 × 63$), Cantidad,
    Estado, acciones. Móvil: tarjetas.
  - **Edición rápida de cantidad** con stepper −/+ e input numérico (es lo que más cambiará);
    guarda con debounce o al salir, con estado "Guardando…/Guardado" (texto + ícono, no solo
    color) y rollback + toast si falla.
  - Botón "Editar" → diálogo con todos los campos editables (marca, nombre, variante, inicial,
    cuota, número de cuotas, cantidad, activo). Validación en línea, errores con
    `aria-describedby`. "Nuevo producto" usa el mismo diálogo.
  - Borrar con `alert-dialog` de confirmación que nombra el producto. Sugiere "Ocultar"
    (activo=false) como alternativa en el texto.
  - Estados: carga (skeleton), vacío, error de permisos ("Tu sesión no tiene acceso"),
    sin resultados de búsqueda. `Agotado` (cantidad 0) con badge de texto.
  - Formato de montos `125$` (como el cliente); decimales solo si los hay.
  - Muestra "Actualizado hace X" por fila o en el diálogo (de `actualizadoEn`).

### Trampas conocidas
- La regla exige `actualizadoEn == request.time`: usa `serverTimestamp()`, no `new Date()`.
- `cantidad` y `numeroCuotas` deben llegar como **enteros** (`Math.trunc` tras validar): un
  `3.0` de JS es entero, pero `"3"` (string) falla la regla.
- Los productos del seed tienen `actualizadoPor: "seed"`: tu update lo sobrescribe, bien.
- No toques `app/(panel)/layout.tsx` (W1) ni `components/ui/`.
- Datos compartidos con otros workers: tus productos de prueba empiezan por `W2 prueba` y los
  borras al terminar; no borres los del seed.

### Cómo verificar
- Con el server en tu puerto y sesión de admin en el emulador: editar cantidad desde móvil
  (375 px) y desktop; editar precio en el diálogo y ver el cambio en la UI del emulador
  (:4000) y en otra pestaña en vivo; crear y borrar un `W2 prueba`; entrada inválida muestra
  error y no escribe; sin sesión la página muestra el estado de error (no se cuelga).
- Tests de `validacion.ts`. a11y: claro/oscuro, 320 px, teclado (stepper y diálogo).

### Cierre
Changeset: ninguno. En el PR, "Decisión tomada / alternativa" para: guardado de cantidad
(debounce vs botón), tabla vs tarjetas. Acciones manuales: ninguna.

---

## W3 — `feat/chatbot-produccion`

Eres el worker **W3**. Decisiones: `context/decisions/04-chatbot.md`, rango **D020–D024**.
Filas de CONTENT_CHECKLIST: **10–12**. Te condicionan D002 (modelo), D003 (acceso), D005
(chatbot lee Firestore directo): `grep -A8 "^# D00[235]" context/decisions/01-base.md`.

### Qué pide el dueño
> "Necesito crear un panel administrativo para un cliente al que le tengo un chatbot [...]
> el proyecto utilizara firebase."

Tu unidad es el puente con el chatbot y el paso a producción; no hay UI.

### Dónde está
- `lib/catalogo/tipos.ts`, `lib/catalogo/catalogo-inicial.ts` — modelo y lista del 29/09.
- `scripts/seed-emulador.ts` — patrón de script con `firebase-admin` (solo emulador).
- `firestore.rules`, `firebase.json`, `.env.example`.
- `README.md` — el de create-next-app: reemplázalo.

### Enfoque decidido
- `lib/catalogo/texto-lista.ts` (puro, sin Firebase): `textoListaDePrecios(productos, fecha)`
  que genera el texto que el cliente ya manda por chat, mismo formato:
  `Lista de precios actualizada (DD/MM)`, bloque por marca en mayúsculas, por producto
  `<nombre> <variante>` y `Inic 125$.   6 quincenas 63$`. Omite `activo == false`; marca o
  excluye `cantidad == 0` según un parámetro `{ agotados: "ocultar" | "marcar" }` (por defecto
  `"marcar"` → sufijo ` (agotado)`). Tests en `tests/unit/` incluido un snapshot del catálogo
  inicial que coincida con la lista del cliente (salvo normalizaciones de nombre).
- `docs/chatbot.md`: contrato de datos (campos, tipos, qué significa cada uno, qué NO cambiar),
  cómo leer desde el servidor del chatbot con `firebase-admin` (cuenta de servicio con permiso
  mínimo de lectura de Firestore — rol `roles/datastore.viewer`), consulta
  `where("activo","==",true)`, ejemplo de uso de `textoListaDePrecios` o de búsqueda por
  modelo, y suscripción en vivo opcional (`onSnapshot`) vs leer por mensaje (recomienda caché
  corta). Nota: el chatbot no puede usar el SDK web sin sesión: las reglas lo bloquean (D003).
- `scripts/crear-admin.ts`: `bun scripts/crear-admin.ts <correo>` crea (o encuentra) el usuario
  en Firebase Auth con contraseña temporal aleatoria que **imprime una sola vez**, y crea
  `admins/{uid}`. Funciona contra emulador (si `FIRESTORE_EMULATOR_HOST`) o producción (con
  `GOOGLE_APPLICATION_CREDENTIALS`), y en producción pide `--prod` explícito.
- `scripts/seed-produccion.ts`: carga `CATALOGO_INICIAL` en producción, `--prod` obligatorio,
  **no sobrescribe** documentos que ya existan (para no pisar ediciones del cliente) salvo
  `--forzar`; imprime resumen.
- `package.json`: scripts `admin:crear` y `seed:produccion` (cambio mínimo).
- `README.md` en español: qué es, desarrollo local (emuladores, seed, cuentas de prueba: remite
  al archivo, no copies contraseñas), y **guía de puesta en producción** paso a paso: crear
  proyecto Firebase, habilitar Auth correo/contraseña, **desactivar el alta de usuarios desde el
  cliente** (Auth › Configuración › Acciones del usuario), crear Firestore, `bunx firebase
  deploy --only firestore:rules --project <id>`, cuenta de servicio (dónde guardarla, nunca en
  git), `seed:produccion`, `admin:crear`, variables en Vercel, dominio autorizado en Auth.
  Recomienda App Check como mejora posterior.

### Trampas conocidas
- No hay proyecto Firebase real: verifica los scripts contra el **emulador ya corriendo**
  (no arranques otro). `crear-admin` contra el emulador con un correo `w3-prueba@inversiones.test`.
- `seed-produccion` sin `--forzar` no debe tocar lo existente: pruébalo contra el emulador
  (que ya tiene el seed) cambiando el host y un `projectId` demo propio, p. ej. `demo-w3` (para
  no pisar los datos de W1/W2). Añade una forma de forzar emulador (`--emulador`) para eso.
- No imprimas ni commitees credenciales. `service-account*.json` ya está en `.gitignore`.

### Cómo verificar
- `bun run test` con los tests de `texto-lista`. Scripts ejecutados contra el emulador con
  salida pegada (sin contraseñas) en el PR.

### Cierre
Changeset: ninguno. En el PR, "Decisión tomada / alternativa" para: formato de agotados,
caché del chatbot. Acciones manuales: las de la guía (crear proyecto, cuenta de servicio,
desplegar reglas, crear la cuenta del cliente).
