"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { actualizarProducto, borrarProducto } from "@/lib/catalogo/repositorio";
import type { ProductoConId } from "@/lib/catalogo/tipos";
import { cn } from "@/lib/utils";
import { FOCO } from "./formato";

interface Props {
  producto: ProductoConId | null;
  alCerrar: () => void;
}

export function nombreCompleto(p: ProductoConId): string {
  return [p.marca, p.nombre, p.variante].filter(Boolean).join(" ");
}

/** Confirmación de borrado que nombra el equipo y ofrece ocultarlo como alternativa. */
export function DialogoBorrar({ producto, alCerrar }: Props) {
  const [ocupado, setOcupado] = useState(false);
  const nombre = producto ? nombreCompleto(producto) : "";

  async function ejecutar(accion: "borrar" | "ocultar") {
    if (!producto) return;
    setOcupado(true);
    try {
      if (accion === "borrar") {
        await borrarProducto(producto.id);
        toast.success(`Borraste ${nombre}`);
      } else {
        await actualizarProducto(producto.id, { activo: false });
        toast.success(`Ocultaste ${nombre}`, {
          description:
            "El chatbot ya no lo ofrece. Puedes reactivarlo al editar.",
        });
      }
      alCerrar();
    } catch (e) {
      toast.error(
        accion === "borrar" ? "No se pudo borrar" : "No se pudo ocultar",
        { description: e instanceof Error ? e.message : undefined },
      );
    } finally {
      setOcupado(false);
    }
  }

  return (
    <AlertDialog
      open={producto !== null}
      onOpenChange={(abierto) => {
        if (!abierto) alCerrar();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Borrar {nombre}?</AlertDialogTitle>
          <AlertDialogDescription>
            Se borra para siempre y el chatbot deja de ofrecerlo.
            {producto?.activo
              ? " Si solo quieres que no aparezca por un tiempo, mejor ocúltalo: podrás reactivarlo después."
              : ""}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:flex-wrap">
          <AlertDialogCancel className={cn("h-11", FOCO)} disabled={ocupado}>
            Cancelar
          </AlertDialogCancel>
          {producto?.activo && (
            <Button
              variant="outline"
              className={cn("h-11", FOCO)}
              disabled={ocupado}
              onClick={() => ejecutar("ocultar")}
            >
              Ocultar
            </Button>
          )}
          <AlertDialogAction
            variant="destructive"
            className={cn("h-11 dark:bg-destructive/10", FOCO)}
            disabled={ocupado}
            onClick={() => ejecutar("borrar")}
          >
            Borrar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
