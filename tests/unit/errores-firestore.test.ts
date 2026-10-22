import { describe, expect, test } from "bun:test";
import { MENSAJE_INESPERADO, mensajeDeError } from "@/lib/firebase/errores";

const conCodigo = (code: string) =>
  Object.assign(new Error(`${code.toUpperCase()}: evaluation error at L228`), {
    code,
  });

describe("mensajeDeError", () => {
  test("traduce los códigos de Firestore y nunca muestra el texto técnico", () => {
    const m = mensajeDeError(conCodigo("permission-denied"));
    expect(m).toContain("No se aceptó el cambio");
    expect(m).not.toContain("L228");
    expect(mensajeDeError(conCodigo("not-found"))).toContain("ya no existe");
  });

  test("un código desconocido da el mensaje genérico", () => {
    expect(mensajeDeError(conCodigo("data-loss"))).toBe(MENSAJE_INESPERADO);
  });

  test("los errores propios (sin código) se muestran tal cual", () => {
    expect(mensajeDeError(new Error("Sin sesión: inicia sesión."))).toBe(
      "Sin sesión: inicia sesión.",
    );
    expect(mensajeDeError("texto")).toBeUndefined();
  });
});
