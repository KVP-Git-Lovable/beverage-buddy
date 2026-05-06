import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DistributorType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  level: number;
  parent_allowed: boolean;
  parent_type_code: string | null;
  sort_order: number;
  legacy_mapping: string | null;
}

export function useDistributorTypes() {
  const [types, setTypes] = useState<DistributorType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTypes = async () => {
      const { data, error } = await supabase
        .from("distributor_types")
        .select("*")
        .order("sort_order");

      if (!error && data) {
        setTypes(data as DistributorType[]);
      }
      setLoading(false);
    };

    fetchTypes();
  }, []);

  return { types, loading };
}
