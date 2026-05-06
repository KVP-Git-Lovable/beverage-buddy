import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trophy, Target, TrendingUp, Users, ShoppingCart, Award, MessageSquare, Image } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function GamePolicy() {
  const navigate = useNavigate();
  const [conversionRate, setConversionRate] = useState(1);

  useEffect(() => {
    fetchConversionRate();
  }, []);

  const fetchConversionRate = async () => {
    const { data } = await supabase
      .from("gamification_games")
      .select("points_to_rupee_conversion")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (data) {
      setConversionRate(data.points_to_rupee_conversion || 1);
    }
  };

  const activities = [
    {
      icon: Users,
      name: "First Orders from New Retailer",
      points: "5 points",
      description: "Awarded only on the first order ever placed by a newly acquired retailer",
      config: "Max 2 activities per retailer",
      example: "You add a new retailer 'ABC Store' and receive their first order. You earn 5 points instantly.",
      color: "from-blue-500 to-blue-600"
    },
    {
      icon: Target,
      name: "Meeting Daily Target",
      points: "15 points",
      description: "Awarded once per day when you hit your defined daily threshold",
      config: "Target: 5 orders or ₹10,000 in sales",
      example: "Your daily target is 5 orders. You complete 6 orders today and earn 15 points once.",
      color: "from-green-500 to-green-600"
    },
    {
      icon: Trophy,
      name: "Focused Product Sales",
      points: "5 points",
      description: "Awarded for each order containing a focused product",
      config: "Auto-detected from product master",
      example: "Product X is marked as focused. Any order with Product X earns you 5 points per order.",
      color: "from-purple-500 to-purple-600"
    },
    {
      icon: ShoppingCart,
      name: "Productive Visits",
      points: "5 points",
      description: "Awarded for any check-in/visit that results in an order",
      config: "Max 5 productive visits per day",
      example: "You visit 7 retailers today and 5 place orders. You earn 25 points (5×5).",
      color: "from-orange-500 to-orange-600"
    },
    {
      icon: TrendingUp,
      name: "Order Frequency from Retailer",
      points: "2 points",
      description: "Sequential bonus for consecutive orders from the same retailer",
      config: "2+ consecutive orders required",
      example: "Retailer Y orders on Day 1, Day 2, Day 3. You earn 2 points on Day 2, 2 points on Day 3, etc.",
      color: "from-pink-500 to-pink-600"
    },
    {
      icon: TrendingUp,
      name: "Beat Growth",
      points: "5 points",
      description: "Requires calculation of sales growth vs. prior period within your beat",
      config: "Minimum 7% growth target",
      example: "Last month beat sales: ₹1,00,000. This month: ₹1,08,000 (8% growth). You earn 5 points.",
      color: "from-indigo-500 to-indigo-600"
    },
    {
      icon: Award,
      name: "Competition Intelligence",
      points: "2 points",
      description: "Awarded upon successful submission of Competition Intelligence form",
      config: "Unlimited awards",
      example: "You capture competitor product photos and pricing at a retailer. Earn 2 points per submission.",
      color: "from-cyan-500 to-cyan-600"
    },
    {
      icon: MessageSquare,
      name: "Retailer Feedback",
      points: "2 points",
      description: "Awarded for capturing retailer feedback",
      config: "Unlimited awards",
      example: "You collect feedback from a retailer about product quality. Earn 2 points.",
      color: "from-teal-500 to-teal-600"
    },
    {
      icon: Image,
      name: "Branding Requests",
      points: "2 points",
      description: "Awarded for submitting branding requests with photos and measurements",
      config: "Unlimited awards",
      example: "You request a new shop board at retailer Z with measurements. Earn 2 points per request.",
      color: "from-red-500 to-red-600"
    }
  ];

  return (
    <Layout>
      <div className="container mx-auto p-6 max-w-6xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/leaderboard")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Leaderboard
        </Button>

        <div className="mb-6">
          <h1 className="text-4xl font-bold mb-2">Game Policy</h1>
          <p className="text-lg text-muted-foreground">
            Understanding how to earn points, track progress, and redeem rewards
          </p>
        </div>

        <Tabs defaultValue="activities" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="activities">9 Activities</TabsTrigger>
            <TabsTrigger value="structure">Game Structure</TabsTrigger>
            <TabsTrigger value="process">Earning Process</TabsTrigger>
            <TabsTrigger value="redemption">Redemption</TabsTrigger>
          </TabsList>

          <TabsContent value="activities" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>The 9 Gamification Activities</CardTitle>
                <CardDescription>
                  Each activity is designed to reward specific behaviors that drive business growth
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {activities.map((activity, index) => {
                  const Icon = activity.icon;
                  return (
                    <div key={index} className="space-y-3 pb-6 border-b last:border-0">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-lg bg-gradient-to-br ${activity.color}`}>
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">{activity.name}</h3>
                            <Badge variant="secondary">{activity.points}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{activity.description}</p>
                          <div className="bg-muted/50 p-3 rounded-md space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Configuration</p>
                            <p className="text-sm">{activity.config}</p>
                          </div>
                          <div className="mt-3 bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md border-l-4 border-blue-500">
                            <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Example</p>
                            <p className="text-sm text-blue-600 dark:text-blue-400">{activity.example}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="structure" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Game Structure & Configuration</CardTitle>
                <CardDescription>How games are organized and managed</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">1. Game Creation</h3>
                    <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                      <p className="text-sm">• Admin selects one or more of the 9 activities</p>
                      <p className="text-sm">• Defines reward points per activity</p>
                      <p className="text-sm">• Sets start and end dates (optional)</p>
                      <p className="text-sm">• Chooses territories (or applies to all)</p>
                      <p className="text-sm">• Activates the game</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">2. Activity Configuration</h3>
                    <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                      <div>
                        <p className="text-sm font-medium mb-1">Daily Target Activity:</p>
                        <p className="text-xs text-muted-foreground ml-4">→ Choose: Total Orders OR Sales Value (₹)</p>
                        <p className="text-xs text-muted-foreground ml-4">→ Set base daily target</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-1">Focused Products:</p>
                        <p className="text-xs text-muted-foreground ml-4">→ Auto-detected from Product Master</p>
                        <p className="text-xs text-muted-foreground ml-4">→ Points awarded when order contains focused product</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-1">Order Frequency:</p>
                        <p className="text-xs text-muted-foreground ml-4">→ Define consecutive orders needed (e.g., 2, 3, 4)</p>
                        <p className="text-xs text-muted-foreground ml-4">→ Sequence resets if gap occurs</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">3. Territory Application</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="border rounded-lg p-4">
                        <p className="font-medium mb-2">All Territories</p>
                        <p className="text-sm text-muted-foreground">Game applies to everyone across all regions</p>
                      </div>
                      <div className="border rounded-lg p-4">
                        <p className="font-medium mb-2">Selected Territories</p>
                        <p className="text-sm text-muted-foreground">Game applies only to specific territories</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">4. Points Calculation Flow</h3>
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 p-6 rounded-lg">
                      <div className="flex flex-col space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">1</div>
                          <p className="text-sm">User performs activity (e.g., creates order)</p>
                        </div>
                        <div className="ml-4 border-l-2 border-blue-300 h-4"></div>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold">2</div>
                          <p className="text-sm">System checks active games with matching activities</p>
                        </div>
                        <div className="ml-4 border-l-2 border-green-300 h-4"></div>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm font-bold">3</div>
                          <p className="text-sm">Validates configuration rules (limits, thresholds, etc.)</p>
                        </div>
                        <div className="ml-4 border-l-2 border-purple-300 h-4"></div>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm font-bold">4</div>
                          <p className="text-sm">Awards points to user's account</p>
                        </div>
                        <div className="ml-4 border-l-2 border-orange-300 h-4"></div>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-pink-500 text-white flex items-center justify-center text-sm font-bold">5</div>
                          <p className="text-sm">Points appear in leaderboard & user profile</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="process" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Earning Points: Detailed Process</CardTitle>
                <CardDescription>Step-by-step guide on how points are earned</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Real-Time Point Calculation</h3>
                    <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                      <p className="text-sm">Points are calculated and awarded in real-time as activities occur:</p>
                      <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
                        <li>Order placed → Check for First Order, Daily Target, Focused Product, Productive Visit</li>
                        <li>Visit completed → Check for Productive Visit points</li>
                        <li>Competition data submitted → Award Competition Intelligence points</li>
                        <li>Feedback captured → Award Retailer Feedback points</li>
                        <li>Branding request created → Award Branding Request points</li>
                      </ul>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">Example Scenarios</h3>
                    
                    <div className="space-y-4">
                      <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-950/20">
                        <p className="font-medium text-green-700 dark:text-green-300 mb-2">Scenario 1: New Retailer Onboarding</p>
                        <div className="text-sm space-y-1 text-green-600 dark:text-green-400">
                          <p>1. Add new retailer "XYZ Mart" → 0 points (no game for this)</p>
                          <p>2. Visit XYZ Mart and place first order → 5 points (First Order from New Retailer)</p>
                          <p>3. Order contains Focused Product → Additional 5 points</p>
                          <p>4. This is your 5th order today, meeting daily target → Additional 15 points</p>
                          <p className="font-bold pt-2">Total Earned: 25 points from one visit!</p>
                        </div>
                      </div>

                      <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-950/20">
                        <p className="font-medium text-blue-700 dark:text-blue-300 mb-2">Scenario 2: Daily Routine</p>
                        <div className="text-sm space-y-1 text-blue-600 dark:text-blue-400">
                          <p>1. Visit Retailer A (existing) → Place order → 5 points (Productive Visit)</p>
                          <p>2. Visit Retailer B (existing) → Place order → 5 points (Productive Visit) + 2 points (2nd consecutive order)</p>
                          <p>3. Visit Retailer C → Capture competition data → 2 points</p>
                          <p>4. Visit Retailer D → Place order with focused product → 5 points + 5 points</p>
                          <p>5. Complete 5 orders, hit daily target → 15 points</p>
                          <p className="font-bold pt-2">Total Earned: 39 points for the day!</p>
                        </div>
                      </div>

                      <div className="border rounded-lg p-4 bg-purple-50 dark:bg-purple-950/20">
                        <p className="font-medium text-purple-700 dark:text-purple-300 mb-2">Scenario 3: Month-End Achievement</p>
                        <div className="text-sm space-y-1 text-purple-600 dark:text-purple-400">
                          <p>1. Last month beat sales: ₹2,00,000</p>
                          <p>2. This month beat sales: ₹2,20,000 (10% growth)</p>
                          <p>3. Growth exceeds 7% minimum → 5 points (Beat Growth)</p>
                          <p className="font-bold pt-2">Bonus earned at month end!</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">Tracking Your Progress</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="border rounded-lg p-4">
                        <p className="font-medium mb-2">Leaderboard Tab</p>
                        <p className="text-sm text-muted-foreground">View your rank and points by time period</p>
                      </div>
                      <div className="border rounded-lg p-4">
                        <p className="font-medium mb-2">My Games Tab</p>
                        <p className="text-sm text-muted-foreground">See active games and points earned per game</p>
                      </div>
                      <div className="border rounded-lg p-4">
                        <p className="font-medium mb-2">Badges Tab</p>
                        <p className="text-sm text-muted-foreground">View earned badges and achievements</p>
                      </div>
                      <div className="border rounded-lg p-4">
                        <p className="font-medium mb-2">My Points Card</p>
                        <p className="text-sm text-muted-foreground">Filter by today, week, month, quarter, YTD</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="redemption" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Points Redemption Policy</CardTitle>
                <CardDescription>How to redeem your earned points for rewards</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Redemption Process</h3>
                    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 p-6 rounded-lg">
                      <div className="flex flex-col space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-yellow-500 text-white flex items-center justify-center text-sm font-bold">1</div>
                          <p className="text-sm">Navigate to Leaderboard → Click "Redeem Points"</p>
                        </div>
                        <div className="ml-4 border-l-2 border-yellow-300 h-4"></div>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm font-bold">2</div>
                          <p className="text-sm">Enter points amount you want to redeem</p>
                        </div>
                        <div className="ml-4 border-l-2 border-orange-300 h-4"></div>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center text-sm font-bold">3</div>
                          <p className="text-sm">System calculates voucher amount (₹1 per point)</p>
                        </div>
                        <div className="ml-4 border-l-2 border-red-300 h-4"></div>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-pink-500 text-white flex items-center justify-center text-sm font-bold">4</div>
                          <p className="text-sm">Submit redemption request</p>
                        </div>
                        <div className="ml-4 border-l-2 border-pink-300 h-4"></div>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm font-bold">5</div>
                          <p className="text-sm">Admin reviews and approves request</p>
                        </div>
                        <div className="ml-4 border-l-2 border-purple-300 h-4"></div>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold">6</div>
                          <p className="text-sm">Receive voucher code or gift</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">Redemption Rules</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="border rounded-lg p-4">
                        <p className="font-medium mb-2">Conversion Rate</p>
                        <p className="text-2xl font-bold text-primary">1 Point = ₹{conversionRate}</p>
                      </div>
                      <div className="border rounded-lg p-4">
                        <p className="font-medium mb-2">Minimum Redemption</p>
                        <p className="text-2xl font-bold text-primary">100 Points</p>
                      </div>
                      <div className="border rounded-lg p-4">
                        <p className="font-medium mb-2">Processing Time</p>
                        <p className="text-sm text-muted-foreground">2-5 business days</p>
                      </div>
                      <div className="border rounded-lg p-4">
                        <p className="font-medium mb-2">Redemption Status</p>
                        <p className="text-sm text-muted-foreground">Track in "My Redemptions" tab</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">Request Statuses</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                        <Badge variant="secondary">Pending</Badge>
                        <p className="text-sm">Request submitted, awaiting admin review</p>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                        <Badge className="bg-green-600">Approved</Badge>
                        <p className="text-sm">Request approved! Voucher code will be shared</p>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                        <Badge variant="destructive">Rejected</Badge>
                        <p className="text-sm">Request rejected with reason provided</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">Important Notes</h3>
                    <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border-l-4 border-blue-500 space-y-2">
                      <p className="text-sm">• Points cannot be transferred between users</p>
                      <p className="text-sm">• Redeemed points are deducted from your total</p>
                      <p className="text-sm">• Rejected requests return points to your account</p>
                      <p className="text-sm">• Keep track of your redemption history in the dashboard</p>
                      <p className="text-sm">• Contact admin if you have questions about redemption</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">Redemption Example</h3>
                    <div className="border rounded-lg p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
                      <p className="font-medium mb-3">Scenario: First Redemption</p>
                      <div className="space-y-2 text-sm">
                        <p>• Current Points: 500 points</p>
                        <p>• Redeem Request: 200 points</p>
                        <p>• Voucher Value: ₹200</p>
                        <p>• After Redemption: 300 points remaining</p>
                        <p className="pt-2 font-medium">Process: Request submitted → Admin approves → Receive ₹200 voucher code → Use for purchases!</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-6 flex justify-center">
          <Button onClick={() => navigate("/leaderboard")} size="lg">
            Go to Leaderboard
          </Button>
        </div>
      </div>
    </Layout>
  );
}
