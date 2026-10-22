# D042 · Clientes · Fechas entre 2020 y hoy + 2 años; emisión no futura salvo renovación · Implementado

**Decisión:** la primera cuota y la emisión de la póliza se aceptan entre `2020-01-01` y hoy
(Caracas) + 24 meses (`fechaEnRango`, `lib/financiamiento/fechas.ts`). La emisión además no puede
ser posterior a hoy, salvo que sea la misma que ya tenía (una renovación la deja en el
vencimiento anterior). Las reglas solo cortan lo absurdo: `fecha()` exige 2000–2099.
**Por qué:** la QA funcional (2026-10-22) vio que teclear «26» en el año del selector guardaba
`0026-10-28` y `Date.UTC` lo convertía en 1926/1927. Clientes «atrasados hace 100 años» y avisos
del bot con vencimientos absurdos. También se aceptaban 1800 y 3000.
**Consecuencia:** editar un cliente con una fecha anterior a 2020 obliga a corregirla. Rango
elegido sin consultar a César (conservador); si el cliente registra deudas más viejas, bajar
`FECHA_MINIMA`.
