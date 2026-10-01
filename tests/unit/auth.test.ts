import { describe, expect, test } from "bun:test";
import { MENSAJE_GENERICO, mensajeDeErrorAuth } from "@/lib/auth/errores";
import {
  RUTA_INICIO_PANEL,
  rutaSiguienteSegura,
  urlLoginConSiguiente,
} from "@/lib/auth/siguiente";

describe("rutaSiguienteSegura", () => {
  test("acepta rutas internas", () => {
    expect(rutaSiguienteSegura("/productos")).toBe("/productos");
    expect(rutaSiguienteSegura("/productos/abc?x=1")).toBe(
      "/productos/abc?x=1",
    );
  });

  test("rechaza destinos externos o raros", () => {
    for (const malo of [
      null,
      undefined,
      "",
      "https://evil.com",
      "//evil.com",
      "/\\evil.com",
      "javascript:alert(1)",
      "/\t/evil.com",
      "productos",
      "/login",
      "/login?siguiente=%2Fproductos",
    ]) {
      expect(rutaSiguienteSegura(malo)).toBe(RUTA_INICIO_PANEL);
    }
  });

  test("urlLoginConSiguiente codifica la ruta", () => {
    expect(urlLoginConSiguiente("/productos")).toBe(
      "/login?siguiente=%2Fproductos",
    );
  });
});

describe("mensajeDeErrorAuth", () => {
  test("no distingue usuario inexistente de contraseña mala", () => {
    const a = mensajeDeErrorAuth({ code: "auth/invalid-credential" });
    expect(mensajeDeErrorAuth({ code: "auth/user-not-found" })).toBe(a);
    expect(mensajeDeErrorAuth({ code: "auth/wrong-password" })).toBe(a);
  });

  test("traduce los códigos conocidos", () => {
    expect(mensajeDeErrorAuth({ code: "auth/too-many-requests" })).toContain(
      "Demasiados intentos",
    );
    expect(
      mensajeDeErrorAuth({ code: "auth/network-request-failed" }),
    ).toContain("conexión");
    expect(mensajeDeErrorAuth({ code: "auth/user-disabled" })).toContain(
      "desactivada",
    );
  });

  test("cualquier otra cosa da el genérico", () => {
    expect(mensajeDeErrorAuth({ code: "auth/otra-cosa" })).toBe(
      MENSAJE_GENERICO,
    );
    expect(mensajeDeErrorAuth(new Error("x"))).toBe(MENSAJE_GENERICO);
    expect(mensajeDeErrorAuth(null)).toBe(MENSAJE_GENERICO);
  });
});
