"use client";

import { LoaderCircleIcon, RefreshCwIcon } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { FOCO, haceCuanto } from "@/components/catalogo/formato";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cotizar, numeroEs, textoPrecio } from "@/lib/rcv/cotizacion";
import { guardarTasas } from "@/lib/rcv/repositorio";
import { type ConfigRcv, type FuenteBs, fuenteBsDe } from "@/lib/rcv/tipos";
import { type TextosTasas, validarTasas } from "@/lib/rcv/validacion";
import { cn } from "@/lib/utils";
import type { EstadoTasaBcv } from "./use-tasa-bcv";

const aTexto = (n: number | undefined) =>
  n === undefined ? "" : String(n).replace(".", ",");

const fechaBcv = new Intl.DateTimeFormat("es-VE", {
  dateStyle: "medium",
  timeZone: "America/Caracas",
});

const OPCIONES_BS: { valor: FuenteBs; nombre: string }[] = [
  { valor: "bcv", nombre: "Tasa BCV" },
  { valor: "manual", nombre: "Manual" },
];

/**
 * Tasas del día (D031): el precio de cada transporte está fijo en euros y aquí se dice cuánto
 * vale 1 € en dólares, bolívares y pesos colombianos. Dólares y pesos se escriben a mano; los
 * bolívares pueden seguir solos la tasa oficial del BCV o escribirse. El chat recalcula en < 1 min.
 */
