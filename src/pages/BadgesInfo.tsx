import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trophy, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BadgeInfo {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  criteria_type: string;
  criteria_value: number;
  badge_color: string | null;
}

export default function BadgesInfo() {
  const navigate = useNavigate();
  const [badges, setBadges] = useState<BadgeInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBadges();
  }, []);

  const fetchBadges = async () => {
    const { data, error } = await supabase
      .from("badges")
      .select("*")
      .order("criteria_value", { ascending: true });

    if (error) {
      toast.error("Failed to load badges");
      setLoading(false);
      return;
    }

    setBadges(data || []);
    setLoading(false);
  };

  const getCriteriaText = (badge: BadgeInfo) => {
    switch (badge.criteria_type) {
      case "total_points":
        return `Earn ${badge.criteria_value} total points`;
      case "consecutive_days":
        return `Active for ${badge.criteria_value} consecutive days`;
      case "orders_count":
        return `Complete ${badge.criteria_value} orders`;
      case "retailers_count":
        return `Acquire ${badge.criteria_value} retailers`;
      case "visits_count":
        return `Complete ${badge.criteria_value} visits`;
      default:
        return `Achieve ${badge.criteria_value} ${badge.criteria_type}`;
    }
  };

  const getColorClass = (color: string | null) => {
    switch (color) {
      case "gold":
        return "from-yellow-500 to-orange-500";
      case "silver":
        return "from-gray-400 to-gray-500";
      case "bronze":
        return "from-orange-600 to-orange-700";
      case "blue":
        return "from-blue-500 to-blue-600";
      case "green":
        return "from-green-500 to-green-600";
      case "purple":
        return "from-purple-500 to-purple-600";
      default:
        return "from-primary to-primary";
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-4 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/leaderboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Badges & Achievements</h1>
            <p className="text-muted-foreground">Complete criteria to unlock badges and showcase your achievements</p>
          </div>
        </div>

        {badges.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg text-muted-foreground">No badges configured yet</p>
              <p className="text-sm text-muted-foreground mt-2">Contact your admin to set up badges</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {badges.map((badge) => (
              <Card key={badge.id} className="relative overflow-hidden">
                <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${getColorClass(badge.badge_color)} opacity-20 rounded-bl-full`} />
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-3 rounded-full bg-gradient-to-br ${getColorClass(badge.badge_color)}`}>
                      <span className="text-3xl">{badge.icon}</span>
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{badge.name}</CardTitle>
                    </div>
                  </div>
                  <CardDescription className="text-sm">
                    {badge.description || "Complete the criteria to unlock this badge"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Unlock Criteria:</div>
                    <Badge variant="outline" className="text-xs">
                      {getCriteriaText(badge)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
