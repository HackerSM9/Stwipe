import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Play, PlusCircle, User, LogOut, BookOpen, Calculator, Atom } from "lucide-react";
import type { Playlist, UserProgress } from "@shared/schema";

interface HomeScreenProps {
  onPlaylistSelect: (playlistId: string) => void;
  onProcessingStart: (playlistId: string) => void;
}

export default function HomeScreen({ onPlaylistSelect, onProcessingStart }: HomeScreenProps) {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [playlistForm, setPlaylistForm] = useState({
    youtubeUrl: "",
    language: "hinglish",
    subject: "",
  });

  // Fetch user's playlists
  const { data: playlists = [] } = useQuery<Playlist[]>({
    queryKey: ["/api/playlists"],
    enabled: !!user,
  });

  // Fetch user progress
  const { data: userStats } = useQuery<{
    totalShorts: number;
    hoursStudied: number;
    streak: number;
  }>({
    queryKey: ["/api/users/stats"],
    enabled: !!user,
  });

  // Process playlist mutation
  const processPlaylistMutation = useMutation({
    mutationFn: async (data: typeof playlistForm) => {
      const response = await apiRequest("POST", "/api/playlists/process", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
      onProcessingStart(data.id);
      setPlaylistForm({ youtubeUrl: "", language: "hinglish", subject: "" });
      toast({
        title: "Processing Started",
        description: "Your playlist is being processed into study shorts.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Processing Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playlistForm.youtubeUrl) {
      toast({
        title: "URL Required",
        description: "Please enter a valid YouTube playlist URL.",
        variant: "destructive",
      });
      return;
    }
    processPlaylistMutation.mutate(playlistForm);
  };

  const getPlaylistIcon = (subject: string) => {
    switch (subject?.toLowerCase()) {
      case "physics": return BookOpen;
      case "mathematics": case "math": return Calculator;
      case "chemistry": return Atom;
      default: return BookOpen;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-accent/10 text-accent";
      case "processing": return "bg-primary/10 text-primary";
      case "failed": return "bg-destructive/10 text-destructive";
      default: return "bg-muted/10 text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <Play className="w-4 h-4 text-primary" />
            </div>
            <h1 className="text-xl font-bold">Stwipe</h1>
          </div>

          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" data-testid="button-profile">
              <User className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={signOut}
              data-testid="button-signout"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Welcome Section */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2">
            Welcome back, <span className="text-primary">{user?.displayName || "User"}!</span>
          </h2>
          <p className="text-muted-foreground">Transform any YouTube playlist into focused study shorts</p>
        </div>

        {/* Playlist Input */}
        <Card className="mb-8 bg-card border border-border">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <PlusCircle className="w-5 h-5 text-primary mr-2" />
              Add New Playlist
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="youtubeUrl" className="block text-sm font-medium mb-2">
                  YouTube Playlist URL
                </Label>
                <Input
                  id="youtubeUrl"
                  type="url"
                  value={playlistForm.youtubeUrl}
                  onChange={(e) => setPlaylistForm(prev => ({ ...prev, youtubeUrl: e.target.value }))}
                  className="w-full"
                  placeholder="https://www.youtube.com/playlist?list=..."
                  data-testid="input-playlist-url"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="language" className="block text-sm font-medium mb-2">
                    Language
                  </Label>
                  <Select 
                    value={playlistForm.language}
                    onValueChange={(value) => setPlaylistForm(prev => ({ ...prev, language: value }))}
                  >
                    <SelectTrigger data-testid="select-language">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hinglish">Hinglish (Hindi + English)</SelectItem>
                      <SelectItem value="english">English</SelectItem>
                      <SelectItem value="hindi">Hindi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="subject" className="block text-sm font-medium mb-2">
                    Subject
                  </Label>
                  <Input
                    id="subject"
                    type="text"
                    value={playlistForm.subject}
                    onChange={(e) => setPlaylistForm(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full"
                    placeholder="e.g., Physics, Mathematics"
                    data-testid="input-subject"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={processPlaylistMutation.isPending}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                data-testid="button-process-playlist"
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                {processPlaylistMutation.isPending ? "Processing..." : "Process Playlist"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Recent Playlists */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Your Study Collections</h3>

          {playlists.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No study collections yet. Add your first playlist above!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {playlists.map((playlist) => {
                const IconComponent = getPlaylistIcon(playlist.subject || "");
                return (
                  <Card
                    key={playlist.id}
                    className="bg-card border border-border hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => onPlaylistSelect(playlist.id)}
                    data-testid={`card-playlist-${playlist.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                          <IconComponent className="w-6 h-6 text-primary" />
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(playlist.status)}`}>
                          {playlist.status.charAt(0).toUpperCase() + playlist.status.slice(1)}
                        </span>
                      </div>

                      <h4 className="font-semibold mb-1" data-testid={`text-playlist-title-${playlist.id}`}>
                        {playlist.title}
                      </h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        {playlist.processedVideos || 0} of {playlist.totalVideos || 0} videos processed
                      </p>

                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                        <span>{playlist.subject || "General"}</span>
                        <span>{new Date(playlist.createdAt || "").toLocaleDateString()}</span>
                      </div>

                      {(playlist.totalVideos || 0) > 0 && (
                        <div className="w-full bg-muted rounded-full h-1.5">
                          <div
                            className="bg-primary h-1.5 rounded-full transition-all"
                            style={{
                              width: `${((playlist.processedVideos || 0) / (playlist.totalVideos || 1)) * 100}%`
                            }}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Study Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card border border-border">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary mb-1" data-testid="text-total-shorts">
                {userStats?.totalShorts || 0}
              </div>
              <div className="text-sm text-muted-foreground">Study Shorts Created</div>
            </CardContent>
          </Card>

          <Card className="bg-card border border-border">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-accent mb-1" data-testid="text-hours-studied">
                {userStats?.hoursStudied || 0}
              </div>
              <div className="text-sm text-muted-foreground">Hours Studied</div>
            </CardContent>
          </Card>

          <Card className="bg-card border border-border">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary mb-1" data-testid="text-streak">
                {userStats?.streak || 0}
              </div>
              <div className="text-sm text-muted-foreground">Day Streak</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
