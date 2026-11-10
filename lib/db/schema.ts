/**
 * Esquema de Postgres (D044). Una tabla por colección de Firestore, con los mismos campos
 * de `lib/*\/tipos.ts` en snake_case. Los límites de `firestore.rules` son CHECK, así que se
 * aplican también a lo que escribe el bot. Contrato con el chatbot: ver docs/chatbot.md.
 *
 * Las tablas de Better Auth (`user`, `session`, `account`, `verification`) se suman en el
 * paso de auth; entonces `admins.user_id` y `suscripciones_push.user_id` pasan a FK de `user.id`.
 */
import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  date,
  doublePrecision,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import type { PlanPagos } from "../financiamiento/tipos";
import type { CategoriaRcv } from "../rcv/tipos";
import type { EstadoCita } from "../solicitudes/tipos";

// Ids de Firestore (20 caracteres) y uid de Firebase se conservan: texto, no uuid.
const id = () => text().primaryKey().default(sql`gen_random_uuid()::text`);

const huella = {
  actualizadoEn: timestamp({ withTimezone: true, mode: "date" }),
  actualizadoPor: text(),
};

const creadoEn = () =>
  timestamp({ withTimezone: true, mode: "date" }).notNull().defaultNow();

// Mismo patrón que lib/catalogo/marcas.ts y la regla marcaValida.
const PATRON_MARCA = "^[A-Z0-9ÁÉÍÓÚÜÑ][A-Z0-9ÁÉÍÓÚÜÑ &.+-]*$";

/** `admins/{uid}` (D003): la fila existe ⇔ ese usuario entra al panel. */
export const admins = pgTable("admins", {
  userId: text().primaryKey(),
  creadoEn: creadoEn(),
});

/** `marcas/{nombre}` (D025): el nombre es la clave. */
export const marcas = pgTable(
  "marcas",
  {
    nombre: text().primaryKey(),
    ...huella,
  },
  (t) => [
    check(
      "marcas_nombre_valido",
      sql`char_length(${t.nombre}) between 1 and 30 and ${t.nombre} ~ ${sql.raw(`'${PATRON_MARCA}'`)}`,
    ),
  ],
);

/** `productos` (D002): un equipo por fila. */
export const productos = pgTable(
  "productos",
  {
    id: id(),
    marca: text().notNull(),
    nombre: text().notNull(),
    variante: text().notNull().default(""),
    inicial: doublePrecision().notNull(),
    cuota: doublePrecision().notNull(),
    numeroCuotas: integer().notNull(),
    cantidad: integer().notNull(),
    activo: boolean().notNull().default(true),
    orden: doublePrecision().notNull(),
    ...huella,
  },
  (t) => [
    // Renombrar marca = UPDATE en cascada; no se borra una marca con productos.
    foreignKey({ columns: [t.marca], foreignColumns: [marcas.nombre] })
      .onUpdate("cascade")
      .onDelete("restrict"),
    index().on(t.marca, t.orden),
    check(
      "productos_valido",
      sql`char_length(${t.nombre}) between 1 and 80
        and char_length(${t.variante}) <= 20
        and ${t.inicial} between 0 and 100000
        and ${t.cuota} between 0 and 100000
        and ${t.numeroCuotas} between 1 and 48
        and ${t.cantidad} between 0 and 100000`,
    ),
  ],
);

/**
 * `configuracion/{clave}`: filas `horario` (lo lee el bot) y `rcv` (tasas y requisitos).
 * `jsonb` porque cada campo es opcional y los lectores ya toleran que falten (D044).
 */
export const configuracion = pgTable("configuracion", {
  clave: text().primaryKey(),
  valor: jsonb().$type<Record<string, unknown>>().notNull().default({}),
  ...huella,
});

/** `planesRcv` (D029, D030). */
export const planesRcv = pgTable(
  "planes_rcv",
  {
    id: id(),
    clase: text().notNull(),
    descripcion: text().notNull(),
    /** null = "Solicitar cotización". */
    precioEur: doublePrecision(),
    categorias: text().array().$type<CategoriaRcv[]>().notNull(),
    financiamiento: boolean().notNull().default(false),
    activo: boolean().notNull().default(true),
    orden: doublePrecision().notNull(),
    ...huella,
  },
  (t) => [
    check(
      "planes_rcv_valido",
      sql`char_length(${t.clase}) between 1 and 40
        and char_length(${t.descripcion}) between 1 and 120
        and (${t.precioEur} is null or ${t.precioEur} between 0 and 100000)
        and cardinality(${t.categorias}) between 1 and 3
        and ${t.categorias} <@ array['publico','privado','extranjeras']::text[]`,
    ),
  ],
);

