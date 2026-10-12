/**
 * Textos de Gaby. Cada mensaje tiene varias versiones que dicen lo mismo con otras palabras;
 * se elige una al azar en cada envío para que el número no mande siempre el mismo texto
 * (reduce el riesgo de que WhatsApp lo marque como automatizado).
 *
 * `{nombre}` se reemplaza por el nombre de WhatsApp del cliente (o se quita si no hay).
 */

export type Variantes = readonly string[];

export const SALUDO: Variantes = [
  "Hola{nombre}, soy Gaby, asesora comercial de Inversiones JS. ¿En qué te puedo servir?",
  "¡Hola{nombre}! Te saluda Gaby, asesora comercial de Inversiones JS. ¿Cómo te puedo ayudar hoy?",
  "¡Hola{nombre}! Qué gusto saludarte. Soy Gaby, asesora comercial de Inversiones JS. ¿En qué te ayudo?",
  "Hola{nombre} 👋 Soy Gaby, de Inversiones JS. Cuéntame, ¿en qué te puedo servir?",
  "¡Qué tal{nombre}! Mi nombre es Gaby y soy asesora comercial de Inversiones JS. ¿Qué necesitas hoy?",
];

/** Opciones fijas: siempre iguales para que el cliente las reconozca. */
export const OPCIONES_MENU = [
  "1️⃣ Emprender con agencia de loterías",
  "2️⃣ Adquirir teléfono a crédito",
  "3️⃣ Adquirir póliza RCV",
].join("\n");

export const PIE_MENU: Variantes = [
  "Responde con el número de la opción.",
  "Escríbeme el número de la opción que te interesa.",
  "Solo responde 1, 2 o 3.",
  "Indícame el número de la opción, por favor.",
  "Envíame el número de lo que buscas.",
];

export const MENU_DE_NUEVO: Variantes = [
  "¿Te puedo ayudar en algo más?",
  "¿Hay algo más en lo que te pueda servir?",
  "Si necesitas algo más, aquí estoy.",
  "¿Te ayudo con otra cosa?",
  "Cuéntame si te puedo ayudar con algo más.",
];

export const NO_ENTENDI: Variantes = [
  "Disculpa, no logré entenderte.",
  "Perdona, no entendí tu respuesta.",
  "Ups, no capté bien tu mensaje.",
  "Disculpa, no me quedó claro.",
  "No logré entender esa respuesta.",
];

// ── 1. Agencia de loterías ──────────────────────────────────────────────

export const LOTERIA_INFO: Variantes = [
  "¡Felicidades por tu espíritu emprendedor! Con nosotros vas a tener crecimiento económico y personal. Solo necesitas internet, un espacio físico y muchas ganas de ganar dinero. Nosotros te proveemos los equipos, la publicidad y el respaldo económico.",
  "¡Qué bueno que quieras emprender! Con Inversiones JS creces económica y personalmente. Lo único que necesitas es internet, un espacio físico y muchas ganas de ganar dinero; nosotros ponemos los equipos, la publicidad y el respaldo económico.",
  "¡Felicitaciones por dar el paso de emprender! Con nosotros tendrás crecimiento económico y personal. Tú pones internet, un espacio físico y las ganas de ganar dinero; nosotros te damos los equipos, la publicidad y el respaldo económico.",
  "¡Excelente decisión! Emprender con nosotros te da crecimiento económico y personal. Solo te pedimos internet, un espacio físico y muchas ganas de trabajar; los equipos, la publicidad y el respaldo económico corren por nuestra cuenta.",
  "¡Admiramos tu espíritu emprendedor! Con Inversiones JS vas a crecer en lo económico y en lo personal. Necesitas internet, un espacio físico y muchas ganas de ganar dinero, y nosotros te proveemos equipos, publicidad y respaldo económico.",
];

export const LOTERIA_PREGUNTA_CITA: Variantes = [
  "¿Quieres agendar una cita? Responde *SÍ* o *NO*.",
  "¿Te gustaría agendar una cita con nosotros? Responde *SÍ* o *NO*.",
  "¿Agendamos una cita? Escribe *SÍ* o *NO*.",
  "¿Deseas que te agendemos una cita? Contesta *SÍ* o *NO*.",
  "¿Quieres que coordinemos una cita? Respóndeme *SÍ* o *NO*.",
];

export const LOTERIA_NO: Variantes = [
  "¡Perfecto! Quedamos a tus órdenes.",
  "Está bien, quedamos a tus órdenes para cuando lo necesites.",
  "Entendido. Aquí estaremos cuando lo decidas.",
  "No hay problema, quedamos a tu disposición.",
  "Cuando quieras, aquí estamos atentos.",
];

