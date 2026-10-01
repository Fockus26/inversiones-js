# Se construye desde la raíz del repo: el bot usa lib/catalogo y lib/horario del panel.
FROM oven/bun:1-slim
ENV NODE_ENV=production TZ=America/Caracas
WORKDIR /app
COPY lib/catalogo ./lib/catalogo
COPY lib/horario ./lib/horario
COPY bot/package.json bot/bun.lock ./bot/
WORKDIR /app/bot
RUN bun install --frozen-lockfile --production
COPY bot/src ./src
EXPOSE 3000
CMD ["bun", "src/servidor.ts"]
