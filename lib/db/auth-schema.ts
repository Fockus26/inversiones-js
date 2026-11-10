/**
 * Tablas de Better Auth (esquema base de la v1.7 + `rateLimit` con `storage: "database"`).
 * Se escriben a mano porque la CLI no carga `lib/auth/servidor.ts` (importa `next/server`):
 * si Better Auth cambia su esquema al actualizarlo, revisar su `concepts/database`.
 * `user.id` = uid de Firebase en los usuarios importados (migración al VPS).
 */
import { relations } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

const momento = () => timestamp({ withTimezone: true, mode: "date" });

export const user = pgTable("user", {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: boolean().notNull().default(false),
  image: text(),
  createdAt: momento().notNull().defaultNow(),
  updatedAt: momento()
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const session = pgTable(
  "session",
  {
    id: text().primaryKey(),
    expiresAt: momento().notNull(),
    token: text().notNull().unique(),
    createdAt: momento().notNull().defaultNow(),
    updatedAt: momento()
      .notNull()
      .$onUpdate(() => new Date()),
    ipAddress: text(),
    userAgent: text(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text().primaryKey(),
    accountId: text().notNull(),
    providerId: text().notNull(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: momento(),
    refreshTokenExpiresAt: momento(),
    scope: text(),
    /** Hash de Better Auth, o `firebase-scrypt$sal$hash` en los importados. */
    password: text(),
    createdAt: momento().notNull().defaultNow(),
    updatedAt: momento()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("account_user_id_idx").on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text().primaryKey(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: momento().notNull(),
    createdAt: momento().notNull().defaultNow(),
    updatedAt: momento()
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

/** Límite por IP y ruta de Better Auth; en BD porque en Vercel cada función tiene su memoria. */
export const rateLimit = pgTable("rate_limit", {
  id: text().primaryKey(),
  key: text().notNull().unique(),
  count: integer().notNull(),
  lastRequest: bigint({ mode: "number" }).notNull(),
});

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));
