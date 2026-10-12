"use client";

import { LoaderCircleIcon } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { FOCO, haceCuanto } from "@/components/catalogo/formato";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cotizar, textoPrecio } from "@/lib/rcv/cotizacion";
import { guardarTasas } from "@/lib/rcv/repositorio";
import type { TasasRcv } from "@/lib/rcv/tipos";
import { validarTasas } from "@/lib/rcv/validacion";
import { cn } from "@/lib/utils";

const aTexto = (n: number | undefined) =>
  n === undefined ? "" : String(n).replace(".", ",");

/**
 * Tasas del día: el precio de cada transporte está fijo en euros y aquí se dice cuánto vale
 * 1 € en dólares y en bolívares. El chat recalcula los precios al guardar (en menos de 1 min).
 */
export function Tasas({
  tasas,
  actualizadoEn,
}: {
  tasas: TasasRcv | null;
  actualizadoEn: Date | null | undefined;
}) {
  const prefijo = useId();
  const [usd, setUsd] = useState(aTexto(tasas?.usd));
  const [bs, setBs] = useState(aTexto(tasas?.bs));
  const [intentado, setIntentado] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const resultado = validarTasas(usd, bs);
  const errores = intentado && !resultado.ok ? resultado.errores : {};
  const cambiado =
    resultado.ok &&
    (resultado.valor.usd !== tasas?.usd || resultado.valor.bs !== tasas?.bs);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setIntentado(true);
    if (!resultado.ok) return;
    setGuardando(true);
    try {
      await guardarTasas(resultado.valor);
      toast.success("Guardaste las tasas", {
        description: "El chat ya muestra los precios con estas tasas.",
      });
      setIntentado(false);
    } catch (err) {
      toast.error("No se pudieron guardar las tasas", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setGuardando(false);
    }
  }

  const campo = (
    id: "usd" | "bs",
    etiqueta: string,
    valor: string,
    cambiar: (v: string) => void,
    ejemplo: string,
  ) => {
    const error = errores[id];
    return (
      <div className="grid gap-1.5">
        <Label htmlFor={`${prefijo}-${id}`}>{etiqueta}</Label>
        <Input
          id={`${prefijo}-${id}`}
          value={valor}
          onChange={(e) => cambiar(e.target.value)}
          inputMode="decimal"
          placeholder={ejemplo}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${prefijo}-${id}-error` : undefined}
          className={cn("h-11", FOCO)}
          autoComplete="off"
        />
        {error && (
          <p id={`${prefijo}-${id}-error`} className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  };

  return (
    <section
      aria-labelledby={`${prefijo}-titulo`}
      className="grid gap-4 rounded-xl border bg-card p-4 text-card-foreground"
    >
      <div className="grid gap-1">
        <h2 id={`${prefijo}-titulo`} className="text-lg font-semibold">
          Tasas del día
        </h2>
        <p className="text-sm text-muted-foreground">
          {tasas
            ? actualizadoEn
              ? `Actualizadas ${haceCuanto(actualizadoEn)}.`
              : "Guardadas."
            : "Todavía no hay tasas: el chat muestra los precios solo en euros."}
        </p>
      </div>
      <form
        onSubmit={enviar}
        noValidate
        className="grid items-start gap-4 sm:grid-cols-[1fr_1fr_auto]"
      >
        {campo("usd", "1 € en dólares ($)", usd, setUsd, "1,12")}
        {campo("bs", "1 € en bolívares (Bs.)", bs, setBs, "979,08")}
        <Button
          type="submit"
          className={cn("h-11 sm:mt-6", FOCO)}
          disabled={guardando || (!cambiado && resultado.ok)}
        >
          {guardando && (
            <LoaderCircleIcon
              className="motion-safe:animate-spin"
              aria-hidden="true"
            />
          )}
          {guardando ? "Guardando…" : "Guardar tasas"}
        </Button>
      </form>
      {resultado.ok && (
        <p className="text-sm" aria-live="polite">
          Ejemplo: {textoPrecio(cotizar(15, resultado.valor))}
        </p>
      )}
    </section>
  );
}