export const LOTERIA_HORARIOS: Variantes = [
  "Estos son los horarios disponibles:",
  "Tenemos estos horarios libres:",
  "Te puedo ofrecer estos horarios:",
  "Estas son las fechas y horas disponibles:",
  "Mira los horarios que tenemos disponibles:",
];

export const LOTERIA_ELIGE_HORARIO: Variantes = [
  "Responde con el número del horario que prefieras.",
  "Escríbeme el número del horario que te queda mejor.",
  "Indícame el número de la opción que te convenga.",
  "¿Cuál te conviene? Envíame su número.",
  "Elige uno respondiendo con su número.",
];

export const LOTERIA_SIN_HORARIOS: Variantes = [
  "En este momento no tengo horarios libres en la agenda. Un asesor te contactará para coordinar la cita.",
  "Por ahora la agenda está llena, pero un asesor se comunicará contigo para buscar un espacio.",
  "No me quedan horarios disponibles esta semana. Un asesor te escribirá para coordinar.",
  "La agenda está completa por ahora; un asesor te contactará para cuadrar la cita.",
  "Ahorita no hay horarios libres. No te preocupes, un asesor te contactará para agendarte.",
];

export const LOTERIA_PIDE_DIRECCION: Variantes = [
  "Regálame tu dirección exacta con puntos de referencia y un número de contacto para localizarte.",
  "Perfecto. Ahora envíame tu dirección exacta con puntos de referencia y un número de contacto.",
  "¡Listo! Escríbeme tu dirección exacta, algún punto de referencia y un número de contacto para ubicarte.",
  "Muy bien. Necesito tu dirección exacta con puntos de referencia y un teléfono de contacto.",
  "Excelente. Compárteme tu dirección exacta con puntos de referencia y un número para localizarte.",
];

export const LOTERIA_DIRECCION_CORTA: Variantes = [
  "Necesito un poco más de detalle: dirección exacta, puntos de referencia y número de contacto.",
  "¿Me das la dirección completa con puntos de referencia y un número de contacto?",
  "Para ubicarte bien necesito la dirección exacta, un punto de referencia y tu número.",
  "Me falta información: escríbeme la dirección completa con referencias y un teléfono.",
  "Por favor envíame la dirección con más detalle y un número de contacto.",
];

export const LOTERIA_CONFIRMADA: Variantes = [
  "¡Listo! Tu cita quedó agendada para el *{turno}*. Te enviaremos un recordatorio antes.",
  "¡Perfecto! Te agendé para el *{turno}*. Te recordaremos antes de la cita.",
  "¡Cita confirmada para el *{turno}*! Te escribiremos un recordatorio antes.",
  "Quedó registrada tu cita para el *{turno}*. Antes de la hora te enviamos un recordatorio.",
  "¡Hecho! Te esperamos el *{turno}*. Te avisaremos antes para que no se te pase.",
];

export const LOTERIA_TURNO_OCUPADO: Variantes = [
  "Ese horario se acaba de ocupar. Te muestro los que siguen libres:",
  "Disculpa, alguien tomó ese horario hace un momento. Estos siguen disponibles:",
  "Ups, ese espacio ya no está disponible. Elige otro de estos:",
  "Ese horario ya se ocupó. Estas son las opciones que quedan:",
  "Lo siento, ese turno se acaba de reservar. Mira estos otros:",
];

export const ERROR_AGENDA: Variantes = [
  "Tuve un problema al revisar la agenda. Un asesor te contactará para coordinar tu cita.",
  "No pude acceder a la agenda en este momento; un asesor te escribirá para agendarte.",
  "Hubo un inconveniente con la agenda. No te preocupes, un asesor se comunicará contigo.",
  "La agenda no respondió ahora mismo. Un asesor te contactará para cuadrar la cita.",
  "Algo falló al consultar los horarios; un asesor te contactará en breve.",
];

export const RECORDATORIO_24H: Variantes = [
  "Hola{nombre}, te recordamos tu cita con Inversiones JS mañana *{turno}*. ¡Te esperamos!",
  "¡Hola{nombre}! Mañana *{turno}* tienes tu cita con Inversiones JS. Cualquier cambio, escríbenos.",
  "Recordatorio{nombre}: tu cita con Inversiones JS es mañana, *{turno}*.",
  "Hola{nombre} 👋 Solo para recordarte que mañana *{turno}* es tu cita con nosotros.",
  "¡Buen día{nombre}! Te escribimos para recordarte tu cita de mañana, *{turno}*, con Inversiones JS.",
];

export const RECORDATORIO_2H: Variantes = [
  "Hola{nombre}, en un par de horas (*{hora}*) es tu cita con Inversiones JS. ¡Nos vemos!",
  "¡Hola{nombre}! Te recordamos que hoy a las *{hora}* es tu cita con Inversiones JS.",
  "Recordatorio{nombre}: hoy a las *{hora}* tienes tu cita con nosotros.",
  "Hola{nombre} 👋 Tu cita con Inversiones JS es hoy a las *{hora}*. ¡Te esperamos!",
  "¡Ya casi{nombre}! Hoy a las *{hora}* es tu cita con Inversiones JS.",
];

