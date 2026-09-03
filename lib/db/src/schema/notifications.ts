import { boolean, integer, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id")
    .notNull()
    .references(() => usersTable.id),
  type: varchar("type").notNull(),
  /** "client" = visible côté client, "pro" = visible côté garage pro */
  target: varchar("target").notNull().default("client"),
  content: text("content").notNull(),
  relatedId: integer("related_id"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Notification = typeof notificationsTable.$inferSelect;
export type InsertNotification = typeof notificationsTable.$inferInsert;
