"use client";

import { MailIcon, PhoneIcon, UserPlusIcon } from "lucide-react";
import { useState } from "react";
import { DialogoClienteRcv } from "@/components/clientes/clientes-rcv";
import { useClientes } from "@/components/clientes/comun";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { textoPrecio } from "@/lib/rcv/cotizacion";
import { escucharSolicitudesRcv } from "@/lib/rcv/repositorio";
import {
  COLECCION_SOLICITUDES_RCV,
  NOMBRES_CATEGORIA,
  type SolicitudRcvConId,
} from "@/lib/rcv/tipos";
import { cn } from "@/lib/utils";
import {
  cuantas,
  Encabezado,
  EnlaceContacto,
  EnlaceWhatsapp,
  EstadoCarga,
  ListaSolicitudes,
  nombreDe,
} from "./comun";

/** /solicitudes/rcv: datos que dejaron en el chat quienes pidieron la póliza (D030, D043). */
export function SolicitudesRcv() {
  const estado = useClientes(escucharSolicitudesRcv);
  const [registrando, setRegistrando] = useState<SolicitudRcvConId | null>(
    null,
  );
  if (estado.tipo !== "listo") return <EstadoCarga estado={estado} />;
  const solicitudes = estado.clientes;
  return (
    <div className="grid gap-6">
      <Encabezado resumen={cuantas(solicitudes.length)} />
      <ListaSolicitudes
        coleccion={COLECCION_SOLICITUDES_RCV}
        solicitudes={solicitudes}
        vacio="Cuando alguien pida una póliza por WhatsApp, aquí verás su nombre, correo, teléfono y el plan que eligió."
        contenido={(s) => (
          <>
            <div className="flex flex-wrap gap-1">
              <Badge variant="outline">{NOMBRES_CATEGORIA[s.categoria]}</Badge>
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
            {s.vehiculo && (
              <p className="wrap-anywhere">
                <span className="text-muted-foreground">Vehículo: </span>
                {s.vehiculo}
              </p>
            )}
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
              {s.correo && (
                <EnlaceContacto
                  href={`mailto:${s.correo}`}
                  icono={<MailIcon aria-hidden="true" />}
                  texto={s.correo}
                  etiqueta="Correo"
                />
              )}
              {s.telefono && (
                <EnlaceContacto
                  href={`tel:+${s.telefono.startsWith("0") ? `58${s.telefono.slice(1)}` : s.telefono}`}
                  icono={<PhoneIcon aria-hidden="true" />}
                  texto={s.telefono}
                  etiqueta="Teléfono"
                />
              )}
              <EnlaceWhatsapp whatsapp={s.whatsapp} />
            </ul>
            <Button
              variant="outline"
              className={cn("h-11 justify-self-start px-3")}
              onClick={() => setRegistrando(s)}
            >
              <UserPlusIcon aria-hidden="true" />
              {/* El texto visible va primero en el nombre accesible (WCAG 2.5.3, control por voz). */}
              Registrar cliente
              <span className="sr-only">: {nombreDe(s)}</span>
            </Button>
          </>
        )}
      />
      <DialogoClienteRcv
        abierto={registrando !== null}
        alCambiarAbierto={(abierto) => {
          if (!abierto) setRegistrando(null);
        }}
        cliente={null}
        inicial={registrando ? inicialDe(registrando) : undefined}
      />
    </div>
  );
}

/** Datos de la solicitud del chat para arrancar la ficha del cliente (D032). */
function inicialDe(s: SolicitudRcvConId) {
  const vehiculo = s.vehiculo
    ? `${s.clase} — ${s.vehiculo}`
    : `${s.clase} — ${s.descripcion}`;
  return {
    nombre: s.nombre,
    telefono: s.telefono,
    correo: s.correo,
    vehiculo: vehiculo.slice(0, 120),
    financiado: s.financiamiento === true,
  };
}
