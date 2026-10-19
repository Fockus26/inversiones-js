import { describe, expect, test } from "bun:test";
import { mensajeDeError } from "@/lib/mensaje-error";

describe("mensajeDeError", () => {
  test("traduce permission-denied de Firestore", () => {
    const e = Object.assign(new Error("PERMISSION_DENIED: evaluation error"), {
      code: "permission-denied",
    });
    expect(mensajeDeError(e)).toContain("ya no tiene permiso");
  });

  test("un código desconocido conserva el mensaje", () => {
    const e = Object.assign(new Error("algo raro"), { code: "internal" });
    expect(mensajeDeError(e)).toBe("algo raro");
  });

  test("sin Error no hay descripción", () => {
    expect(mensajeDeError("texto")).toBeUndefined();
  });
});
