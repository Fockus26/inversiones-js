import { crearUsuario } from "../auth/usuarios";
import { CATALOGO_INICIAL } from "../catalogo/catalogo-inicial";
import { MARCAS_INICIALES } from "../catalogo/tipos";
import {
  clientesCelularesDePrueba,
  clientesRcvDePrueba,
} from "../financiamiento/datos-demo";
import { hoyCaracas } from "../financiamiento/fechas";
import {
  PLANES_RCV_INICIALES,
  TASAS_RCV_INICIALES,
} from "../rcv/planes-iniciales";
import { DOC_CONFIG_RCV, REQUISITOS_RCV_POR_DEFECTO } from "../rcv/tipos";
import {
  admins,
  clientesCelulares,
  clientesRcv,
  configuracion,
  marcas,
  planesRcv,
  productos,
  solicitudesCelulares,
  solicitudesCitas,
  solicitudesRcv,
} from "./schema";
import type { Db } from "./tipos";

/**
 * Datos de QA (antes el seed del emulador de Firebase): el catálogo del 29/09, la póliza RCV, clientes con
 * financiamiento en distintas situaciones (D032) y solicitudes de ejemplo de cada tipo (D043).
 * Sin datos personales reales. Las cuentas vienen de `.env.test.local`: `admin` entra al panel,
 * `sinAcceso` tiene sesión pero no fila en `admins`.
 */
export interface CuentasQa {
  admin?: { email: string; password: string };
  sinAcceso?: { email: string; password: string };
}

const huella = { actualizadoPor: "seed", actualizadoEn: new Date() };

export async function sembrar(db: Db, cuentas: CuentasQa = {}) {
  const hoy = hoyCaracas();
  const celulares = clientesCelularesDePrueba(hoy);
  const rcv = clientesRcvDePrueba(hoy);

  await db.transaction(async (tx) => {
    await tx
      .insert(marcas)
      .values(MARCAS_INICIALES.map((nombre) => ({ nombre, ...huella })));
    await tx
      .insert(productos)
      .values(CATALOGO_INICIAL.map((p) => ({ ...p, ...huella })));
    await tx
      .insert(planesRcv)
      .values(PLANES_RCV_INICIALES.map((p) => ({ ...p, ...huella })));
    await tx.insert(configuracion).values({
      clave: DOC_CONFIG_RCV,
      valor: {
        tasaUsd: TASAS_RCV_INICIALES.usd,
        tasaBs: TASAS_RCV_INICIALES.bs,
        requisitosGenerales: [...REQUISITOS_RCV_POR_DEFECTO],
      },
      ...huella,
    });
    await tx
      .insert(clientesCelulares)
      .values(celulares.map((c) => ({ ...c, ...huella })));
    await tx.insert(clientesRcv).values(rcv.map((c) => ({ ...c, ...huella })));
    await tx.insert(solicitudesRcv).values([
      {
        id: "ejemplo-extranjera",
        nombre: "Andrés Ruiz",
        correo: "andres@ejemplo.com",
        telefono: "573001234567",
        whatsapp: "573001234567",
        categoria: "extranjeras",
        planId: "cotizacion-extranjera",
        clase: "PLACAS EXTRANJERAS",
        descripcion: "SOLICITAR COTIZACIÓN",
        vehiculo: "camioneta Toyota Hilux 2018",
      },
      {
        id: "ejemplo",
        nombre: "María Pérez",
        correo: "maria@ejemplo.com",
        telefono: "04141234567",
        whatsapp: "584141234567",
        categoria: "publico",
        planId: "minibuses",
        clase: "MINIBUSES URBANOS Y SUBURBANOS",
        descripcion: "PLAN II MINIBUSES URBANOS Y SUBURBANOS APOV/EXC",
        precioEur: 131,
        precioUsd: 146.63,
        precioBs: 128259.32,
        financiamiento: true,
      },
    ]);
    await tx.insert(solicitudesCelulares).values([
      {
        id: "ejemplo",
        nombre: "Luis Mendoza",
        whatsapp: "584241112233",
        equipo: "SAMSUNG A16 4/128",
      },
      { id: "sin-lista", nombre: "", whatsapp: "584161234567", equipo: null },
    ]);
    await tx.insert(solicitudesCitas).values([
      {
        id: "ejemplo",
        nombre: "Carla Díaz",
        whatsapp: "584129876543",
        estado: "agendada",
        horario: "Lunes 27 10am",
        direccion: "Av. Libertador, local 4, frente al banco. 0412-9876543",
      },
      {
        id: "sin-horarios",
        nombre: "Pedro",
        whatsapp: "584145556677",
        estado: "sin-horarios",
      },
    ]);
  });

  if (cuentas.admin) {
    const id = await crearUsuario(
      db,
      cuentas.admin.email,
      cuentas.admin.password,
    );
    await db.insert(admins).values({ userId: id }).onConflictDoNothing();
  }
  if (cuentas.sinAcceso) {
    await crearUsuario(db, cuentas.sinAcceso.email, cuentas.sinAcceso.password);
  }

  return {
    marcas: MARCAS_INICIALES.length,
    productos: CATALOGO_INICIAL.length,
    planes: PLANES_RCV_INICIALES.length,
    clientes: celulares.length + rcv.length,
  };
}
