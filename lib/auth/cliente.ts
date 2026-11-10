"use client";

import { createAuthClient } from "better-auth/react";

/** Cliente de Better Auth en el navegador (mismo origen: `/api/auth`). */
export const authClient = createAuthClient();
