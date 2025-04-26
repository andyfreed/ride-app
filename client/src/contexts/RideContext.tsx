import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Ride } from "@shared/schema";
import { GeolocationCoordinate } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { 
  getAllRides as getAllRidesFromDB, 
  getRideById as getRideByIdFromDB,
  saveRide as saveRideToDb,
  updateRide as updateRideInDb,
  deleteRide as deleteRideFromDb,
  getNotUploadedRides,
  markRideAsUploaded
} from "@/lib/indexedDB";

interface RideContextType {
  rides: Ride[];
  loading: boolean;
  getRideById: (id: number) => Promise<Ride | null>;
  saveRide: (rideData: Omit<Ride, "id" | "isUploaded">) => Promise<Ride>;
  updateRide: (id: number, rideData: Partial<Ride>) => Promise<Ride | null>;
  deleteRide: (id: number) => Promise<boolean>;
}

// Initialize with default values to avoid undefined errors
const defaultContextValue: RideContextType = {
  rides: [],
  loading: true,
  getRideById: async () => null,
  saveRide: async (data) => {
    console.error("RideProvider not initialized");
    throw new Error("RideProvider not initialized");
  },
  updateRide: async () => null,
  deleteRide: async () => false
};

const RideContext = createContext<RideContextType>(defaultContextValue);

export function RideProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync offline rides when coming online
  useEffect(() => {
    if (isOnline) {
      syncOfflineRides();
    }
  }, [isOnline]);

  // Fetch rides from server or indexedDB
  const { data: rides = [], isLoading: loading } = useQuery({
    queryKey: ['/api/rides'],
    queryFn: async () => {
      try {
        if (isOnline) {
          const res = await fetch('/api/rides');
          if (!res.ok) throw new Error('Failed to fetch rides');
          return await res.json();
        } else {
          return await getAllRidesFromDB();
        }
      } catch (error) {
        console.error('Error fetching rides:', error);
        return await getAllRidesFromDB();
      }
    },
    refetchOnWindowFocus: false,
  });

  // Get a specific ride by ID
  const getRideById = async (id: number): Promise<Ride | null> => {
    try {
      if (isOnline) {
        const res = await fetch(`/api/rides/${id}`);
        if (!res.ok) {
          // If not found on server, try local
          return await getRideByIdFromDB(id);
        }
        return await res.json();
      } else {
        return await getRideByIdFromDB(id);
      }
    } catch (error) {
      console.error('Error fetching ride:', error);
      return await getRideByIdFromDB(id);
    }
  };

  // Save a new ride
  const saveRide = async (rideData: Omit<Ride, "id" | "isUploaded">): Promise<Ride> => {
    try {
      // Always save locally first
      const newRideId = await saveRideToDb({
        ...rideData,
        isUploaded: false,
      });
      
      // Try to upload to server if online
      if (isOnline) {
        try {
          const res = await apiRequest('POST', '/api/rides', rideData);
          const serverRide = await res.json();
          
          // Mark as uploaded in local DB
          await markRideAsUploaded(newRideId);
          
          // Refresh ride list
          queryClient.invalidateQueries({ queryKey: ['/api/rides'] });
          
          return serverRide;
        } catch (error) {
          console.error('Failed to upload to server:', error);
        }
      }
      
      // Return the local ride
      const localRide = await getRideByIdFromDB(newRideId);
      if (!localRide) throw new Error('Failed to retrieve saved ride');
      
      // Refresh ride list
      queryClient.invalidateQueries({ queryKey: ['/api/rides'] });
      
      return localRide;
    } catch (error) {
      console.error('Error saving ride:', error);
      throw error;
    }
  };

  // Update an existing ride
  const updateRide = async (id: number, rideData: Partial<Ride>): Promise<Ride | null> => {
    try {
      // Get the existing ride
      const existingRide = await getRideById(id);
      if (!existingRide) return null;
      
      // Update locally
      const updatedRide = { ...existingRide, ...rideData };
      await updateRideInDb(updatedRide);
      
      // Update on server if online
      if (isOnline) {
        try {
          await apiRequest('PATCH', `/api/rides/${id}`, rideData);
        } catch (error) {
          console.error('Failed to update on server:', error);
        }
      }
      
      // Refresh ride list
      queryClient.invalidateQueries({ queryKey: ['/api/rides'] });
      
      return updatedRide;
    } catch (error) {
      console.error('Error updating ride:', error);
      return null;
    }
  };

  // Delete a ride
  const deleteRide = async (id: number): Promise<boolean> => {
    try {
      // Delete locally
      await deleteRideFromDb(id);
      
      // Delete from server if online
      if (isOnline) {
        try {
          await apiRequest('DELETE', `/api/rides/${id}`);
        } catch (error) {
          console.error('Failed to delete from server:', error);
        }
      }
      
      // Refresh ride list
      queryClient.invalidateQueries({ queryKey: ['/api/rides'] });
      
      return true;
    } catch (error) {
      console.error('Error deleting ride:', error);
      return false;
    }
  };

  // Sync offline rides with the server
  const syncOfflineRides = async () => {
    try {
      // Get rides that haven't been uploaded
      // Wrap in try-catch to handle possible IndexedDB initialization errors
      try {
        const notUploadedRides = await getNotUploadedRides();
        
        if (notUploadedRides.length > 0) {
          for (const ride of notUploadedRides) {
            try {
              // Upload to server
              const { id, isUploaded, ...rideData } = ride;
              await apiRequest('POST', '/api/rides', rideData);
              
              // Mark as uploaded in local DB
              await markRideAsUploaded(id);
            } catch (error) {
              console.error(`Failed to sync ride ${ride.id}:`, error);
            }
          }
          
          // Refresh ride list
          queryClient.invalidateQueries({ queryKey: ['/api/rides'] });
        }
      } catch (dbError) {
        // Gracefully handle IndexedDB errors (e.g., if DB isn't initialized yet)
        console.warn('IndexedDB not ready for offline sync:', dbError);
      }
    } catch (error) {
      console.error('Error in syncOfflineRides:', error);
    }
  };

  return (
    <RideContext.Provider
      value={{
        rides,
        loading,
        getRideById,
        saveRide,
        updateRide,
        deleteRide,
      }}
    >
      {children}
    </RideContext.Provider>
  );
}

export function useRide() {
  return useContext(RideContext);
}
