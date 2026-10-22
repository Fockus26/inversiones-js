"use client";

import { LoaderCircleIcon, RefreshCwIcon } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { haceCuanto } from "@/components/catalogo/formato";
import { ACTIVO } from "@/components/panel/estilos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mensajeDeError } from "@/lib/firebase/errores";
import { cotizar, numeroEs, textoPrecio } from "@/lib/rcv/cotizacion";
import { guardarTasas } from "@/lib/rcv/repositorio";
import {
  type ConfigRcv,
  type FuenteBs,
  type FuenteMercado,
  fuenteBsDe,
  fuenteCopDe,
  fuenteUsdDe,
} from "@/lib/rcv/tipos";
import {
  type FuentesTasas,
  type TextosTasas,
  validarTasas,
} from "@/lib/rcv/validacion";
import { cn } from "@/lib/utils";
import type { EstadoTasaBcv } from "./use-tasa-bcv";
import type { EstadoTasaMercado } from "./use-tasa-mercado";

const aTexto = (n: number | undefined) =>
  n === undefined ? "" : String(n).replace(".", ",");

const fechaCorta = new Intl.DateTimeFormat("es-VE", {
  dateStyle: "medium",
  timeZone: "America/Caracas",
});

const entero = new Intl.NumberFormat("es-VE", { maximumFractionDigits: 2 });

type Bcv = EstadoTasaBcv & { reintentar: () => void };
type Mercado = EstadoTasaMercado & { reintentar: () => void };

/**
 * Tasas del día (D031, D036): el precio de cada transporte está fijo en euros y aquí se dice
 * cuánto vale 1 € en bolívares, dólares y pesos colombianos. Cada una puede seguir sola su
 * fuente (bolívares: BCV; dólares y pesos: tasa de mercado, la que muestra Google) o escribirse
 * a mano. El chat recalcula en < 1 min.
 */
