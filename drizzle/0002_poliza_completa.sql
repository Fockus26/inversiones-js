ALTER TABLE "clientes_rcv" DROP CONSTRAINT "clientes_rcv_valido";--> statement-breakpoint
ALTER TABLE "clientes_rcv" ADD CONSTRAINT "clientes_rcv_valido" CHECK (char_length("clientes_rcv"."nombre") between 1 and 80
  and char_length("clientes_rcv"."cedula") <= 20
  and char_length("clientes_rcv"."telefono") between 1 and 30
  and char_length("clientes_rcv"."notas") <= 500
        and char_length("clientes_rcv"."correo") <= 120
        and char_length("clientes_rcv"."direccion") <= 200
        and char_length("clientes_rcv"."vehiculo") between 1 and 120
        and char_length("clientes_rcv"."placa") <= 12
        and (("clientes_rcv"."emision" is null and "clientes_rcv"."vence" is null)
          or ("clientes_rcv"."emision" is not null and "clientes_rcv"."vence" is not null
            and "clientes_rcv"."emision" between '2000-01-01' and '2099-12-31'
            and "clientes_rcv"."vence" between '2000-01-01' and '2099-12-31'
            and "clientes_rcv"."vence" > "clientes_rcv"."emision")));