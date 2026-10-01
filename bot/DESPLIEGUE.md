# Despliegue de Gaby (bot de WhatsApp) en el VPS

Pasos A–E: preparación (Google + VPS). Pasos F–I: levantar el bot y vincular el número.

## A. Clave JSON `chatbot-lectura` (Google Cloud)

1. Entra a https://console.cloud.google.com con la cuenta dueña del proyecto de Firebase del panel.
   Arriba, selecciona **el mismo proyecto** que usa el panel.
2. Menú ☰ › **IAM y administración › Cuentas de servicio › + Crear cuenta de servicio**.
   - Nombre: `chatbot-lectura` → Crear y continuar.
   - Rol: **Cloud Datastore Viewer** (busca "Datastore Viewer") → Continuar → Listo.
3. Abre la cuenta recién creada › pestaña **Claves › Agregar clave › Crear clave nueva › JSON**.
   Se descarga un archivo `.json`. **No lo pegues en el chat ni lo subas a git.**
4. Copia el correo de la cuenta (algo como `chatbot-lectura@TU-PROYECTO.iam.gserviceaccount.com`).
5. Menú ☰ › **APIs y servicios › Biblioteca** › busca **Google Calendar API** › **Habilitar**.

## B. Calendario de citas (Google Calendar)

1. En https://calendar.google.com con la cuenta del negocio: a la izquierda, "Otros calendarios" › **+ › Crear calendario**.
   Nombre: `Citas Gaby`. (Puedes usar el principal, pero uno aparte es más ordenado.)
2. Configuración de ese calendario › **Compartir con determinadas personas › + Agregar** →
   pega el correo de `chatbot-lectura` con permiso **"Hacer cambios en los eventos"**.
3. Más abajo, en **Integrar el calendario**, copia el **ID del calendario**
   (`xxxxx@group.calendar.google.com`). Lo necesitas en el paso D.

## C. Subir la clave al VPS (desde tu PC, en la carpeta donde se descargó)

```bash
ssh root@178.238.238.7 "mkdir -p /opt/gaby-secretos && chmod 700 /opt/gaby-secretos"
scp NOMBRE-DEL-ARCHIVO.json root@178.238.238.7:/opt/gaby-secretos/google.json
```

## D. Preparar el VPS para bajar el repo (en el VPS: `ssh root@178.238.238.7`)

```bash
ssh-keygen -t ed25519 -N "" -f ~/.ssh/deploy_inversiones -C "vps-inversiones"
cat ~/.ssh/deploy_inversiones.pub
```

Copia lo que imprime y agrégalo en GitHub: repo `Fockus26/inversiones-js` › **Settings › Deploy keys
› Add deploy key** (solo lectura, sin marcar "Allow write access").

```bash
cat >> ~/.ssh/config <<'CFG'
Host github-inversiones
  HostName github.com
  User git
  IdentityFile ~/.ssh/deploy_inversiones
CFG
git clone -b claude/amazing-curie-wc20yt git@github-inversiones:Fockus26/inversiones-js.git /opt/inversiones-js
```

Y verifica cómo están Evolution y su red (mándame la salida si algo no cuadra):

```bash
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
docker network ls
docker inspect evolution_api --format '{{json .NetworkSettings.Networks}}' | head -c 400; echo
```

## E. Teléfono del negocio

Instala **WhatsApp Business** (o WhatsApp normal) en el teléfono con la SIM y deja la cuenta activa,
con foto de perfil y nombre "Inversiones JS". El bot se conecta como **dispositivo vinculado**:
el teléfono sigue funcionando normal.

## F. Red compartida con Evolution API

Gaby y Evolution se hablan por la red Docker `automation-net`. Si en el paso D viste que
`evolution_api` **no** está en `automation-net`, conéctala (una sola vez):

```bash
docker network create automation-net 2>/dev/null || true
docker network connect --alias evolution-api automation-net evolution_api
```

> Para que sobreviva a un `docker compose up` de Evolution, agrega también en su
> `docker-compose.yml` el servicio a `networks: [automation-net]` con `external: true`.

## G. Configurar y levantar el bot

```bash
cd /opt/inversiones-js/bot
cp .env.example .env
nano .env
```

Completa:

- `EVOLUTION_API_KEY` = la `AUTHENTICATION_API_KEY` de Evolution (la que ya guardaste).
- `WEBHOOK_TOKEN` = el resultado de `openssl rand -hex 16`.
- `GOOGLE_CALENDAR_ID` = el ID del calendario del paso B.
- `ASESOR_NUMEROS` = número(s) que reciben los avisos (`58412…`, separados por coma). **No pongas
  el mismo número del bot.**

```bash
docker compose up -d --build
docker compose logs -f gaby      # debe decir "Gaby escuchando en :3000 …"  (Ctrl+C para salir)
```

`restart: unless-stopped` la mantiene siempre arriba: si se cae o se reinicia el VPS, Docker la
vuelve a levantar sola.

## H. Vincular el número del negocio

```bash
cd /opt/inversiones-js/bot
./scripts/vincular.sh 58412XXXXXXX     # el número de la SIM, con 58, sin + ni espacios
```

Te imprime un **código de 8 caracteres**. En el teléfono del negocio: WhatsApp › ⋮ (o Configuración)
› **Dispositivos vinculados › Vincular un dispositivo › Vincular con el número de teléfono** e
ingresa el código. Comprueba:

```bash
curl -s -H "apikey: $(grep ^EVOLUTION_API_KEY .env | cut -d= -f2)" \
  http://localhost:8080/instance/connectionState/inversiones-js
# → "state":"open"
```

## I. Probar

Desde **otro** teléfono escribe "Hola" al número del negocio. Gaby responde en 3–10 s
(simula que escribe). Mira lo que pasa con `docker compose logs -f gaby`.

## Uso diario

| Para… | Comando (en `/opt/inversiones-js/bot`) |
|---|---|
| Ver logs | `docker compose logs -f --tail 100 gaby` |
| Actualizar a la última versión | `git pull && docker compose up -d --build` |
| Reiniciar | `docker compose restart gaby` |
| Estado del número | `curl -s -H "apikey: …" http://localhost:8080/instance/connectionState/inversiones-js` |

## Cuidar el número (riesgo de baneo)

Ya incluido en el bot: pausa aleatoria con "escribiendo…", marca leído antes de responder, 5
redacciones distintas de cada mensaje, solo responde a quien escribe primero, ignora grupos y el
historial viejo, y espacia los recordatorios.

Lo que te toca a ti:

- **No hagas pruebas en ráfaga.** En la demo, conversaciones normales desde 1–2 teléfonos.
- Usa el teléfono del negocio también a mano (mensajes reales, entrantes y salientes).
- Nada de mensajes masivos ni a gente que no escribió primero.
- No desvincules y vuelvas a vincular seguido; deja la instancia quieta en el VPS.
- Ten un número de respaldo pensado por si acaso.
