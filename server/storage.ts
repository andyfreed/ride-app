import { users, rides, type User, type InsertUser, type Ride, type InsertRide, type UpdateRide } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Ride methods
  getRide(id: number): Promise<Ride | undefined>;
  getRidesByUserId(userId: number): Promise<Ride[]>;
  createRide(ride: InsertRide): Promise<Ride>;
  updateRide(id: number, ride: UpdateRide): Promise<Ride | undefined>;
  deleteRide(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User Methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Ride Methods
  async getRide(id: number): Promise<Ride | undefined> {
    const [ride] = await db.select().from(rides).where(eq(rides.id, id));
    return ride || undefined;
  }

  async getRidesByUserId(userId: number): Promise<Ride[]> {
    return await db.select().from(rides).where(eq(rides.userId, userId));
  }

  async createRide(insertRide: InsertRide): Promise<Ride> {
    // Set isUploaded to true for server-created rides
    const [ride] = await db
      .insert(rides)
      .values({ ...insertRide, isUploaded: true })
      .returning();
    return ride;
  }

  async updateRide(id: number, updateRide: UpdateRide): Promise<Ride | undefined> {
    const [updatedRide] = await db
      .update(rides)
      .set(updateRide)
      .where(eq(rides.id, id))
      .returning();
    return updatedRide || undefined;
  }

  async deleteRide(id: number): Promise<boolean> {
    const result = await db
      .delete(rides)
      .where(eq(rides.id, id))
      .returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
