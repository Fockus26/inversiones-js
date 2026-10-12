import { describe, expect, test } from "bun:test";
import { Cupos, comandoDe, RegistroEnvios } from "../src/control";

describe("comandoDe", () => {
  test("reconoce on/off/estado y sinónimos, sin importar mayúsculas", () => {
    expect(comandoDe("Gaby off")).toBe("off");
    expect(comandoDe("gaby apagar")).toBe("off");
    expect(comandoDe("#GABY ON")).toBe("on");
    expect(comandoDe("gaby encender!")).toBe("on");
    expect(comandoDe("gaby estado")).toBe("estado");
  });
  test("no confunde mensajes normales", () => {
    expect(comandoDe("hola gaby")).toBeNull();
    expect(comandoDe("gaby")).toBeNull();
    expect(comandoDe("gaby quiero el note 15")).toBeNull();
    expect(comandoDe("off")).toBeNull();
  });
});

describe("RegistroEnvios", () => {
  test("distingue lo que mandó el bot de lo escrito a mano", () => {
    let t = 0;
    const r = new RegistroEnvios(() => t);
    r.anotarTexto("a@s.whatsapp.net", "Hola,  ¿cómo estás?");
    r.anotarId("ID1");
    expect(r.esDelBot("a@s.whatsapp.net", "otro", "Hola, ¿cómo estás?")).toBe(
      true,
    );
    expect(r.esDelBot("b@s.whatsapp.net", "otro", "Hola, ¿cómo estás?")).toBe(
      false,
    );
    expect(r.esDelBot("b@s.whatsapp.net", "ID1", "")).toBe(true);
    expect(r.esDelBot("a@s.whatsapp.net", "X", "Ya te atiendo yo")).toBe(false);
    t = 16 * 60_000;
    expect(r.esDelBot("a@s.whatsapp.net", "ID1", "Hola, ¿cómo estás?")).toBe(
      false,
    );
  });
});

describe("Cupos", () => {
  test("tope por chat en 10 min, se libera después", () => {
    let t = 0;
    const c = new Cupos(2, 100, () => t);
    expect(c.usar("a")).toBe(true);
    expect(c.usar("a")).toBe(true);
    expect(c.usar("a")).toBe(false);
    expect(c.usar("b")).toBe(true);
    t = 601_000;
    expect(c.usar("a")).toBe(true);
  });
  test("tope global por hora", () => {
    const c = new Cupos(10, 2, () => 0);
    expect(c.usar("a")).toBe(true);
    expect(c.usar("b")).toBe(true);
    expect(c.usar("c")).toBe(false);
  });
});