// ── 2. Teléfono a crédito ───────────────────────────────────────────────

export const TELEFONO_INFO: Variantes = [
  "Adquirir tu teléfono es muy sencillo: solo necesitas copia de la cédula, RIF actualizado y la inicial del equipo que solicites.",
  "¡Sacar tu teléfono a crédito es muy fácil! Solo necesitas copia de tu cédula, el RIF actualizado y la inicial del equipo que elijas.",
  "Es muy sencillo: con copia de la cédula, RIF actualizado y la inicial del equipo que quieras, ya puedes estrenar teléfono.",
  "Para llevarte tu teléfono solo necesitas tres cosas: copia de la cédula, RIF actualizado y la inicial del equipo.",
  "¡Estrenar teléfono es muy fácil! Requisitos: copia de la cédula, RIF actualizado y la inicial del equipo que solicites.",
];

export const TELEFONO_LISTA: Variantes = [
  "Estos son los equipos disponibles:",
  "Te comparto la lista de equipos disponibles:",
  "Mira los equipos que tenemos disponibles:",
  "Esta es nuestra lista de equipos disponibles:",
  "Aquí tienes los equipos que tenemos ahora:",
];

export const TELEFONO_ELIGE: Variantes = [
  "Si alguno te interesa, escríbeme su número.",
  "¿Te gustó alguno? Envíame su número.",
  "Responde con el número del equipo que te interese.",
  "Indícame el número del equipo que quieres.",
  "Escríbeme el número del que te guste.",
];

export const TELEFONO_ELEGIDO: Variantes = [
  "¡Excelente elección! Anoté tu interés en el *{equipo}*. Un asesor te escribirá en breve para continuar.",
  "¡Buena elección! El *{equipo}* queda anotado; un asesor te contactará para seguir con el proceso.",
  "Perfecto, registré el *{equipo}*. En breve un asesor te escribe para continuar.",
  "¡Muy bien! Tomé nota del *{equipo}*. Un asesor se comunicará contigo pronto.",
  "Anotado el *{equipo}*. Un asesor te contactará para completar tu solicitud.",
];

export const TELEFONO_SIN_EQUIPOS: Variantes = [
  "En este momento estamos actualizando el inventario. Un asesor te enviará la lista en breve.",
  "Ahorita estoy actualizando los equipos disponibles; un asesor te escribirá con la lista.",
  "Estamos renovando el inventario. En breve un asesor te comparte los equipos disponibles.",
  "No pude cargar la lista en este momento. Un asesor te la enviará pronto.",
  "La lista se está actualizando; un asesor te la hará llegar en breve.",
];

// ── 3. Póliza RCV ───────────────────────────────────────────────────────

export const RCV_INFO: Variantes = [
  "Recuerda que es importante estar al día con la documentación exigida por la Ley de Tránsito de Venezuela.",
  "Es muy importante tener al día la documentación que exige la Ley de Tránsito de Venezuela.",
  "Mantener tu documentación al día, como lo exige la Ley de Tránsito de Venezuela, te evita problemas.",
  "Recuerda: la Ley de Tránsito de Venezuela exige tener tu documentación al día.",
  "Estar al día con los documentos que pide la Ley de Tránsito de Venezuela es fundamental.",
];

export const RCV_PREGUNTA: Variantes = [
  "¿Para qué tipo de transporte es la póliza?",
  "¿Tu vehículo es de transporte público o privado?",
  "Cuéntame, ¿qué tipo de transporte es?",
  "¿La póliza es para transporte público o privado?",
  "Indícame el tipo de transporte:",
];

export const OPCIONES_RCV = "1️⃣ Transporte público\n2️⃣ Transporte privado";

export const RCV_CONFIRMADA: Variantes = [
  "¡Perfecto! Te contactaremos inmediatamente con nuestro asesor.",
  "¡Listo! En un momento te contacta nuestro asesor.",
  "Perfecto, ya le aviso a nuestro asesor para que te contacte de inmediato.",
  "¡Excelente! Nuestro asesor te contactará enseguida.",
  "Anotado. Te pondremos en contacto con nuestro asesor de inmediato.",
];

/** Elige una variante al azar y reemplaza `{clave}`. */
export function elegir(
  variantes: Variantes,
  valores: Record<string, string> = {},
  azar: () => number = Math.random,
): string {
  const texto =
    variantes[Math.floor(azar() * variantes.length)] ?? variantes[0];
  return texto.replace(
    /\{(\w+)\}/g,
    (_, clave: string) => valores[clave] ?? "",
  );
}
