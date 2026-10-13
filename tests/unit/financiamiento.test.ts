import { describe, expect, test } from "bun:test";
import {
  conservarPagos,
  generarCuotas,
  marcarCuota,
  resumenPagos,
} from "@/lib/financiamiento/cuotas";
import {
  diasEntre,
  esFecha,
  fechaCorta,
  hoyCaracas,
  sumarDias,
  sumarMeses,
} from "@/lib/financiamiento/fechas";
import {
  avisoPendiente,
  estadoPoliza,
  renovacion,
  venceDe,
  whatsappDe,
} from "@/lib/financiamiento/poliza";
import {
  type FormularioClienteCelular,
  type FormularioClienteRcv,
  formularioPagos,
  validarClienteCelular,
  validarClienteRcv,
} from "@/lib/financiamiento/validacion";
import { validarPlanRcv } from "@/lib/rcv/validacion";

describe("fechas", () => {
  test("hoy en Caracas (UTC-4), no en UTC", () => {
    // 02:30 UTC del 14 = 22:30 del 13 en Caracas.
    expect(hoyCaracas(new Date("2026-10-14T02:30:00Z"))).toBe("2026-10-13");
  });
  test("sumar días y meses sin desbordar", () => {
    expect(sumarDias("2026-12-25", 10)).toBe("2027-01-04");
    expect(sumarMeses("2026-01-31", 1)).toBe("2026-02-28");
    expect(sumarMeses("2028-02-29", 12)).toBe("2029-02-28");
    expect(sumarMeses("2026-10-13", 12)).toBe("2027-10-13");
  });
  test("días entre fechas y validación", () => {
    expect(diasEntre("2026-10-13", "2026-11-12")).toBe(30);
    expect(diasEntre("2026-10-13", "2026-10-10")).toBe(-3);
    expect(esFecha("2026-02-30")).toBe(false);
    expect(esFecha("2026-2-3")).toBe(false);
    expect(esFecha("2026-02-28")).toBe(true);
    expect(fechaCorta("2026-11-05")).toBe("05/11/2026");
  });
});

describe("cuotas", () => {
  test("quincenal = cada 15 días; mensual = mismo día de cada mes", () => {
    expect(
      generarCuotas(25, 3, "quincenal", "2026-10-01").map((c) => c.vence),
    ).toEqual(["2026-10-01", "2026-10-16", "2026-10-31"]);
    expect(
      generarCuotas(25, 3, "mensual", "2026-01-31").map((c) => c.vence),
    ).toEqual(["2026-01-31", "2026-02-28", "2026-03-31"]);
    expect(
      generarCuotas(10, 2, "semanal", "2026-10-01").map((c) => c.vence),
    ).toEqual(["2026-10-01", "2026-10-08"]);
  });

  test("resumen: al día, atrasado y pagado", () => {
    const cuotas = generarCuotas(25, 4, "quincenal", "2026-09-01");
    const plan = { inicial: 60, frecuencia: "quincenal" as const, cuotas };
    // Vencen 01/09, 16/09, 01/10, 16/10. Hoy 13/10: tres vencidas sin pagar.
    let r = resumenPagos(plan, "2026-10-13");
    expect(r.estado).toBe("atrasado");
    expect(r.vencidas).toBe(3);
    expect(r.saldoVencido).toBe(75);
    expect(r.saldo).toBe(100);
    expect(r.cobrado).toBe(60);
    expect(r.proxima?.numero).toBe(1);

    let pagadas = cuotas;
    for (const n of [1, 2, 3])
      pagadas = marcarCuota(pagadas, n, true, "2026-10-13");
    r = resumenPagos({ ...plan, cuotas: pagadas }, "2026-10-13");
    expect(r.estado).toBe("al-dia");
    expect(r.proxima?.numero).toBe(4);
    expect(r.cobrado).toBe(135);

    pagadas = marcarCuota(pagadas, 4, true, "2026-10-13");
    r = resumenPagos({ ...plan, cuotas: pagadas }, "2026-10-13");
    expect(r.estado).toBe("pagado");
    expect(r.proxima).toBeNull();
    expect(r.saldo).toBe(0);
  });

  test("desmarcar quita la fecha de pago", () => {
    const c = marcarCuota(
      generarCuotas(25, 1, "quincenal", "2026-10-01"),
      1,
      true,
      "2026-10-02",
    );
    expect(c[0]).toMatchObject({ pagada: true, pagadaEl: "2026-10-02" });
    expect(marcarCuota(c, 1, false, "2026-10-03")[0]).toMatchObject({
      pagada: false,
      pagadaEl: null,
    });
  });

  test("al rehacer el plan se conservan las cuotas pagadas por número", () => {
    const previas = marcarCuota(
      generarCuotas(25, 6, "quincenal", "2026-10-01"),
      2,
      true,
      "2026-10-16",
    );
    const nuevas = conservarPagos(
      generarCuotas(30, 4, "mensual", "2026-10-01"),
      previas,
    );
    expect(nuevas.map((c) => c.pagada)).toEqual([false, true, false, false]);
    expect(nuevas[1]).toMatchObject({ monto: 30, pagadaEl: "2026-10-16" });
  });
});

