# D034 · Financiamiento · Requisitos RCV en una lista común; placas extranjeras = cotización sin planes · Implementado

**Título original:** Requisitos comunes a todos los vehículos; placas extranjeras sin planes

**Contexto:** los requisitos no dependen del tipo de vehículo (cédula, título/carnet de
circulación/certificado de origen, correo, teléfono, dirección). Placas extranjeras no tiene
precio fijo: se cotiza según el vehículo.

**Decisión:** `configuracion/rcv.requisitosGenerales` (una lista) reemplaza a `requisitos` por
categoría; el panel borra el campo viejo al guardar y las reglas lo siguen aceptando mientras
exista. Los planes solo llevan `publico`/`privado`; el plan `placas-extranjeras` sale del seed
(en producción hay que borrarlo a mano desde /rcv). En el chat, «Placas extranjeras» muestra
los requisitos, pide el vehículo y guarda la solicitud con `vehiculo` y precios `null`.

**Por qué:** el cliente edita una sola lista y el chat deja de inventar un «plan» para algo que
en realidad es una cotización.
