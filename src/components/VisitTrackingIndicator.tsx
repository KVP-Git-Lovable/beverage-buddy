import { CheckCircle2, AlertTriangle, XCircle, MapPin, Clock, Phone, Globe } from "lucide-react";

interface VisitTrackingIndicatorProps {
  locationStatus: 'at_store' | 'within_range' | 'not_at_store' | 'location_unavailable';
  checkInTime: string;
  distance: number | null;
  onClick: () => void;
  orderSource?: string | null; // 'portal_order' | 'voice_assistant' | null
}

export const VisitTrackingIndicator = ({ 
  locationStatus, 
  checkInTime, 
  distance, 
  onClick,
  orderSource
}: VisitTrackingIndicatorProps) => {
  const getIcon = () => {
    if (orderSource === 'portal_order') return <Globe className="h-3 w-3 text-purple-600" />;
    if (orderSource === 'voice_assistant') return <Phone className="h-3 w-3 text-blue-600" />;
    switch (locationStatus) {
      case 'at_store':
        return <CheckCircle2 className="h-3 w-3 text-success" />;
      case 'within_range':
        return <AlertTriangle className="h-3 w-3 text-warning" />;
      case 'not_at_store':
        return <XCircle className="h-3 w-3 text-destructive" />;
      default:
        return <MapPin className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getStatusText = () => {
    if (orderSource === 'portal_order') return 'Portal Order';
    if (orderSource === 'voice_assistant') return 'Phone Order';
    switch (locationStatus) {
      case 'at_store':
        return 'Store Visit';
      case 'within_range':
        return distance !== null ? `Near (${Math.round(distance)}m)` : 'Near Store';
      case 'not_at_store':
        return 'Not at Store';
      default:
        return 'Location N/A';
    }
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString('en-IN', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true 
      });
    } catch {
      return '--:--';
    }
  };

  return (
    <button
      onClick={(e) => { 
        e.stopPropagation(); 
        onClick(); 
      }}
      className="flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full bg-muted/50 hover:bg-muted transition-colors border border-border/50"
    >
      {getIcon()}
      <span className="text-muted-foreground">{getStatusText()}</span>
      <span className="text-muted-foreground/50">•</span>
      <Clock className="h-3 w-3 text-muted-foreground" />
      <span className="text-muted-foreground">In: {formatTime(checkInTime)}</span>
    </button>
  );
};
