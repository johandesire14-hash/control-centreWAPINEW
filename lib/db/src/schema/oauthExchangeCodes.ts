import { index, jsonb, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

export const oauthExchangeCodesTable = pgTable(
  "oauth_exchange_codes",
  {
    code: varchar("code", { length: 128 }).primaryKey(),
    sessionId: varchar("session_id").notNull(),
    isNewUser: varchar("is_new_user", { length: 5 }).notNull().default("false"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("oauth_exchange_codes_expire_idx").on(table.expiresAt)],
);

export type OauthExchangeCode = typeof oauthExchangeCodesTable.$inferSelect;
