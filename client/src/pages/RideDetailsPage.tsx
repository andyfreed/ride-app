import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useRide } from "@/contexts/RideContext";
import { Ride } from "@shared/schema";
import RideDetailsSheet from "@/components/RideDetailsSheet";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const RideDetailsPage = () => {
  const params = useParams<{ id: string }>();
  const { getRideById, deleteRide } = useRide();
  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const fetchRide = async () => {
      try {
        const rideId = parseInt(params.id, 10);
        if (isNaN(rideId)) {
          navigate('/rides');
          return;
        }

        const fetchedRide = await getRideById(rideId);
        if (fetchedRide) {
          setRide(fetchedRide);
        } else {
          toast({
            title: "Ride Not Found",
            description: "This ride could not be loaded",
            variant: "destructive"
          });
          navigate('/rides');
        }
      } catch (error) {
        console.error("Error fetching ride:", error);
        toast({
          title: "Error",
          description: "Failed to load ride details",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchRide();
  }, [params.id, navigate]);

  const handleDeleteRide = async (rideId: number) => {
    await deleteRide(rideId);
    toast({
      title: "Ride Deleted",
      description: "The ride has been permanently deleted",
    });
    navigate('/rides');
  };

  const handleExportRide = (ride: Ride) => {
    // Implementation same as in RidesListPage
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
        title: `Motorcycle Ride - ${new Date(ride.startTime).toLocaleDateString()}`,
        text: `Check out my motorcycle ride!`,
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
      <div className="p-4">
        <div className="flex items-center mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/rides')}
            className="mr-2"
          >
            <ChevronLeft size={20} />
          </Button>
          <h1 className="text-xl font-semibold">Loading ride details...</h1>
        </div>
      </div>
    );
  }

  if (!ride) {
    return (
      <div className="p-4">
        <div className="flex items-center mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/rides')}
            className="mr-2"
          >
            <ChevronLeft size={20} />
          </Button>
          <h1 className="text-xl font-semibold">Ride not found</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="p-4 sticky top-0 z-10 bg-background flex items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/rides')}
          className="mr-2"
        >
          <ChevronLeft size={20} />
        </Button>
        <h1 className="text-xl font-semibold">{ride.title}</h1>
      </div>
      
      <RideDetailsSheet 
        ride={ride}
        isOpen={true}
        onOpenChange={() => navigate('/rides')}
        onDelete={handleDeleteRide}
        onExport={handleExportRide}
        onShare={handleShareRide}
        isFullPage={true}
      />
    </div>
  );
};

export default RideDetailsPage;
