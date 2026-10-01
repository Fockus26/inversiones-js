#!/usr/bin/env bash
# Crea la instancia de WhatsApp en Evolution, le apunta el webhook a Gaby y pide el código
# de vinculación. Uso (en el VPS, desde bot/):  ./scripts/vincular.sh 58412XXXXXXX
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a

NUMERO="${1:?Uso: ./scripts/vincular.sh 58412XXXXXXX (número del negocio, sin + ni espacios)}"
EVO="${EVOLUTION_LOCAL:-http://localhost:8080}"
INST="${EVOLUTION_INSTANCIA:-inversiones-js}"
H=(-H "apikey: $EVOLUTION_API_KEY" -H "Content-Type: application/json")
WEBHOOK="http://gaby:3000/webhook/$WEBHOOK_TOKEN"

echo "→ Creando instancia $INST (si ya existe, sigue)…"
curl -s "${H[@]}" -X POST "$EVO/instance/create" -d "{
  \"instanceName\": \"$INST\",
  \"integration\": \"WHATSAPP-BAILEYS\",
  \"qrcode\": true,
  \"groupsIgnore\": true,
  \"rejectCall\": false,
  \"alwaysOnline\": false,
  \"readMessages\": false,
  \"readStatus\": false,
  \"syncFullHistory\": false
}" | head -c 300; echo

echo "→ Apuntando el webhook a Gaby…"
curl -s "${H[@]}" -X POST "$EVO/webhook/set/$INST" -d "{
  \"webhook\": {
    \"enabled\": true,
    \"url\": \"$WEBHOOK\",
    \"byEvents\": false,
    \"base64\": false,
    \"events\": [\"MESSAGES_UPSERT\", \"CONNECTION_UPDATE\"]
  }
}" | head -c 300; echo

echo "→ Pidiendo código de vinculación para $NUMERO…"
RESP=$(curl -s "${H[@]}" "$EVO/instance/connect/$INST?number=$NUMERO")
CODIGO=$(echo "$RESP" | grep -o '"pairingCode":"[^"]*"' | cut -d'"' -f4 || true)
echo "$RESP" | grep -o '"base64":"[^"]*"' | cut -d'"' -f4 | sed 's/^data:image\/png;base64,//' | base64 -d > qr.png 2>/dev/null || true

echo
if [ -n "$CODIGO" ]; then
  echo "  CÓDIGO: $CODIGO"
  echo "  En el teléfono del negocio: WhatsApp › ⋮ › Dispositivos vinculados › Vincular un dispositivo"
  echo "  › 'Vincular con el número de teléfono' e ingresa el código."
else
  echo "  No llegó código de vinculación. Respuesta de Evolution:"
  echo "$RESP" | head -c 500; echo
fi
[ -s qr.png ] && echo "  (También se guardó qr.png por si prefieres escanear el QR.)"
echo
echo "Después comprueba:  curl -s -H \"apikey: \$EVOLUTION_API_KEY\" $EVO/instance/connectionState/$INST"
