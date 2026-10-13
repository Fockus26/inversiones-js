# D038 · Base · Sin versión ni Changesets; pool fijo de worktrees · Implementado

Panel privado de un solo cliente: nadie lee un CHANGELOG, así que no se adopta Changesets
(kit 3.1.0) y `version` se queda fija. Las tandas usan el pool fijo de worktrees del kit
(`wt.ps1`, `..\inversiones-js-wt\wtN`) en vez de un worktree nuevo por unidad.
