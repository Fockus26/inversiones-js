/**
 * Clientes de ejemplo (D032, D037): los usa el seed del emulador y el modo demo del panel
 * (`?demo`). Cubren los casos que muestra /clientes. Las fechas son relativas a hoy, así los
 * estados (al día, atrasado, por vencer…) siempre se ven igual.
 * Nombres y teléfonos inventados.
 */
import { generarCuotas, marcarCuota } from "@/lib/financiamiento/cuotas";
import { type Fecha, sumarDias } from "@/lib/financiamiento/fechas";
import { venceDe } from "@/lib/financiamiento/poliza";
import type {
  CamposClienteCelular,
  CamposClienteRcv,
  Frecuencia,
  PlanPagos,
} from "@/lib/financiamiento/tipos";

/** Plan con las primeras `pagadas` cuotas ya cobradas (cada una el día que vencía). */
function plan(
  hoy: Fecha,
  o: {
    inicial: number;
    cuota: number;
    numero: number;
    frecuencia: Frecuencia;
    /** Días desde hoy hasta la primera cuota (negativo = ya pasó). */
    primera: number;
    pagadas: number;
  },
): PlanPagos {
  let cuotas = generarCuotas(
    o.cuota,
    o.numero,
    o.frecuencia,
    sumarDias(hoy, o.primera),
  );
  for (const c of cuotas.slice(0, o.pagadas))
    cuotas = marcarCuota(cuotas, c.numero, true, c.vence);
  return { inicial: o.inicial, frecuencia: o.frecuencia, cuotas };
}

export function clientesCelularesDePrueba(
  hoy: Fecha,
): (CamposClienteCelular & { id: string })[] {
  const persona = { cedula: "", notas: "" };
  return [
    {
      id: "prueba-maria-perez",
      ...persona,
      nombre: "María Pérez",
      cedula: "V-18456789",
      telefono: "0414-1234567",
      equipo: "HONOR 600 Elite 8/256",
      // Al día: pagó 3 de 6 y la cuarta vence hoy.
      pagos: plan(hoy, {
        inicial: 60,
        cuota: 25,
        numero: 6,
        frecuencia: "quincenal",
        primera: -45,
        pagadas: 3,
      }),
    },
    {
      id: "prueba-carlos-mendoza",
      ...persona,
      nombre: "Carlos Mendoza",
      cedula: "V-20111222",
      telefono: "0424-5550101",
      equipo: "REDMI Note 15 8/256",
      notas: "Dice que paga el viernes. Llamar si no aparece.",
      // Atrasado: dos cuotas vencidas sin pagar.
      pagos: plan(hoy, {
        inicial: 50,
        cuota: 30,
        numero: 6,
        frecuencia: "quincenal",
        primera: -60,
        pagadas: 2,
      }),
    },
    {
      id: "prueba-luisa-fernandez",
      ...persona,
      nombre: "Luisa Fernández",
      telefono: "0412-7778899",
      equipo: "SAMSUNG A16 4/128",
      // Terminó de pagar.
      pagos: plan(hoy, {
        inicial: 40,
        cuota: 22,
        numero: 6,
        frecuencia: "quincenal",
        primera: -100,
        pagadas: 6,
      }),
    },
    {
      id: "prueba-pedro-gomez",
      ...persona,
      nombre: "Pedro Gómez",
      cedula: "V-25333444",
      telefono: "0416-2223344",
      equipo: "TECNO Spark 40 8/256",
      // Recién vendido: la primera cuota es en 10 días.
      pagos: plan(hoy, {
        inicial: 45,
        cuota: 20,
        numero: 6,
        frecuencia: "quincenal",
        primera: 10,
        pagadas: 0,
      }),
    },
    {
      id: "prueba-ana-torres",
      ...persona,
      nombre: "Ana Torres",
      telefono: "0426-1110022",
      equipo: "INFINIX Hot 60 8/256",
      // Mensual: una cuota atrasada.
      pagos: plan(hoy, {
        inicial: 0,
        cuota: 40,
        numero: 4,
        frecuencia: "mensual",
        primera: -40,
        pagadas: 1,
      }),
    },
    {
      id: "prueba-jorge-salas",
      ...persona,
      nombre: "Jorge Salas",
      telefono: "0414-9990011",
      equipo: "HONOR X6c 6/128",
      // Semanal al día.
      pagos: plan(hoy, {
        inicial: 30,
        cuota: 15,
        numero: 8,
        frecuencia: "semanal",
        primera: -21,
        pagadas: 3,
      }),
    },
  ];
}