export function Tasas({
  config,
  bcv,
  mercado,
}: {
  config: ConfigRcv | null;
  bcv: Bcv;
  mercado: Mercado;
}) {
  const prefijo = useId();
  const guardadas: FuentesTasas = {
    bs: fuenteBsDe(config),
    usd: fuenteUsdDe(config),
    cop: fuenteCopDe(config),
  };
  // Sin nada guardado se proponen las automáticas; si ya hay tasa manual, se respeta.
  const [fuentes, setFuentes] = useState<FuentesTasas>({
    bs: config?.fuenteBs || config?.tasaBs ? guardadas.bs : "bcv",
    usd: config?.fuenteUsd || config?.tasaUsd ? guardadas.usd : "mercado",
    cop: config?.fuenteCop || config?.tasaCop ? guardadas.cop : "mercado",
  });
  const [textos, setTextos] = useState<TextosTasas>({
    usd: aTexto(config?.tasaUsd),
    bs: aTexto(config?.tasaBs),
    cop: aTexto(config?.tasaCop),
  });
  const [intentado, setIntentado] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const resultado = validarTasas(textos, fuentes);
  const errores = intentado && !resultado.ok ? resultado.errores : {};
  const enVivo = {
    bs: bcv.tipo === "lista" ? bcv.tasa : null,
    usd: mercado.tipo === "lista" ? mercado.usd : null,
    cop: mercado.tipo === "lista" ? mercado.cop : null,
  };
  const guardada = {
    bs: config?.tasaBs ?? null,
    usd: config?.tasaUsd ?? null,
    cop: config?.tasaCop ?? null,
  };
  /** La tasa que usaría el chat para cada moneda con lo elegido ahora. */
  const efectiva = (k: keyof TextosTasas): number | null => {
    if (fuentes[k] === "manual")
      return resultado.ok ? resultado.valor[k] : null;
    return enVivo[k] ?? guardada[k];
  };
  // Automática caída y sin una guardada: no hay con qué cotizar esa moneda.
  const faltan = (["bs", "usd"] as const).filter(
    (k) => fuentes[k] !== "manual" && efectiva(k) === null,
  );
  const cambiado =
    resultado.ok &&
    ((["bs", "usd", "cop"] as const).some((k) => fuentes[k] !== guardadas[k]) ||
      (["bs", "usd", "cop"] as const).some(
        (k) => fuentes[k] === "manual" && resultado.valor[k] !== guardada[k],
      ));

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setIntentado(true);
    if (!resultado.ok) return;
    if (faltan.length > 0) {
      toast.error("No se pudo consultar una tasa automática", {
        description: "Reintenta o escríbela a mano.",
      });
      return;
    }
    setGuardando(true);
    try {
      const valor = (k: keyof TextosTasas) =>
        fuentes[k] === "manual" ? resultado.valor[k] : enVivo[k];
      await guardarTasas({
        bs: valor("bs"),
        usd: valor("usd"),
        cop: valor("cop"),
        fuenteBs: fuentes.bs,
        fuenteUsd: fuentes.usd,
        fuenteCop: fuentes.cop,
      });
      toast.success("Guardaste las tasas", {
        description: "El chat ya muestra los precios con estas tasas.",
      });
      setIntentado(false);
    } catch (err) {
      toast.error("No se pudieron guardar las tasas", {
        description: mensajeDeError(err),
      });
    } finally {
      setGuardando(false);
    }
  }

  const campo = (id: keyof TextosTasas, ejemplo: string) => {
    const error = errores[id];
    return (
      <div className="grid gap-1.5">
        <Label htmlFor={`${prefijo}-${id}`}>Tasa manual</Label>
        <Input
          id={`${prefijo}-${id}`}
          value={textos[id]}
          onChange={(e) => setTextos((t) => ({ ...t, [id]: e.target.value }))}
          inputMode="decimal"
          placeholder={ejemplo}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${prefijo}-${id}-error` : undefined}
          className={cn("h-11")}
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

  const usdVista = efectiva("usd");
  const bsVista = efectiva("bs");
  const tasasVista =
    usdVista !== null && bsVista !== null
      ? { usd: usdVista, bs: bsVista, cop: efectiva("cop") }
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
      <form onSubmit={enviar} noValidate className="grid gap-5">
        <div className="grid gap-5 lg:grid-cols-3">
          <FilaTasa<FuenteBs>
            prefijo={`${prefijo}-bs`}
            titulo="1 € en bolívares (Bs.)"
            opciones={[
              { valor: "bcv", nombre: "Tasa BCV" },
              { valor: "manual", nombre: "Manual" },
            ]}
            fuente={fuentes.bs}
            alCambiar={(bs) => setFuentes((f) => ({ ...f, bs }))}
            manual={campo("bs", "979,08")}
            automatica={
              <EstadoAutomatica
                estado={bcv.tipo}
                reintentar={bcv.reintentar}
                valor={
                  bcv.tipo === "lista" ? `Bs. ${numeroEs(bcv.tasa)}` : null
                }
                fuente="tasa oficial del BCV"
                fecha={bcv.tipo === "lista" ? bcv.fecha : null}
                respaldo={
                  guardada.bs === null ? null : `Bs. ${numeroEs(guardada.bs)}`
                }
              />
            }
          />
          <FilaTasa<FuenteMercado>
            prefijo={`${prefijo}-usd`}
            titulo="1 € en dólares ($)"
            opciones={OPCIONES_MERCADO}
            fuente={fuentes.usd}
            alCambiar={(usd) => setFuentes((f) => ({ ...f, usd }))}
            manual={campo("usd", "1,12")}
            automatica={
              <EstadoAutomatica
                estado={mercado.tipo}
                reintentar={mercado.reintentar}
                valor={
                  mercado.tipo === "lista"
                    ? `${String(mercado.usd).replace(".", ",")}$`
                    : null
                }
                fuente="tasa de mercado"
                fecha={mercado.tipo === "lista" ? mercado.fecha : null}
                respaldo={
                  guardada.usd === null
                    ? null
                    : `${String(guardada.usd).replace(".", ",")}$`
                }
              />
            }
          />
          <FilaTasa<FuenteMercado>
            prefijo={`${prefijo}-cop`}
            titulo="1 € en pesos colombianos (COP)"
            opciones={OPCIONES_MERCADO}
            fuente={fuentes.cop}
            alCambiar={(cop) => setFuentes((f) => ({ ...f, cop }))}
            manual={campo("cop", "4350")}
            automatica={
              <EstadoAutomatica
                estado={mercado.tipo}
                reintentar={mercado.reintentar}
                valor={
                  mercado.tipo === "lista"
                    ? `${entero.format(mercado.cop)} COP`
                    : null
                }
                fuente="tasa de mercado"
                fecha={mercado.tipo === "lista" ? mercado.fecha : null}
                respaldo={
                  guardada.cop === null
                    ? null
                    : `${entero.format(guardada.cop)} COP`
                }
              />
            }
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          {tasasVista ? (
            <p className="text-sm" aria-live="polite">
              Ejemplo: {textoPrecio(cotizar(15, tasasVista))}
            </p>
          ) : (
            <span />
          )}
          <Button
            type="submit"
            className={cn("h-11")}
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
    </section>
  );
}

const OPCIONES_MERCADO: { valor: FuenteMercado; nombre: string }[] = [
  { valor: "mercado", nombre: "Automática" },
  { valor: "manual", nombre: "Manual" },
];

/** Una moneda: selector automática/manual y, debajo, la tasa consultada o el campo. */
function FilaTasa<F extends string>({
  prefijo,
  titulo,
  opciones,
  fuente,
  alCambiar,
  manual,
  automatica,
}: {
  prefijo: string;
  titulo: string;
  opciones: { valor: F; nombre: string }[];
  fuente: F;
  alCambiar: (f: F) => void;
  manual: React.ReactNode;
  automatica: React.ReactNode;
}) {
  const esManual = fuente === "manual";
  return (
    <fieldset className="grid content-start gap-2">
      <legend className="mb-1.5 text-sm font-medium">{titulo}</legend>
      <div
        role="radiogroup"
        aria-label={`De dónde sale la tasa: ${titulo}`}
        className="relative grid grid-cols-2 gap-1 rounded-xl border bg-muted p-1 sm:max-w-xs"
      >
        {/* Píldora que se desliza bajo la opción elegida. */}
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-y-1 left-1 w-[calc(50%-0.375rem)] rounded-lg border border-input bg-card shadow-sm transition-transform duration-300 ease-out motion-reduce:transition-none",
            esManual && "translate-x-[calc(100%+0.25rem)]",
          )}
        />
        {opciones.map((o) => (
          <label
            key={o.valor}
            className={cn(
              "relative flex h-11 cursor-pointer items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring",
              fuente === o.valor
                ? cn("text-card-foreground", ACTIVO)
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <input
              type="radio"
              name={`${prefijo}-fuente`}
              value={o.valor}
              checked={fuente === o.valor}
              onChange={() => alCambiar(o.valor)}
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
        {esManual ? manual : automatica}
      </div>
    </fieldset>
  );
}

function EstadoAutomatica({
  estado,
  reintentar,
  valor,
  fuente,
  fecha,
  respaldo,
}: {
  estado: "cargando" | "error" | "lista";
  reintentar: () => void;
  valor: string | null;
  fuente: string;
  fecha: Date | null;
  respaldo: string | null;
}) {
  if (estado === "cargando")
    return (
      <p className="flex min-h-11 items-center gap-2 text-sm text-muted-foreground">
        <LoaderCircleIcon
          aria-hidden="true"
          className="size-4 motion-safe:animate-spin"
        />
        Consultando la {fuente}…
      </p>
    );
  if (estado === "error" || valor === null)
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed p-2 text-sm">
        <span className="flex-1">
          No se pudo consultar la {fuente} ahora.
          {respaldo
            ? ` El chat sigue con la última guardada: ${respaldo}.`
            : " Reintenta o usa la tasa manual."}
        </span>
        <Button
          type="button"
          variant="outline"
          className={cn("h-11")}
          onClick={reintentar}
        >
          <RefreshCwIcon aria-hidden="true" />
          Reintentar
        </Button>
      </div>
    );
  return (
    <p className="grid min-h-11 max-w-prose content-center gap-0.5 rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground">
      <span>
        <strong className="tabular-nums">{valor}</strong> por euro, {fuente}
        {fecha ? ` del ${fechaCorta.format(fecha)}` : ""}.
      </span>
      <span className="text-xs">
        Se actualiza sola: el chat siempre cotiza con la tasa vigente.
      </span>
    </p>
  );
}
