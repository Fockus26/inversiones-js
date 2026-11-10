/** Sin sesión → 401; con sesión pero sin fila en `admins` → 403 (D003). */
export class ErrorAcceso extends Error {
  constructor(readonly estado: 401 | 403) {
    super(estado === 401 ? "Inicia sesión para continuar." : "Sin acceso.");
    this.name = "ErrorAcceso";
  }
}
