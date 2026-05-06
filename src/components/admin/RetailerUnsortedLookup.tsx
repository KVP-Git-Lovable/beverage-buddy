import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';

import { Badge } from '@/components/ui/badge';
import { SearchInput } from '@/components/SearchInput';
import { Database, Phone, MapPin } from 'lucide-react';
import { fetchStateCountsByStates, normalizeStateName } from '@/lib/state-counts';

export const RetailerUnsortedLookup: React.FC = () => {
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: states = [], isLoading: statesLoading } = useQuery({
    queryKey: ['retailer-unsorted-states'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_retailer_unsorted_states');
      if (error) throw error;
      return (data || []).map((r: any) => r.state as string).filter(Boolean);
    },
    staleTime: 60 * 60 * 1000,
  });

  const { data: unsortedStateCounts = {}, isFetched: unsortedStateCountsLoaded } = useQuery({
    queryKey: ['retailer-unsorted-state-counts', states],
    queryFn: async () => {
      return fetchStateCountsByStates({
        table: 'retailer_external_unsorted',
        column: 'state',
        states,
      });
    },
    enabled: states.length > 0,
    staleTime: 60 * 60 * 1000,
  });

  const stateLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    states.forEach((s) => {
      if (!unsortedStateCountsLoaded) {
        labels[s] = s;
        return;
      }

      const count = unsortedStateCounts[normalizeStateName(s)] ?? 0;
      labels[s] = `${s} (${count.toLocaleString()} retailers)`;
    });
    return labels;
  }, [states, unsortedStateCounts, unsortedStateCountsLoaded]);

  const { data: districts = [], isLoading: districtsLoading } = useQuery({
    queryKey: ['retailer-unsorted-districts', selectedState],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_retailer_unsorted_districts', {
        p_state: selectedState,
      });
      if (error) throw error;
      return (data || []).map((r: any) => r.district as string).filter(Boolean);
    },
    enabled: !!selectedState,
    staleTime: 30 * 60 * 1000,
  });

  const { data: cities = [], isLoading: citiesLoading } = useQuery({
    queryKey: ['retailer-unsorted-cities', selectedState, selectedDistrict],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_retailer_unsorted_cities', {
        p_state: selectedState,
        p_district: selectedDistrict,
      });
      if (error) throw error;
      return (data || []).map((r: any) => r.city as string).filter(Boolean);
    },
    enabled: !!selectedState && !!selectedDistrict,
    staleTime: 30 * 60 * 1000,
  });

  const {
    data: retailers = [],
    isLoading: retailersLoading,
    error: retailersError,
  } = useQuery({
    queryKey: ['retailer-unsorted-data', selectedState, selectedDistrict, selectedCity],
    queryFn: async () => {
      const normalizedState = selectedState.trim();
      const normalizedDistrict = selectedDistrict.trim();
      const normalizedCity = selectedCity.trim();

      const { data, error } = await supabase
        .from('retailer_external_unsorted' as any)
        .select('*')
        .eq('state', normalizedState)
        .eq('district', normalizedDistrict)
        .eq('city', normalizedCity)
        .limit(500);

      if (error) throw error;

      return (data || []).sort((a: any, b: any) =>
        (a.company_name || '').localeCompare(b.company_name || '')
      );
    },
    enabled: !!selectedState && !!selectedDistrict && !!selectedCity,
    staleTime: 10 * 60 * 1000,
  });

  const handleStateChange = (value: string) => {
    setSelectedState(value.trim());
    setSelectedDistrict('');
    setSelectedCity('');
    setSearchQuery('');
  };

  const handleDistrictChange = (value: string) => {
    setSelectedDistrict(value.trim());
    setSelectedCity('');
    setSearchQuery('');
  };

  const handleCityChange = (value: string) => {
    setSelectedCity(value.trim());
    setSearchQuery('');
  };

  const filteredRetailers = retailers.filter((r: any) =>
    !searchQuery ||
    (r.company_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.village || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Search Uncategorized Retailers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Select State</label>
              <SearchableSelect
                value={selectedState}
                onValueChange={handleStateChange}
                options={states}
                placeholder={statesLoading ? "Loading states..." : "Select State"}
                searchPlaceholder="Search state..."
                loading={statesLoading}
                labels={stateLabels}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Select District</label>
              <Select value={selectedDistrict} onValueChange={handleDistrictChange} disabled={!selectedState}>
                <SelectTrigger>
                  <SelectValue placeholder={
                    !selectedState ? "Select a state first" :
                    districtsLoading ? "Loading districts..." : "Select District"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {districts.map((district: string) => (
                    <SelectItem key={district} value={district}>{district}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Select City</label>
              <Select value={selectedCity} onValueChange={handleCityChange} disabled={!selectedDistrict}>
                <SelectTrigger>
                  <SelectValue placeholder={
                    !selectedDistrict ? "Select a district first" :
                    citiesLoading ? "Loading cities..." : "Select City"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((city: string) => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedCity && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-lg">
                Uncategorized Retailers in {selectedCity}, {selectedDistrict}, {selectedState}
                <Badge variant="secondary" className="ml-2">{filteredRetailers.length}</Badge>
              </CardTitle>
              {retailers.length > 0 && (
                <div className="w-64">
                  <SearchInput
                    placeholder="Filter results..."
                    value={searchQuery}
                    onChange={setSearchQuery}
                  />
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {retailersLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : retailersError ? (
              <p className="text-center text-destructive py-8">
                Failed to load retailers: {(retailersError as Error).message}
              </p>
            ) : filteredRetailers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No retailers found</p>
            ) : (
              <div className="space-y-2">
                {filteredRetailers.map((r: any, i: number) => (
                  <Card key={i} className="p-3">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{r.company_name || '—'}</p>
                      {r.latitude && r.longitude ? (
                        <a
                          href={`https://www.google.com/maps?q=${r.latitude},${r.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 text-[10px] text-primary hover:underline"
                        >
                          📍 {Number(r.latitude).toFixed(4)}, {Number(r.longitude).toFixed(4)}
                        </a>
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic">No GPS</span>
                      )}
                      {r.pincode && (
                        <Badge variant="outline" className="ml-auto text-[10px] px-1.5 py-0">{r.pincode}</Badge>
                      )}
                    </div>
                    {r.address && (
                      <p className="text-xs text-muted-foreground mt-1">📍 {r.address}</p>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                      {r.village && <span>{r.village}</span>}
                      {r.mobile && <span>📞 {r.mobile}</span>}
                      {r.category && (
                        <Badge variant="secondary" className="text-[10px] px-2 py-0.5">{r.category}</Badge>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
