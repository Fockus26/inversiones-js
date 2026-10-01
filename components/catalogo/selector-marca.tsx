"use client";

import { Select } from "@base-ui/react/select";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import type { Marca } from "@/lib/catalogo/tipos";
import { cn } from "@/lib/utils";
import { FOCO } from "./formato";

interface Props {
  /** Va al botón: así `<Label htmlFor>` lo nombra y el formulario puede darle foco. */
  id: string;
  name?: string;
  value: Marca;
  marcas: readonly Marca[];
  onValueChange: (marca: Marca) => void;
  onBlur?: () => void;
  invalido?: boolean;
  describedBy?: string;
  placeholder?: string;
}

/**
 * Select propio (Base UI, no el `<select>` del navegador) con el estilo del panel: opciones de
 * 44 px, marca elegida con ✓ y lista con scroll si hay muchas marcas. Teclado: flechas, Enter,
 * Escape y escribir para saltar a una marca.
 */
export function SelectorMarca({
  id,
  name,
  value,
  marcas,
  onValueChange,
  onBlur,
  invalido,
  describedBy,
  placeholder = "Elige una marca",
}: Props) {
  return (
    <Select.Root
      id={id}
      name={name}
      value={value === "" ? null : value}
      onValueChange={(v) => {
        if (v) onValueChange(v);
      }}
      items={marcas.map((m) => ({ value: m, label: m }))}
    >
      <Select.Trigger
        onBlur={onBlur}
        aria-invalid={invalido ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          "flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-2.5 text-left text-base outline-none transition-colors hover:bg-muted/50 aria-invalid:border-destructive data-popup-open:border-ring md:text-sm dark:bg-input/30",
          FOCO,
        )}
      >
        <Select.Value
          placeholder={placeholder}
          className="truncate data-placeholder:text-muted-foreground"
        />
        <Select.Icon className="shrink-0 text-muted-foreground transition-transform in-data-popup-open:rotate-180 motion-reduce:transition-none">
          <ChevronDownIcon className="size-4" aria-hidden="true" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner
          alignItemWithTrigger={false}
          sideOffset={4}
          className="isolate z-50 outline-none"
        >
          <Select.Popup className="max-h-[min(var(--available-height),18rem)] w-(--anchor-width) origin-(--transform-origin) overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            <Select.List>
              {marcas.length === 0 ? (
                <p className="px-3 py-2.5 text-sm text-muted-foreground">
                  No hay marcas. Créalas en «Marcas».
                </p>
              ) : (
                marcas.map((m) => (
                  <Select.Item
                    key={m}
                    value={m}
                    className="flex min-h-11 cursor-default items-center justify-between gap-2 rounded-md px-3 text-base outline-none select-none data-highlighted:bg-muted data-selected:font-medium md:text-sm"
                  >
                    <Select.ItemText>{m}</Select.ItemText>
                    <Select.ItemIndicator>
                      <CheckIcon
                        className="size-4 text-success"
                        aria-hidden="true"
                      />
                    </Select.ItemIndicator>
                  </Select.Item>
                ))
              )}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
