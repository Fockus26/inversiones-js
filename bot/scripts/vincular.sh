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
  \"number\": \"$NUMERO\",
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
CODIGO=""
for intento in 1 2 3; do
  RESP=$(curl -s "${H[@]}" "$EVO/instance/connect/$INST?number=$NUMERO")
  CODIGO=$(echo "$RESP" | grep -o '"pairingCode":"[^"]*"' | cut -d'"' -f4 || true)
  [ -n "$CODIGO" ] && break
  sleep 3
done

echo
if [ -n "$CODIGO" ]; then
  echo "  CÓDIGO: $CODIGO"
  echo "  En el teléfono del negocio: WhatsApp › ⋮ › Dispositivos vinculados › Vincular un dispositivo"
  echo "  › 'Vincular con el número de teléfono' e ingresa el código."
else
  # Algunas versiones de Evolution no dan código: se muestra el QR en la terminal.
  QR=$(echo "$RESP" | grep -o '"code":"[^"]*"' | cut -d'"' -f4 || true)
  if [ -n "$QR" ] && command -v qrencode >/dev/null; then
    echo "  Evolution no dio código. Escanea este QR YA (vence en ~40 s; si vence, corre el script otra vez):"
    echo "  WhatsApp › ⋮ › Dispositivos vinculados › Vincular un dispositivo › apunta la cámara."
    echo
    echo "$QR" | qrencode -t ansiutf8
  elif [ -n "$QR" ]; then
    echo "  Evolution no dio código. Instala qrencode para ver el QR aquí y repite:"
    echo "    apt install -y qrencode && ./scripts/vincular.sh $NUMERO"
  else
    echo "  Evolution no dio código ni QR. Respuesta:"
    echo "$RESP" | head -c 500; echo
  fi
fi
echo
echo "Después comprueba:  curl -s -H \"apikey: \$EVOLUTION_API_KEY\" $EVO/instance/connectionState/$INST"