export function clientesRcvDePrueba(
  hoy: Fecha,
): (CamposClienteRcv & { id: string })[] {
  /** Póliza emitida hace `dias` días (vence a un año de esa fecha). */
  const emitida = (dias: number) => {
    const emision = sumarDias(hoy, -dias);
    return { emision, vence: venceDe(emision) };
  };
  const base = {
    cedula: "",
    correo: "",
    direccion: "",
    placa: "",
    notas: "",
    recordatorio30: false,
    recordatorio3: false,
    pagos: null,
  };
  return [
    {
      id: "prueba-jose-rodriguez",
      ...base,
      nombre: "José Rodríguez",
      cedula: "V-14555666",
      telefono: "0412-7654321",
      correo: "jose@ejemplo.com",
      vehiculo: "TAXI — PLAN BÁSICO TAXI POR PUESTOS",
      placa: "AB123CD",
      // Vence en ~25 días: Gaby ya mandó el aviso del mes.
      ...emitida(340),
      recordatorio30: true,
    },
    {
      id: "prueba-rosa-diaz",
      ...base,
      nombre: "Rosa Díaz",
      telefono: "0424-3332211",
      vehiculo: "MOTO — MOTOCICLETAS",
      placa: "AE1B23C",
      // Vence en ~2 días y no renovó: le toca el aviso final.
      ...emitida(363),
      recordatorio30: true,
    },
    {
      id: "prueba-miguel-castro",
      ...base,
      nombre: "Miguel Castro",
      telefono: "0416-8887766",
      direccion: "Av. Bolívar, San Cristóbal",
      vehiculo: "PARTICULAR — PLAN BÁSICO PARTICULAR HASTA 800KG",
      placa: "AC456DE",
      // Venció hace ~10 días.
      ...emitida(375),
      recordatorio30: true,
      recordatorio3: true,
    },
    {
      id: "prueba-carmen-lopez",
      ...base,
      nombre: "Carmen López",
      telefono: "0414-4445566",
      correo: "carmen@ejemplo.com",
      vehiculo: "MINIBUSES URBANOS Y SUBURBANOS — PLAN II APOV/EXC",
      placa: "11AB2CD",
      ...emitida(60),
      // Financiada y con dos cuotas atrasadas.
      pagos: plan(hoy, {
        inicial: 31,
        cuota: 25,
        numero: 4,
        frecuencia: "quincenal",
        primera: -60,
        pagadas: 2,
      }),
    },
    {
      id: "prueba-daniel-herrera",
      ...base,
      nombre: "Daniel Herrera",
      telefono: "0426-5554433",
      vehiculo: "PICK UP — PLAN BÁSICO PARTICULAR PICK UP",
      placa: "AD789FG",
      ...emitida(200),
      // Financiada y pagada completa.
      pagos: plan(hoy, {
        inicial: 15,
        cuota: 10,
        numero: 3,
        frecuencia: "mensual",
        primera: -200,
        pagadas: 3,
      }),
    },
    {
      id: "prueba-patricia-gil",
      ...base,
      nombre: "Patricia Gil",
      telefono: "0412-1212121",
      correo: "patricia@ejemplo.com",
      vehiculo: "CARGA — PLAN BÁSICO CARGA DE 2 TM A 5 TM",
      notas: "Llegó por el chat. Falta la foto del título.",
      // Aún sin emitir.
      emision: null,
      vence: null,
    },
    {
      id: "prueba-andres-ruiz",
      ...base,
      nombre: "Andrés Ruiz",
      telefono: "+57 300 1234567",
      vehiculo: "PLACAS EXTRANJERAS — CAMIONETA TOYOTA HILUX 2018",
      placa: "KJT482",
      ...emitida(30),
      // Placas extranjeras, financiada y al día.
      pagos: plan(hoy, {
        inicial: 40,
        cuota: 50,
        numero: 3,
        frecuencia: "mensual",
        primera: -25,
        pagadas: 1,
      }),
    },
  ];
}
