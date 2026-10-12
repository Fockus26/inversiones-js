import { config } from "./config";
import {
  borrarEvento,
  correoCuentaServicio,
  crearEvento,
  leerCatalogo,
  leerHorario,
  ocupados,
  proyectoFirestore,
} from "./google";

/**
 * Comprueba todas las conexiones antes de vincular el número.
 * En el VPS: docker compose run --rm gaby bun src/diagnostico.ts
 */

let fallos = 0;
async function paso(
  nombre: string,
  prueba: () => Promise<string>,
  ayuda: string,
) {
  try {
    console.log(`✅ ${nombre}: ${await prueba()}`);
  } catch (e) {
    fallos++;
    console.log(
      `❌ ${nombre}: ${(e as Error).message.slice(0, 300)}\n   → ${ayuda}`,
    );
  }
}

console.log(`Cuenta de servicio: ${correoCuentaServicio}`);
console.log(`Proyecto Firestore: ${proyectoFirestore}\n`);

await paso(
  "Firestore (catálogo)",
  async () => {
    const p = await leerCatalogo();
    const conStock = p.filter((x) => x.cantidad > 0).length;
    return `${p.length} equipos activos, ${conStock} con stock (los que verá el cliente)`;
  },
  "¿El panel usa este mismo proyecto de Firebase? Si no, pon FIREBASE_PROJECT_ID en .env y dale a la cuenta el rol 'Cloud Datastore Viewer' en ESE proyecto.",
);

await paso(
  "Firestore (horario)",
  async () => {
    const h = await leerHorario();
    return `citas de ${h.duracionMinutos} min, ${h.diasAdelante} días adelante`;
  },
  "Igual que arriba.",
);

await paso(
  "Calendar (lectura)",
  async () => {
    const o = await ocupados(new Date(), new Date(Date.now() + 7 * 86_400_000));
    return `${o.length} tramos ocupados en los próximos 7 días`;
  },
  `Comparte el calendario con ${correoCuentaServicio} y revisa GOOGLE_CALENDAR_ID. ¿Está habilitada la Google Calendar API en el proyecto?`,
);

await paso(
  "Calendar (escritura)",
  async () => {
    const inicio = new Date(Date.now() + 365 * 86_400_000);
    const id = await crearEvento({
      inicio: inicio.toISOString(),
      fin: new Date(inicio.getTime() + 60_000).toISOString(),
      titulo: "Prueba de Gaby (se borra sola)",
      descripcion: "",
      ubicacion: "",
      privado: { origen: "diagnostico" },
    });
    await borrarEvento(id);
    return "puede crear y borrar citas";
  },
  "El permiso compartido debe ser 'Hacer cambios en los eventos' (no 'Ver solo libre/ocupado').",
);

await paso(
  "Evolution API",
  async () => {
    const res = await fetch(`${config.evolutionUrl}/instance/fetchInstances`, {
      headers: { apikey: config.evolutionApiKey },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    const lista = (await res.json()) as {
      name?: string;
      connectionStatus?: string;
    }[];
    const nombres = lista
      .map((i) => `${i.name}(${i.connectionStatus})`)
      .join(", ");
    return `responde en ${config.evolutionUrl}. Instancias: ${nombres || "ninguna"}`;
  },
  "¿Evolution está en la red automation-net con el alias evolution-api? ¿EVOLUTION_API_KEY es la AUTHENTICATION_API_KEY de Evolution?",
);

console.log(
  fallos
    ? `\n${fallos} problema(s). Corrige y vuelve a correr.`
    : "\nTodo listo ✔",
);
process.exit(fallos ? 1 : 0);
