import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Circle, Loader2 } from "lucide-react";
import type { Playlist } from "@shared/schema";

interface ProcessingScreenProps {
  playlistId: string;
  onComplete: () => void;
  onCancel: () => void;
}

export default function ProcessingScreen({ playlistId, onComplete, onCancel }: ProcessingScreenProps) {
  const [progress, setProgress] = useState(0);

  // Poll for playlist status
  const { data: playlist, isLoading } = useQuery<Playlist>({
    queryKey: ["/api/playlists", playlistId],
    refetchInterval: 2000, // Poll every 2 seconds
    enabled: !!playlistId,
  });

  useEffect(() => {
    if (playlist) {
      const progressPercentage = (playlist.totalVideos || 0) > 0 
        ? Math.round(((playlist.processedVideos || 0) / (playlist.totalVideos || 1)) * 100)
        : 0;
      
      setProgress(progressPercentage);

      if (playlist.status === "completed") {
        setTimeout(() => {
          onComplete();
        }, 1000);
      }
    }
  }, [playlist, onComplete]);

  const steps = [
    { 
      id: 1, 
      label: "Downloaded playlist videos", 
      completed: playlist?.status !== "pending" 
    },
    { 
      id: 2, 
      label: "Converting audio using Whisper API", 
      completed: playlist?.status === "completed",
      active: playlist?.status === "processing"
    },
    { 
      id: 3, 
      label: "Filtering and segmenting content", 
      completed: playlist?.status === "completed" 
    },
    { 
      id: 4, 
      label: "Creating study shorts", 
      completed: playlist?.status === "completed" 
    },
  ];

  const estimatedTimeRemaining = (playlist?.totalVideos || 0) > 0
    ? Math.max(0, Math.round((((playlist?.totalVideos || 0) - (playlist.processedVideos || 0)) * 2)))
    : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="relative w-32 h-32 mx-auto mb-6">
          {/* Circular Progress Indicator */}
          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth="8"
            />
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="8"
              strokeDasharray="314"
              strokeDashoffset={314 - (314 * progress) / 100}
              strokeLinecap="round"
              className="transition-all duration-300 ease-out"
            />
          </svg>

          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary" data-testid="text-progress-percentage">
                {progress}%
              </div>
              <div className="text-xs text-muted-foreground">Complete</div>
            </div>
          </div>
        </div>

        <h2 className="text-xl font-semibold mb-2">Processing Your Playlist</h2>
        <p className="text-muted-foreground mb-6" data-testid="text-current-step">
          {playlist?.status === "processing" 
            ? `Processing video ${playlist.processedVideos || 0} of ${playlist.totalVideos || 0}...`
            : "Initializing processing..."
          }
        </p>

        {/* Processing Steps */}
        <div className="space-y-3 mb-8">
          {steps.map((step) => (
            <div key={step.id} className="flex items-center text-sm">
              {step.completed ? (
                <Check className="w-4 h-4 text-primary mr-3" />
              ) : step.active ? (
                <div className="w-4 h-4 bg-primary rounded-full mr-3 animate-pulse" />
              ) : (
                <Circle className="w-4 h-4 text-muted mr-3" />
              )}
              <span className={
                step.completed 
                  ? "text-foreground" 
                  : step.active 
                    ? "text-primary" 
                    : "text-muted-foreground"
              }>
                {step.label}
              </span>
            </div>
          ))}
        </div>

        <Card className="bg-card border border-border">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-2">Estimated time remaining</div>
            <div className="text-lg font-semibold text-primary" data-testid="text-eta">
              {estimatedTimeRemaining > 0 ? `${estimatedTimeRemaining} minutes` : "Almost done!"}
            </div>
          </CardContent>
        </Card>

        <Button
          variant="ghost"
          className="mt-6 text-muted-foreground hover:text-foreground"
          onClick={onCancel}
          data-testid="button-cancel-processing"
        >
          Cancel Processing
        </Button>
      </div>
    </div>
  );
}
