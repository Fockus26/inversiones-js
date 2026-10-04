// pm2: `pm2 start ecosystem.config.cjs`. Lee las variables de .env (Node 20.6+).
module.exports = {
  apps: [
    {
      name: "chatbot",
      script: "dist/index.js",
      node_args: "--env-file=.env",
      instances: 1, // NUNCA más de una: dos instancias se pelean la sesión de WhatsApp
      autorestart: true,
      max_restarts: 10,
      min_uptime: "60s",
      restart_delay: 10000,
      time: true,
    },
  ],
};
