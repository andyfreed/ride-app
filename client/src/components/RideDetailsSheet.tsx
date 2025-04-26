import { Ride } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { X, Share, Download, Trash2, MapPin, Flag } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { 
  formatDistance, 
  formatDuration, 
  formatSpeed, 
  formatElevation, 
  formatDateTime 
} from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useEffect, useState } from "react";
import MapView from "./MapView";

interface RideDetailsSheetProps {
  ride: Ride;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (rideId: number) => void;
  onExport: (ride: Ride) => void;
  onShare: (ride: Ride) => void;
  isFullPage?: boolean;
}

const RideDetailsSheet = ({ 
  ride, 
  isOpen, 
  onOpenChange, 
  onDelete, 
  onExport, 
  onShare,
  isFullPage = false 
}: RideDetailsSheetProps) => {
  const { settings } = useSettings();
  const isMetric = settings.units === 'metric';
  const [mapKey, setMapKey] = useState(Date.now()); // Force map rerender when shown
  
  useEffect(() => {
    if (isOpen) {
      setMapKey(Date.now());
    }
  }, [isOpen]);

  const sheetContent = (
    <>
      <SheetHeader className="mb-4 flex items-center justify-between">
        <SheetTitle>Ride Details</SheetTitle>
        {!isFullPage && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onOpenChange(false)}>
            <X size={18} />
          </Button>
        )}
      </SheetHeader>

      {/* Map Preview */}
      <div className="h-40 bg-neutral-200 rounded-xl mb-4 relative overflow-hidden" key={mapKey}>
        <MapView 
          coordinates={ride.route} 
          isTracking={false} 
          gpsStatus="strong" 
          followPosition={false}
        />
      </div>

      {/* Ride Summary */}
      <div className="flex justify-between mb-6">
        <div className="flex flex-col items-center">
          <span className="text-2xl font-semibold">
            {formatDistance(Number(ride.distance), isMetric)}
          </span>
          <span className="text-xs text-neutral-400">Distance</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-2xl font-semibold">
            {formatDuration(ride.duration)}
          </span>
          <span className="text-xs text-neutral-400">Duration</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-2xl font-semibold">
            {formatSpeed(Number(ride.avgSpeed), isMetric)}
          </span>
          <span className="text-xs text-neutral-400">Avg Speed</span>
        </div>
      </div>

      {/* Ride Statistics */}
      <div className="border-t border-neutral-100 py-4">
        <h3 className="font-medium mb-3">Ride Statistics</h3>
        
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm">Max Speed</span>
          <span className="text-sm font-medium">
            {formatSpeed(Number(ride.maxSpeed), isMetric)}
          </span>
        </div>
        
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm">Start Time</span>
          <span className="text-sm font-medium">
            {formatDateTime(new Date(ride.startTime))}
          </span>
        </div>
        
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm">End Time</span>
          <span className="text-sm font-medium">
            {formatDateTime(new Date(ride.endTime))}
          </span>
        </div>
        
        {ride.elevationGain && (
          <div className="flex justify-between items-center">
            <span className="text-sm">Elevation Gain</span>
            <span className="text-sm font-medium">
              {formatElevation(Number(ride.elevationGain), isMetric)}
            </span>
          </div>
        )}
      </div>

      {/* Route Information */}
      <div className="border-t border-neutral-100 py-4">
        <h3 className="font-medium mb-3">Route Information</h3>
        
        <div className="flex items-center mb-2">
          <div className="mr-2 text-secondary">
            <MapPin size={16} />
          </div>
          <div>
            <div className="text-sm font-medium">Start Point</div>
            <div className="text-xs text-neutral-400">
              {ride.startLocation || "Unknown location"}
            </div>
          </div>
        </div>
        
        <div className="flex items-center">
          <div className="mr-2 text-primary">
            <Flag size={16} />
          </div>
          <div>
            <div className="text-sm font-medium">End Point</div>
            <div className="text-xs text-neutral-400">
              {ride.endLocation || "Unknown location"}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mt-2">
        <Button 
          variant="outline" 
          className="flex-1"
          onClick={() => onShare(ride)}
        >
          <Share className="mr-2 h-4 w-4" />
          Share
        </Button>
        <Button 
          variant="outline" 
          className="flex-1"
          onClick={() => onExport(ride)}
        >
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
        <Button 
          variant="outline" 
          className="flex-1 text-destructive hover:text-destructive"
          onClick={() => onDelete(ride.id)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      </div>
    </>
  );

  // If showing in full page mode, just return the content
  if (isFullPage) {
    return <div className="px-4 py-3">{sheetContent}</div>;
  }

  // Otherwise show in a Sheet component
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] pt-6">
        <div className="w-16 h-1 bg-neutral-300 rounded-full mx-auto -mt-2 mb-4"></div>
        {sheetContent}
      </SheetContent>
    </Sheet>
  );
};

export default RideDetailsSheet;
