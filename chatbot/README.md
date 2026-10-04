# Chatbot de WhatsApp — Inversiones JS

Bot que responde por WhatsApp con el catálogo que el cliente edita en el panel. Lee la
colección `productos` de Firestore (contrato en [`../docs/chatbot.md`](../docs/chatbot.md)) y
se conecta a WhatsApp con [Baileys](https://github.com/WhiskeySockets/Baileys) como
**dispositivo vinculado** del teléfono (igual que WhatsApp Web), así que el teléfono sigue
funcionando normal.

> ⚠️ Baileys **no es la API oficial** de WhatsApp: usarlo va contra sus términos y siempre hay
> riesgo de restricción. Las reglas de abajo lo reducen, no lo eliminan. Si el volumen crece,
> la salida segura es la API oficial (WhatsApp Cloud API de Meta).

## El flujo

| El cliente escribe | El bot responde |
|---|---|
| Primer mensaje, "hola", "menu", "info" | Saludo + menú (1 lista · 2 modelo · 3 asesor) |
| `1`, "lista", "precios" | La lista completa en el formato del cliente. Si la pidió hace < 5 min, le dice que está arriba |
| `2` | Le pide el nombre del modelo |
| Un modelo: "cuánto está el note 15" | Las dos líneas de ese modelo (`Inic 80$.   6 quincenas 40$`) y "escribe 3 para apartarlo" |
| `3`, "asesor", "comprar", "apartar" | "Un asesor te escribe en breve", **el bot se calla en ese chat** (12 h) y te avisa a `NUMERO_AVISOS` |
| "ok", "dale", "listo" | Nada |
| Algo que no entiende | "No encontré ese modelo…" **una vez** cada 10 min; si no, silencio |
| Foto, audio o sticker (con la conversación empezada) | Nada: lo ve una persona |

- **Si tú escribes desde el teléfono** en un chat, el bot se calla en ese chat 12 h
  (`HORAS_PAUSA`): no se mete en conversaciones que llevas tú.
- Junta los mensajes seguidos del cliente (3,5 s) y responde una sola vez.
- Solo chats privados: ignora grupos, estados, difusiones y canales.
- Al reconectar no contesta mensajes viejos.
- Los textos están en [`src/textos.ts`](src/textos.ts); el flujo en [`src/flujo.ts`](src/flujo.ts)
  (puro, con tests).

## Instalación en el VPS (Ubuntu 22.04/24.04)

No hace falta abrir puertos: el bot solo hace conexiones de salida.

### 1. Preparar el servidor (una vez)

```bash
ssh root@IP_DEL_VPS

# Usuario sin privilegios para el bot
adduser bot && usermod -aG sudo bot
su - bot

sudo apt update && sudo apt install -y git curl unzip
sudo timedatectl set-timezone America/Caracas

# Node 22 (corre el bot) y bun (instala y compila)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
bun add -g pm2

node -v   # v22.x
bun -v
pm2 -v
```

### 2. Traer el código (repo privado → deploy key de solo lectura)

```bash
ssh-keygen -t ed25519 -C "vps-chatbot" -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub
```

Copia esa línea en GitHub › `Fockus26/inversiones-js` › Settings › Deploy keys › Add deploy key
(sin "Allow write access"). Luego:

```bash
git clone git@github.com:Fockus26/inversiones-js.git
cd inversiones-js/chatbot
bun install
bun run build
```

### 3. Clave de Firestore de solo lectura

Crea la cuenta de servicio `chatbot-lectura` con rol **Cloud Datastore Viewer** y descarga su
JSON (pasos en [`../docs/chatbot.md`](../docs/chatbot.md#credenciales-cuenta-de-servicio-de-solo-lectura-d024)).
Desde **tu PC** súbela al VPS:

```bash
# en tu PC
scp chatbot-lectura.json bot@IP_DEL_VPS:~/
```

```bash
# en el VPS
mkdir -p ~/claves && mv ~/chatbot-lectura.json ~/claves/ && chmod 600 ~/claves/chatbot-lectura.json
```

### 4. Configurar

```bash
cp .env.example .env
nano .env
```

Para la primera prueba:

```bash
GOOGLE_APPLICATION_CREDENTIALS=/home/bot/claves/chatbot-lectura.json
NUMERO_BOT=584121234567        # el número del bot: código de país + número, sin + ni 0
NUMERO_AVISOS=584147654321     # tu número personal (avisos de "asesor")
SOLO_NUMEROS=584147654321      # mientras pruebas: solo te responde a ti
MAX_POR_HORA=30                # bajo la primera semana
```

### 5. Vincular el número (una sola vez)

```bash
node --env-file=.env dist/index.js
```

Imprime un **código de 8 caracteres**. En el teléfono del bot: WhatsApp › ⋮ (o Configuración) ›
**Dispositivos vinculados** › **Vincular un dispositivo** › **Vincular con el número de
teléfono** › escribe el código. Cuando salga `[bot] conectado ✅`, corta con `Ctrl+C`.

(Si prefieres QR, deja `NUMERO_BOT` vacío: el QR sale en la terminal; agranda la ventana.)

La sesión queda en `datos/sesion/`. **Es el acceso a la cuenta:** no la copies ni la subas.

### 6. Dejarlo corriendo con pm2

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup          # imprime un comando con sudo: cópialo y ejecútalo
pm2 logs chatbot     # ver qué hace (Ctrl+C para salir de los logs)
```

Comandos del día a día:

```bash
pm2 status
pm2 logs chatbot --lines 100
pm2 restart chatbot
pm2 stop chatbot                 # apagar el bot ya (p. ej. si WhatsApp avisa de algo raro)

# actualizar el código
cd ~/inversiones-js && git pull && cd chatbot && bun install && bun run build && pm2 restart chatbot
```

### 7. Probar el flujo

Con `SOLO_NUMEROS` = tu número personal, escríbele al número del bot desde tu teléfono:

1. `hola` → saludo con el menú.
2. `1` → lista de precios. `1` otra vez → "te la envié arriba".
3. `cuanto esta el note 15` → solo ese modelo.
4. En el panel cambia la cantidad o el precio de ese modelo; espera 1 minuto y repite el 3:
   debe salir el valor nuevo.
5. `3` → "un asesor te escribe" y te llega el aviso. Escribe `hola` otra vez: el bot ya no
   responde en ese chat (pausa de 12 h).
6. Desde el teléfono del bot, contesta a mano en otro chat de prueba: el bot se calla ahí.

Para quitar una pausa de prueba: `pm2 stop chatbot`, borra `datos/chats.json`, `pm2 start chatbot`.

Cuando todo esté bien, vacía `SOLO_NUMEROS` en `.env` y `pm2 restart chatbot`.

### Si se cae la sesión

- Log `la sesión se cerró desde el teléfono`: cerraste el dispositivo vinculado (o WhatsApp lo
  cerró). `pm2 stop chatbot && rm -rf datos/sesion`, repite el paso 5 y `pm2 start chatbot`.
- Log `otra instancia del bot tomó la sesión`: hay dos bots corriendo con la misma sesión
  (otro VPS, tu PC). Deja uno solo.
- Log `403` / aviso de cuenta suspendida en el teléfono: `pm2 stop chatbot` **ya**, no
  vuelvas a vincular enseguida y sigue las reglas de abajo.
- El teléfono tiene que conectarse a internet al menos cada 14 días o WhatsApp desvincula
  los dispositivos.

## Reglas para evitar el baneo

Lo que más banea es que **la gente te bloquee o te reporte**, y que el número **se comporte
como un robot** (muchos mensajes, rápidos, iguales, a gente que no te escribió).

**Lo que el bot ya hace solo:** responde solo a quien le escribe (nunca inicia), simula
"escribiendo…" con pausas al azar, envía de a un mensaje, no aparece "en línea" todo el día,
junta mensajes seguidos, tiene topes por chat y por hora, no contesta grupos ni mensajes
viejos, y se calla cuando intervienes tú.

**Lo que depende de ti:**

1. **Calentamiento.** 2–3 días con 2 conversaciones es poco. Ideal: 1–2 semanas de uso normal
   antes de automatizar a todo el mundo: foto de perfil, nombre, descripción, horario
   (mejor en **WhatsApp Business**), conversaciones reales de ida y vuelta, que te agreguen
   como contacto. Mientras tanto usa `SOLO_NUMEROS` y luego ábrelo con `MAX_POR_HORA=30` la
   primera semana.
2. **Nunca envíes masivos** desde este número: nada de difusiones, listas de números, "buenos
   días a todos" ni mensajes a gente que no te escribió primero. Ni con el bot ni a mano.
3. **SIM física y activa**, no números virtuales/VoIP. El teléfono encendido, con internet y
   con WhatsApp actualizado; no desinstales la app.
4. **Una sola instancia**, en un solo VPS, siempre la misma. No vincules y desvincules
   seguido, no cambies de servidor/IP cada rato, no lo corras a la vez en tu PC.
5. **Cuidado con los enlaces** en los primeros mensajes, sobre todo acortadores (bit.ly…).
   Este bot no manda enlaces; si los agregas a `src/textos.ts`, que sean del dominio propio.
6. **Atiende rápido a quien pide asesor.** Un cliente ignorado bloquea; un bloqueo pesa mucho.
7. **Si alguien pide que no le escriban, no le escribas más.** No agregues gente a grupos.
8. **Si WhatsApp avisa** ("cuenta suspendida temporalmente", te cierra la sesión): para el
   bot, espera a que se levante la restricción, usa el número a mano unos días y vuelve con
   topes más bajos. Si fue un baneo, pide revisión desde la app.
9. **No subas los topes** (`MAX_POR_CHAT_10MIN`, `MAX_POR_HORA`) ni bajes las pausas de
   `src/envio.ts` para "responder más rápido".

## Probar en tu PC contra el emulador (sin tocar datos reales)

```bash
# en la raíz del repo, dos terminales
bun run emulators
bun run seed:emulador

# en chatbot/, con .env que tenga FIRESTORE_EMULATOR_HOST=127.0.0.1:8080,
# FIREBASE_PROJECT_ID=demo-inversiones-js y sin GOOGLE_APPLICATION_CREDENTIALS
bun run dev
```

Ojo: si vinculas el número en tu PC y luego en el VPS, son dos sesiones; desvincula la de la PC
(Dispositivos vinculados) antes de arrancar el VPS.

## Desarrollo

```bash
bun run typecheck
bun run test       # flujo y búsqueda (tests/)
bun run build      # dist/index.js (node)
```
