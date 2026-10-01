"use client";

import { LoaderCircleIcon, Trash2Icon } from "lucide-react";
import { type ReactNode, useId, useRef, useState } from "react";
import { toast } from "sonner";
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
import { unirMarcas } from "@/lib/catalogo/marcas";
import { actualizarProducto, crearProducto } from "@/lib/catalogo/repositorio";
import type { Marca, ProductoConId } from "@/lib/catalogo/tipos";
import {
  type CampoFormulario,
  type FormularioProducto,
  LIMITES,
  validarProducto,
} from "@/lib/catalogo/validacion";
import { cn } from "@/lib/utils";
import { DIALOGO_CON_PIE_FIJO, FOCO, haceCuanto } from "./formato";
import { SelectorMarca } from "./selector-marca";

interface Props {
  abierto: boolean;
  alCambiarAbierto: (abierto: boolean) => void;
  /** null = "Nuevo producto". */
  producto: ProductoConId | null;
  /** Marca preseleccionada al crear (la del filtro activo). */
  marcaInicial?: Marca;
  /** Marcas registradas (D025): las opciones del select. */
  marcas: readonly Marca[];
  /** `orden` para un producto nuevo (último + 1). */
  ordenNuevo: number;
  alPedirBorrar: (producto: ProductoConId) => void;
}

/**
 * Mismo diálogo para editar y para crear. El formulario se monta de cero en cada apertura.
 * En pantallas bajas (o con el teclado del teléfono abierto) solo se desplazan los campos: el
 * pie con «Guardar» queda siempre a la vista.
 */
export function DialogoProducto(props: Props) {
  return (
    <Dialog open={props.abierto} onOpenChange={props.alCambiarAbierto}>
      <DialogContent showCloseButton={false} className={DIALOGO_CON_PIE_FIJO}>
        {props.abierto && <Formulario {...props} />}
      </DialogContent>
    </Dialog>
  );
}

function aFormulario(
  p: ProductoConId | null,
  marca: Marca | undefined,
): FormularioProducto {
  if (!p)
    return {
      marca: marca ?? "",
      nombre: "",
      variante: "",
      inicial: "",
      cuota: "",
      numeroCuotas: "6",
      cantidad: "0",
      activo: true,
    };
  const monto = (n: number) =>
    Number.isInteger(n) ? String(n) : n.toFixed(2).replace(".", ",");
  return {
    marca: p.marca,
    nombre: p.nombre,
    variante: p.variante,
    inicial: monto(p.inicial),
    cuota: monto(p.cuota),
    numeroCuotas: String(p.numeroCuotas),
    cantidad: String(p.cantidad),
    activo: p.activo,
  };
}

const ORDEN_CAMPOS: CampoFormulario[] = [
  "marca",
  "nombre",
  "variante",
  "inicial",
  "cuota",
  "numeroCuotas",
  "cantidad",
];

