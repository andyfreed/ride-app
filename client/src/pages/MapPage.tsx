import { useEffect, useState, useRef } from "react";
import MapView from "@/components/MapView";
import RideControlPanel from "@/components/RideControlPanel";
import { useSettings } from "@/contexts/SettingsContext";
import { useRide } from "@/contexts/RideContext";
import { GPSTracker } from "@/lib/gpsTracker";
import { calculateDistance, GeolocationCoordinate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";

const MapPage = () => {
  const [currentPosition, setCurrentPosition] = useState<GeolocationCoordinate | undefined>(undefined);
  const [coordinates, setCoordinates] = useState<GeolocationCoordinate[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [duration, setDuration] = useState(0);
  const [distance, setDistance] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [maxSpeed, setMaxSpeed] = useState(0);
  const [gpsStatus, setGpsStatus] = useState<'strong' | 'weak' | 'none'>('none');
  const [showStopDialog, setShowStopDialog] = useState(false);
  const trackerRef = useRef<GPSTracker | null>(null);
  const durationTimerRef = useRef<number | null>(null);
  // Handle the case when settings context might not be available yet
  let settings;
  let saveRide;
  
  try {
    // Try to use the hooks, but be prepared for them to fail
    const settingsContext = useSettings();
    settings = settingsContext.settings;
    
    const rideContext = useRide();
    saveRide = rideContext.saveRide;
  } catch (error) {
    console.warn("Contexts not yet available:", error);
    // Return a loading state if contexts aren't available
    return <div className="p-4">Loading application...</div>;
  }
  
  const { toast } = useToast();

  // Initialize by getting current position with iOS optimizations
  useEffect(() => {
    if (navigator.geolocation) {
      // Check if this is an iOS device
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      console.log("Device detection: iOS device =", isIOS);
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, altitude, speed, heading, accuracy, altitudeAccuracy } = position.coords;
          const newPosition: GeolocationCoordinate = {
            latitude,
            longitude,
            timestamp: position.timestamp,
            altitude: altitude,
            speed: speed,
            heading: heading,
            accuracy: accuracy,
            altitudeAccuracy: altitudeAccuracy
          };
          setCurrentPosition(newPosition);
          updateGpsStatus(accuracy || 0);
          
          // Log GPS information for debugging on iOS
          console.log(`Initial GPS data: Accuracy: ${accuracy}m, Lat: ${latitude}, Lng: ${longitude}`);
          
          // Show a visible toast for GPS acquisition success
          toast({
            title: "GPS Signal Acquired",
            description: `Location found with ${accuracy.toFixed(1)}m accuracy`,
            variant: "default"
          });
        },
        (error) => {
          console.error("Error getting current position:", error);
          toast({
            title: "GPS Error",
            description: `Could not get your location: ${error.message}`,
            variant: "destructive"
          });
          setGpsStatus('none');
        },
        {
          // On iOS, use slightly different settings
          enableHighAccuracy: true,
          timeout: isIOS ? 15000 : 10000, // Longer timeout for iOS
          maximumAge: isIOS ? 2000 : 0  // Allow slightly cached positions on iOS
        }
      );
    }

    return () => {
      if (trackerRef.current) {
        trackerRef.current.stopTracking();
      }
      if (durationTimerRef.current) {
        window.clearInterval(durationTimerRef.current);
      }
    };
  }, []);

  // Update GPS status based on accuracy with more lenient thresholds for desktop
  const updateGpsStatus = (accuracy: number) => {
    // Check if device is iOS to use different thresholds
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // More lenient thresholds for desktop browsers
    if (isMobile) {
      // Mobile thresholds (stricter)
      if (accuracy <= 15) {
        setGpsStatus('strong');
      } else if (accuracy <= 40) {
        setGpsStatus('weak');
      } else {
        setGpsStatus('none');
      }
    } else {
      // Desktop thresholds (more lenient)
      if (accuracy <= 30) {
        setGpsStatus('strong');
      } else if (accuracy <= 100) {
        setGpsStatus('weak');
      } else {
        setGpsStatus('none');
      }
    }
    
    // If we have any accuracy value, we should at least show something
    if (accuracy > 0 && gpsStatus === 'none') {
      setGpsStatus('weak');
    }
  };

  // Start ride tracking
  const handleStartRide = () => {
    if (gpsStatus === 'none') {
      toast({
        title: "GPS Signal Needed",
        description: "Please wait for GPS signal before starting a ride",
        variant: "destructive"
      });
      return;
    }

    // Check if this is an iOS device
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    // Initialize tracker with iOS-specific optimizations
    trackerRef.current = new GPSTracker({
      highAccuracy: settings.gpsAccuracy === 'high',
      onPositionUpdate: handlePositionUpdate,
      onError: handleGpsError,
      // Adjust update frequency based on accuracy setting and device type
      pauseBetweenUpdates: isIOS 
        ? (settings.gpsAccuracy === 'low' ? 8000 : 
           settings.gpsAccuracy === 'medium' ? 3000 : 2000)
        : (settings.gpsAccuracy === 'low' ? 5000 : 
           settings.gpsAccuracy === 'medium' ? 2000 : 1000),
      // iOS-specific optimizations
      isAppleDevice: isIOS,
      // Minimum distance between points to record (in meters)
      minDistance: isIOS ? 5 : 2,
      // Allow slightly cached positions on iOS to save battery
      maximumAge: isIOS ? 2000 : 0,
      // Longer timeout for iOS
      timeout: isIOS ? 15000 : 10000
    });

    // Start tracking
    if (trackerRef.current.startTracking()) {
      setIsRecording(true);
      setIsPaused(false);
      setStartTime(Date.now());
      setCoordinates([]);
      setDuration(0);
      setDistance(0);
      setCurrentSpeed(0);
      setMaxSpeed(0);

      // Start duration timer
      durationTimerRef.current = window.setInterval(() => {
        if (!isPaused) {
          setDuration(prev => prev + 1);
        }
      }, 1000);

      toast({
        title: "Ride Started",
        description: "GPS tracking is now active"
      });
    } else {
      toast({
        title: "Could Not Start Tracking",
        description: "There was an error starting GPS tracking",
        variant: "destructive"
      });
    }
  };

  // Handle new position data
  const handlePositionUpdate = (position: GeolocationCoordinate) => {
    if (isPaused) return;
    
    setCurrentPosition(position);
    updateGpsStatus(position.accuracy || 0);
    
    setCoordinates(prev => {
      const newCoordinates = [...prev, position];
      
      // Calculate total distance
      if (prev.length > 0) {
        const newDistance = calculateDistance([prev[prev.length - 1], position]);
        setDistance(prevDistance => prevDistance + newDistance);
      }
      
      return newCoordinates;
    });
    
    // Update current speed
    if (position.speed !== null && position.speed !== undefined) {
      const speedMps = position.speed;
      setCurrentSpeed(speedMps);
      
      // Update max speed if needed
      if (speedMps > maxSpeed) {
        setMaxSpeed(speedMps);
      }
    }
  };

  // Handle GPS errors
  const handleGpsError = (error: GeolocationPositionError) => {
    console.error("GPS Error:", error);
    
    toast({
      title: "GPS Error",
      description: `There was a problem with GPS tracking: ${error.message}`,
      variant: "destructive"
    });
    
    if (error.code === 1) {
      // Permission denied
      setGpsStatus('none');
    } else if (error.code === 2) {
      // Position unavailable
      setGpsStatus('weak');
    }
  };

  // Pause ride tracking
  const handlePauseRide = () => {
    if (!trackerRef.current) return;
    
    trackerRef.current.pauseTracking();
    setIsPaused(true);
    
    toast({
      title: "Ride Paused",
      description: "GPS tracking has been paused"
    });
  };

  // Resume ride tracking
  const handleResumeRide = () => {
    if (!trackerRef.current) return;
    
    trackerRef.current.resumeTracking();
    setIsPaused(false);
    
    toast({
      title: "Ride Resumed",
      description: "GPS tracking has been resumed"
    });
  };

  // Stop ride tracking and save the ride
  const handleStopRide = () => {
    setShowStopDialog(true);
  };

  // Confirm stopping the ride
  const confirmStopRide = async () => {
    if (!trackerRef.current) return;
    
    try {
      // Get final coordinates
      const finalCoordinates = trackerRef.current.getCoordinates();
      
      // Stop tracking
      trackerRef.current.stopTracking();
      
      // Clear timer
      if (durationTimerRef.current) {
        window.clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
      
      // Calculate ride stats
      const endTime = Date.now();
      
      // Save ride data
      if (finalCoordinates.length > 0) {
        const title = `Ride on ${new Date().toLocaleDateString()}`;
        
        try {
          const savedRide = await saveRide({
            title,
            description: "",
            distance: distance.toString(), // Convert to string for numeric type
            duration,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            maxSpeed: maxSpeed.toString(), // Convert to string for numeric type
            avgSpeed: (distance / (duration > 0 ? duration : 1)).toString(), // Convert to string for numeric type
            userId: null, // No user ID for local rides
            elevationGain: "0", // Default elevation gain
            route: finalCoordinates.map(coord => ({
              latitude: coord.latitude,
              longitude: coord.longitude,
              timestamp: coord.timestamp,
              altitude: coord.altitude !== null ? coord.altitude : undefined,
              speed: coord.speed !== null ? coord.speed : undefined,
              heading: coord.heading !== null ? coord.heading : undefined,
              accuracy: coord.accuracy !== null ? coord.accuracy : undefined,
              altitudeAccuracy: coord.altitudeAccuracy !== null ? coord.altitudeAccuracy : undefined
            })),
            startLocation: "Starting point",
            endLocation: "Ending point"
          });
          
          toast({
            title: "Ride Saved",
            description: `Your ${formatDistance(distance)} ride has been saved`
          });
          
          console.log("Ride saved successfully:", savedRide);
        } catch (saveError) {
          console.error("Error saving ride:", saveError);
          toast({
            title: "Error Saving Ride",
            description: "There was a problem saving your ride data. Please try again.",
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Ride Not Saved",
          description: "No GPS data was recorded for this ride",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error in confirmStopRide:", error);
      toast({
        title: "Error",
        description: "There was a problem ending your ride. Please try again.",
        variant: "destructive"
      });
    } finally {
      // Always reset state even if there was an error
      setIsRecording(false);
      setIsPaused(false);
      setShowStopDialog(false);
    }
  };

  // Format distance based on settings
  const formatDistance = (meters: number) => {
    if (settings.units === 'metric') {
      return meters >= 1000 
        ? `${(meters / 1000).toFixed(1)} km` 
        : `${meters.toFixed(0)} m`;
    } else {
      const miles = meters / 1609.34;
      return `${miles.toFixed(1)} mile${miles !== 1 ? 's' : ''}`;
    }
  };

  // Add waypoint (just a toast for now)
  const handleAddWaypoint = () => {
    toast({
      title: "Waypoint Added",
      description: "Marked current location as a waypoint"
    });
  };

  return (
    <>
      <div className="h-full w-full flex flex-col overflow-hidden">
        <div className="relative flex-1 overflow-hidden">
          <MapView 
            coordinates={coordinates}
            currentPosition={currentPosition}
            isTracking={isRecording}
            gpsStatus={gpsStatus}
            followPosition={isRecording}
          />
        </div>
        
        <div className="relative z-10">
          <RideControlPanel
            isRecording={isRecording}
            isPaused={isPaused}
            duration={duration}
            distance={distance}
            currentSpeed={currentSpeed}
            avgSpeed={distance / (duration > 0 ? duration : 1)}
            onStart={handleStartRide}
            onPause={handlePauseRide}
            onResume={handleResumeRide}
            onStop={handleStopRide}
            onAddWaypoint={handleAddWaypoint}
          />
        </div>
      </div>

      <AlertDialog open={showStopDialog} onOpenChange={setShowStopDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End this ride?</AlertDialogTitle>
            <AlertDialogDescription>
              This will stop tracking and save your ride data. You can't undo this action.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmStopRide}>
              End Ride
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default MapPage;
