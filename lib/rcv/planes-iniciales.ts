import type { PlanRcv, TasasRcv } from "./tipos";

/**
 * Tabla que pasó el cliente (12/10/2026), para el seed. Privado: 1–4. Público: 1–6 y 8.
 * Placas extranjeras (7): opción aparte, sin precio fijo. Después se edita desde el panel.
 */
export const PLANES_RCV_INICIALES: (Omit<
  PlanRcv,
  "actualizadoEn" | "actualizadoPor"
> & {
  id: string;
})[] = [
  {
    id: "moto",
    orden: 1,
    clase: "MOTO",
    descripcion: "MOTOCICLETAS",
    precioEur: 15,
    categorias: ["privado", "publico"],
    financiamiento: false,
    activo: true,
  },
  {
    id: "particular-hasta-800kg",
    orden: 2,
    clase: "PARTICULAR",
    descripcion: "PLAN BÁSICO PARTICULAR HASTA 800KG",
    precioEur: 33,
    categorias: ["privado", "publico"],
    financiamiento: false,
    activo: true,
  },
  {
    id: "particular-mas-800kg",
    orden: 3,
    clase: "PARTICULAR",
    descripcion: "PLAN BÁSICO PARTICULAR MÁS 800KG",
    precioEur: 39,
    categorias: ["privado", "publico"],
    financiamiento: false,
    activo: true,
  },
  {
    id: "pick-up",
    orden: 4,
    clase: "PICK UP",
    descripcion: "PLAN BÁSICO PARTICULAR PICK UP",
    precioEur: 45,
    categorias: ["privado", "publico"],
    financiamiento: false,
    activo: true,
  },
  {
    id: "carga-2-5tm",
    orden: 5,
    clase: "CARGA",
    descripcion: "PLAN BÁSICO CARGA DE 2 TM A 5 TM",
    precioEur: 84,
    categorias: ["publico"],
    financiamiento: false,
    activo: true,
  },
  {
    id: "taxi",
    orden: 6,
    clase: "TAXI",
    descripcion: "PLAN BÁSICO TAXI POR PUESTOS",
    precioEur: 114,
    categorias: ["publico"],
    financiamiento: false,
    activo: true,
  },
  {
    id: "placas-extranjeras",
    orden: 7,
    clase: "PLACAS EXTRANJERAS",
    descripcion: "SOLICITAR COTIZACIÓN",
    precioEur: null,
    categorias: ["extranjeras"],
    financiamiento: false,
    activo: true,
  },
  {
    id: "minibuses",
    orden: 8,
    clase: "MINIBUSES URBANOS Y SUBURBANOS",
    descripcion: "PLAN II MINIBUSES URBANOS Y SUBURBANOS APOV/EXC",
    precioEur: 131,
    categorias: ["publico"],
    financiamiento: true,
    activo: true,
  },
];

/** Tasas implícitas en esa tabla (15 € = 16,79 $ = Bs. 14.686,18). */
export const TASAS_RCV_INICIALES: TasasRcv = { usd: 1.1193, bs: 979.0788 };