function Formulario({
  producto,
  marcaInicial,
  marcas,
  ordenNuevo,
  alCambiarAbierto,
  alPedirBorrar,
}: Props) {
  const prefijo = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [form, setForm] = useState(() => aFormulario(producto, marcaInicial));
  const [tocados, setTocados] = useState<Set<CampoFormulario>>(new Set());
  const [intentado, setIntentado] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Un producto de antes de D025 puede tener una marca sin registrar: la regla deja guardarlo
  // si no la cambia, así que se ofrece como opción.
  const opciones =
    producto && !marcas.includes(producto.marca)
      ? unirMarcas(marcas, [producto.marca])
      : marcas;
  const resultado = validarProducto(form, opciones);
  const errores = resultado.ok ? {} : resultado.errores;
  const errorVisible = (c: CampoFormulario) =>
    intentado || tocados.has(c) ? errores[c] : undefined;

  const idDe = (c: CampoFormulario) => `${prefijo}-${c}`;
  const cambiar =
    (c: CampoFormulario) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [c]: e.target.value }));
  const tocar = (c: CampoFormulario) => () =>
    setTocados((t) => (t.has(c) ? t : new Set(t).add(c)));

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setIntentado(true);
    if (!resultado.ok) {
      // Foco al primer campo con error para que el lector de pantalla lo anuncie.
      const primero = ORDEN_CAMPOS.find((c) => resultado.errores[c]);
      if (primero)
        formRef.current
          ?.querySelector<HTMLElement>(`#${CSS.escape(idDe(primero))}`)
          ?.focus();
      return;
    }
    setGuardando(true);
    try {
      if (producto) await actualizarProducto(producto.id, resultado.valor);
      else await crearProducto(resultado.valor, ordenNuevo);
      toast.success(
        producto
          ? `Guardaste ${resultado.valor.marca} ${resultado.valor.nombre}`
          : `Creaste ${resultado.valor.marca} ${resultado.valor.nombre}`,
      );
      alCambiarAbierto(false);
    } catch (err) {
      toast.error("No se pudo guardar", {
        description: err instanceof Error ? err.message : undefined,
      });
      setGuardando(false);
    }
  }

  const campoTexto = (
    c: CampoFormulario,
    etiqueta: string,
    extra: React.ComponentProps<"input"> = {},
    ayuda?: ReactNode,
  ) => {
    const error = errorVisible(c);
    const aviso = resultado.avisos[c];
    const descritoPor = [
      error && `${idDe(c)}-error`,
      (ayuda || aviso) && `${idDe(c)}-ayuda`,
    ]
      .filter(Boolean)
      .join(" ");
    return (
      <div className="grid gap-1.5">
        <Label htmlFor={idDe(c)}>{etiqueta}</Label>
        <Input
          id={idDe(c)}
          name={c}
          value={String(form[c])}
          onChange={cambiar(c)}
          onBlur={tocar(c)}
          aria-invalid={error ? true : undefined}
          aria-describedby={descritoPor || undefined}
          className={cn("h-11", FOCO)}
          autoComplete="off"
          {...extra}
        />
        {(aviso || ayuda) && (
          <p id={`${idDe(c)}-ayuda`} className="text-xs text-muted-foreground">
            {aviso ?? ayuda}
          </p>
        )}
        {error && (
          <p id={`${idDe(c)}-error`} className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  };

  const errorMarca = errorVisible("marca");
  const titulo = producto
    ? `Editar ${producto.marca} ${producto.nombre}`
    : "Nuevo producto";

  return (
    <form
      ref={formRef}
      onSubmit={enviar}
      noValidate
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="grid min-h-0 gap-4 overflow-y-auto overscroll-contain p-4">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>
            {producto
              ? producto.actualizadoEn
                ? `Actualizado ${haceCuanto(producto.actualizadoEn)}. Lo que guardes es lo que responde el chatbot.`
                : "Lo que guardes es lo que responde el chatbot."
              : "Se agrega al final de su marca. Lo que guardes es lo que responde el chatbot."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-1.5">
          <Label htmlFor={idDe("marca")}>Marca</Label>
          <SelectorMarca
            id={idDe("marca")}
            name="marca"
            value={form.marca}
            marcas={opciones}
            onValueChange={(m) => {
              setForm((f) => ({ ...f, marca: m }));
              tocar("marca")();
            }}
            onBlur={tocar("marca")}
            invalido={!!errorMarca}
            describedBy={errorMarca ? `${idDe("marca")}-error` : undefined}
          />
          {errorMarca && (
            <p
              id={`${idDe("marca")}-error`}
              className="text-xs text-destructive"
            >
              {errorMarca}
            </p>
          )}
        </div>

        {campoTexto("nombre", "Nombre", {
          maxLength: LIMITES.nombreMax,
          placeholder: "600 Elite",
        })}
        {campoTexto(
          "variante",
          "Variante (RAM/almacenamiento)",
          { maxLength: LIMITES.varianteMax, placeholder: "8/256" },
          "Opcional. Formato sugerido: 8/256.",
        )}

        {/* Dos columnas también en el teléfono: son cuatro números cortos y así se ve todo
          el precio sin desplazarse. Solo a menos de 360 px se apilan. */}
        <div className="grid grid-cols-2 items-start gap-4 max-[359px]:grid-cols-1">
          {campoTexto("inicial", "Inicial ($)", {
            inputMode: "decimal",
            placeholder: "125",
          })}
          {campoTexto("cuota", "Cuota quincenal ($)", {
            inputMode: "decimal",
            placeholder: "63",
          })}
          {campoTexto("numeroCuotas", "Número de cuotas", {
            inputMode: "numeric",
          })}
          {campoTexto("cantidad", "Cantidad disponible", {
            inputMode: "numeric",
          })}
        </div>

        <div className="flex items-start gap-3 rounded-lg border px-3 py-1">
          <input
            id={`${prefijo}-activo`}
            type="checkbox"
            name="activo"
            checked={form.activo}
            onChange={(e) =>
              setForm((f) => ({ ...f, activo: e.target.checked }))
            }
            aria-describedby={`${prefijo}-activo-ayuda`}
            className="mt-3 size-5 accent-[var(--brand-teal)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          />
          <div className="grid flex-1">
            <label
              htmlFor={`${prefijo}-activo`}
              className="flex min-h-11 cursor-pointer items-center text-sm font-medium"
            >
              Activo
            </label>
            <p
              id={`${prefijo}-activo-ayuda`}
              className="pb-2 text-xs text-muted-foreground"
            >
              Si lo desmarcas, el chatbot deja de ofrecerlo, pero no se borra.
            </p>
          </div>
        </div>
      </div>

      {/* Una sola fila también en móvil: tres botones apilados se comerían media pantalla
          con el teclado abierto. «Borrar» queda solo como icono bajo sm. */}
      <DialogFooter className="m-0 flex-row items-center justify-between sm:justify-between">
        {producto ? (
          <Button
            type="button"
            variant="destructive"
            className={cn(
              "h-11 max-sm:w-11 max-sm:px-0 dark:bg-destructive/10",
              FOCO,
            )}
            onClick={() => alPedirBorrar(producto)}
            aria-label={`Borrar ${producto.marca} ${producto.nombre}`}
          >
            <Trash2Icon aria-hidden="true" />
            <span aria-hidden="true" className="max-sm:sr-only">
              Borrar
            </span>
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <DialogClose
            render={<Button variant="outline" className={cn("h-11", FOCO)} />}
          >
            Cancelar
          </DialogClose>
          <Button
            type="submit"
            className={cn("h-11", FOCO)}
            disabled={guardando}
          >
            {guardando && (
              <LoaderCircleIcon
                className="motion-safe:animate-spin"
                aria-hidden="true"
              />
            )}
            {guardando ? "Guardando…" : producto ? "Guardar" : "Crear producto"}
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}
