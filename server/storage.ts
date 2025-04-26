import { users, type User, type InsertUser, type Ride, type InsertRide, type UpdateRide } from "@shared/schema";

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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private rides: Map<number, Ride>;
  private userIdCounter: number;
  private rideIdCounter: number;

  constructor() {
    this.users = new Map();
    this.rides = new Map();
    this.userIdCounter = 1;
    this.rideIdCounter = 1;
  }

  // User Methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Ride Methods
  async getRide(id: number): Promise<Ride | undefined> {
    return this.rides.get(id);
  }

  async getRidesByUserId(userId: number): Promise<Ride[]> {
    return Array.from(this.rides.values()).filter(
      (ride) => ride.userId === userId
    );
  }

  async createRide(insertRide: InsertRide): Promise<Ride> {
    const id = this.rideIdCounter++;
    const newRide: Ride = { 
      ...insertRide, 
      id,
      isUploaded: true // Since we're storing it server-side
    };
    this.rides.set(id, newRide);
    return newRide;
  }

  async updateRide(id: number, updateRide: UpdateRide): Promise<Ride | undefined> {
    const ride = this.rides.get(id);
    if (!ride) {
      return undefined;
    }
    
    const updatedRide: Ride = { ...ride, ...updateRide };
    this.rides.set(id, updatedRide);
    return updatedRide;
  }

  async deleteRide(id: number): Promise<boolean> {
    return this.rides.delete(id);
  }
}

export const storage = new MemStorage();
