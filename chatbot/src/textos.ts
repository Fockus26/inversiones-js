/** Textos que manda el bot. Edítalos aquí; tuteo neutro, sin prometer nada que no esté en el catálogo. */

export const MENU = [
  "Escribe el número de lo que necesitas:",
  "",
  "1️⃣ Ver la lista de precios",
  "2️⃣ Consultar un modelo",
  "3️⃣ Hablar con un asesor",
].join("\n");

export const SALUDO = [
  "¡Hola! 👋 Bienvenido a *Inversiones JS*.",
  "Celulares a crédito: das una inicial y el resto en cuotas quincenales.",
  "",
  MENU,
].join("\n");

export const PEDIR_MODELO =
  "Escribe el nombre del modelo que buscas, por ejemplo: *Redmi Note 15* o *Honor 600 Elite*.";

export const LISTA_RECIENTE =
  "Te envié la lista hace un momento, está arriba 👆. Si te interesa un modelo, escribe su nombre o *3* para hablar con un asesor.";

export const TRAS_PRODUCTO =
  "¿Te interesa? Escribe *3* y un asesor te atiende para apartarlo.";

export const TODOS_AGOTADOS =
  "Ese modelo está agotado por ahora. Escribe *1* para ver lo que hay disponible o *3* para hablar con un asesor.";

export const NO_ENCONTRADO =
  "No encontré ese modelo 🤔. Escribe *1* para ver la lista completa o *3* para hablar con un asesor.";

export const ASESOR =
  "¡Listo! Un asesor te escribe por aquí en breve. Mientras tanto puedes dejarnos tu consulta. 🙌";

export const GRACIAS = "¡A la orden! Si necesitas algo más, escribe *menu*.";

export const SIN_CATALOGO =
  "Estamos actualizando la lista en este momento. Escribe *3* y un asesor te atiende.";

/** Aviso al número del dueño cuando alguien pide asesor. */
export function avisoAsesor(contacto: string, nombre: string | undefined) {
  return `🔔 ${nombre ? `${nombre} (${contacto})` : contacto} pidió hablar con un asesor.`;
}
