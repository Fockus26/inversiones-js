import { parsearEntero, parsearMonto } from "@/lib/catalogo/validacion";
import { conservarPagos, generarCuotas } from "./cuotas";
import { esFecha, fechaEnRango, hoyCaracas } from "./fechas";
import { venceDe, whatsappDe } from "./poliza";
import {
  type CamposClienteCelular,
  type CamposClienteRcv,
  type ClienteRcv,
  FRECUENCIAS,
  type Frecuencia,
  type PlanPagos,
} from "./tipos";

/**
 * Validación pura de los formularios de /clientes. Los límites son los mismos que
 * `clienteCelularValido`, `clienteRcvValido` y `planPagosValido` en firestore.rules.
 */

export const LIMITES_CLIENTE = {
  nombreMax: 80,
  cedulaMax: 20,
  telefonoMax: 30,
  equipoMax: 80,
  vehiculoMax: 120,
  placaMax: 12,
  correoMax: 120,
  direccionMax: 200,
  notasMax: 500,
  montoMax: 100_000,
  cuotasMax: 60,
} as const;

export interface FormularioPagos {
  inicial: string;
  cuota: string;
  numeroCuotas: string;
  frecuencia: Frecuencia;
  /** Fecha de la primera cuota ("2026-10-28"). */
  primera: string;
}

export type CampoPagos = keyof FormularioPagos;

export interface FormularioClienteCelular extends FormularioPagos {
  nombre: string;
  cedula: string;
  telefono: string;
  equipo: string;
  notas: string;
}

export interface FormularioClienteRcv extends FormularioPagos {
  nombre: string;
  cedula: string;
  telefono: string;
  correo: string;
  direccion: string;
  vehiculo: string;
  placa: string;
  notas: string;
  /** Vacío = la póliza aún no se emitió. */
  emision: string;
  /** false = la pagó de contado (no se validan ni guardan cuotas). */
  financiado: boolean;
}

const FUERA_DE_RANGO =
  "Revisa el año: la fecha debe estar entre 2020 y dos años desde hoy.";

type Errores<C extends string> = Partial<Record<C, string>>;

export type Resultado<T, C extends string> =
  | { ok: true; valor: T }
  | { ok: false; errores: Errores<C> };

const espacios = (t: string) => t.trim().replace(/\s+/g, " ");

function texto<C extends string>(
  errores: Errores<C>,
  campo: C,
  valor: string,
  max: number,
  obligatorio?: string,
): string {
  const limpio = espacios(valor);
  if (!limpio && obligatorio) errores[campo] = obligatorio;
  else if (limpio.length > max) errores[campo] = `Máximo ${max} caracteres.`;
  return limpio;
}

function telefono(errores: { telefono?: string }, valor: string): string {
  const limpio = espacios(valor);
  if (!limpio) errores.telefono = "Escribe el teléfono, p. ej. 0414-1234567.";
  else if (
    limpio.length > LIMITES_CLIENTE.telefonoMax ||
    /[^\d\s+().-]/.test(limpio) ||
    !whatsappDe(limpio)
  )
    errores.telefono =
      "No parece un número válido. Escríbelo con el código de área, p. ej. 0414-1234567.";
  return limpio;
}

/** Inicial, cuotas y fechas → plan de pagos (conservando lo ya cobrado de `previo`). */
function pagos(
  errores: Errores<CampoPagos>,
  f: FormularioPagos,
  previo: PlanPagos | null,
  hoy: string,
): PlanPagos | null {
  const inicial = f.inicial.trim() === "" ? 0 : parsearMonto(f.inicial);
  if (inicial === null)
    errores.inicial = "Usa solo números, p. ej. 60 o 60,50.";
  else if (inicial > LIMITES_CLIENTE.montoMax)
    errores.inicial = `No puede pasar de ${LIMITES_CLIENTE.montoMax}$.`;

  const cuota = parsearMonto(f.cuota);
  if (cuota === null || cuota <= 0)
    errores.cuota = "Escribe el monto de cada cuota, p. ej. 25.";
  else if (cuota > LIMITES_CLIENTE.montoMax)
    errores.cuota = `No puede pasar de ${LIMITES_CLIENTE.montoMax}$.`;

  const numero = parsearEntero(f.numeroCuotas);
  if (numero === null || numero < 1 || numero > LIMITES_CLIENTE.cuotasMax)
    errores.numeroCuotas = /^\d+[.,]\d+$/.test(f.numeroCuotas.trim())
      ? "Usa un número entero, sin decimales."
      : `Usa un número entero entre 1 y ${LIMITES_CLIENTE.cuotasMax}.`;

  if (!FRECUENCIAS.includes(f.frecuencia))
    errores.frecuencia = "Elige cada cuánto paga.";

  if (!esFecha(f.primera))
    errores.primera = "Elige la fecha de la primera cuota.";
  else if (!fechaEnRango(f.primera, hoy)) errores.primera = FUERA_DE_RANGO;

  if (
    inicial === null ||
    cuota === null ||
    numero === null ||
    Object.keys(errores).length > 0
  )
    return null;
  const cuotas = generarCuotas(cuota, numero, f.frecuencia, f.primera);
  return {
    inicial,
    frecuencia: f.frecuencia,
    cuotas: previo ? conservarPagos(cuotas, previo.cuotas) : cuotas,
  };
}