export function Tasas({
  config,
  bcv,
}: {
  config: ConfigRcv | null;
  bcv: EstadoTasaBcv & { reintentar: () => void };
}) {
  const prefijo = useId();
  const guardada = fuenteBsDe(config);
  // Sin nada guardado se propone la del BCV; si ya hay tasa manual, se respeta.
  const [fuente, setFuente] = useState<FuenteBs>(
    config?.fuenteBs || config?.tasaBs ? guardada : "bcv",
  );
  const [textos, setTextos] = useState<TextosTasas>({
    usd: aTexto(config?.tasaUsd),
    bs: aTexto(config?.tasaBs),
    cop: aTexto(config?.tasaCop),
  });
  const [intentado, setIntentado] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const resultado = validarTasas(textos, fuente);
  const errores = intentado && !resultado.ok ? resultado.errores : {};
  const bcvLista = bcv.tipo === "lista" ? bcv.tasa : null;
  // Con BCV caído y sin una tasa guardada no hay bolívares con qué cotizar.
  const sinBs = fuente === "bcv" && bcvLista === null && !config?.tasaBs;
  const bsEfectiva =
    fuente === "manual"
      ? resultado.ok
        ? resultado.valor.bs
        : null
      : (bcvLista ?? config?.tasaBs ?? null);
  const cambiado =
    resultado.ok &&
    (resultado.valor.usd !== config?.tasaUsd ||
      resultado.valor.cop !== config?.tasaCop ||
      fuente !== guardada ||
      (fuente === "manual" && resultado.valor.bs !== config?.tasaBs));

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setIntentado(true);
    if (!resultado.ok) return;
    if (sinBs) {
      toast.error("No se pudo consultar la tasa del BCV", {
        description: "Reintenta o escribe la tasa de bolívares a mano.",
      });
      return;
    }
    setGuardando(true);
    try {
      await guardarTasas({
        usd: resultado.valor.usd,
        cop: resultado.valor.cop,
        fuenteBs: fuente,
        bs: fuente === "manual" ? resultado.valor.bs : bcvLista,
      });
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

  const campo = (id: keyof TextosTasas, etiqueta: string, ejemplo: string) => {
    const error = errores[id];
    return (
      <div className="grid gap-1.5">
        <Label htmlFor={`${prefijo}-${id}`}>{etiqueta}</Label>
        <Input
          id={`${prefijo}-${id}`}
          value={textos[id]}
          onChange={(e) => setTextos((t) => ({ ...t, [id]: e.target.value }))}
          inputMode="decimal"
          placeholder={ejemplo}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${prefijo}-${id}-error` : undefined}
          className={cn("h-11", FOCO)}
          autoComplete="off"
        />
        {error && (
          <p
            id={`${prefijo}-${id}-error`}
            className="text-xs text-destructive motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1"
          >
            {error}
          </p>
        )}
      </div>
    );
  };

  const tasasVista =
    resultado.ok && bsEfectiva !== null
      ? { usd: resultado.valor.usd, bs: bsEfectiva, cop: resultado.valor.cop }
      : null;
  const hayGuardadas = Boolean(config?.tasaUsd && config?.tasaBs);

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
          {hayGuardadas
            ? config?.actualizadoEn
              ? `Actualizadas ${haceCuanto(config.actualizadoEn)}.`
              : "Guardadas."
            : "Todavía no hay tasas: el chat muestra los precios solo en euros."}
        </p>
      </div>
      <form onSubmit={enviar} noValidate className="grid gap-4">
        <fieldset className="grid gap-2">
          <legend className="mb-1.5 text-sm font-medium">
            1 € en bolívares (Bs.)
          </legend>
          <div
            role="radiogroup"
            aria-label="De dónde sale la tasa de bolívares"
            className="relative grid grid-cols-2 gap-1 rounded-xl border bg-muted p-1 sm:max-w-xs"
          >
            {/* Píldora que se desliza bajo la opción elegida. */}
            <span
              aria-hidden="true"
              className={cn(
                "absolute inset-y-1 left-1 w-[calc(50%-0.375rem)] rounded-lg bg-card shadow-sm transition-transform duration-300 ease-out motion-reduce:transition-none",
                fuente === "manual" && "translate-x-[calc(100%+0.25rem)]",
              )}
            />
            {OPCIONES_BS.map((o) => (
              <label
                key={o.valor}
                className={cn(
                  "relative flex h-11 cursor-pointer items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring",
                  fuente === o.valor
                    ? "text-card-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <input
                  type="radio"
                  name={`${prefijo}-fuente`}
                  value={o.valor}
                  checked={fuente === o.valor}
                  onChange={() => setFuente(o.valor)}
                  className="sr-only"
                />
                {o.nombre}
              </label>
            ))}
          </div>
          <div
            key={fuente}
            className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 motion-safe:duration-300"
          >
            {fuente === "manual" ? (
              campo("bs", "Tasa manual", "979,08")
            ) : (
              <EstadoBcv bcv={bcv} respaldo={config?.tasaBs} />
            )}
          </div>
        </fieldset>

        <div className="grid items-start gap-4 sm:grid-cols-[1fr_1fr_auto]">
          {campo("usd", "1 € en dólares ($)", "1,12")}
          {campo("cop", "1 € en pesos colombianos (COP)", "4350")}
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
        </div>
      </form>
      {tasasVista && (
        <p className="text-sm" aria-live="polite">
          Ejemplo: {textoPrecio(cotizar(15, tasasVista))}
        </p>
      )}
    </section>
  );
}

function EstadoBcv({
  bcv,
  respaldo,
}: {
  bcv: EstadoTasaBcv & { reintentar: () => void };
  respaldo: number | undefined;
}) {
  if (bcv.tipo === "cargando")
    return (
      <p className="flex min-h-11 items-center gap-2 text-sm text-muted-foreground">
        <LoaderCircleIcon
          aria-hidden="true"
          className="size-4 motion-safe:animate-spin"
        />
        Consultando la tasa del BCV…
      </p>
    );
  if (bcv.tipo === "error")
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed p-2 text-sm">
        <span className="flex-1">
          No se pudo consultar el BCV ahora.
          {respaldo
            ? ` El chat sigue con la última guardada: Bs. ${numeroEs(respaldo)}.`
            : " Reintenta o usa la tasa manual."}
        </span>
        <Button
          type="button"
          variant="outline"
          className={cn("h-11", FOCO)}
          onClick={bcv.reintentar}
        >
          <RefreshCwIcon aria-hidden="true" />
          Reintentar
        </Button>
      </div>
    );
  return (
    <p className="grid min-h-11 content-center gap-0.5 rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground">
      <span>
        <strong className="tabular-nums">Bs. {numeroEs(bcv.tasa)}</strong> por
        euro, tasa oficial del BCV
        {bcv.fecha ? ` del ${fechaBcv.format(bcv.fecha)}` : ""}.
      </span>
      <span className="text-xs">
        Se actualiza sola: el chat siempre cotiza con la tasa vigente.
      </span>
    </p>
  );
}
