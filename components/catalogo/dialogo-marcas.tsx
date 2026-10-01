"use client";

import {
  CheckIcon,
  LoaderCircleIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MARCA_MAX, unirMarcas, validarMarca } from "@/lib/catalogo/marcas";
import {
  borrarMarca,
  crearMarca,
  renombrarMarca,
} from "@/lib/catalogo/repositorio";
import type { Marca } from "@/lib/catalogo/tipos";
import { cn } from "@/lib/utils";
import { FOCO } from "./formato";

interface Props {
  abierto: boolean;
  alCambiarAbierto: (abierto: boolean) => void;
  /** Registradas en `marcas` (D025). */
  marcas: readonly Marca[];
  /** Productos por marca (incluye marcas que usan productos pero no están registradas). */
  conteo: ReadonlyMap<Marca, number>;
}

function productos(n: number) {
  return `${n} ${n === 1 ? "producto" : "productos"}`;
}

function mensajeDe(e: unknown) {
  return e instanceof Error ? e.message : undefined;
}

/** Agregar, renombrar y borrar marcas. Cada fila se edita o se confirma en el mismo lugar. */
export function DialogoMarcas(props: Props) {
  return (
    <Dialog open={props.abierto} onOpenChange={props.alCambiarAbierto}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg"
      >
        {props.abierto && <Contenido {...props} />}
      </DialogContent>
    </Dialog>
  );
}

