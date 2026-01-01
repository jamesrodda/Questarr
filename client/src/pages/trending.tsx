import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function TrendingPage() {
  const [_, setLocation] = useLocation();

  return (
    <div className="h-full overflow-auto p-6 flex items-center justify-center">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle>Trending Games</CardTitle>
          <CardDescription>
            See what's popular in the gaming community.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            For now, check out the Discover page to find new games.
          </p>
          <Button onClick={() => setLocation("/discover")}>
            Go to Discover
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
