# Se construye desde la raíz del repo: el bot usa carpetas de lib/ del panel. Cada carpeta
# que importe bot/src tiene que estar aquí (lo comprueba bot/tests/dockerfile.test.ts).
FROM oven/bun:1-slim
ENV NODE_ENV=production TZ=America/Caracas
WORKDIR /app
COPY lib/catalogo ./lib/catalogo
COPY lib/financiamiento ./lib/financiamiento
COPY lib/horario ./lib/horario
COPY lib/notificaciones ./lib/notificaciones
COPY lib/rcv ./lib/rcv
COPY lib/solicitudes ./lib/solicitudes
COPY bot/package.json bot/bun.lock ./bot/
WORKDIR /app/bot
RUN bun install --frozen-lockfile --production
COPY bot/src ./src
EXPOSE 3000
CMD ["bun", "src/servidor.ts"]
