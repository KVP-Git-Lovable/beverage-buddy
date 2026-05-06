import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Award, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface BadgeData {
  id: string;
  name: string;
  description: string;
  icon: string;
  criteria_type: string;
  criteria_value: number;
  badge_color: string;
}

interface UserBadge extends BadgeData {
  earned_at: string;
  is_earned: boolean;
}

export function BadgesDisplay() {
  const { userProfile } = useAuth();
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userProfile?.id) {
      fetchBadges();
    }
  }, [userProfile]);

  const fetchBadges = async () => {
    if (!userProfile?.id) return;

    // Fetch all badges
    const { data: allBadges } = await supabase
      .from("badges")
      .select("*")
      .order("criteria_value", { ascending: true });

    // Fetch user's earned badges
    const { data: earnedBadges } = await supabase
      .from("user_badges")
      .select("badge_id, earned_at")
      .eq("user_id", userProfile.id);

    const earnedMap = new Map(earnedBadges?.map(b => [b.badge_id, b.earned_at]) || []);

    const badgesWithStatus: UserBadge[] = (allBadges || []).map(badge => ({
      ...badge,
      earned_at: earnedMap.get(badge.id) || "",
      is_earned: earnedMap.has(badge.id)
    }));

    setBadges(badgesWithStatus);
    setLoading(false);
  };

  const earnedBadges = badges.filter(b => b.is_earned);
  const lockedBadges = badges.filter(b => !b.is_earned);

  const getColorClass = (color: string, earned: boolean) => {
    if (!earned) return "bg-gray-100 border-gray-300";
    
    const colors: Record<string, string> = {
      gold: "bg-gradient-to-br from-yellow-100 to-yellow-200 border-yellow-400",
      silver: "bg-gradient-to-br from-gray-100 to-gray-200 border-gray-400",
      blue: "bg-gradient-to-br from-blue-100 to-blue-200 border-blue-400",
      green: "bg-gradient-to-br from-green-100 to-green-200 border-green-400",
      purple: "bg-gradient-to-br from-purple-100 to-purple-200 border-purple-400"
    };
    return colors[color] || "bg-gradient-to-br from-gray-100 to-gray-200";
  };

  const BadgeCard = ({ badge }: { badge: UserBadge }) => (
    <Card className={`${getColorClass(badge.badge_color, badge.is_earned)} border-2 transition-all hover:scale-105`}>
      <CardContent className="p-4 text-center">
        <div className={`text-4xl mb-2 ${!badge.is_earned && "opacity-30 grayscale"}`}>
          {badge.is_earned ? badge.icon : <Lock className="h-10 w-10 mx-auto text-gray-400" />}
        </div>
        <h3 className="font-bold text-sm mb-1">{badge.name}</h3>
        <p className="text-xs text-muted-foreground mb-2">{badge.description}</p>
        {badge.is_earned && (
          <Badge variant="secondary" className="text-xs">
            Earned {new Date(badge.earned_at).toLocaleDateString()}
          </Badge>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return <div className="text-center py-8">Loading badges...</div>;
  }

  return (
    <Tabs defaultValue="earned" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="earned">
          <Award className="mr-2 h-4 w-4" />
          Earned ({earnedBadges.length})
        </TabsTrigger>
        <TabsTrigger value="locked">
          <Lock className="mr-2 h-4 w-4" />
          Locked ({lockedBadges.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="earned" className="mt-4">
        {earnedBadges.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {earnedBadges.map(badge => (
              <BadgeCard key={badge.id} badge={badge} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No badges earned yet. Complete actions to unlock achievements!
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="locked" className="mt-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {lockedBadges.map(badge => (
            <BadgeCard key={badge.id} badge={badge} />
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );
}
