
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { supabase } from "../integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";

interface StoryCircleProps {
  userId: string;
  username: string;
  avatarUrl: string | null;
  isCurrentUser?: boolean;
  hasStories?: boolean;
  onNoStories?: () => void;
}

const StoryCircle = ({ userId, username, avatarUrl, isCurrentUser = false, hasStories: propHasStories, onNoStories }: StoryCircleProps) => {
  const navigate = useNavigate();
  const [hasUnviewedStories, setHasUnviewedStories] = useState(false);

  // Check if user has unviewed stories
  const { data: storiesData } = useQuery({
    queryKey: ["userStories", userId],
    queryFn: async () => {
      // Get all non-expired stories from the user
      const { data: stories, error } = await supabase
        .from("stories")
        .select("id")
        .eq("user_id", userId)
        .gt("expires_at", new Date().toISOString());

      if (error) throw error;
      
      if (!stories || stories.length === 0) {
        setHasUnviewedStories(false);
        // Notificar componente pai que não há stories, se necessário
        if (onNoStories) onNoStories();
        return { hasStories: propHasStories || false, stories: [] };
      }
      
      // If it's the current user, no need to check views
      if (isCurrentUser) {
        setHasUnviewedStories(true);
        return { hasStories: true, stories };
      }
      
      // For other users, check if there are any unviewed stories
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) return { hasStories: propHasStories || false, stories: [] };
      
      const storyIds = stories.map(story => story.id);
      
      const { data: views, error: viewsError } = await supabase
        .from("story_views")
        .select("story_id")
        .eq("viewer_id", currentUser.user.id)
        .in("story_id", storyIds);
        
      if (viewsError) throw viewsError;
      
      // If number of views is less than number of stories, there are unviewed stories
      const hasUnviewed = views ? stories.length > views.length : true;
      setHasUnviewedStories(hasUnviewed);
      
      return { 
        hasStories: true, 
        hasUnviewedStories: hasUnviewed,
        stories 
      };
    },
    refetchInterval: 60000, // Refetch every minute
  });

  const handleClick = () => {
    if (isCurrentUser) {
      // Modificação para visualizar os próprios stories ao invés de adicionar
      navigate(`/story/manage`);
    } else if (storiesData?.hasStories) {
      // View user's stories
      navigate(`/story/view/${userId}`);
    }
  };

  // Display name truncation 
  const displayName = isCurrentUser ? "Seu story" : 
    username.length > 9 ? username.substring(0, 8) + '...' : username;

  return (
    <div className="flex flex-col items-center w-[62px]">
      <div 
        className="relative w-[62px] h-[62px] flex items-center justify-center cursor-pointer"
        onClick={handleClick}
      >
        {/* Gradient circle for unviewed stories - Instagram style gradient */}
        {storiesData?.hasStories && hasUnviewedStories ? (
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-yellow-500 via-orange-500 via-red-500 via-purple-500 to-blue-500"></div>
        ) : storiesData?.hasStories ? (
          <div className="absolute inset-0 rounded-full bg-gray-300 dark:bg-gray-700"></div>
        ) : (
          <div className="absolute inset-0 rounded-full bg-gray-200 dark:bg-gray-800"></div>
        )}

        {/* White inner circle - smaller gap for Instagram look */}
        <div className="absolute inset-[2px] bg-white dark:bg-black rounded-full"></div>

        {/* User avatar */}
        <Avatar className="h-[56px] w-[56px] relative">
          {avatarUrl ? (
            <AvatarImage src={avatarUrl} alt={username} className="object-cover" />
          ) : (
            <AvatarFallback className="text-xs">
              {username?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          )}
        </Avatar>

        {/* "+" button for current user - Instagram style */}
        {isCurrentUser && (
          <div className="absolute bottom-0 right-0 bg-blue-500 rounded-full border-2 border-white dark:border-black w-4 h-4 flex items-center justify-center">
            <Plus className="h-2 w-2 text-white" />
          </div>
        )}
      </div>

      {/* Username below - smaller text for Instagram look */}
      <span className="mt-1 text-[11px] text-center truncate w-full">
        {displayName}
      </span>
    </div>
  );
};

export default StoryCircle;
