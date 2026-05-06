import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  ChevronDown,
  Building2,
  Phone,
  Users,
  Truck,
  MapPin,
} from "lucide-react";
import type { DistributorType } from "@/hooks/useDistributorTypes";

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

interface TreeNode {
  distributor: Distributor;
  children: TreeNode[];
  resolvedType?: DistributorType;
}

interface Props {
  distributors: Distributor[];
  types: DistributorType[];
}

const statusColors: Record<string, string> = {
  initial_connect: "bg-gray-100 text-gray-800",
  evaluation: "bg-yellow-100 text-yellow-800",
  strong_candidate: "bg-blue-100 text-blue-800",
  documentation: "bg-purple-100 text-purple-800",
  onboarded: "bg-green-100 text-green-800",
  active: "bg-green-100 text-green-800",
  inactive: "bg-red-100 text-red-800",
  drop: "bg-red-100 text-red-800",
};

const partnershipColors: Record<string, string> = {
  platinum: "bg-gradient-to-r from-slate-400 to-slate-600 text-white",
  gold: "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white",
  silver: "bg-gradient-to-r from-gray-300 to-gray-500 text-white",
  registered: "bg-gray-100 text-gray-800",
};

const levelColors = [
  "border-l-primary",
  "border-l-blue-500",
  "border-l-emerald-500",
  "border-l-amber-500",
  "border-l-purple-500",
];

function buildTree(distributors: Distributor[], types: DistributorType[]): TreeNode[] {
  const resolveType = (d: Distributor) => {
    if (d.type_id) return types.find((t) => t.id === d.type_id);
    return types.find((t) => t.legacy_mapping === d.distribution_level);
  };

  const nodeMap = new Map<string, TreeNode>();
  distributors.forEach((d) => {
    nodeMap.set(d.id, {
      distributor: d,
      children: [],
      resolvedType: resolveType(d),
    });
  });

  const roots: TreeNode[] = [];
  distributors.forEach((d) => {
    const node = nodeMap.get(d.id)!;
    if (d.parent_id && nodeMap.has(d.parent_id)) {
      nodeMap.get(d.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  // Sort children by type level then name
  const sortChildren = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      const levelA = a.resolvedType?.level ?? 99;
      const levelB = b.resolvedType?.level ?? 99;
      if (levelA !== levelB) return levelA - levelB;
      return a.distributor.name.localeCompare(b.distributor.name);
    });
    nodes.forEach((n) => sortChildren(n.children));
  };
  sortChildren(roots);

  return roots;
}

function formatStatus(status: string) {
  return status?.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) || "Unknown";
}

function TreeNodeCard({
  node,
  depth,
  defaultExpanded,
}: {
  node: TreeNode;
  depth: number;
  defaultExpanded: boolean;
}) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const d = node.distributor;
  const hasChildren = node.children.length > 0;
  const colorClass = levelColors[depth % levelColors.length];

  return (
    <div className="relative">
      {/* Connector line */}
      {depth > 0 && (
        <div
          className="absolute top-5 h-px bg-border"
          style={{ left: -16, width: 16 }}
        />
      )}

      <Card
        className={cn(
          "border-l-4 transition-shadow hover:shadow-md cursor-pointer",
          colorClass
        )}
      >
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-start gap-2">
            {/* Expand toggle */}
            {hasChildren ? (
              <button
                className="mt-0.5 p-0.5 rounded hover:bg-muted shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(!expanded);
                }}
              >
                {expanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            ) : (
              <div className="w-5 shrink-0" />
            )}

            {/* Content */}
            <div
              className="flex-1 min-w-0"
              onClick={() => navigate(`/distributor/${d.id}`)}
            >
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">
                    {d.name}
                  </h3>
                  <div className="flex items-center gap-1.5 flex-wrap mt-1">
                    {node.resolvedType && (
                      <Badge variant="outline" className="text-xs">
                        {node.resolvedType.name}
                      </Badge>
                    )}
                    {d.partnership_status && (
                      <Badge
                        className={cn(
                          "text-xs",
                          partnershipColors[d.partnership_status] ||
                            "bg-muted text-muted-foreground"
                        )}
                      >
                        {d.partnership_status.charAt(0).toUpperCase() +
                          d.partnership_status.slice(1)}
                      </Badge>
                    )}
                    {hasChildren && (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <Users className="h-3 w-3" />
                        {node.children.length} sub
                      </Badge>
                    )}
                  </div>
                </div>
                <Badge
                  className={cn(
                    "flex-shrink-0 text-xs",
                    statusColors[d.status] || "bg-muted text-muted-foreground"
                  )}
                >
                  {formatStatus(d.status)}
                </Badge>
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2 flex-wrap">
                {d.contact_person && <span>{d.contact_person}</span>}
                {d.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {d.phone}
                  </span>
                )}
                {d.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate max-w-[200px]">{d.address}</span>
                  </span>
                )}
                {d.network_retailers_count !== null && (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {d.network_retailers_count} retailers
                  </span>
                )}
                {(d.assets_vans || d.assets_trucks) && (
                  <span className="flex items-center gap-1">
                    <Truck className="h-3 w-3" />
                    {(d.assets_vans || 0) + (d.assets_trucks || 0)} vehicles
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Children */}
      {expanded && hasChildren && (
        <div className="ml-6 mt-2 space-y-2 relative before:absolute before:left-[-8px] before:top-0 before:bottom-4 before:w-px before:bg-border">
          {node.children.map((child) => (
            <TreeNodeCard
              key={child.distributor.id}
              node={child}
              depth={depth + 1}
              defaultExpanded={depth < 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function DistributorHierarchyTree({ distributors, types }: Props) {
  const tree = useMemo(() => buildTree(distributors, types), [distributors, types]);

  if (tree.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground font-medium">No distributors found</p>
        </CardContent>
      </Card>
    );
  }

  // Summary counts by type
  const typeCounts = new Map<string, number>();
  distributors.forEach((d) => {
    const t = d.type_id
      ? types.find((t) => t.id === d.type_id)
      : types.find((t) => t.legacy_mapping === d.distribution_level);
    const label = t?.name || "Untyped";
    typeCounts.set(label, (typeCounts.get(label) || 0) + 1);
  });

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {Array.from(typeCounts.entries()).map(([label, count]) => (
          <Badge key={label} variant="outline" className="text-xs gap-1">
            {label}: <span className="font-bold">{count}</span>
          </Badge>
        ))}
        <Badge variant="secondary" className="text-xs gap-1">
          Total: <span className="font-bold">{distributors.length}</span>
        </Badge>
      </div>

      {/* Tree */}
      <div className="space-y-3">
        {tree.map((node) => (
          <TreeNodeCard
            key={node.distributor.id}
            node={node}
            depth={0}
            defaultExpanded={true}
          />
        ))}
      </div>
    </div>
  );
}