describe("vigencia de la póliza (D033)", () => {
  const poliza = (emision: string | null) => ({
    emision,
    vence: emision ? venceDe(emision) : null,
    recordatorio30: false,
    recordatorio3: false,
  });

  test("estado según los días que faltan", () => {
    expect(estadoPoliza(poliza(null), "2026-10-13").tipo).toBe("sin-emitir");
    expect(estadoPoliza(poliza("2026-03-01"), "2026-10-13")).toEqual({
      tipo: "vigente",
      dias: 139,
    });
    expect(estadoPoliza(poliza("2025-11-02"), "2026-10-13")).toEqual({
      tipo: "por-vencer",
      dias: 20,
    });
    expect(estadoPoliza(poliza("2025-10-10"), "2026-10-13")).toEqual({
      tipo: "vencida",
      dias: 3,
    });
  });

  test("aviso del mes a los 30 días y final a los 3; nada si ya se mandó", () => {
    const p = poliza("2025-11-12"); // vence 2026-11-12
    expect(avisoPendiente(p, "2026-10-12")).toBeNull(); // faltan 31
    expect(avisoPendiente(p, "2026-10-13")).toBe("mes"); // faltan 30
    expect(
      avisoPendiente({ ...p, recordatorio30: true }, "2026-10-20"),
    ).toBeNull();
    expect(avisoPendiente({ ...p, recordatorio30: true }, "2026-11-09")).toBe(
      "final",
    );
    expect(
      avisoPendiente(
        { ...p, recordatorio30: true, recordatorio3: true },
        "2026-11-10",
      ),
    ).toBeNull();
    // Registrada tarde: solo el final, no los dos.
    expect(avisoPendiente(p, "2026-11-11")).toBe("final");
    // Vencida: ya no avisa el bot.
    expect(avisoPendiente(p, "2026-11-13")).toBeNull();
    expect(avisoPendiente(poliza(null), "2026-11-13")).toBeNull();
  });

  test("renovar: arranca donde vencía (o hoy si ya venció) y reinicia los avisos", () => {
    const vigente = { ...poliza("2025-11-12"), recordatorio30: true };
    expect(renovacion(vigente, "2026-10-20")).toEqual({
      emision: "2026-11-12",
      vence: "2027-11-12",
      recordatorio30: false,
      recordatorio3: false,
    });
    expect(renovacion(poliza("2025-01-05"), "2026-10-13")).toMatchObject({
      emision: "2026-10-13",
      vence: "2027-10-13",
    });
  });

  test("número de WhatsApp desde como se escribió", () => {
    expect(whatsappDe("0414-1234567")).toBe("584141234567");
    expect(whatsappDe("414 123 4567")).toBe("584141234567");
    expect(whatsappDe("+58 412 7654321")).toBe("584127654321");
    expect(whatsappDe("+57 300 1234567")).toBe("573001234567");
    expect(whatsappDe("1234")).toBeNull();
    expect(whatsappDe("")).toBeNull();
  });
});

const pagos = {
  inicial: "60",
  cuota: "25",
  numeroCuotas: "6",
  frecuencia: "quincenal" as const,
  primera: "2026-10-28",
};

