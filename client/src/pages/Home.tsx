import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import AuthScreen from "@/components/AuthScreen";
import HomeScreen from "@/components/HomeScreen";
import ProcessingScreen from "@/components/ProcessingScreen";
import StudyShortsViewer from "@/components/StudyShortsViewer";
import { Loader2 } from "lucide-react";

type AppScreen = "home" | "processing" | "viewer";

export default function Home() {
  const { user, loading } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<AppScreen>("home");
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>("");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  const handlePlaylistSelect = (playlistId: string) => {
    setSelectedPlaylistId(playlistId);
    setCurrentScreen("viewer");
  };

  const handleProcessingStart = (playlistId: string) => {
    setSelectedPlaylistId(playlistId);
    setCurrentScreen("processing");
  };

  const handleProcessingComplete = () => {
    setCurrentScreen("home");
    setSelectedPlaylistId("");
  };

  const handleBack = () => {
    setCurrentScreen("home");
    setSelectedPlaylistId("");
  };

  switch (currentScreen) {
    case "processing":
      return (
        <ProcessingScreen
          playlistId={selectedPlaylistId}
          onComplete={handleProcessingComplete}
          onCancel={handleBack}
        />
      );
    case "viewer":
      return (
        <StudyShortsViewer
          playlistId={selectedPlaylistId}
          onBack={handleBack}
        />
      );
    default:
      return (
        <HomeScreen
          onPlaylistSelect={handlePlaylistSelect}
          onProcessingStart={handleProcessingStart}
        />
      );
  }
}
