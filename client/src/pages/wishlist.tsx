import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import GameGrid from "@/components/GameGrid";
import { type Game } from "@shared/schema";
import { type GameStatus } from "@/components/StatusBadge";
import { useToast } from "@/hooks/use-toast";

export default function WishlistPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: games = [], isLoading } = useQuery<Game[]>({
    queryKey: ["/api/games"],
  });

  // Wishlist contains 'wanted' games
  const wishlistGames = games.filter(g => g.status === "wanted");

  const statusMutation = useMutation({
    mutationFn: async ({ gameId, status }: { gameId: string; status: GameStatus }) => {
      const response = await fetch(`/api/games/${gameId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Failed to update status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/games"] });
      toast({ description: "Game status updated successfully" });
    },
    onError: () => {
      toast({ description: "Failed to update game status", variant: "destructive" });
    },
  });

  return (
    <div className="h-full overflow-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Wishlist</h1>
          <p className="text-muted-foreground">Games you want to play</p>
        </div>
      </div>
      
      {wishlistGames.length === 0 && !isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          Your wishlist is empty. Add games from the Discover page.
        </div>
      ) : (
        <GameGrid 
          games={wishlistGames} 
          onStatusChange={(id, status) => statusMutation.mutate({ gameId: id, status })} 
          isLoading={isLoading} 
        />
      )}
    </div>
  );
}