function Contenido({ marcas, conteo }: Props) {
  const prefijo = useId();
  const [nueva, setNueva] = useState("");
  const [intentoNueva, setIntentoNueva] = useState(false);
  const [editando, setEditando] = useState<Marca | null>(null);
  const [borrando, setBorrando] = useState<Marca | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const deProductos = [...conteo.keys()];
  const todas = unirMarcas(marcas, deProductos);
  const resultadoNueva = validarMarca(nueva, todas);

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    setIntentoNueva(true);
    if (!resultadoNueva.ok) return;
    setOcupado(true);
    try {
      await crearMarca(resultadoNueva.valor);
      toast.success(`Agregaste la marca ${resultadoNueva.valor}`);
      setNueva("");
      setIntentoNueva(false);
    } catch (err) {
      toast.error("No se pudo agregar la marca", {
        description: mensajeDe(err),
      });
    } finally {
      setOcupado(false);
    }
  }

  async function registrar(marca: Marca) {
    setOcupado(true);
    try {
      await crearMarca(marca);
      toast.success(`Registraste la marca ${marca}`);
    } catch (err) {
      toast.error("No se pudo registrar la marca", {
        description: mensajeDe(err),
      });
    } finally {
      setOcupado(false);
    }
  }

  async function renombrar(vieja: Marca, nueva: Marca) {
    setOcupado(true);
    try {
      const movidos = await renombrarMarca(vieja, nueva);
      toast.success(`Renombraste ${vieja} a ${nueva}`, {
        description:
          movidos > 0 ? `Se actualizaron ${productos(movidos)}.` : undefined,
      });
      setEditando(null);
    } catch (err) {
      toast.error("No se pudo renombrar la marca", {
        description: mensajeDe(err),
      });
    } finally {
      setOcupado(false);
    }
  }

  async function borrar(marca: Marca) {
    setOcupado(true);
    try {
      await borrarMarca(marca);
      toast.success(`Borraste la marca ${marca}`);
      setBorrando(null);
    } catch (err) {
      toast.error("No se pudo borrar la marca", {
        description: mensajeDe(err),
      });
    } finally {
      setOcupado(false);
    }
  }

  const idNueva = `${prefijo}-nueva`;
  const errorNueva =
    intentoNueva && !resultadoNueva.ok ? resultadoNueva.error : undefined;

  return (
    <div className="grid gap-4">
      <DialogHeader>
        <DialogTitle>Marcas</DialogTitle>
        <DialogDescription>
          Se muestran en orden alfabético, en el panel y en la lista del
          chatbot. Al renombrar una marca se actualizan todos sus productos.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={agregar} noValidate className="grid gap-1.5">
        <Label htmlFor={idNueva}>Nueva marca</Label>
        <div className="flex gap-2">
          <Input
            id={idNueva}
            value={nueva}
            onChange={(e) => {
              setNueva(e.target.value);
              setIntentoNueva(false);
            }}
            placeholder="p. ej. Motorola"
            maxLength={MARCA_MAX + 10}
            autoComplete="off"
            autoCapitalize="characters"
            aria-invalid={errorNueva ? true : undefined}
            aria-describedby={errorNueva ? `${idNueva}-error` : undefined}
            className={cn("h-11 uppercase placeholder:normal-case", FOCO)}
          />
          <Button
            type="submit"
            className={cn("h-11 px-4", FOCO)}
            disabled={ocupado}
          >
            <PlusIcon aria-hidden="true" />
            Agregar
          </Button>
        </div>
        {errorNueva && (
          <p id={`${idNueva}-error`} className="text-xs text-destructive">
            {errorNueva}
          </p>
        )}
      </form>

      {todas.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          Todavía no hay marcas. Agrega la primera arriba.
        </p>
      ) : (
        <ul className="grid divide-y rounded-lg border" aria-label="Marcas">
          {todas.map((m) => {
            const n = conteo.get(m) ?? 0;
            const registrada = marcas.includes(m);
            if (editando === m)
              return (
                <FilaEditando
                  key={m}
                  marca={m}
                  cantidad={n}
                  todas={todas}
                  ocupado={ocupado}
                  alGuardar={(nueva) => renombrar(m, nueva)}
                  alCancelar={() => setEditando(null)}
                />
              );
            if (borrando === m)
              return (
                <li key={m} className="grid gap-2 p-3">
                  {n > 0 ? (
                    <p className="text-sm" role="alert">
                      <strong>{m}</strong> tiene {productos(n)}. Muévelos a otra
                      marca o bórralos antes de borrar la marca.
                    </p>
                  ) : (
                    <p className="text-sm" role="alert">
                      ¿Borrar la marca <strong>{m}</strong>? No tiene productos.
                    </p>
                  )}
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      variant="outline"
                      className={cn("h-11", FOCO)}
                      disabled={ocupado}
                      onClick={() => setBorrando(null)}
                    >
                      {n > 0 ? "Entendido" : "Cancelar"}
                    </Button>
                    {n === 0 && (
                      <Button
                        variant="destructive"
                        className={cn("h-11 dark:bg-destructive/10", FOCO)}
                        disabled={ocupado}
                        onClick={() => borrar(m)}
                      >
                        {ocupado ? (
                          <LoaderCircleIcon
                            className="motion-safe:animate-spin"
                            aria-hidden="true"
                          />
                        ) : (
                          <Trash2Icon aria-hidden="true" />
                        )}
                        Borrar
                      </Button>
                    )}
                  </div>
                </li>
              );
            return (
              <li
                key={m}
                className="flex flex-wrap items-center justify-between gap-2 py-1 pr-1 pl-3"
              >
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-medium break-all">{m}</span>
                  <span className="text-sm text-muted-foreground">
                    {productos(n)}
                  </span>
                  {!registrada && (
                    <Badge variant="outline">Sin registrar</Badge>
                  )}
                </div>
                {registrada ? (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      className={cn("size-11", FOCO)}
                      disabled={ocupado}
                      onClick={() => {
                        setBorrando(null);
                        setEditando(m);
                      }}
                      aria-label={`Renombrar ${m}`}
                    >
                      <PencilIcon aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      className={cn(
                        "size-11 text-destructive hover:text-destructive",
                        FOCO,
                      )}
                      disabled={ocupado}
                      onClick={() => {
                        setEditando(null);
                        setBorrando(m);
                      }}
                      aria-label={`Borrar ${m}`}
                    >
                      <Trash2Icon aria-hidden="true" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className={cn("h-11 px-3", FOCO)}
                    disabled={ocupado}
                    onClick={() => registrar(m)}
                    aria-label={`Registrar ${m}`}
                  >
                    <PlusIcon aria-hidden="true" />
                    <span aria-hidden="true">Registrar</span>
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <DialogFooter>
        <DialogClose
          render={<Button variant="outline" className={cn("h-11", FOCO)} />}
        >
          Cerrar
        </DialogClose>
      </DialogFooter>
    </div>
  );
}

function FilaEditando({
  marca,
  cantidad,
  todas,
  ocupado,
  alGuardar,
  alCancelar,
}: {
  marca: Marca;
  cantidad: number;
  todas: readonly Marca[];
  ocupado: boolean;
  alGuardar: (nueva: Marca) => void;
  alCancelar: () => void;
}) {
  const id = useId();
  const [texto, setTexto] = useState(marca);
  const [intentado, setIntentado] = useState(false);
  const resultado = validarMarca(texto, todas, marca);
  const error = intentado && !resultado.ok ? resultado.error : undefined;
  const ayuda =
    cantidad > 0 ? `Se actualizarán ${productos(cantidad)}.` : undefined;
  const descritoPor = [error && `${id}-error`, ayuda && `${id}-ayuda`]
    .filter(Boolean)
    .join(" ");

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    setIntentado(true);
    if (!resultado.ok) return;
    if (resultado.valor === marca) alCancelar();
    else alGuardar(resultado.valor);
  }

  return (
    <li className="p-3">
      <form onSubmit={guardar} noValidate className="grid gap-1.5">
        <Label htmlFor={id}>Renombrar {marca}</Label>
        <div className="flex gap-1">
          <Input
            id={id}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              // Escape cierra la edición, no el diálogo entero.
              if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                alCancelar();
              }
            }}
            maxLength={MARCA_MAX + 10}
            autoComplete="off"
            autoCapitalize="characters"
            autoFocus
            aria-invalid={error ? true : undefined}
            aria-describedby={descritoPor || undefined}
            className={cn("h-11 uppercase", FOCO)}
          />
          <Button
            type="submit"
            className={cn("size-11", FOCO)}
            disabled={ocupado}
            aria-label="Guardar"
          >
            {ocupado ? (
              <LoaderCircleIcon
                className="motion-safe:animate-spin"
                aria-hidden="true"
              />
            ) : (
              <CheckIcon aria-hidden="true" />
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            className={cn("size-11", FOCO)}
            disabled={ocupado}
            onClick={alCancelar}
            aria-label="Cancelar"
          >
            <XIcon aria-hidden="true" />
          </Button>
        </div>
        {ayuda && (
          <p id={`${id}-ayuda`} className="text-xs text-muted-foreground">
            {ayuda}
          </p>
        )}
        {error && (
          <p id={`${id}-error`} className="text-xs text-destructive">
            {error}
          </p>
        )}
      </form>
    </li>
  );
}
