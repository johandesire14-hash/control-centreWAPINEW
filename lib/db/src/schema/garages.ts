import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const garagesTable = pgTable("garages", {
  id: serial("id").primaryKey(),
  ownerId: varchar("owner_id")
    .notNull()
    .unique()
    .references(() => usersTable.id),
  name: varchar("name").notNull(),
  neighborhood: varchar("neighborhood").notNull(),
  address: varchar("address").notNull(),
  phone: varchar("phone").notNull(),
  whatsapp: varchar("whatsapp"),
  description: text("description"),
  coverImageUrl: varchar("cover_image_url"),
  avatarImageUrl: varchar("avatar_image_url"),
  certified: boolean("certified").notNull().default(false),
  specialties: jsonb("specialties").notNull().default(sql`'[]'::jsonb`),
  emergencyAvailable: boolean("emergency_available").notNull().default(false),
  averageRepairDelay: varchar("average_repair_delay"),
  yearsExperience: integer("years_experience").notNull().default(0),
  mechanicsCount: integer("mechanics_count").notNull().default(0),
  acceptedBrands: jsonb("accepted_brands").notNull().default(sql`'[]'::jsonb`),
  openingHours: jsonb("opening_hours").notNull().default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type Garage = typeof garagesTable.$inferSelect;
export type InsertGarage = typeof garagesTable.$inferInsert;

export const garagePhotosTable = pgTable("garage_photos", {
  id: serial("id").primaryKey(),
  garageId: integer("garage_id")
    .notNull()
    .references(() => garagesTable.id, { onDelete: "cascade" }),
  url: varchar("url").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type GaragePhoto = typeof garagePhotosTable.$inferSelect;
export type InsertGaragePhoto = typeof garagePhotosTable.$inferInsert;
