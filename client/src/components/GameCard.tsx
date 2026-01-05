import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Info, Star, Calendar, Eye, EyeOff, PackageCheck } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import StatusBadge, { type GameStatus } from "./StatusBadge";
import { type Game } from "@shared/schema";
import { useState, memo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import GameDetailsModal from "./GameDetailsModal";
import GameDownloadDialog from "./GameDownloadDialog";

interface GameCardProps {
  game: Game;
  onStatusChange?: (gameId: string, newStatus: GameStatus) => void;
  onViewDetails?: (gameId: string) => void;
  onTrackGame?: (game: Game) => void;
  onToggleHidden?: (gameId: string, hidden: boolean) => void;
  isDiscovery?: boolean;
}

function getReleaseStatus(game: Game): {
  label: string;
  variant: "default" | "secondary" | "outline" | "destructive";
  isReleased: boolean;
  className?: string;
} {
  if (game.releaseStatus === "delayed") {
    return { label: "Delayed", variant: "destructive", isReleased: false };
  }

  if (!game.releaseDate) return { label: "TBA", variant: "secondary", isReleased: false };

  const now = new Date();
  const release = new Date(game.releaseDate);

  if (release > now) {
    return { label: "Upcoming", variant: "default", isReleased: false };
  }
  return {
    label: "Released",
    variant: "outline",
    isReleased: true,
    className: "bg-green-500 border-green-600 text-white",
  };
}

// ⚡ Bolt: Using React.memo to prevent unnecessary re-renders of the GameCard
// when parent components update but this card's props remain unchanged.
// This is particularly effective in grids or lists where many cards are rendered.
const GameCard = ({
  game,
  onStatusChange,
  onViewDetails,
  onTrackGame,
  onToggleHidden,
  isDiscovery = false,
}: GameCardProps) => {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const releaseStatus = getReleaseStatus(game);

  // Use Intersection Observer to detect when card is visible in viewport
  // This prevents making API calls for games that aren't visible on screen
  useEffect(() => {
    const currentRef = cardRef.current;
    if (!currentRef) return;

    // Only observe wanted games that need torrent availability check
    const shouldObserve = !isDiscovery && game.status === "wanted" && !!game.title;
    if (!shouldObserve) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isVisible) {
            setIsVisible(true);
            // Once visible, we don't need to observe anymore
            observer.disconnect();
          }
        });
      },
      {
        // Start loading slightly before the card becomes visible
        rootMargin: "100px",
        threshold: 0.01,
      }
    );

    observer.observe(currentRef);

    return () => {
      observer.disconnect();
    };
  }, [isDiscovery, game.status, game.title, isVisible]);

  // Check for torrent availability for wanted games - only when visible
  // This prevents hundreds of simultaneous API requests when loading a page with many wanted games
  const { data: searchResults } = useQuery({
    queryKey: ["/api/search", game.title],
    queryFn: async () => {
      const response = await fetch(`/api/search?q=${encodeURIComponent(game.title)}&limit=1`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !isDiscovery && game.status === "wanted" && !!game.title && isVisible,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false,
  });

  const hasTorrentsAvailable = searchResults?.items && searchResults.items.length > 0;

  const handleStatusClick = () => {
    console.warn(`Status change triggered for game: ${game.title}`);
    const nextStatus: GameStatus =
      game.status === "wanted" ? "owned" : game.status === "owned" ? "completed" : "wanted";
    onStatusChange?.(game.id, nextStatus);
  };

  const handleDetailsClick = () => {
    console.warn(`View details triggered for game: ${game.title}`);
    setDetailsOpen(true);
    onViewDetails?.(game.id);
  };

  const handleDownloadClick = () => {
    console.warn(`Download triggered for game: ${game.title}`);
    setDownloadOpen(true);
  };

  const handleToggleHidden = () => {
    onToggleHidden?.(game.id, !game.hidden);
  };

  return (
    <Card
      ref={cardRef}
      className={`group hover-elevate transition-all duration-200 max-w-[225px] mx-auto w-full ${game.hidden ? "opacity-60 grayscale" : ""}`}
      data-testid={`card-game-${game.id}`}
    >
      <div className="relative">
        {/* ⚡ Bolt: Lazy loading images prevents fetching all game covers upfront,
            improving initial page load speed, especially on pages with many carousels. */}
        <img
          src={game.coverUrl || "/placeholder-game-cover.jpg"}
          alt={`${game.title} cover`}
          className="thumbnail-image rounded-t-md"
          loading="lazy"
          data-testid={`img-cover-${game.id}`}
        />
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          {!isDiscovery && game.status && <StatusBadge status={game.status} />}
          {game.status === "wanted" && hasTorrentsAvailable && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="default"
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 border-emerald-700 p-1 h-6 w-6 flex items-center justify-center cursor-help"
                >
                  <PackageCheck className="w-3 h-3" />
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Downloads Available</p>
              </TooltipContent>
            </Tooltip>
          )}
          {game.status === "wanted" && (
            <Badge
              variant={releaseStatus.variant}
              className={`text-xs ${releaseStatus.className || ""}`}
            >
              {releaseStatus.label}
            </Badge>
          )}
          {game.hidden && (
            <Badge variant="secondary" className="text-xs bg-gray-500 text-white">
              Hidden
            </Badge>
          )}
        </div>
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-t-md flex items-center justify-center gap-2">
          {isDiscovery && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="default"
                  onClick={handleDownloadClick}
                  aria-label="Download game"
                  data-testid={`button-download-${game.id}`}
                >
                  <Download className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Download</p>
              </TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="secondary"
                onClick={handleDetailsClick}
                aria-label="View details"
                data-testid={`button-details-${game.id}`}
              >
                <Info className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>View Details</p>
            </TooltipContent>
          </Tooltip>
          {!isDiscovery && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={handleToggleHidden}
                  aria-label={game.hidden ? "Unhide game" : "Hide game"}
                  data-testid={`button-toggle-hidden-${game.id}`}
                >
                  {game.hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{game.hidden ? "Unhide Game" : "Hide Game"}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
      <CardContent className="p-3">
        <h3
          className="font-semibold text-sm mb-2 line-clamp-2"
          data-testid={`text-title-${game.id}`}
        >
          {game.title}
        </h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1" tabIndex={0}>
                <Star className="w-3 h-3 text-accent" aria-hidden="true" />
                <span data-testid={`text-rating-${game.id}`}>
                  {game.rating ? `${game.rating}/10` : "N/A"}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Rating</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1" tabIndex={0}>
                <Calendar className="w-3 h-3" aria-hidden="true" />
                <span data-testid={`text-release-${game.id}`}>{game.releaseDate || "TBA"}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Release Date</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="flex flex-wrap gap-1 mb-3">
          {game.genres?.slice(0, 2).map((genre) => (
            <span
              key={genre}
              className="text-xs bg-muted px-2 py-1 rounded-sm"
              data-testid={`tag-genre-${genre.toLowerCase()}`}
            >
              {genre}
            </span>
          )) || <span className="text-xs text-muted-foreground">No genres</span>}
        </div>
        {isDiscovery ? (
          <Button
            variant="default"
            size="sm"
            className="w-full"
            onClick={() => onTrackGame?.(game)}
            data-testid={`button-track-${game.id}`}
          >
            Track Game
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleStatusClick}
            data-testid={`button-status-${game.id}`}
          >
            Mark as{" "}
            {game.status === "wanted" ? "Owned" : game.status === "owned" ? "Completed" : "Wanted"}
          </Button>
        )}
      </CardContent>

      {/* ⚡ Bolt: Conditionally render modals only when they are active.
          This prevents rendering hundreds of hidden, complex components on pages
          with many game cards, significantly improving initial render performance
          and reducing memory usage. */}
      {detailsOpen && (
        <GameDetailsModal
          game={game}
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          onStatusChange={onStatusChange}
        />
      )}

      {downloadOpen && (
        <GameDownloadDialog game={game} open={downloadOpen} onOpenChange={setDownloadOpen} />
      )}
    </Card>
  );
};

export default memo(GameCard);
