/**
 * Servidor de QA contra los EMULADORES de Firebase — nunca contra el proyecto real.
 * Versión Firebase del `qa-local.ts` del kit (3.4.0), que asume Supabase en Docker.
 *
 * Uso (con node; Node ≥ 23.6):
 *   node scripts/qa-local.ts --port 4301            (= bun run qa:local -- --port 4301)
 *   node scripts/qa-local.ts --port 4301 --no-seed  (no recarga los datos de ejemplo)
 *
 * Qué hace:
 *   1. Si los emuladores no están ya escuchando, los levanta (`firebase emulators:start`,
 *      proyecto `demo-inversiones-js`; necesita Java). Se apagan al cerrar este script.
 *      Los emuladores arrancan vacíos: los datos son desechables.
 *   2. `seed-emulador.ts`: catálogo, póliza RCV, clientes de ejemplo y las cuentas de D014.
 *   3. Crea las cuentas de prueba de `.env.test.local` en el emulador de Auth:
 *        ADMIN_EMAIL_TEST / ADMIN_PASSWORD_TEST  → con `admins/{uid}` (acceso al panel)
 *        EMAIL_TEST / PASSWORD_TEST              → sin acceso (comprueba el rechazo)
 *        <ROL>_EMAIL_TEST / <ROL>_PASSWORD_TEST  → sin acceso; si aparece un rol nuevo,
 *                                                  adapta `asignarRol` abajo.
 *   4. Levanta `bun run dev -- --port <puerto>` con NEXT_PUBLIC_USE_EMULATORS=true y el
 *      proyecto demo-*, por process.env (en Next gana a `.env.local`): no escribe archivos.
 *
 * Seguro: se aborta si el proyecto no empieza por `demo-` (los emuladores con un proyecto
 * demo-* no pueden tocar recursos reales). Las contraseñas de prueba no se imprimen nunca.
 * Los correos de Auth (restablecer contraseña) no salen: el emulador los deja en su UI
 * (http://127.0.0.1:4000/auth) con el enlace.
 */

import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { connect } from "node:net";

const PROYECTO = "demo-inversiones-js";
const AUTH = "127.0.0.1:9099";
const FIRESTORE = "127.0.0.1:8080";

const args = process.argv.slice(2);
const puerto = args[args.indexOf("--port") + 1];
if (!args.includes("--port") || !/^\d+$/.test(puerto ?? "")) {
  console.error("Uso: node scripts/qa-local.ts --port <puerto> [--no-seed]");
  process.exit(2);
}
const sembrar = !args.includes("--no-seed");
if (!PROYECTO.startsWith("demo-"))
  throw new Error("La QA solo corre contra demo-*");

// 0. Chromium de Playwright (wave-qa lo necesita). En la nube viene instalado: no se baja.
try {
  const { chromium } = await import("@playwright/test");
  if (!existsSync(chromium.executablePath())) {
    if (process.env.CLAUDE_CODE_REMOTE === "true") {
      console.warn(
        "! El Chromium de Playwright no está donde lo espera (nube: no se descarga).",
      );
    } else {
      console.log(
        "… Falta el Chromium de Playwright: instalándolo (una vez por máquina)",
      );
      const r = spawnSync(
        process.execPath,
        ["node_modules/@playwright/test/cli.js", "install", "chromium"],
        { stdio: "inherit" },
      );
      if (r.status !== 0)
        console.warn(
          "! Falló: node node_modules/@playwright/test/cli.js install chromium",
        );
    }
  }
} catch {
  console.warn(
    "! El proyecto no tiene @playwright/test: wave-qa no podrá abrir un navegador.",
  );
}

function leerEnv(archivo: string): Record<string, string> {
  if (!existsSync(archivo)) return {};
  const salida: Record<string, string> = {};
  for (const linea of readFileSync(archivo, "utf8").split(/\r?\n/)) {
    const m = linea.match(
      /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/,
    );
    if (m) salida[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
  return salida;
}

function escuchando(hostPuerto: string): Promise<boolean> {
  const [host, p] = hostPuerto.split(":");
  return new Promise((ok) => {
    const s = connect(Number(p), host);
    s.once("connect", () => {
      s.end();
      ok(true);
    });
    s.once("error", () => ok(false));
  });
}

async function esperar(hostPuerto: string, segundos: number): Promise<void> {
  for (let i = 0; i < segundos; i++) {
    if (await escuchando(hostPuerto)) return;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(
    `El emulador en ${hostPuerto} no respondió en ${segundos} s (¿Java instalado?)`,
  );
}

const hijos: ChildProcess[] = [];
function lanzar(cmd: string, a: string[], env = process.env): ChildProcess {
  const h = spawn(cmd, a, {
    stdio: "inherit",
    env,
    shell: process.platform === "win32",
  });
  hijos.push(h);
  return h;
}
// En Windows `kill()` solo mata la shell intermedia y deja huérfano al Java del emulador.
function matarTodo(): void {
  for (const h of hijos) {
    if (h.pid === undefined || h.exitCode !== null) continue;
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/PID", String(h.pid), "/T", "/F"], {
        stdio: "ignore",
      });
    } else h.kill("SIGTERM");
  }
}
for (const s of ["SIGINT", "SIGTERM"] as const) {
  process.on(s, () => {
    matarTodo();
    process.exit(0);
  });
}

