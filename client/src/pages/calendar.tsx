import { Calendar as CalendarIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function CalendarPage() {
  return (
    <div className="h-full overflow-auto p-6 flex items-center justify-center">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <CalendarIcon className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle>Release Calendar</CardTitle>
          <CardDescription>
            This feature is coming soon! You'll be able to see upcoming releases for games in your library and wishlist.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Stay tuned for updates.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