describe("validarClienteCelular", () => {
  const base: FormularioClienteCelular = {
    nombre: "  María   Pérez ",
    cedula: "v-12345678",
    telefono: "0414-1234567",
    equipo: "HONOR 600 Elite 8/256",
    notas: "",
    ...pagos,
  };

  test("limpia los textos y genera las cuotas", () => {
    const r = validarClienteCelular(base);
    if (!r.ok) throw new Error(JSON.stringify(r.errores));
    expect(r.valor.nombre).toBe("María Pérez");
    expect(r.valor.cedula).toBe("V-12345678");
    expect(r.valor.pagos.inicial).toBe(60);
    expect(r.valor.pagos.cuotas).toHaveLength(6);
    expect(r.valor.pagos.cuotas[5].vence).toBe("2027-01-11");
  });

  test("errores por campo", () => {
    const r = validarClienteCelular({
      ...base,
      nombre: "",
      telefono: "123",
      equipo: "",
      cuota: "0",
      numeroCuotas: "61",
      primera: "2026-02-30",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.errores).sort()).toEqual(
      [
        "cuota",
        "equipo",
        "nombre",
        "numeroCuotas",
        "primera",
        "telefono",
      ].sort(),
    );
  });

  test("inicial vacía = 0", () => {
    const r = validarClienteCelular({ ...base, inicial: "" });
    expect(r.ok && r.valor.pagos.inicial).toBe(0);
  });

  test("ida y vuelta con formularioPagos", () => {
    const r = validarClienteCelular({ ...base, cuota: "25,50" });
    if (!r.ok) throw new Error("debía validar");
    expect(formularioPagos(r.valor.pagos, "2026-10-13")).toEqual({
      ...pagos,
      cuota: "25,50",
    });
  });
});

describe("validarClienteRcv", () => {
  const base: FormularioClienteRcv = {
    nombre: "José Rodríguez",
    cedula: "",
    telefono: "0412-7654321",
    correo: " Jose@Correo.com ",
    direccion: "",
    vehiculo: "taxi — plan básico",
    placa: "ab123cd",
    notas: "",
    emision: "2026-01-15",
    financiado: false,
    ...pagos,
  };

  test("de contado: sin cuotas; vence a un año; avisos en cero", () => {
    const r = validarClienteRcv(base);
    if (!r.ok) throw new Error(JSON.stringify(r.errores));
    expect(r.valor).toMatchObject({
      correo: "jose@correo.com",
      vehiculo: "TAXI — PLAN BÁSICO",
      placa: "AB123CD",
      vence: "2027-01-15",
      recordatorio30: false,
      recordatorio3: false,
      pagos: null,
    });
  });

  test("sin emisión = póliza aún no confirmada", () => {
    const r = validarClienteRcv({ ...base, emision: "" });
    expect(r.ok && [r.valor.emision, r.valor.vence]).toEqual([null, null]);
  });

  test("misma emisión conserva los avisos; otra los reinicia", () => {
    const previo = {
      emision: "2026-01-15",
      recordatorio30: true,
      recordatorio3: false,
      pagos: null,
    };
    const igual = validarClienteRcv(base, previo);
    expect(igual.ok && igual.valor.recordatorio30).toBe(true);
    const otra = validarClienteRcv({ ...base, emision: "2026-02-01" }, previo);
    expect(otra.ok && otra.valor.recordatorio30).toBe(false);
  });

  test("financiada valida el plan; correo inválido falla", () => {
    const r = validarClienteRcv({ ...base, financiado: true, cuota: "" });
    expect(r.ok).toBe(false);
    const ok = validarClienteRcv({ ...base, financiado: true });
    expect(ok.ok && ok.valor.pagos?.cuotas).toHaveLength(6);
    const correo = validarClienteRcv({ ...base, correo: "jose@" });
    expect(!correo.ok && correo.errores.correo).toBeTruthy();
  });
});

describe("planes RCV sin placas extranjeras (D034)", () => {
  test("«extranjeras» se descarta; si era la única, falta categoría", () => {
    const base = {
      clase: "X",
      descripcion: "Y",
      precioEur: "",
      financiamiento: false,
      activo: true,
    };
    const solo = validarPlanRcv({ ...base, categorias: ["extranjeras"] });
    expect(solo.ok).toBe(false);
    const mixto = validarPlanRcv({
      ...base,
      categorias: ["extranjeras", "privado"],
    });
    expect(mixto.ok && mixto.valor.categorias).toEqual(["privado"]);
  });
});
