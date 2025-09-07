import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSwipe } from "@/hooks/useSwipe";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { 
  ArrowLeft, 
  MoreVertical, 
  Bookmark, 
  SkipBack, 
  SkipForward, 
  Play, 
  Pause,
  RotateCcw,
  RotateCw,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import type { StudyShort, Playlist } from "@shared/schema";

interface StudyShortsViewerProps {
  playlistId: string;
  onBack: () => void;
}

export default function StudyShortsViewer({ playlistId, onBack }: StudyShortsViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTopicInfo, setShowTopicInfo] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const queryClient = useQueryClient();

  // Fetch playlist info
  const { data: playlist } = useQuery<Playlist>({
    queryKey: ["/api/playlists", playlistId],
  });

  // Fetch study shorts (shuffled)
  const { data: shorts = [] } = useQuery<StudyShort[]>({
    queryKey: ["/api/playlists", playlistId, "shorts"],
  });

  // Update progress mutation
  const updateProgressMutation = useMutation({
    mutationFn: async (data: { shortId: string; timeSpent: number }) => {
      return apiRequest("POST", "/api/progress/update", data);
    },
  });

  // Bookmark mutation
  const toggleBookmarkMutation = useMutation({
    mutationFn: async (shortId: string) => {
      return apiRequest("POST", `/api/shorts/${shortId}/bookmark`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/playlists", playlistId, "shorts"] });
    },
  });

  const currentShort = shorts[currentIndex];

  // Swipe handlers
  const swipeRef = useSwipe({
    onSwipeLeft: () => nextShort(),
    onSwipeRight: () => previousShort(),
  });

  const nextShort = () => {
    if (currentIndex < shorts.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setProgress(0);
      setCurrentTime(0);
    }
  };

  const previousShort = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setProgress(0);
      setCurrentTime(0);
    }
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const skipTime = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(duration, currentTime + seconds));
    }
  };

  const toggleBookmark = () => {
    if (currentShort) {
      toggleBookmarkMutation.mutate(currentShort.id);
    }
  };

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const current = video.currentTime;
      const total = video.duration;
      setCurrentTime(current);
      setDuration(total);
      setProgress((current / total) * 100);
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      // Auto advance to next short
      setTimeout(() => {
        nextShort();
      }, 1000);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
    };
  }, [currentIndex]);

  // Track viewing time
  useEffect(() => {
    if (currentShort && isPlaying) {
      const interval = setInterval(() => {
        updateProgressMutation.mutate({
          shortId: currentShort.id,
          timeSpent: 1,
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [currentShort?.id, isPlaying]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!currentShort) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p>No study shorts available</p>
          <Button variant="outline" onClick={onBack} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative" ref={swipeRef}>
      {/* Top Header */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/50 to-transparent">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="sm"
            className="bg-black/30 rounded-full backdrop-blur-sm text-white hover:bg-black/50"
            onClick={onBack}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>

          <div className="text-center">
            <div className="text-white text-sm font-medium" data-testid="text-playlist-title">
              {playlist?.title}
            </div>
            <div className="text-white/70 text-xs" data-testid="text-short-position">
              Short {currentIndex + 1} of {shorts.length}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              className="bg-black/30 rounded-full backdrop-blur-sm text-white hover:bg-black/50"
              onClick={toggleBookmark}
              data-testid="button-bookmark"
            >
              <Bookmark className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="bg-black/30 rounded-full backdrop-blur-sm text-white hover:bg-black/50"
              onClick={() => setShowTopicInfo(true)}
              data-testid="button-options"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Video Container */}
      <div className="relative w-full h-screen bg-black flex items-center justify-center">
        {/* Placeholder for video player - in real implementation, this would be the actual video */}
        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-4 mx-auto">
              {isPlaying ? (
                <Pause className="w-8 h-8" />
              ) : (
                <Play className="w-8 h-8" />
              )}
            </div>
            <div className="text-lg font-medium mb-2" data-testid="text-short-title">
              {currentShort.title}
            </div>
            <div className="text-sm opacity-75" data-testid="text-short-topic">
              {currentShort.topic}
            </div>
          </div>
        </div>

        {/* Hidden video element for audio playback */}
        <video
          ref={videoRef}
          className="hidden"
          src={`/api/shorts/${currentShort.id}/video`}
        />

        {/* Swipe Indicators */}
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 opacity-0 hover:opacity-100 transition-opacity">
          <div className="bg-primary/80 rounded-full w-15 h-15 flex items-center justify-center text-white">
            <ChevronLeft className="w-6 h-6" />
          </div>
        </div>
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 opacity-0 hover:opacity-100 transition-opacity">
          <div className="bg-primary/80 rounded-full w-15 h-15 flex items-center justify-center text-white">
            <ChevronRight className="w-6 h-6" />
          </div>
        </div>

        {/* Video Controls Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent">
          <div className="p-4">
            {/* Progress Bar */}
            <div className="flex items-center space-x-3 mb-4">
              <span className="text-white text-xs" data-testid="text-current-time">
                {formatTime(currentTime)}
              </span>
              <div className="flex-1 bg-white/20 rounded-full h-1 cursor-pointer">
                <div 
                  className="bg-primary h-1 rounded-full transition-all" 
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-white text-xs" data-testid="text-duration">
                {formatTime(duration)}
              </span>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center justify-center space-x-6">
              <Button
                variant="ghost"
                size="sm"
                className="bg-white/10 rounded-full backdrop-blur-sm text-white"
                onClick={() => skipTime(-10)}
                data-testid="button-rewind"
              >
                <RotateCcw className="w-5 h-5" />
              </Button>

              <Button
                size="lg"
                className="bg-primary rounded-full hover:bg-primary/90"
                onClick={togglePlayPause}
                data-testid="button-play-pause"
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6 text-primary-foreground" />
                ) : (
                  <Play className="w-6 h-6 text-primary-foreground" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="bg-white/10 rounded-full backdrop-blur-sm text-white"
                onClick={() => skipTime(10)}
                data-testid="button-forward"
              >
                <RotateCw className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="absolute bottom-4 left-4 right-4 z-20">
        <div className="flex items-center justify-between bg-black/50 backdrop-blur-sm rounded-full px-6 py-3">
          <Button
            variant="ghost"
            className="flex items-center space-x-2 text-white/70 hover:text-white"
            onClick={previousShort}
            disabled={currentIndex === 0}
            data-testid="button-previous-short"
          >
            <SkipBack className="w-4 h-4" />
            <span className="text-sm">Previous</span>
          </Button>

          <div className="text-center">
            <div className="flex items-center space-x-1">
              {/* Progress dots for shorts */}
              {shorts.slice(Math.max(0, currentIndex - 2), currentIndex + 3).map((_, index) => {
                const actualIndex = Math.max(0, currentIndex - 2) + index;
                return (
                  <div
                    key={actualIndex}
                    className={`w-2 h-2 rounded-full ${
                      actualIndex === currentIndex 
                        ? "bg-primary" 
                        : "bg-white/30"
                    }`}
                  />
                );
              })}
            </div>
          </div>

          <Button
            variant="ghost"
            className="flex items-center space-x-2 text-white/70 hover:text-white"
            onClick={nextShort}
            disabled={currentIndex === shorts.length - 1}
            data-testid="button-next-short"
          >
            <span className="text-sm">Next</span>
            <SkipForward className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Topic Information Overlay */}
      {showTopicInfo && (
        <div 
          className="absolute inset-0 bg-black/80 backdrop-blur-sm z-30 p-6 flex items-center justify-center"
          onClick={() => setShowTopicInfo(false)}
          data-testid="overlay-topic-info"
        >
          <div className="max-w-md text-center text-white">
            <h3 className="text-2xl font-bold mb-4" data-testid="text-topic-title">
              {currentShort.topic}
            </h3>
            <p className="text-white/80 mb-6 leading-relaxed" data-testid="text-topic-content">
              {currentShort.content}
            </p>
            <div className="flex items-center justify-center space-x-4 text-sm text-white/60 mb-6">
              <span>
                <i className="fas fa-clock mr-1"></i> 
                {formatTime(currentShort.duration)}
              </span>
              <span>
                <i className="fas fa-tag mr-1"></i> 
                {playlist?.subject || "Study"}
              </span>
            </div>
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => setShowTopicInfo(false)}
              data-testid="button-continue-learning"
            >
              Continue Learning
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
