import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, Building2, Network } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OwnerSelector } from "@/components/distributor/OwnerSelector";
import { useDistributorTypes, DistributorType } from "@/hooks/useDistributorTypes";

interface Distributor {
  id: string;
  name: string;
}

export default function AddDistributor() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [parentDistributors, setParentDistributors] = useState<Distributor[]>([]);
  const { types, loading: typesLoading } = useDistributorTypes();

  // Resolve initial type from URL param (legacy_mapping match)
  const urlType = searchParams.get('type') || '';

  const [selectedType, setSelectedType] = useState<DistributorType | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    gst_number: "",
    established_year: "",
    distribution_experience_years: "",
    sales_team_size: "",
    assets_vans: "",
    assets_trucks: "",
    network_retailers_count: "",
    region_coverage: "",
    type_id: "",
    distribution_level: "",
    parent_id: "",
    distributor_status: "initial_connect",
    partnership_status: "registered",
    onboarding_date: "",
    years_of_relationship: "",
    products_distributed: "",
    other_products: "",
    competition_products: "",
    strength: "",
    weakness: "",
    opportunities: "",
    threats: "",
    about_business: "",
    owner_id: "",
    owner_name: "",
  });

  // Once types load, resolve initial selection from URL param
  useEffect(() => {
    if (types.length === 0) return;

    let resolved: DistributorType | undefined;

    if (urlType) {
      // Try legacy_mapping match first
      resolved = types.find(t => t.legacy_mapping === urlType);
      // Try code match
      if (!resolved) resolved = types.find(t => t.code.toLowerCase() === urlType.toLowerCase());
    }

    // Default to first type
    if (!resolved) resolved = types[0];

    if (resolved) {
      setSelectedType(resolved);
      setFormData(prev => ({ ...prev, type_id: resolved!.id }));
    }
  }, [types, urlType]);

  // Load parent distributors when selected type has parent_allowed
  useEffect(() => {
    if (!selectedType?.parent_allowed || !selectedType.parent_type_code) {
      setParentDistributors([]);
      return;
    }

    const loadParentDistributors = async () => {
      // Step 1: Find the parent type's id via its code
      const parentType = types.find(t => t.code === selectedType.parent_type_code);
      if (!parentType) {
        setParentDistributors([]);
        return;
      }

      // Step 2: Query distributors where type_id = parentType.id
      const { data } = await supabase
        .from('distributors')
        .select('id, name')
        .eq('type_id', parentType.id)
        .order('name');
      setParentDistributors(data || []);
    };

    loadParentDistributors();
  }, [selectedType, types]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTypeChange = (typeId: string) => {
    const type = types.find(t => t.id === typeId);
    if (type) {
      setSelectedType(type);
      setFormData(prev => ({ ...prev, type_id: type.id, parent_id: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.contact_person.trim() || !formData.phone.trim()) {
      toast.error("Please fill in required fields");
      return;
    }

    if (!selectedType) {
      toast.error("Please select a distributor type");
      return;
    }

    if (selectedType.parent_allowed && !formData.parent_id) {
      toast.error(`Please select a parent ${types.find(t => t.code === selectedType.parent_type_code)?.name || 'distributor'}`);
      return;
    }

    setLoading(true);
    try {
      const insertData: any = {
        name: formData.name.trim(),
        contact_person: formData.contact_person.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || null,
        address: formData.address.trim() || null,
        gst_number: formData.gst_number.trim() || null,
        established_year: formData.established_year ? parseInt(formData.established_year) : null,
        distribution_experience_years: formData.distribution_experience_years ? parseInt(formData.distribution_experience_years) : null,
        sales_team_size: formData.sales_team_size ? parseInt(formData.sales_team_size) : null,
        assets_vans: formData.assets_vans ? parseInt(formData.assets_vans) : null,
        assets_trucks: formData.assets_trucks ? parseInt(formData.assets_trucks) : null,
        network_retailers_count: formData.network_retailers_count ? parseInt(formData.network_retailers_count) : null,
        region_coverage: formData.region_coverage.trim() || null,
        // Dual-write: type_id + legacy distribution_level
        type_id: selectedType.id,
        distribution_level: selectedType.legacy_mapping,
        parent_id: formData.parent_id || null,
        status: "active",
        distributor_status: formData.distributor_status,
        partnership_status: formData.partnership_status,
        onboarding_date: formData.onboarding_date || null,
        years_of_relationship: formData.years_of_relationship ? parseInt(formData.years_of_relationship) : null,
        products_distributed: formData.products_distributed ? formData.products_distributed.split(',').map(s => s.trim()) : null,
        other_products: formData.other_products ? formData.other_products.split(',').map(s => s.trim()) : null,
        competition_products: formData.competition_products ? formData.competition_products.split(',').map(s => s.trim()) : null,
        strength: formData.strength.trim() || null,
        weakness: formData.weakness.trim() || null,
        opportunities: formData.opportunities.trim() || null,
        threats: formData.threats.trim() || null,
        about_business: formData.about_business.trim() || null,
        owner_id: formData.owner_id || null,
        owner_name: formData.owner_name || null,
      };

      const { data, error } = await supabase
        .from('distributors')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      toast.success("Distributor created successfully");
      navigate(`/distributor/${data.id}`);
    } catch (error: any) {
      toast.error("Failed to create distributor: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (typesLoading) {
    return (
      <Layout>
        <div className="p-4 flex items-center justify-center min-h-[50vh]">
          <p className="text-muted-foreground">Loading distributor types...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Add Distributor</h1>
            <p className="text-sm text-muted-foreground">Onboard a new distribution partner</p>
          </div>
        </div>

        {/* DMS Type Card */}
        {selectedType && (
          <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 mb-4 flex items-start gap-3">
            <Network className="h-6 w-6 mt-0.5 flex-shrink-0 text-primary" />
            <div>
              <p className="font-semibold text-primary">{selectedType.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{selectedType.description}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Business Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="Enter business name"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="contact_person">Contact Person *</Label>
                  <Input
                    id="contact_person"
                    value={formData.contact_person}
                    onChange={(e) => handleChange("contact_person", e.target.value)}
                    placeholder="Contact name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="Phone number"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="Email address"
                />
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="Full address"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="gst_number">GST Number</Label>
                <Input
                  id="gst_number"
                  value={formData.gst_number}
                  onChange={(e) => handleChange("gst_number", e.target.value)}
                  placeholder="GST registration number"
                />
              </div>

              {/* Owner Selector */}
              <OwnerSelector
                value={formData.owner_id || null}
                valueName={formData.owner_name || null}
                onChange={(id, name) => {
                  setFormData(prev => ({ 
                    ...prev, 
                    owner_id: id || "", 
                    owner_name: name || "" 
                  }));
                }}
              />
            </CardContent>
          </Card>

          {/* About Business - Moved up */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">About Business</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                id="about_business"
                value={formData.about_business}
                onChange={(e) => handleChange("about_business", e.target.value)}
                placeholder="Additional notes about the business"
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Distribution Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Distribution Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Distributor Type</Label>
                  <Select value={formData.type_id} onValueChange={handleTypeChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {types.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Parent distributor selector — only visible when parent_allowed */}
                {selectedType?.parent_allowed && (
                  <div>
                    <Label>Parent {types.find(t => t.code === selectedType.parent_type_code)?.name || 'Distributor'} *</Label>
                    <Select value={formData.parent_id || "none"} onValueChange={(v) => handleChange("parent_id", v === "none" ? "" : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder={`Select ${types.find(t => t.code === selectedType.parent_type_code)?.name || 'parent'}`} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {parentDistributors.map(d => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {parentDistributors.length === 0 && (
                      <p className="text-xs text-destructive mt-1">No {types.find(t => t.code === selectedType.parent_type_code)?.name || 'parent'} distributors found. Add one first.</p>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Onboarding Status</Label>
                  <Select value={formData.distributor_status} onValueChange={(v) => handleChange("distributor_status", v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
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
                <div>
                  <Label>Partnership Status</Label>
                  <Select value={formData.partnership_status} onValueChange={(v) => handleChange("partnership_status", v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="platinum">Platinum</SelectItem>
                      <SelectItem value="gold">Gold</SelectItem>
                      <SelectItem value="silver">Silver</SelectItem>
                      <SelectItem value="registered">Registered</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="established_year">Established Year</Label>
                  <Input
                    id="established_year"
                    type="number"
                    value={formData.established_year}
                    onChange={(e) => handleChange("established_year", e.target.value)}
                    placeholder="e.g., 2010"
                  />
                </div>
                <div>
                  <Label htmlFor="distribution_experience_years">Experience (Years)</Label>
                  <Input
                    id="distribution_experience_years"
                    type="number"
                    value={formData.distribution_experience_years}
                    onChange={(e) => handleChange("distribution_experience_years", e.target.value)}
                    placeholder="Years of experience"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="onboarding_date">Onboarding Date</Label>
                  <Input
                    id="onboarding_date"
                    type="date"
                    value={formData.onboarding_date}
                    onChange={(e) => handleChange("onboarding_date", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="years_of_relationship">Years of Relationship</Label>
                  <Input
                    id="years_of_relationship"
                    type="number"
                    value={formData.years_of_relationship}
                    onChange={(e) => handleChange("years_of_relationship", e.target.value)}
                    placeholder="Years with us"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Network & Assets */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Network & Assets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="sales_team_size">Sales Team Size</Label>
                  <Input
                    id="sales_team_size"
                    type="number"
                    value={formData.sales_team_size}
                    onChange={(e) => handleChange("sales_team_size", e.target.value)}
                    placeholder="Number of team members"
                  />
                </div>
                <div>
                  <Label htmlFor="network_retailers_count">Retailers Supported</Label>
                  <Input
                    id="network_retailers_count"
                    type="number"
                    value={formData.network_retailers_count}
                    onChange={(e) => handleChange("network_retailers_count", e.target.value)}
                    placeholder="Number of retailers"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="assets_vans">Vans</Label>
                  <Input
                    id="assets_vans"
                    type="number"
                    value={formData.assets_vans}
                    onChange={(e) => handleChange("assets_vans", e.target.value)}
                    placeholder="Number of vans"
                  />
                </div>
                <div>
                  <Label htmlFor="assets_trucks">Trucks</Label>
                  <Input
                    id="assets_trucks"
                    type="number"
                    value={formData.assets_trucks}
                    onChange={(e) => handleChange("assets_trucks", e.target.value)}
                    placeholder="Number of trucks"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="region_coverage">Region Coverage</Label>
                <Input
                  id="region_coverage"
                  value={formData.region_coverage}
                  onChange={(e) => handleChange("region_coverage", e.target.value)}
                  placeholder="e.g., North Karnataka, 5 Districts"
                />
              </div>
            </CardContent>
          </Card>

          {/* Products */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Products & Competition</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="products_distributed">Our Products Distributed</Label>
                <Input
                  id="products_distributed"
                  value={formData.products_distributed}
                  onChange={(e) => handleChange("products_distributed", e.target.value)}
                  placeholder="Comma separated list"
                />
              </div>
              <div>
                <Label htmlFor="other_products">Other Products Distributed</Label>
                <Input
                  id="other_products"
                  value={formData.other_products}
                  onChange={(e) => handleChange("other_products", e.target.value)}
                  placeholder="Comma separated list"
                />
              </div>
              <div>
                <Label htmlFor="competition_products">Competition Products</Label>
                <Input
                  id="competition_products"
                  value={formData.competition_products}
                  onChange={(e) => handleChange("competition_products", e.target.value)}
                  placeholder="Comma separated list"
                />
              </div>
            </CardContent>
          </Card>

          {/* SWOT Analysis */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">SWOT Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="strength">Strengths</Label>
                <Textarea
                  id="strength"
                  value={formData.strength}
                  onChange={(e) => handleChange("strength", e.target.value)}
                  placeholder="Key strengths of this distributor"
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="weakness">Weaknesses</Label>
                <Textarea
                  id="weakness"
                  value={formData.weakness}
                  onChange={(e) => handleChange("weakness", e.target.value)}
                  placeholder="Areas of improvement"
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="opportunities">Opportunities</Label>
                <Textarea
                  id="opportunities"
                  value={formData.opportunities}
                  onChange={(e) => handleChange("opportunities", e.target.value)}
                  placeholder="Growth opportunities"
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="threats">Threats</Label>
                <Textarea
                  id="threats"
                  value={formData.threats}
                  onChange={(e) => handleChange("threats", e.target.value)}
                  placeholder="Potential threats or risks"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Button type="submit" className="w-full gap-2" disabled={loading}>
            <Save className="h-4 w-4" />
            {loading ? "Saving..." : "Save Distributor"}
          </Button>
        </form>
      </div>
    </Layout>
  );
}
