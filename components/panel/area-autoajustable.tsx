"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/** `useLayoutEffect` solo en el navegador: en el servidor no hay nada que medir. */
const useEfectoDeMedida =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Navegadores sin `field-sizing` (Safari antes de la 26, Firefox): se ajusta por JS. */
const sinFieldSizing = () =>
  typeof CSS !== "undefined" && !CSS.supports("field-sizing", "content");

/**
 * Área de texto que crece con lo escrito: sin barra interna hasta `max-h` y, de ahí, scroll.
 * `field-sizing: content` hace el trabajo donde existe; donde no, la altura se mide por JS. Las
 * alturas van en `lh` (líneas de su propia letra), así sigue valiendo con la letra al 200 %, y el
 * tope no pasa de media pantalla para que el resto del diálogo siga a la vista.
 *
 * `lineas` es el mínimo visible (lo que antes daba `rows`).
 */
export function AreaAutoajustable({
  lineas = 3,
  className,
  style,
  onInput,
  ref,
  ...area
}: React.ComponentProps<"textarea"> & { lineas?: number }) {
  const interno = useRef<HTMLTextAreaElement | null>(null);

  const ajustar = useCallback(() => {
    const el = interno.current;
    if (!el || !sinFieldSizing()) return;
    el.style.height = "auto";
    const bordes = el.offsetHeight - el.clientHeight;
    el.style.height = `${el.scrollHeight + bordes}px`;
  }, []);

  // El valor puede cambiar sin que se escriba (al abrir el diálogo, al restablecer).
  useEfectoDeMedida(ajustar, [ajustar, area.value]);

  useEffect(() => {
    if (!sinFieldSizing()) return;
    window.addEventListener("resize", ajustar);
    return () => window.removeEventListener("resize", ajustar);
  }, [ajustar]);

  return (
    <textarea
      ref={(el) => {
        interno.current = el;
        if (typeof ref === "function") return ref(el);
        if (ref) ref.current = el;
      }}
      rows={lineas}
      onInput={(e) => {
        ajustar();
        onInput?.(e);
      }}
      style={
        {
          "--lineas": lineas,
          ...style,
        } as React.CSSProperties
      }
      className={cn(
        // Relleno (1 rem) y borde (2 px) van aparte de las líneas: min y max cuentan la caja entera.
        "field-sizing-content min-h-[calc(var(--lineas)*1lh+1rem+2px)] max-h-[min(calc(12lh+1rem+2px),50dvh)] overflow-y-auto",
        className,
      )}
      {...area}
    />
  );
}
