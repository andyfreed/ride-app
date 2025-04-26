import { pgTable, text, serial, integer, boolean, timestamp, jsonb, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// GPS coordinate schema
export const coordinateSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  timestamp: z.number(),
  altitude: z.number().optional(),
  speed: z.number().optional(),
  heading: z.number().optional(),
  accuracy: z.number().optional(),
  altitudeAccuracy: z.number().optional(),
});

export type Coordinate = z.infer<typeof coordinateSchema>;

// Rides table
export const rides = pgTable("rides", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  userId: integer("user_id").references(() => users.id),
  distance: numeric("distance").notNull(),
  duration: integer("duration").notNull(), // in seconds
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  maxSpeed: numeric("max_speed"),
  avgSpeed: numeric("avg_speed"),
  elevationGain: numeric("elevation_gain"),
  startLocation: text("start_location"),
  endLocation: text("end_location"),
  route: jsonb("route").$type<Coordinate[]>().notNull(),
  isUploaded: boolean("is_uploaded").default(false),
});

export const insertRideSchema = createInsertSchema(rides).omit({
  id: true,
  isUploaded: true
});

export const updateRideSchema = createInsertSchema(rides).omit({
  id: true
}).partial();

export type InsertRide = z.infer<typeof insertRideSchema>;
export type UpdateRide = z.infer<typeof updateRideSchema>;
export type Ride = typeof rides.$inferSelect;

// Settings schema for local storage
export const settingsSchema = z.object({
  units: z.enum(["imperial", "metric"]).default("imperial"),
  backgroundTracking: z.boolean().default(true),
  gpsAccuracy: z.enum(["high", "medium", "low"]).default("high"),
  mapStyle: z.enum(["standard", "satellite", "hybrid"]).default("standard"),
});

export type Settings = z.infer<typeof settingsSchema>;