// 1. Emuladores.
const envEmulador = {
  ...process.env,
  FIRESTORE_EMULATOR_HOST: FIRESTORE,
  FIREBASE_AUTH_EMULATOR_HOST: AUTH,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: PROYECTO,
};
if ((await escuchando(AUTH)) && (await escuchando(FIRESTORE))) {
  console.log("= emuladores ya levantados");
} else {
  console.log("… firebase emulators:start");
  lanzar("bun", ["run", "emulators"]);
  try {
    await esperar(AUTH, 240);
    await esperar(FIRESTORE, 240);
  } catch (e) {
    matarTodo();
    throw e;
  }
}

// 2. Datos de ejemplo.
if (sembrar) {
  console.log("… seed-emulador");
  const seed = lanzar("bun", ["scripts/seed-emulador.ts"], envEmulador);
  const codigo = await new Promise<number | null>((r) => seed.on("exit", r));
  if (codigo !== 0) {
    matarTodo();
    throw new Error("seed-emulador falló");
  }
}

// 3. Cuentas de prueba. `Bearer owner` es la credencial de administrador del emulador.
const owner = {
  Authorization: "Bearer owner",
  "Content-Type": "application/json",
};

async function asignarRol(
  uid: string,
  email: string,
  rol: string,
): Promise<void> {
  if (rol !== "admin") return; // el resto de roles no tiene acceso al panel (D003)
  const url = `http://${FIRESTORE}/v1/projects/${PROYECTO}/databases/(default)/documents/admins/${uid}`;
  const r = await fetch(url, {
    method: "PATCH",
    headers: owner,
    body: JSON.stringify({ fields: { email: { stringValue: email } } }),
  });
  if (!r.ok) throw new Error(`No se pudo crear admins/${uid}: ${r.status}`);
}

const pruebas = leerEnv(".env.test.local");
const cuentas = Object.keys(pruebas)
  .map((k) => k.match(/^(?:([A-Z0-9_]+)_)?EMAIL_TEST$/))
  .filter((m): m is RegExpMatchArray => m !== null)
  .map((m) => {
    const prefijo = m[1] ? `${m[1]}_` : "";
    return {
      rol: m[1] ? m[1].toLowerCase() : "user",
      email: pruebas[`${prefijo}EMAIL_TEST`],
      password: pruebas[`${prefijo}PASSWORD_TEST`],
    };
  });

if (!cuentas.length) {
  console.warn(
    "! .env.test.local sin *_EMAIL_TEST: quedan solo las cuentas del seed (D014).",
  );
}
for (const c of cuentas) {
  if (!c.email || !c.password) {
    console.warn(
      `! rol ${c.rol}: falta el correo o la contraseña en .env.test.local; se salta`,
    );
    continue;
  }
  const r = await fetch(
    `http://${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROYECTO}/accounts`,
    {
      method: "POST",
      headers: owner,
      body: JSON.stringify({ email: c.email, password: c.password }),
    },
  );
  const cuerpo = (await r.json()) as {
    localId?: string;
    error?: { message: string };
  };
  if (r.ok && cuerpo.localId) {
    await asignarRol(cuerpo.localId, c.email, c.rol);
    console.log(`  + cuenta de prueba: rol ${c.rol}`);
  } else if (cuerpo.error?.message === "EMAIL_EXISTS") {
    console.log(`  = cuenta de prueba: rol ${c.rol} (ya existía)`);
  } else {
    throw new Error(
      `No se pudo crear la cuenta del rol ${c.rol}: ${r.status} ${cuerpo.error?.message}`,
    );
  }
}

// 4. Servidor apuntando a los emuladores.
console.log(
  `Emuladores: Auth ${AUTH} · Firestore ${FIRESTORE} · UI http://127.0.0.1:4000`,
);
console.log(`… bun run dev en el puerto ${puerto}`);
const dev = lanzar("bun", ["run", "dev", "--", "--port", puerto], {
  ...process.env,
  QA_LOCAL: "1",
  NEXT_PUBLIC_USE_EMULATORS: "true",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: PROYECTO,
  // El SDK exige una apiKey aunque el emulador no la valide; así no hace falta `.env.local`.
  NEXT_PUBLIC_FIREBASE_API_KEY: "demo-qa-local",
});
dev.on("exit", (code) => {
  matarTodo();
  process.exit(code ?? 0);
});
