"use client";

import {
  CircleAlertIcon,
  CircleCheckIcon,
  LoaderCircleIcon,
  MinusIcon,
  PlusIcon,
} from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { actualizarProducto } from "@/lib/catalogo/repositorio";
import { LIMITES, validarCantidad } from "@/lib/catalogo/validacion";
import { cn } from "@/lib/utils";
import { FOCO } from "./formato";

/** Espera tras el último toque antes de guardar; salir del campo guarda en el acto. */
const ESPERA_MS = 800;

type Estado = "inactivo" | "pendiente" | "guardando" | "guardado" | "error";

interface Props {
  id: string;
  cantidad: number;
  /** "HONOR 600 Elite 8/256", para las etiquetas accesibles y el toast. */
  nombre: string;
  className?: string;
}

/**
 * Edición rápida de la cantidad (lo que más cambia): stepper −/+ e input numérico.
 * Guarda con debounce o al salir del campo; si Firestore lo rechaza, vuelve al valor
 * anterior y avisa con un toast.
 */
export function CantidadRapida({ id, cantidad, nombre, className }: Props) {
  const idInput = useId();
  const idEstado = useId();
  const [texto, setTexto] = useState(String(cantidad));
  const [estado, setEstado] = useState<Estado>("inactivo");
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendiente = useRef<number | null>(null);
  const enFoco = useRef(false);
  // Solo el último guardado puede cambiar el estado (evita que uno viejo pise a uno nuevo).
  const turno = useRef(0);
  const confirmada = useRef(cantidad);

  // Llega un valor nuevo del servidor (otra pestaña, el diálogo…): si no estoy editando, lo tomo.
  useEffect(() => {
    confirmada.current = cantidad;
    if (!enFoco.current && pendiente.current === null)
      setTexto(String(cantidad));
  }, [cantidad]);

  const guardar = useCallback(
    async (n: number) => {
      pendiente.current = null;
      if (temporizador.current) clearTimeout(temporizador.current);
      temporizador.current = null;
      if (n === confirmada.current) {
        setEstado("inactivo");
        return;
      }
      const mio = ++turno.current;
      const anterior = confirmada.current;
      setEstado("guardando");
      try {
        await actualizarProducto(id, { cantidad: n });
        if (mio !== turno.current) return;
        confirmada.current = n;
        setEstado("guardado");
      } catch (e) {
        if (mio !== turno.current) return;
        setTexto(String(anterior));
        setEstado("error");
        toast.error(`No se guardó la cantidad de ${nombre}`, {
          description: e instanceof Error ? e.message : undefined,
        });
      }
    },
    [id, nombre],
  );

  const programar = useCallback(
    (n: number) => {
      pendiente.current = n;
      setEstado("pendiente");
      if (temporizador.current) clearTimeout(temporizador.current);
      temporizador.current = setTimeout(() => guardar(n), ESPERA_MS);
    },
    [guardar],
  );

  // Si la fila desaparece (filtro, búsqueda) con un cambio pendiente, se guarda igual.
  useEffect(
    () => () => {
      if (temporizador.current) clearTimeout(temporizador.current);
      const n = pendiente.current;
      if (n !== null && n !== confirmada.current) {
        actualizarProducto(id, { cantidad: n }).catch(() =>
          toast.error(`No se guardó la cantidad de ${nombre}`),
        );
      }
    },
    [id, nombre],
  );

  // El "Guardado" se borra solo a los pocos segundos.
  useEffect(() => {
    if (estado !== "guardado") return;
    const t = setTimeout(() => setEstado("inactivo"), 2500);
    return () => clearTimeout(t);
  }, [estado]);

  const valido = validarCantidad(texto);
  const base = valido ?? confirmada.current;

  function paso(delta: number) {
    const n = Math.min(Math.max(base + delta, 0), LIMITES.cantidadMax);
    setTexto(String(n));
    programar(n);
  }

  return (
    <div className={cn("flex flex-col items-start gap-1", className)}>
      {/* biome-ignore lint/a11y/useSemanticElements: un fieldset aquí rompe el layout de la fila; role=group da la misma semántica */}
      <div
        role="group"
        aria-label={`Cantidad de ${nombre}`}
        className="flex items-center gap-1"
      >
        <Button
          type="button"
          variant="outline"
          className={cn("size-11", FOCO)}
          aria-label="Restar 1"
          disabled={base <= 0}
          onClick={() => paso(-1)}
        >
          <MinusIcon aria-hidden="true" />
        </Button>
        <label htmlFor={idInput} className="sr-only">
          Cantidad de {nombre}
        </label>
        <input
          id={idInput}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={texto}
          aria-invalid={valido === null}
          aria-describedby={idEstado}
          className="h-11 w-16 rounded-lg border border-input bg-transparent text-center text-base tabular-nums outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring aria-invalid:border-destructive dark:bg-input/30 aria-invalid:focus-visible:border-ring"
          onFocus={(e) => {
            enFoco.current = true;
            e.currentTarget.select();
          }}
          onChange={(e) => {
            setTexto(e.target.value);
            const n = validarCantidad(e.target.value);
            if (n === null) {
              if (temporizador.current) clearTimeout(temporizador.current);
              pendiente.current = null;
              setEstado("inactivo");
            } else programar(n);
          }}
          onBlur={() => {
            enFoco.current = false;
            const n = validarCantidad(texto);
            if (n === null) {
              setTexto(String(confirmada.current));
              setEstado("inactivo");
            } else if (pendiente.current !== null) guardar(n);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const n = validarCantidad(texto);
              if (n !== null) guardar(n);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              paso(1);
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              paso(-1);
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          className={cn("size-11", FOCO)}
          aria-label="Sumar 1"
          disabled={base >= LIMITES.cantidadMax}
          onClick={() => paso(1)}
        >
          <PlusIcon aria-hidden="true" />
        </Button>
      </div>
      <output
        id={idEstado}
        className="flex min-h-4 items-center gap-1 text-xs text-muted-foreground"
      >
        {valido === null ? (
          <span className="flex items-center gap-1 text-destructive">
            <CircleAlertIcon className="size-3.5" aria-hidden="true" />
            Usa un número entero
          </span>
        ) : estado === "guardando" ? (
          <>
            <LoaderCircleIcon
              className="size-3.5 motion-safe:animate-spin"
              aria-hidden="true"
            />
            Guardando…
          </>
        ) : estado === "guardado" ? (
          <span className="flex items-center gap-1 text-success">
            <CircleCheckIcon className="size-3.5" aria-hidden="true" />
            Guardado
          </span>
        ) : estado === "error" ? (
          <span className="flex items-center gap-1 text-destructive">
            <CircleAlertIcon className="size-3.5" aria-hidden="true" />
            No se guardó
          </span>
        ) : estado === "pendiente" ? (
          "Sin guardar…"
        ) : null}
      </output>
    </div>
  );
}
