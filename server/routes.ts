import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertRideSchema, updateRideSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  // Prefix all routes with /api
  
  // Rides API endpoints
  app.get("/api/rides", async (req, res) => {
    // In a real app, we would get the userId from the session
    // For now, we'll just return all rides
    const rides = await storage.getRidesByUserId(1);
    return res.json(rides);
  });

  app.get("/api/rides/:id", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ride ID format" });
    }

    const ride = await storage.getRide(id);
    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }

    return res.json(ride);
  });

  app.post("/api/rides", async (req, res) => {
    try {
      const rideData = insertRideSchema.parse(req.body);
      // In a real app, we would set the userId from the session
      const ride = await storage.createRide({ ...rideData, userId: 1 });
      return res.status(201).json(ride);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      return res.status(500).json({ message: "Failed to create ride" });
    }
  });

  app.patch("/api/rides/:id", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ride ID format" });
    }

    try {
      const rideData = updateRideSchema.parse(req.body);
      const updatedRide = await storage.updateRide(id, rideData);
      
      if (!updatedRide) {
        return res.status(404).json({ message: "Ride not found" });
      }
      
      return res.json(updatedRide);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      return res.status(500).json({ message: "Failed to update ride" });
    }
  });

  app.delete("/api/rides/:id", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ride ID format" });
    }

    const success = await storage.deleteRide(id);
    if (!success) {
      return res.status(404).json({ message: "Ride not found" });
    }

    return res.status(204).send();
  });

  // Create HTTP server
  const httpServer = createServer(app);

  return httpServer;
}
