# D021 · Chatbot · Agotados marcados por defecto; fecha en hora de Caracas · Reemplazada en parte por D041

`activo == false` se omite siempre. `cantidad == 0`: `{ agotados: "marcar" }` (por defecto) añade
` (agotado)`; `"ocultar"` lo quita. Se marca por defecto porque ocultar un equipo hace que el
chatbot diga "no lo tenemos" cuando sí se trabaja. Ojo: el seed arranca con `cantidad = 0`.
El `DD/MM` usa `America/Caracas` por defecto (supuesto: precios en USD y pago quincenal); el
servidor del chatbot suele estar en UTC. Ambos son parámetros.
