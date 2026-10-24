"use client";

import { CircleAlertIcon, SmartphoneIcon } from "lucide-react";
import { useClientes } from "@/components/clientes/comun";
import { escucharSolicitudesCelulares } from "@/lib/solicitudes/repositorio";
import { COLECCION_SOLICITUDES_CELULARES } from "@/lib/solicitudes/tipos";
import {
  cuantas,
  Encabezado,
  EnlaceWhatsapp,
  EstadoCarga,
  ListaSolicitudes,
} from "./comun";

/** /solicitudes/celulares (D043): quién eligió un equipo de la lista en el chat. */
export function SolicitudesCelulares() {
  const estado = useClientes(escucharSolicitudesCelulares);
  if (estado.tipo !== "listo") return <EstadoCarga estado={estado} />;
  const solicitudes = estado.clientes;
  const sinLista = solicitudes.filter((s) => s.equipo === null).length;
  return (
    <div className="grid gap-6">
      <Encabezado
        resumen={[
          cuantas(solicitudes.length),
          sinLista > 0
            ? `${sinLista} no ${sinLista === 1 ? "pudo" : "pudieron"} ver la lista`
            : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      />
      <ListaSolicitudes
        coleccion={COLECCION_SOLICITUDES_CELULARES}
        solicitudes={solicitudes}
        vacio="Cuando alguien elija un equipo en el chat de WhatsApp, aquí verás quién es y cuál quiere."
        contenido={(s) => (
          <>
            {s.equipo ? (
              <p className="flex items-center gap-2">
                <SmartphoneIcon
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <span className="wrap-anywhere">
                  <span className="sr-only">Equipo: </span>
                  <strong>{s.equipo}</strong>
                </span>
              </p>
            ) : (
              <p className="flex items-start gap-2">
                <CircleAlertIcon
                  className="mt-0.5 size-4 shrink-0 text-destructive"
                  aria-hidden="true"
                />
                Pidió la lista de equipos pero el chat no pudo mostrársela.
                Escríbele para enviársela.
              </p>
            )}
            <ul className="grid gap-0.5">
              <EnlaceWhatsapp whatsapp={s.whatsapp} />
            </ul>
          </>
        )}
      />
    </div>
  );
}
