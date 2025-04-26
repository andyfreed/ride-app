import { GeolocationCoordinate } from "./utils";

export type GPSTrackerOptions = {
  highAccuracy: boolean;
  onPositionUpdate: (position: GeolocationCoordinate) => void;
  onError: (error: GeolocationPositionError) => void;
  pauseBetweenUpdates?: number; // milliseconds to pause between updates to save battery
  maximumAge?: number; // maximum age in milliseconds of a possible cached position
  timeout?: number; // timeout in milliseconds for position request
  minDistance?: number; // minimum distance (meters) between position updates to record
  isAppleDevice?: boolean; // flag for iOS-specific optimizations
};

export class GPSTracker {
  private watchId: number | null = null;
  private isTracking = false;
  private coordinates: GeolocationCoordinate[] = [];
  private pauseBetweenUpdates: number;
  private options: GPSTrackerOptions;
  private lastUpdateTime = 0;
  private highestSpeed = 0;

  constructor(options: GPSTrackerOptions) {
    this.options = options;
    this.pauseBetweenUpdates = options.pauseBetweenUpdates || 0;
  }

  public startTracking(): boolean {
    if (this.isTracking) return false;
    if (!navigator.geolocation) {
      this.options.onError({
        code: 2,
        message: "Geolocation is not supported by this browser.",
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3
      });
      return false;
    }

    this.coordinates = [];
    this.highestSpeed = 0;
    this.lastUpdateTime = 0;
    this.isTracking = true;

    // Request a wake lock to prevent screen from turning off
    this.requestWakeLock();
    
    // Check if this appears to be an iOS device
    const isIOS = 
      this.options.isAppleDevice || 
      (typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent));
    
    // Use optimized settings for iOS
    const timeout = this.options.timeout || 30000;
    const maximumAge = this.options.maximumAge || (isIOS ? 1000 : 0); // Slight caching for iOS to reduce battery drain
    
    // On iOS, we want to use different accuracy settings for battery preservation
    // Balance between accuracy and battery life
    const enableHighAccuracy = isIOS 
      ? this.options.highAccuracy && navigator.userAgent.includes('iPhone') 
      : this.options.highAccuracy;

    this.watchId = navigator.geolocation.watchPosition(
      this.handlePositionUpdate,
      this.handleError,
      {
        enableHighAccuracy,
        timeout,
        maximumAge
      }
    );

    return true;
  }

  public stopTracking(): GeolocationCoordinate[] {
    if (!this.isTracking) return this.coordinates;

    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    this.isTracking = false;
    this.releaseWakeLock();
    
    return this.coordinates;
  }

  public isCurrentlyTracking(): boolean {
    return this.isTracking;
  }

  public getCoordinates(): GeolocationCoordinate[] {
    return [...this.coordinates];
  }

  public getDistance(): number {
    // Distance is calculated by the consumer of this class
    return 0;
  }

  public getDuration(): number {
    if (this.coordinates.length < 2) return 0;
    
    const start = this.coordinates[0].timestamp;
    const end = this.coordinates[this.coordinates.length - 1].timestamp;
    
    return Math.floor((end - start) / 1000); // in seconds
  }

  public getMaxSpeed(): number {
    return this.highestSpeed;
  }

  public getAverageSpeed(): number {
    const speedReadings = this.coordinates
      .map(coord => coord.speed)
      .filter((speed): speed is number => speed !== null && speed !== undefined);
    
    if (speedReadings.length === 0) return 0;
    
    const sum = speedReadings.reduce((acc, speed) => acc + speed, 0);
    return sum / speedReadings.length;
  }

  public pauseTracking(): void {
    if (!this.isTracking || this.watchId === null) return;
    
    navigator.geolocation.clearWatch(this.watchId);
    this.watchId = null;
  }

  public resumeTracking(): void {
    if (!this.isTracking || this.watchId !== null) return;
    
    // Check if this appears to be an iOS device
    const isIOS = 
      this.options.isAppleDevice || 
      (typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent));
    
    // Use optimized settings for iOS
    const timeout = this.options.timeout || 30000;
    const maximumAge = this.options.maximumAge || (isIOS ? 1000 : 0); // Slight caching for iOS
    
    // On iOS, we want to use different accuracy settings for battery preservation
    const enableHighAccuracy = isIOS 
      ? this.options.highAccuracy && navigator.userAgent.includes('iPhone') 
      : this.options.highAccuracy;
      
    this.watchId = navigator.geolocation.watchPosition(
      this.handlePositionUpdate,
      this.handleError,
      {
        enableHighAccuracy,
        timeout,
        maximumAge
      }
    );
  }

  private handlePositionUpdate = (position: GeolocationPosition) => {
    const now = Date.now();
    
    // Implement pause between updates to save battery
    if (this.pauseBetweenUpdates > 0 && now - this.lastUpdateTime < this.pauseBetweenUpdates) {
      return;
    }
    
    this.lastUpdateTime = now;
    
    const { latitude, longitude, altitude, speed, heading, accuracy, altitudeAccuracy } = position.coords;
    const timestamp = position.timestamp;
    
    // Skip this position update if the accuracy is poor (especially important on iOS)
    // Accuracy is the radius in meters - smaller numbers are better
    // On iPhone, good accuracy is < 10m, reasonable is < 50m, poor is > 50m
    const isIOS = this.options.isAppleDevice || 
                 (typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent));
    
    if (accuracy !== undefined) {
      // Skip very inaccurate readings, with more tolerance on iOS
      const accuracyThreshold = isIOS ? 100 : 50; // meters
      if (accuracy > accuracyThreshold) {
        console.log(`Skipping position update with poor accuracy: ${accuracy}m`);
        return;
      }
    }
    
    // Skip if there hasn't been enough movement (for battery saving)
    if (this.options.minDistance && this.coordinates.length > 0) {
      const lastCoord = this.coordinates[this.coordinates.length - 1];
      const distanceMoved = this.calculateDistance(
        lastCoord.latitude, 
        lastCoord.longitude, 
        latitude, 
        longitude
      );
      
      // Skip if movement is below threshold (important for iOS battery saving)
      if (distanceMoved < this.options.minDistance) {
        return;
      }
    }
    
    // Update highest speed if needed
    if (speed !== null && speed > this.highestSpeed) {
      this.highestSpeed = speed;
    }
    
    const coordinate: GeolocationCoordinate = {
      latitude,
      longitude,
      timestamp,
      altitude,
      speed,
      heading,
      accuracy,
      altitudeAccuracy
    };
    
    this.coordinates.push(coordinate);
    this.options.onPositionUpdate(coordinate);
  };
  
  // Calculate distance between two coordinates using Haversine formula
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    // Earth's radius in meters
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // distance in meters
  };

  private handleError = (error: GeolocationPositionError) => {
    this.options.onError(error);
  };

  // Wake Lock API to prevent screen from turning off during tracking
  private wakeLock: any = null;
  
  private async requestWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        // @ts-ignore - Wake Lock API might not be fully typed
        this.wakeLock = await navigator.wakeLock.request('screen');
      } catch (err) {
        console.log(`Wake Lock error: ${err}`);
      }
    }
  }
  
  private releaseWakeLock() {
    if (this.wakeLock) {
      this.wakeLock.release()
        .then(() => {
          this.wakeLock = null;
        });
    }
  }
}
