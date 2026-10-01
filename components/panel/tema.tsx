"use client";

import { LaptopIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const OPCIONES = [
  { valor: "light", texto: "Claro", Icono: SunIcon },
  { valor: "dark", texto: "Oscuro", Icono: MoonIcon },
  { valor: "system", texto: "Sistema", Icono: LaptopIcon },
] as const;

const sinSuscripcion = () => () => {};

/** Conmutador claro / oscuro / sistema para la cabecera (fondo tinta). */
export function SelectorTema({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  // next-themes solo conoce el tema en el cliente: hasta hidratar mostramos "Sistema".
  const montado = useSyncExternalStore(
    sinSuscripcion,
    () => true,
    () => false,
  );
  const actual =
    OPCIONES.find((o) => o.valor === (montado ? theme : "system")) ??
    OPCIONES[2];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Tema: ${actual.texto.toLowerCase()}. Cambiar tema`}
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "size-11",
          className,
        )}
      >
        <actual.Icono aria-hidden="true" className="size-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Tema</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={actual.valor}
            onValueChange={(valor) => setTheme(String(valor))}
          >
            {OPCIONES.map(({ valor, texto, Icono }) => (
              <DropdownMenuRadioItem
                key={valor}
                value={valor}
                className="min-h-11"
              >
                <Icono aria-hidden="true" />
                {texto}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
