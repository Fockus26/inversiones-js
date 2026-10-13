"use client";

import {
  InboxIcon,
  MailIcon,
  MessageCircleIcon,
  PhoneIcon,
  Trash2Icon,
} from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Aviso } from "@/components/catalogo/catalogo-productos";
import { FOCO, haceCuanto } from "@/components/catalogo/formato";
import {
  ENTRADA,
  escalonado,
  TARJETA_VIVA,
} from "@/components/panel/animacion";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { textoPrecio } from "@/lib/rcv/cotizacion";
import { borrarSolicitudRcv } from "@/lib/rcv/repositorio";
import { NOMBRES_CATEGORIA, type SolicitudRcvConId } from "@/lib/rcv/tipos";
import { cn } from "@/lib/utils";

const fechaLarga = new Intl.DateTimeFormat("es-VE", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Caracas",
});

/** Datos que dejaron los clientes en el chat (los guarda el bot), más nuevos primero. */
export function Solicitudes({
  solicitudes,
}: {
  solicitudes: SolicitudRcvConId[];
}) {
  const titulo = useId();
  const [borrando, setBorrando] = useState<SolicitudRcvConId | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function borrar() {
    if (!borrando) return;
    setOcupado(true);
    try {
      await borrarSolicitudRcv(borrando.id);
      toast.success(`Borraste la solicitud de ${borrando.nombre}`);
      setBorrando(null);
    } catch (e) {
      toast.error("No se pudo borrar", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setOcupado(false);
    }
  }

  return (
    <section aria-labelledby={titulo} className="grid gap-3">
      <h2 id={titulo} className="flex items-center gap-2 text-lg font-semibold">
        <span className="h-5 w-1 rounded-full bg-primary" aria-hidden="true" />
        Solicitudes del chat
        <span className="text-sm font-normal text-muted-foreground">
          ({solicitudes.length})
        </span>
      </h2>
      {solicitudes.length === 0 ? (
        <Aviso
          icono={<InboxIcon aria-hidden="true" />}
          titulo="Todavía no hay solicitudes"
          texto="Cuando alguien pida una póliza por WhatsApp, aquí verás su nombre, correo, teléfono y el plan que eligió."
        />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {solicitudes.map((s, i) => (
            <li
              key={s.id}
              style={escalonado(i)}
              className={cn(
                "grid content-start gap-2 rounded-xl border bg-card p-4 text-sm text-card-foreground",
                ENTRADA,
                TARJETA_VIVA,
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-medium break-words">{s.nombre}</h3>
                  {s.creadoEn && (
                    <p className="text-xs text-muted-foreground">
                      <time
                        dateTime={s.creadoEn.toISOString()}
                        title={fechaLarga.format(s.creadoEn)}
                      >
                        {haceCuanto(s.creadoEn)}
                      </time>
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  className={cn(
                    "size-11 shrink-0 text-destructive hover:text-destructive",
                    FOCO,
                  )}
                  onClick={() => setBorrando(s)}
                  aria-label={`Borrar la solicitud de ${s.nombre}`}
                >
                  <Trash2Icon aria-hidden="true" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline">
                  {NOMBRES_CATEGORIA[s.categoria]}
                </Badge>
                {s.financiamiento !== null && (
                  <Badge variant={s.financiamiento ? "default" : "outline"}>
                    {s.financiamiento
                      ? "Quiere financiamiento"
                      : "Sin financiamiento"}
                  </Badge>
                )}
              </div>
              <p>
                <strong>{s.clase}</strong> — {s.descripcion}
              </p>
              <p className="tabular-nums text-muted-foreground">
                {textoPrecio(
                  s.precioEur === null
                    ? null
                    : {
                        eur: s.precioEur,
                        usd: s.precioUsd,
                        bs: s.precioBs,
                        cop: s.precioCop,
                      },
                )}
              </p>
              <ul className="grid gap-0.5">
                <Contacto
                  href={`mailto:${s.correo}`}
                  icono={<MailIcon aria-hidden="true" />}
                  texto={s.correo}
                  etiqueta="Correo"
                />
                <Contacto
                  href={`tel:+${s.telefono.startsWith("0") ? `58${s.telefono.slice(1)}` : s.telefono}`}
                  icono={<PhoneIcon aria-hidden="true" />}
                  texto={s.telefono}
                  etiqueta="Teléfono"
                />
                {s.whatsapp && (
                  <Contacto
                    href={`https://wa.me/${s.whatsapp}`}
                    icono={<MessageCircleIcon aria-hidden="true" />}
                    texto={`+${s.whatsapp}`}
                    etiqueta="WhatsApp"
                  />
                )}
              </ul>
            </li>
          ))}
        </ul>
      )}

      <AlertDialog
        open={borrando !== null}
        onOpenChange={(abierto) => {
          if (!abierto) setBorrando(null);
        }}
      >
        <AlertDialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Borrar la solicitud de {borrando?.nombre}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Se borran para siempre su nombre, correo y teléfono.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={cn("h-11", FOCO)} disabled={ocupado}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className={cn("h-11 dark:bg-destructive/10", FOCO)}
              disabled={ocupado}
              onClick={borrar}
            >
              Borrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function Contacto({
  href,
  icono,
  texto,
  etiqueta,
}: {
  href: string;
  icono: React.ReactNode;
  texto: string;
  etiqueta: string;
}) {
  return (
    <li>
      <a
        href={href}
        target={href.startsWith("http") ? "_blank" : undefined}
        rel={href.startsWith("http") ? "noreferrer" : undefined}
        className={cn(
          "inline-flex min-h-11 max-w-full items-center gap-2 rounded-md text-success underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring [&>svg]:size-4 [&>svg]:shrink-0",
          FOCO,
        )}
      >
        {icono}
        <span className="sr-only">{etiqueta}: </span>
        <span className="truncate">{texto}</span>
      </a>
    </li>
  );
}
