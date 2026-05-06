import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Search, 
  Building2, 
  Phone, 
  MapPin,
  Users,
  Truck,
  Filter,
  ArrowRightLeft,
  List,
  GitBranch,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RetailerRemapDialog } from "@/components/distributor/RetailerRemapDialog";
import { DistributorHierarchyTree } from "@/components/distributor/DistributorHierarchyTree";
import { useDistributorTypes } from "@/hooks/useDistributorTypes";

interface Distributor {
  id: string;
  name: string;
  contact_person: string;
  phone: string;
  email: string | null;
  address: string | null;
  status: string;
  distribution_level: string | null;
  partnership_status: string | null;
  gst_number: string | null;
  sales_team_size: number | null;
  assets_vans: number | null;
  assets_trucks: number | null;
  network_retailers_count: number | null;
  onboarding_date: string | null;
  parent_id: string | null;
  type_id: string | null;
}

const statusColors: Record<string, string> = {
  'initial_connect': 'bg-gray-100 text-gray-800',
  'evaluation': 'bg-yellow-100 text-yellow-800',
  'strong_candidate': 'bg-blue-100 text-blue-800',
  'documentation': 'bg-purple-100 text-purple-800',
  'onboarded': 'bg-green-100 text-green-800',
  'active': 'bg-green-100 text-green-800',
  'inactive': 'bg-red-100 text-red-800',
  'drop': 'bg-red-100 text-red-800',
};

const partnershipColors: Record<string, string> = {
  'platinum': 'bg-gradient-to-r from-slate-400 to-slate-600 text-white',
  'gold': 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white',
  'silver': 'bg-gradient-to-r from-gray-300 to-gray-500 text-white',
  'registered': 'bg-gray-100 text-gray-800',
};

export default function DistributorMaster() {
  const navigate = useNavigate();
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showRemapDialog, setShowRemapDialog] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "hierarchy">("list");
  const { types, loading: typesLoading } = useDistributorTypes();

  useEffect(() => {
    loadDistributors();
  }, []);

  const loadDistributors = async () => {
    try {
      const { data, error } = await supabase
        .from('distributors')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDistributors(data || []);
    } catch (error: any) {
      toast.error("Failed to load distributors: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const resolveType = (d: Distributor) => {
    if (d.type_id) return types.find(t => t.id === d.type_id);
    return types.find(t => t.legacy_mapping === d.distribution_level);
  };

  const getFilteredDistributors = () => {
    return distributors.filter(d => {
      const resolved = resolveType(d);
      const matchesType = typeFilter === "all" || resolved?.id === typeFilter;
      const matchesSearch = 
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.contact_person?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.phone?.includes(searchQuery);
      const matchesStatus = statusFilter === "all" || d.status === statusFilter;
      return matchesType && matchesSearch && matchesStatus;
    });
  };

  const formatStatus = (status: string) => {
    return status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown';
  };

  const DistributorCard = ({ distributor }: { distributor: Distributor }) => {
    const resolved = resolveType(distributor);
    return (
      <Card 
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => navigate(`/distributor/${distributor.id}`)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate">{distributor.name}</h3>
              <div className="flex items-center gap-2 flex-wrap mt-1">
                {resolved && (
                  <Badge variant="outline" className="text-xs flex-shrink-0">
                    {resolved.name}
                  </Badge>
                )}
                {distributor.partnership_status && (
                  <Badge className={`text-xs flex-shrink-0 ${partnershipColors[distributor.partnership_status] || 'bg-muted text-muted-foreground'}`}>
                    {distributor.partnership_status.charAt(0).toUpperCase() + distributor.partnership_status.slice(1)}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{distributor.contact_person}</p>
            </div>
            <Badge className={`flex-shrink-0 ${statusColors[distributor.status] || 'bg-muted text-muted-foreground'}`}>
              {formatStatus(distributor.status)}
            </Badge>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {distributor.phone}
            </span>
          </div>

          {distributor.address && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
              <MapPin className="h-3 w-3" />
              {distributor.address}
            </p>
          )}

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {distributor.sales_team_size !== null && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {distributor.sales_team_size} team
              </span>
            )}
            {(distributor.assets_vans || distributor.assets_trucks) && (
              <span className="flex items-center gap-1">
                <Truck className="h-3 w-3" />
                {(distributor.assets_vans || 0) + (distributor.assets_trucks || 0)} vehicles
              </span>
            )}
            {distributor.network_retailers_count !== null && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {distributor.network_retailers_count} retailers
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const filtered = getFilteredDistributors();

  return (
    <Layout>
      <div className="p-4 pb-24 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">Distributor Master</h1>
            <p className="text-sm text-muted-foreground">Manage your DMS network structure</p>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center rounded-md border border-input overflow-hidden">
              <button
                className={cn(
                  "px-2.5 py-1.5 text-xs font-medium transition-colors",
                  viewMode === "list"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-muted"
                )}
                onClick={() => setViewMode("list")}
              >
                <List className="h-3.5 w-3.5" />
              </button>
              <button
                className={cn(
                  "px-2.5 py-1.5 text-xs font-medium transition-colors",
                  viewMode === "hierarchy"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-muted"
                )}
                onClick={() => setViewMode("hierarchy")}
              >
                <GitBranch className="h-3.5 w-3.5" />
              </button>
            </div>
            <Button 
              variant="outline"
              onClick={() => setShowRemapDialog(true)}
              size="sm"
              className="gap-2"
            >
              <ArrowRightLeft className="h-4 w-4" />
              Remap
            </Button>
            <Button 
              onClick={() => navigate(`/add-distributor${typeFilter !== "all" ? `?type=${typeFilter}` : ""}`)}
              size="sm"
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add New
            </Button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, contact, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40 h-10 text-xs">
              <Filter className="h-3 w-3 mr-1 flex-shrink-0" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {types.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-10 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="initial_connect">Initial Connect</SelectItem>
              <SelectItem value="evaluation">Evaluation</SelectItem>
              <SelectItem value="strong_candidate">Strong Candidate</SelectItem>
              <SelectItem value="documentation">Documentation</SelectItem>
              <SelectItem value="onboarded">Onboarded</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="drop">Dropped</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Distributor List / Hierarchy */}
        {loading || typesLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4 h-28 bg-muted/50" />
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground font-medium">No distributors found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add distributors to manage your distribution network.
              </p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => navigate(`/add-distributor${typeFilter !== "all" ? `?type=${typeFilter}` : ""}`)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Distributor
              </Button>
            </CardContent>
          </Card>
        ) : viewMode === "hierarchy" ? (
          <DistributorHierarchyTree distributors={filtered} types={types} />
        ) : (
          <div className="space-y-3">
            {filtered.map(d => <DistributorCard key={d.id} distributor={d} />)}
          </div>
        )}

        {/* Remap Dialog */}
        <RetailerRemapDialog 
          open={showRemapDialog} 
          onOpenChange={setShowRemapDialog}
          onSuccess={loadDistributors}
        />
      </div>
    </Layout>
  );
}
