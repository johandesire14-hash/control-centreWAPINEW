import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";
import { usersTable } from "./auth";
import { garagesTable } from "./garages";

export const conversationsTable = pgTable(
  "conversations",
  {
    id: serial("id").primaryKey(),
    garageId: integer("garage_id")
      .notNull()
      .references(() => garagesTable.id, { onDelete: "cascade" }),
    clientId: varchar("client_id")
      .notNull()
      .references(() => usersTable.id),
    lastMessage: text("last_message"),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    clientUnreadCount: integer("client_unread_count").notNull().default(0),
    garageUnreadCount: integer("garage_unread_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.garageId, table.clientId)],
);

export type Conversation = typeof conversationsTable.$inferSelect;
export type InsertConversation = typeof conversationsTable.$inferInsert;

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id")
    .notNull()
    .references(() => conversationsTable.id, { onDelete: "cascade" }),
  senderId: varchar("sender_id")
    .notNull()
    .references(() => usersTable.id),
  type: varchar("type").notNull().default("text"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  readAt: timestamp("read_at", { withTimezone: true }),
});

export type Message = typeof messagesTable.$inferSelect;
export type InsertMessage = typeof messagesTable.$inferInsert;