/** `solicitudesRcv`: las escribe el bot; el panel lee y borra. */
export const solicitudesRcv = pgTable(
  "solicitudes_rcv",
  {
    id: id(),
    nombre: text().notNull(),
    correo: text().notNull().default(""),
    telefono: text().notNull(),
    whatsapp: text().notNull(),
    categoria: text().$type<CategoriaRcv>().notNull(),
    planId: text().notNull(),
    clase: text().notNull().default(""),
    descripcion: text().notNull().default(""),
    vehiculo: text(),
    precioEur: doublePrecision(),
    precioUsd: doublePrecision(),
    precioBs: doublePrecision(),
    precioCop: doublePrecision(),
    financiamiento: boolean(),
    creadoEn: creadoEn(),
  },
  (t) => [
    index().on(t.creadoEn),
    check(
      "solicitudes_rcv_categoria",
      sql`${t.categoria} in ('publico','privado','extranjeras')`,
    ),
  ],
);

/** `solicitudesCelulares` (D043). */
export const solicitudesCelulares = pgTable(
  "solicitudes_celulares",
  {
    id: id(),
    nombre: text().notNull(),
    whatsapp: text().notNull(),
    equipo: text(),
    creadoEn: creadoEn(),
  },
  (t) => [index().on(t.creadoEn)],
);

/** `solicitudesCitas` (D043). */
export const solicitudesCitas = pgTable(
  "solicitudes_citas",
  {
    id: id(),
    nombre: text().notNull(),
    whatsapp: text().notNull(),
    estado: text().$type<EstadoCita>().notNull(),
    horario: text(),
    direccion: text(),
    creadoEn: creadoEn(),
  },
  (t) => [
    index().on(t.creadoEn),
    check(
      "solicitudes_citas_estado",
      sql`${t.estado} in ('agendada','sin-horarios','error-agenda')`,
    ),
  ],
);

// Datos personales comunes a los dos tipos de cliente (regla datosPersonales).
const checkDatosPersonales = (t: {
  nombre: AnyPgColumn;
  cedula: AnyPgColumn;
  telefono: AnyPgColumn;
  notas: AnyPgColumn;
}) => sql`char_length(${t.nombre}) between 1 and 80
  and char_length(${t.cedula}) <= 20
  and char_length(${t.telefono}) between 1 and 30
  and char_length(${t.notas}) <= 500`;

/** `clientesCelulares` (D032): el plan de cuotas va embebido en `pagos`. */
export const clientesCelulares = pgTable(
  "clientes_celulares",
  {
    id: id(),
    nombre: text().notNull(),
    cedula: text().notNull().default(""),
    telefono: text().notNull(),
    equipo: text().notNull(),
    notas: text().notNull().default(""),
    pagos: jsonb().$type<PlanPagos>().notNull(),
    ...huella,
  },
  (t) => [
    check(
      "clientes_celulares_valido",
      sql`${checkDatosPersonales(t)} and char_length(${t.equipo}) between 1 and 80`,
    ),
  ],
);

/** `clientesRcv` (D032, D033): el bot marca `recordatorio30/3` al avisar el vencimiento. */
export const clientesRcv = pgTable(
  "clientes_rcv",
  {
    id: id(),
    nombre: text().notNull(),
    cedula: text().notNull().default(""),
    telefono: text().notNull(),
    correo: text().notNull().default(""),
    direccion: text().notNull().default(""),
    vehiculo: text().notNull(),
    placa: text().notNull().default(""),
    notas: text().notNull().default(""),
    emision: date({ mode: "string" }),
    vence: date({ mode: "string" }),
    recordatorio30: boolean().notNull().default(false),
    recordatorio3: boolean().notNull().default(false),
    pagos: jsonb().$type<PlanPagos>(),
    ...huella,
  },
  (t) => [
    index().on(t.vence),
    check(
      "clientes_rcv_valido",
      sql`${checkDatosPersonales(t)}
        and char_length(${t.correo}) <= 120
        and char_length(${t.direccion}) <= 200
        and char_length(${t.vehiculo}) between 1 and 120
        and char_length(${t.placa}) <= 12
        and ((${t.emision} is null and ${t.vence} is null)
          or (${t.emision} between '2000-01-01' and '2099-12-31'
            and ${t.vence} between '2000-01-01' and '2099-12-31'))`,
    ),
  ],
);

/** `suscripcionesPush` (D035): el bot las lee y borra las que el navegador dio de baja. */
export const suscripcionesPush = pgTable(
  "suscripciones_push",
  {
    id: id(),
    endpoint: text().notNull().unique(),
    p256dh: text().notNull(),
    auth: text().notNull(),
    userId: text().notNull(),
    dispositivo: text().notNull().default(""),
    creadaEn: creadoEn(),
  },
  (t) => [
    check(
      "suscripciones_push_valida",
      sql`char_length(${t.endpoint}) between 1 and 1000
        and ${t.endpoint} ~ '^https://.+'
        and char_length(${t.p256dh}) between 1 and 200
        and char_length(${t.auth}) between 1 and 100
        and char_length(${t.dispositivo}) <= 120`,
    ),
  ],
);
