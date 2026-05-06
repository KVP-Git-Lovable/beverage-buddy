import React, { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { ArrowLeft, List, MapIcon } from 'lucide-react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { PincodeMasterLookup } from '@/components/admin/PincodeMasterLookup';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { IndiaMapView } from '@/components/admin/IndiaMapView';
import { FetchGeocodingButton } from '@/components/admin/FetchGeocodingButton';
import { FetchPincodesButton } from '@/components/admin/FetchPincodesButton';
 
const PincodeMasterPage: React.FC = () => {
  const navigate = useNavigate();
  const { hasAdminAccess, loading } = useAdminAccess();
  const [mapOpen, setMapOpen] = useState(false);
 
   if (loading) {
     return (
       <Layout>
         <div className="min-h-screen flex items-center justify-center">
           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
         </div>
       </Layout>
     );
   }
 
   if (!hasAdminAccess) {
     return <Navigate to="/dashboard" replace />;
   }
 
   return (
     <Layout>
       <div className="min-h-screen bg-gradient-subtle p-4">
         <div className="max-w-4xl mx-auto space-y-6">
           {/* Header */}
           <div className="flex items-center gap-4">
             <Button 
               onClick={() => navigate('/admin-controls')} 
               variant="ghost" 
               size="sm"
               className="p-2"
             >
               <ArrowLeft size={20} />
             </Button>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-foreground">Pincode Master</h1>
                <p className="text-muted-foreground">Browse data of external retailers based on their PIN Codes</p>
              </div>
                 <FetchGeocodingButton />
                 <FetchPincodesButton />
                 <Button
                   onClick={() => setMapOpen(true)}
                   variant="outline"
                   size="sm"
                   className="gap-1 h-8 px-2 text-xs"
                 >
                   <MapIcon size={14} />
                   Map View
                 </Button>
                <Button
                  onClick={() => navigate('/admin/retailer-lists')}
                  variant="outline"
                  size="sm"
                  className="gap-1 h-8 px-2 text-xs"
                >
                  <List size={14} />
                  My Lists
                </Button>
           </div>
 
          {/* Lookup Component */}
            <PincodeMasterLookup />
          </div>
        </div>

        {/* Map View Dialog */}
        <Dialog open={mapOpen} onOpenChange={setMapOpen}>
          <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] max-h-[90vh] p-0 flex flex-col">
            <DialogHeader className="px-6 pt-4 pb-2">
             <DialogTitle>India — State Analytics</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-hidden">
              <IndiaMapView />
            </div>
          </DialogContent>
        </Dialog>
      </Layout>
    );
};

export default PincodeMasterPage;