import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Star, ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface RetailerFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
  visitId: string;
  retailerId: string;
  retailerName: string;
  editId?: string | null;
  editData?: any;
}

// Calculate score for retailer feedback (5 star fields × 5 max = 25 max points, displayed out of 10)
const calculateRetailerFeedbackScore = (feedback: {
  product_packaging: number;
  product_sku_range: number;
  product_quality: number;
  product_placement: number;
  consumer_satisfaction: number;
}): number => {
  const { product_packaging, product_sku_range, product_quality, product_placement, consumer_satisfaction } = feedback;
  const totalPoints = product_packaging + product_sku_range + product_quality + product_placement + consumer_satisfaction;
  const MAX_SCORE = 25; // 5 fields × 5 points each
  
  if (totalPoints === 0) return 0;
  return Math.round((totalPoints / MAX_SCORE) * 100) / 10;
};

export const RetailerFeedbackModal = ({ 
  isOpen, 
  onClose, 
  onBack,
  visitId, 
  retailerId, 
  retailerName,
  editId,
  editData
}: RetailerFeedbackModalProps) => {
  const [feedback, setFeedback] = useState({
    product_packaging: 0,
    product_sku_range: 0,
    product_quality: 0,
    product_placement: 0,
    consumer_satisfaction: 0,
    summary_notes: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate live score
  const currentScore = calculateRetailerFeedbackScore({
    product_packaging: feedback.product_packaging,
    product_sku_range: feedback.product_sku_range,
    product_quality: feedback.product_quality,
    product_placement: feedback.product_placement,
    consumer_satisfaction: feedback.consumer_satisfaction
  });

  // Load existing feedback - from editData or from today's record
  useEffect(() => {
    const loadExistingFeedback = async () => {
      if (!isOpen || !retailerId) return;
      
      // If editData is provided, use it directly
      if (editData) {
        setFeedback({
          product_packaging: editData.product_packaging || 0,
          product_sku_range: editData.product_sku_range || 0,
          product_quality: editData.product_quality || 0,
          product_placement: editData.product_placement || 0,
          consumer_satisfaction: editData.consumer_satisfaction || 0,
          summary_notes: editData.summary_notes || ""
        });
        return;
      }
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // If editId is provided, load that specific record
        if (editId) {
          const { data, error } = await supabase
            .from('retailer_feedback')
            .select('*')
            .eq('id', editId)
            .single();
            
          if (!error && data) {
            setFeedback({
              product_packaging: data.product_packaging || 0,
              product_sku_range: data.product_sku_range || 0,
              product_quality: data.product_quality || 0,
              product_placement: data.product_placement || 0,
              consumer_satisfaction: (data as any).consumer_satisfaction || 0,
              summary_notes: data.summary_notes || ""
            });
          }
          return;
        }

        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
          .from('retailer_feedback')
          .select('*')
          .eq('retailer_id', retailerId)
          .eq('feedback_date', today)
          .eq('user_id', user.id)
          .maybeSingle();

        if (!error && data) {
          setFeedback({
            product_packaging: data.product_packaging || 0,
            product_sku_range: data.product_sku_range || 0,
            product_quality: data.product_quality || 0,
            product_placement: data.product_placement || 0,
            consumer_satisfaction: (data as any).consumer_satisfaction || 0,
            summary_notes: data.summary_notes || ""
          });
        }
      } catch (error) {
        console.error('Error loading existing feedback:', error);
      }
    };

    loadExistingFeedback();
  }, [isOpen, retailerId, editId, editData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if at least one rating is provided
    const hasRating = feedback.product_packaging > 0 || 
                      feedback.product_sku_range > 0 || 
                      feedback.product_quality > 0 || 
                      feedback.product_placement > 0 ||
                      feedback.consumer_satisfaction > 0;

    if (!hasRating) {
      toast({
        title: "Missing Information",
        description: "Please provide at least one rating",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const feedbackData = {
        user_id: user.id,
        retailer_id: retailerId,
        visit_id: visitId && visitId.length > 10 ? visitId : null,
        feedback_type: 'product_feedback',
        feedback_date: new Date().toISOString().split('T')[0],
        product_packaging: feedback.product_packaging,
        product_sku_range: feedback.product_sku_range,
        product_quality: feedback.product_quality,
        product_placement: feedback.product_placement,
        consumer_satisfaction: feedback.consumer_satisfaction,
        summary_notes: feedback.summary_notes || null,
        score: currentScore,
        updated_at: new Date().toISOString()
      };

      // If editing a specific record, update it
      let isNewFeedback = false;
      if (editId) {
        const result = await supabase
          .from('retailer_feedback')
          .update(feedbackData)
          .eq('id', editId);
        if (result.error) throw result.error;
      } else {
        // Check if record exists for today
        const { data: existing } = await supabase
          .from('retailer_feedback')
          .select('id')
          .eq('retailer_id', retailerId)
          .eq('feedback_date', feedbackData.feedback_date)
          .eq('user_id', user.id)
          .maybeSingle();

        if (existing) {
          const result = await supabase
            .from('retailer_feedback')
            .update(feedbackData)
            .eq('id', existing.id);
          if (result.error) throw result.error;
        } else {
          isNewFeedback = true;
          const result = await supabase
            .from('retailer_feedback')
            .insert(feedbackData);
          if (result.error) throw result.error;
        }
      }

      // Award gamification points for retailer feedback (only for new feedback, not updates)
      if (isNewFeedback) {
        try {
          const { awardPointsForRetailerFeedback } = await import('@/utils/gamificationPointsAwarder');
          await awardPointsForRetailerFeedback(user.id, retailerId);
        } catch (e) {
          console.error('Error awarding feedback points:', e);
        }
      }

      toast({
        title: "Feedback Recorded",
        description: `Retailer feedback for ${retailerName} saved with score: ${currentScore}/10`,
      });

      // Reset form
      setFeedback({
        product_packaging: 0,
        product_sku_range: 0,
        product_quality: 0,
        product_placement: 0,
        consumer_satisfaction: 0,
        summary_notes: ""
      });
      
      onClose();
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to record feedback",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStarRating = (value: number, onChange: (value: number) => void, label: string, description: string) => {
    return (
      <div className="flex items-center justify-between">
        <div>
          <Label className="font-medium">{label}</Label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => onChange(star)}
              className="p-1 hover:scale-110 transition-transform focus:outline-none"
            >
              <Star
                size={24}
                className={`${
                  star <= value
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-300 hover:text-yellow-200"
                } transition-colors`}
              />
            </button>
          ))}
        </div>
      </div>
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-600 bg-green-100";
    if (score >= 6) return "text-yellow-600 bg-yellow-100";
    if (score >= 4) return "text-orange-600 bg-orange-100";
    return "text-red-600 bg-red-100";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0">
        {/* Header with gradient */}
        <div className="bg-gradient-to-br from-orange-500/10 via-orange-400/5 to-background p-6 pb-4">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {onBack && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onBack}
                    className="p-1 h-8 w-8"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center">
                    <Star className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  Retailer Feedback
                </DialogTitle>
              </div>
              {currentScore > 0 && (
                <Badge className={`text-sm px-3 py-1.5 font-semibold ${getScoreColor(currentScore)}`}>
                  Score: {currentScore}/10
                </Badge>
              )}
            </div>
            <div className="mt-3 pl-10">
              <p className="text-base font-semibold text-foreground">{retailerName}</p>
            </div>
          </DialogHeader>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 pt-4 space-y-6">
          {/* Performance Ratings Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-orange-700 dark:text-orange-300">
              <Star className="h-4 w-4" />
              Performance Ratings
            </div>
            <div className="grid gap-4 p-4 bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl border border-border/50">
              {renderStarRating(
                feedback.product_packaging,
                (value) => setFeedback({ ...feedback, product_packaging: value }),
                "Product Packaging",
                "Packaging quality & appeal"
              )}
              
              {renderStarRating(
                feedback.product_sku_range,
                (value) => setFeedback({ ...feedback, product_sku_range: value }),
                "Product SKU Range",
                "Variety of products stocked"
              )}
              
              {renderStarRating(
                feedback.product_quality,
                (value) => setFeedback({ ...feedback, product_quality: value }),
                "Product Quality",
                "Customer satisfaction with quality"
              )}
              
              {renderStarRating(
                feedback.product_placement,
                (value) => setFeedback({ ...feedback, product_placement: value }),
                "Product Placement",
                "Visibility and shelf positioning"
              )}
              
              {renderStarRating(
                feedback.consumer_satisfaction,
                (value) => setFeedback({ ...feedback, consumer_satisfaction: value }),
                "Consumer Satisfaction",
                "End consumer feedback"
              )}
            </div>
          </div>

          {/* Summary Notes Section */}
          <div className="space-y-2">
            <Label htmlFor="summary_notes" className="font-medium">Summary Notes</Label>
            <Textarea
              id="summary_notes"
              value={feedback.summary_notes}
              onChange={(e) => setFeedback({ ...feedback, summary_notes: e.target.value })}
              placeholder="Additional observations and feedback notes..."
              rows={3}
              className="resize-none bg-muted/30"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 h-11"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1 h-11 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Submit Feedback"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