export function validarClienteCelular(
  f: FormularioClienteCelular,
  previo: PlanPagos | null = null,
  hoy: string = hoyCaracas(),
): Resultado<CamposClienteCelular, keyof FormularioClienteCelular> {
  const errores: Errores<keyof FormularioClienteCelular> = {};
  const L = LIMITES_CLIENTE;
  const nombre = texto(
    errores,
    "nombre",
    f.nombre,
    L.nombreMax,
    "Escribe el nombre del cliente.",
  );
  // Mayúsculas antes de medir: "ß" pasa a "SS" y la regla mide el texto final.
  const cedula = texto(errores, "cedula", f.cedula.toUpperCase(), L.cedulaMax);
  const tel = telefono(errores, f.telefono);
  const equipo = texto(
    errores,
    "equipo",
    f.equipo,
    L.equipoMax,
    "Escribe qué equipo se llevó.",
  );
  const notas = f.notas.trim();
  if (notas.length > L.notasMax)
    errores.notas = `Máximo ${L.notasMax} caracteres.`;
  const plan = pagos(errores, f, previo, hoy);
  if (!plan || Object.keys(errores).length > 0) return { ok: false, errores };
  return {
    ok: true,
    valor: { nombre, cedula, telefono: tel, equipo, notas, pagos: plan },
  };
}

export function validarClienteRcv(
  f: FormularioClienteRcv,
  previo: Pick<
    ClienteRcv,
    "emision" | "recordatorio30" | "recordatorio3" | "pagos"
  > | null = null,
  hoy: string = hoyCaracas(),
): Resultado<CamposClienteRcv, keyof FormularioClienteRcv> {
  const errores: Errores<keyof FormularioClienteRcv> = {};
  const L = LIMITES_CLIENTE;
  const nombre = texto(
    errores,
    "nombre",
    f.nombre,
    L.nombreMax,
    "Escribe el nombre del cliente.",
  );
  // Mayúsculas antes de medir: "ß" pasa a "SS" y la regla mide el texto final.
  const cedula = texto(errores, "cedula", f.cedula.toUpperCase(), L.cedulaMax);
  const tel = telefono(errores, f.telefono);
  const correo = espacios(f.correo).toLowerCase();
  if (correo && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(correo))
    errores.correo = "Ese correo no parece válido: nombre@correo.com.";
  else if (correo.length > L.correoMax)
    errores.correo = `Máximo ${L.correoMax} caracteres.`;
  const direccion = texto(errores, "direccion", f.direccion, L.direccionMax);
  const vehiculo = texto(
    errores,
    "vehiculo",
    f.vehiculo.toLocaleUpperCase("es"),
    L.vehiculoMax,
    "Escribe el vehículo o el plan.",
  );
  const placa = texto(errores, "placa", f.placa.toUpperCase(), L.placaMax);
  const notas = f.notas.trim();
  if (notas.length > L.notasMax)
    errores.notas = `Máximo ${L.notasMax} caracteres.`;

  const emision = f.emision.trim() === "" ? null : f.emision.trim();
  if (emision !== null && !esFecha(emision))
    errores.emision = "Elige una fecha válida o déjala vacía.";
  else if (emision !== null && !fechaEnRango(emision, hoy))
    errores.emision = FUERA_DE_RANGO;
  // Una renovación deja la emisión en el vencimiento anterior (futuro): se respeta al editar.
  else if (emision !== null && emision > hoy && previo?.emision !== emision)
    errores.emision = "La póliza no puede emitirse después de hoy.";

  let plan: PlanPagos | null = null;
  if (f.financiado) plan = pagos(errores, f, previo?.pagos ?? null, hoy);

  if (Object.keys(errores).length > 0 || (f.financiado && !plan))
    return { ok: false, errores };

  // Misma emisión → se conservan los avisos ya mandados; otra emisión = otro vencimiento.
  const mismaEmision = previo !== null && previo.emision === emision;
  return {
    ok: true,
    valor: {
      nombre,
      cedula,
      telefono: tel,
      correo,
      direccion,
      vehiculo,
      placa,
      notas,
      emision,
      vence: emision ? venceDe(emision) : null,
      recordatorio30: mismaEmision ? previo.recordatorio30 : false,
      recordatorio3: mismaEmision ? previo.recordatorio3 : false,
      pagos: plan,
    },
  };
}

/** Plan guardado → textos del formulario. Sin plan: valores de arranque. */
export function formularioPagos(
  plan: PlanPagos | null,
  hoy: string,
): FormularioPagos {
  if (!plan || plan.cuotas.length === 0)
    return {
      inicial: "",
      cuota: "",
      numeroCuotas: "6",
      frecuencia: "quincenal",
      primera: hoy,
    };
  const monto = (n: number) =>
    Number.isInteger(n) ? String(n) : n.toFixed(2).replace(".", ",");
  return {
    inicial: plan.inicial === 0 ? "" : monto(plan.inicial),
    cuota: monto(plan.cuotas[0].monto),
    numeroCuotas: String(plan.cuotas.length),
    frecuencia: plan.frecuencia,
    primera: plan.cuotas[0].vence,
  };
}
