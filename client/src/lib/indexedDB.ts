import { Ride, Coordinate } from "@shared/schema";

// Define the database name and version
const DB_NAME = "mototrack_db";
const DB_VERSION = 1;

// Define the store names
const RIDES_STORE = "rides";
const SETTINGS_STORE = "settings";

// Open and initialize the database
// Create a single database connection that can be reused
let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  // If we already have a db connection promise, return it
  if (dbPromise) return dbPromise;
  
  // Otherwise create a new one
  dbPromise = new Promise((resolve, reject) => {
    // Check if IndexedDB is available
    if (!window.indexedDB) {
      console.error("Your browser doesn't support IndexedDB");
      reject("IndexedDB not supported");
      return;
    }
    
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("Error opening database:", request.error);
      dbPromise = null; // Reset so we can try again
      reject("Error opening database: " + request.error?.message || "Unknown error");
    };

    request.onsuccess = (event) => {
      const db = request.result;
      
      // Handle connection errors
      db.onerror = (event) => {
        console.error("Database error:", (event.target as any).error);
      };
      
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = request.result;

      // Create Rides store
      if (!db.objectStoreNames.contains(RIDES_STORE)) {
        const ridesStore = db.createObjectStore(RIDES_STORE, { keyPath: "id", autoIncrement: true });
        ridesStore.createIndex("userId", "userId", { unique: false });
        ridesStore.createIndex("isUploaded", "isUploaded", { unique: false });
        ridesStore.createIndex("startTime", "startTime", { unique: false });
      }

      // Create Settings store
      if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
        db.createObjectStore(SETTINGS_STORE, { keyPath: "id" });
      }
    };
  });
  
  return dbPromise;
}

// Save a ride to IndexedDB
export async function saveRide(ride: Omit<Ride, "id">): Promise<number> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(RIDES_STORE, "readwrite");
    const store = transaction.objectStore(RIDES_STORE);
    
    const request = store.add(ride);
    
    request.onsuccess = () => {
      resolve(request.result as number);
    };
    
    request.onerror = () => {
      reject("Error saving ride");
    };
    
    transaction.oncomplete = () => {
      db.close();
    };
  });
}

// Get all rides from IndexedDB
export async function getAllRides(): Promise<Ride[]> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(RIDES_STORE, "readonly");
    const store = transaction.objectStore(RIDES_STORE);
    
    const request = store.getAll();
    
    request.onsuccess = () => {
      resolve(request.result as Ride[]);
    };
    
    request.onerror = () => {
      reject("Error getting rides");
    };
    
    transaction.oncomplete = () => {
      db.close();
    };
  });
}

// Get a ride by ID
export async function getRideById(id: number): Promise<Ride | null> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(RIDES_STORE, "readonly");
    const store = transaction.objectStore(RIDES_STORE);
    
    const request = store.get(id);
    
    request.onsuccess = () => {
      resolve(request.result as Ride || null);
    };
    
    request.onerror = () => {
      reject("Error getting ride");
    };
    
    transaction.oncomplete = () => {
      db.close();
    };
  });
}

// Delete a ride by ID
export async function deleteRide(id: number): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(RIDES_STORE, "readwrite");
    const store = transaction.objectStore(RIDES_STORE);
    
    const request = store.delete(id);
    
    request.onsuccess = () => {
      resolve();
    };
    
    request.onerror = () => {
      reject("Error deleting ride");
    };
    
    transaction.oncomplete = () => {
      db.close();
    };
  });
}

// Update a ride
export async function updateRide(ride: Ride): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(RIDES_STORE, "readwrite");
    const store = transaction.objectStore(RIDES_STORE);
    
    const request = store.put(ride);
    
    request.onsuccess = () => {
      resolve();
    };
    
    request.onerror = () => {
      reject("Error updating ride");
    };
    
    transaction.oncomplete = () => {
      db.close();
    };
  });
}

// Mark ride as uploaded
export async function markRideAsUploaded(id: number): Promise<void> {
  const ride = await getRideById(id);
  if (ride) {
    ride.isUploaded = true;
    await updateRide(ride);
  }
}

// Get rides that haven't been uploaded
export async function getNotUploadedRides(): Promise<Ride[]> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(RIDES_STORE, "readonly");
    const store = transaction.objectStore(RIDES_STORE);
    const index = store.index("isUploaded");
    
    const request = index.getAll(IDBKeyRange.only(false));
    
    request.onsuccess = () => {
      resolve(request.result as Ride[]);
    };
    
    request.onerror = () => {
      reject("Error getting not uploaded rides");
    };
    
    transaction.oncomplete = () => {
      db.close();
    };
  });
}

// Save settings
export async function saveSettings(settings: any): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SETTINGS_STORE, "readwrite");
    const store = transaction.objectStore(SETTINGS_STORE);
    
    const request = store.put({ ...settings, id: "app-settings" });
    
    request.onsuccess = () => {
      resolve();
    };
    
    request.onerror = () => {
      reject("Error saving settings");
    };
    
    transaction.oncomplete = () => {
      db.close();
    };
  });
}

// Get settings
export async function getSettings(): Promise<any | null> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SETTINGS_STORE, "readonly");
    const store = transaction.objectStore(SETTINGS_STORE);
    
    const request = store.get("app-settings");
    
    request.onsuccess = () => {
      resolve(request.result || null);
    };
    
    request.onerror = () => {
      reject("Error getting settings");
    };
    
    transaction.oncomplete = () => {
      db.close();
    };
  });
}
