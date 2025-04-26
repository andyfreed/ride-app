import { useEffect, useState } from "react";
import { useRide } from "@/contexts/RideContext";
import { useSettings } from "@/contexts/SettingsContext";
import { Ride } from "@shared/schema";
import { Link, useLocation } from "wouter";
import { formatDistance, formatDuration, formatSpeed, formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight, MapPin } from "lucide-react";
import RideDetailsSheet from "@/components/RideDetailsSheet";
import { useToast } from "@/hooks/use-toast";

const RidesListPage = () => {
  const { rides, loading, deleteRide } = useRide();
  const { settings } = useSettings();
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const isMetric = settings.units === 'metric';

  const handleViewDetails = (ride: Ride) => {
    setSelectedRide(ride);
    setDetailsOpen(true);
  };

  const handleDeleteRide = async (rideId: number) => {
    await deleteRide(rideId);
    setDetailsOpen(false);
    toast({
      title: "Ride Deleted",
      description: "The ride has been permanently deleted",
    });
  };

  const handleExportRide = (ride: Ride) => {
    // Create a GPX file for the ride
    const gpx = createGpxFromRide(ride);
    const blob = new Blob([gpx], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    
    // Create a download link and click it
    const a = document.createElement('a');
    a.href = url;
    a.download = `ride-${new Date(ride.startTime).toISOString().split('T')[0]}.gpx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Ride Exported",
      description: "GPX file has been downloaded to your device"
    });
  };

  const handleShareRide = (ride: Ride) => {
    if (navigator.share) {
      navigator.share({
        title: `Motorcycle Ride - ${formatDate(new Date(ride.startTime))}`,
        text: `Check out my motorcycle ride! ${formatDistance(Number(ride.distance), isMetric)} in ${formatDuration(ride.duration)}.`,
      })
      .catch(error => {
        console.error('Error sharing:', error);
        toast({
          title: "Sharing Failed",
          description: "Could not share this ride",
          variant: "destructive"
        });
      });
    } else {
      toast({
        title: "Sharing Not Available",
        description: "Your browser does not support the Web Share API",
        variant: "destructive"
      });
    }
  };

  const createGpxFromRide = (ride: Ride): string => {
    const header = `<?xml version="1.0" encoding="UTF-8"?>
<gpx creator="MotoTrack" version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${ride.title}</name>
    <time>${new Date(ride.startTime).toISOString()}</time>
  </metadata>
  <trk>
    <name>${ride.title}</name>
    <trkseg>`;
    
    const points = ride.route.map(coord => 
      `      <trkpt lat="${coord.latitude}" lon="${coord.longitude}">
        <ele>${coord.altitude || 0}</ele>
        <time>${new Date(coord.timestamp).toISOString()}</time>
        ${coord.speed !== undefined ? `<speed>${coord.speed}</speed>` : ''}
      </trkpt>`
    ).join('\n');
    
    const footer = `    </trkseg>
  </trk>
</gpx>`;
    
    return `${header}\n${points}\n${footer}`;
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <h1 className="text-2xl font-semibold mb-4 pt-2">Your Rides</h1>
        {[1, 2, 3].map(i => (
          <Card key={i} className="mb-4">
            <CardContent className="p-0">
              <Skeleton className="h-32 w-full" />
              <div className="p-4">
                <div className="flex justify-between mb-3">
                  {[1, 2, 3].map(j => (
                    <Skeleton key={j} className="h-10 w-16" />
                  ))}
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 pb-20">
      <h1 className="text-2xl font-semibold mb-4 pt-2">Your Rides</h1>
      
      {rides.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <div className="text-neutral-400 mb-4">
            <MapPin size={48} />
          </div>
          <h3 className="text-lg font-medium mb-2">No rides yet</h3>
          <p className="text-sm text-neutral-400 max-w-xs">
            Start tracking your rides to see them listed here. Your ride history will appear on this screen.
          </p>
        </div>
      ) : (
        rides.map(ride => (
          <Card key={ride.id} className="bg-white rounded-xl shadow-sm mb-4 overflow-hidden">
            <div className="h-32 bg-neutral-200 relative">
              {ride.route.length > 0 && (
                <div className="w-full h-full">
                  <img 
                    src={`https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/path-3+0057FF-0.5(${ride.route.slice(0, 100).map(c => `${c.longitude},${c.latitude}`).join(';')})/auto/400x200?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw`} 
                    alt="Map of ride route" 
                    className="w-full h-full object-cover" 
                  />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
              <div className="absolute bottom-2 left-3 text-white">
                <div className="text-lg font-semibold">{ride.title}</div>
                <div className="text-sm opacity-90">{formatDate(new Date(ride.startTime))}</div>
              </div>
            </div>
            <div className="p-4">
              <div className="flex justify-between mb-3">
                <div className="flex flex-col">
                  <span className="text-xs text-neutral-400">Distance</span>
                  <span className="font-semibold">
                    {formatDistance(Number(ride.distance), isMetric)}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-neutral-400">Duration</span>
                  <span className="font-semibold">
                    {formatDuration(ride.duration)}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-neutral-400">Avg Speed</span>
                  <span className="font-semibold">
                    {formatSpeed(Number(ride.avgSpeed), isMetric)}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center text-xs text-neutral-400">
                  <MapPin size={12} className="mr-1" />
                  <span>{ride.startLocation || "Unknown route"}</span>
                </div>
                <button 
                  className="text-primary text-sm font-medium flex items-center"
                  onClick={() => handleViewDetails(ride)}
                >
                  Details
                  <ChevronRight size={14} className="ml-1" />
                </button>
              </div>
            </div>
          </Card>
        ))
      )}
      
      {selectedRide && (
        <RideDetailsSheet
          ride={selectedRide}
          isOpen={detailsOpen}
          onOpenChange={setDetailsOpen}
          onDelete={handleDeleteRide}
          onExport={handleExportRide}
          onShare={handleShareRide}
        />
      )}
    </div>
  );
};

export default RidesListPage;
