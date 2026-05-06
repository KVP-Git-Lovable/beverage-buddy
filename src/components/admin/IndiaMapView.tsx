import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { INDIA_STATES, SVG_WIDTH, SVG_HEIGHT } from '@/data/indiaStatesGeo';
import { gdiIndexData } from '@/data/gdiIndexData';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

const LAKSHADWEEP_DOTS = [
  { cx: 137.7, cy: 725.8 }, { cx: 124.0, cy: 728.6 }, { cx: 145.2, cy: 731.6 },
  { cx: 121.9, cy: 738.9 }, { cx: 138.2, cy: 740.9 }, { cx: 127.7, cy: 745.7 },
  { cx: 126.7, cy: 745.9 }, { cx: 162.8, cy: 749.2 }, { cx: 123.6, cy: 749.4 },
  { cx: 135.9, cy: 755.7 }, { cx: 162.4, cy: 766.8 }, { cx: 127.7, cy: 767.3 },
  { cx: 161.6, cy: 769.1 }, { cx: 126.7, cy: 769.6 }, { cx: 145.4, cy: 816.2 },
];

type MapMode = 'retailers' | 'hdi' | 'health' | 'living';

interface IndiaMapViewProps {
  rpcName?: string;
}

interface StateAnalytics {
  state_name: string;
  total_districts: number;
  total_pincodes: number;
  total_retailers: number;
  converted_retailers: number;
}

interface TooltipData {
  x: number;
  y: number;
  name: string;
  analytics: StateAnalytics | null;
  indexValue?: number | null;
}

// Map GDI state keys (lowercase) to INDIA_STATES dbName (uppercase)
const GDI_TO_DB_NAME: Record<string, string> = {
  'andaman and nicobar islands': 'ANDAMAN AND NICOBAR',
  'andhra pradesh': 'ANDHRA PRADESH',
  'arunachal pradesh': 'ARUNACHAL PRADESH',
  'assam': 'ASSAM',
  'bihar': 'BIHAR',
  'chandigarh': 'CHANDIGARH',
  'chhattisgarh': 'CHHATTISGARH',
  'dadra and nagar haveli and daman and diu': 'DADRA AND NAGAR HAVELI',
  'the dadra and nagar haveli and daman and diu': 'DADRA AND NAGAR HAVELI',
  'delhi': 'DELHI',
  'goa': 'GOA',
  'gujarat': 'GUJARAT',
  'haryana': 'HARYANA',
  'himachal pradesh': 'HIMACHAL PRADESH',
  'jammu and kashmir': 'JAMMU AND KASHMIR',
  'jharkhand': 'JHARKHAND',
  'karnataka': 'KARNATAKA',
  'kerala': 'KERALA',
  'ladakh': 'LADAKH',
  'lakshadweep': 'LAKSHADWEEP',
  'madhya pradesh': 'MADHYA PRADESH',
  'maharashtra': 'MAHARASHTRA',
  'manipur': 'MANIPUR',
  'meghalaya': 'MEGHALAYA',
  'mizoram': 'MIZORAM',
  'nagaland': 'NAGALAND',
  'odisha': 'ODISHA',
  'puducherry': 'PUDUCHERRY',
  'punjab': 'PUNJAB',
  'rajasthan': 'RAJASTHAN',
  'sikkim': 'SIKKIM',
  'tamil nadu': 'TAMIL NADU',
  'telangana': 'TELANGANA',
  'tripura': 'TRIPURA',
  'uttar pradesh': 'UTTAR PRADESH',
  'uttarakhand': 'UTTARAKHAND',
  'west bengal': 'WEST BENGAL',
};

interface StateIndexAverages {
  hdi: number;
  healthIndex: number;
  standardOfLivingIndex: number;
  districtCount: number;
}

// Official state-level composite indices (2023–24) from reputed sources.
// These override the district-mean aggregation when present, so the state
// number on the map matches published composite figures rather than a simple
// average of older district-level data.
const STATE_INDEX_OVERRIDES: Record<string, Pick<StateIndexAverages, 'hdi' | 'healthIndex' | 'standardOfLivingIndex'>> = {
  'KARNATAKA': { hdi: 0.764, healthIndex: 0.785, standardOfLivingIndex: 0.762 },
};

function computeStateIndexAverages(): Record<string, StateIndexAverages> {
  const result: Record<string, StateIndexAverages> = {};
  for (const [gdiState, districts] of Object.entries(gdiIndexData)) {
    const dbName = GDI_TO_DB_NAME[gdiState];
    if (!dbName) continue;
    // Deduplicate by using unique values
    const seen = new Set<string>();
    let hdiSum = 0, healthSum = 0, livingSum = 0, count = 0;
    for (const [distName, data] of Object.entries(districts)) {
      const key = `${data.hdi}-${data.healthIndex}-${data.standardOfLivingIndex}`;
      if (seen.has(key)) continue;
      seen.add(key);
      hdiSum += data.hdi;
      healthSum += data.healthIndex;
      livingSum += data.standardOfLivingIndex;
      count++;
    }
    if (count > 0) {
      // Merge into existing if multiple GDI keys map to same dbName
      if (result[dbName]) {
        const prev = result[dbName];
        const totalCount = prev.districtCount + count;
        result[dbName] = {
          hdi: (prev.hdi * prev.districtCount + hdiSum) / totalCount,
          healthIndex: (prev.healthIndex * prev.districtCount + healthSum) / totalCount,
          standardOfLivingIndex: (prev.standardOfLivingIndex * prev.districtCount + livingSum) / totalCount,
          districtCount: totalCount,
        };
      } else {
        result[dbName] = {
          hdi: hdiSum / count,
          healthIndex: healthSum / count,
          standardOfLivingIndex: livingSum / count,
          districtCount: count,
        };
      }
    }
  }
  // Apply official state-level overrides
  for (const [dbName, override] of Object.entries(STATE_INDEX_OVERRIDES)) {
    const prev = result[dbName];
    result[dbName] = {
      hdi: override.hdi,
      healthIndex: override.healthIndex,
      standardOfLivingIndex: override.standardOfLivingIndex,
      districtCount: prev?.districtCount ?? 0,
    };
  }
  return result;
}

const RETAILER_HEATMAP_COLORS = [
  'hsl(var(--muted))',     // 0 (no data)
  'hsl(28 92% 55%)',       // < 500           — Low (orange)
  'hsl(95 55% 75%)',       // 500 – 2,000     — light green
  'hsl(110 55% 55%)',      // 2,000 – 5,000   — green
  'hsl(130 60% 40%)',      // 5,000 – 10,000  — deeper green
  'hsl(142 75% 25%)',      // ≥ 10,000        — High (dark green)
];

// Absolute-threshold buckets so sparsely-covered states always read as "Low",
// regardless of the maximum value in the dataset.
//   < 500            → Low (orange)
//   500 – 2,000      → light green
//   2,000 – 5,000    → green
//   5,000 – 10,000   → deeper green
//   ≥ 10,000         → darkest green (High)
function getRetailerHeatmapColor(count: number, _maxCount: number): string {
  if (count <= 0) return RETAILER_HEATMAP_COLORS[0];
  if (count < 500) return RETAILER_HEATMAP_COLORS[1];
  if (count < 2000) return RETAILER_HEATMAP_COLORS[2];
  if (count < 5000) return RETAILER_HEATMAP_COLORS[3];
  if (count < 10000) return RETAILER_HEATMAP_COLORS[4];
  return RETAILER_HEATMAP_COLORS[5];
}

// Red-Yellow-Green gradient for 0-1 index values
const INDEX_COLORS = [
  'hsl(var(--muted))',     // no data
  'hsl(0 70% 50%)',        // very low (red)
  'hsl(25 80% 50%)',       // low (orange)
  'hsl(45 90% 50%)',       // medium-low (yellow)
  'hsl(80 60% 45%)',       // medium-high (lime)
  'hsl(142 70% 35%)',      // high (green)
];

function getIndexColor(value: number | undefined): string {
  if (value === undefined || value === 0) return INDEX_COLORS[0];
  if (value < 0.45) return INDEX_COLORS[1];
  if (value < 0.55) return INDEX_COLORS[2];
  if (value < 0.65) return INDEX_COLORS[3];
  if (value < 0.75) return INDEX_COLORS[4];
  return INDEX_COLORS[5];
}

const MAP_MODE_CONFIG: Record<MapMode, { label: string; shortLabel: string; legendText: string }> = {
  retailers: { label: 'States by External Retailer Density', shortLabel: 'Retailer Density', legendText: 'Retailer Density' },
  hdi: { label: 'States by Average HDI', shortLabel: 'Avg HDI', legendText: 'HDI (0–1)' },
  health: { label: 'States by Average Health Index', shortLabel: 'Avg Health', legendText: 'Health Index (0–1)' },
  living: { label: 'States by Standard of Living Index', shortLabel: 'Std of Living', legendText: 'Standard of Living (0–1)' },
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.5;

export const IndiaMapView: React.FC<IndiaMapViewProps> = ({ rpcName = 'get_state_analytics' }) => {
  const [analytics, setAnalytics] = useState<Record<string, StateAnalytics>>({});
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [mapMode, setMapMode] = useState<MapMode>('retailers');

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const stateIndexAverages = useMemo(() => computeStateIndexAverages(), []);

  useEffect(() => {
    let cancelled = false;
    const fetchAnalytics = async (showLoading = false) => {
      if (showLoading) setLoading(true);
      try {
        const { data, error } = await (supabase as any).rpc(rpcName);
        if (error) throw error;
        if (cancelled) return;
        const map: Record<string, StateAnalytics> = {};
        (data || []).forEach((row: StateAnalytics) => { map[row.state_name] = row; });
        setAnalytics(map);
      } catch (err) {
        console.error('Failed to fetch state analytics:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAnalytics(true);

    // Auto-refresh every 30 minutes to pick up newly added retailers
    const REFRESH_MS = 30 * 60 * 1000;
    const intervalId = window.setInterval(() => fetchAnalytics(false), REFRESH_MS);

    // Refetch when tab becomes visible again (so stale tabs catch up immediately)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') fetchAnalytics(false);
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [rpcName]);

  const maxRetailers = useMemo(() => {
    const vals = Object.values(analytics).map(a => a.total_retailers);
    return Math.max(...vals, 1);
  }, [analytics]);

  const getFillColor = useCallback((dbName: string): string => {
    if (mapMode === 'retailers') {
      const data = analytics[dbName];
      return getRetailerHeatmapColor(data?.total_retailers || 0, maxRetailers);
    }
    const indexData = stateIndexAverages[dbName];
    if (!indexData) return INDEX_COLORS[0];
    const value = mapMode === 'hdi' ? indexData.hdi
      : mapMode === 'health' ? indexData.healthIndex
      : indexData.standardOfLivingIndex;
    return getIndexColor(value);
  }, [mapMode, analytics, maxRetailers, stateIndexAverages]);

  const getIndexValueForState = useCallback((dbName: string): number | null => {
    const indexData = stateIndexAverages[dbName];
    if (!indexData) return null;
    if (mapMode === 'hdi') return indexData.hdi;
    if (mapMode === 'health') return indexData.healthIndex;
    if (mapMode === 'living') return indexData.standardOfLivingIndex;
    return null;
  }, [mapMode, stateIndexAverages]);

  const handleMouseMoveSvg = useCallback((e: React.MouseEvent, stateName: string, dbName: string) => {
    const rect = e.currentTarget.closest('svg')?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({
      x: e.clientX - rect.left + 15,
      y: e.clientY - rect.top - 10,
      name: stateName,
      analytics: analytics[dbName] || null,
      indexValue: mapMode !== 'retailers' ? getIndexValueForState(dbName) : null,
    });
    setHoveredState(dbName);
  }, [analytics, mapMode, getIndexValueForState]);

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
    setHoveredState(null);
  }, []);

  const zoomIn = useCallback(() => setZoom(z => Math.min(z + ZOOM_STEP, MAX_ZOOM)), []);
  const zoomOut = useCallback(() => {
    setZoom(z => {
      const next = Math.max(z - ZOOM_STEP, MIN_ZOOM);
      if (next === MIN_ZOOM) setPan({ x: 0, y: 0 });
      return next;
    });
  }, []);
  const resetView = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) zoomIn();
    else zoomOut();
  }, [zoomIn, zoomOut]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (zoom <= 1) return;
    isPanning.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [zoom]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setPan(p => ({ x: p.x + dx, y: p.y + dy }));
  }, []);

  const handlePointerUp = useCallback(() => { isPanning.current = false; }, []);

  const currentConfig = MAP_MODE_CONFIG[mapMode];
  const legendColors = mapMode === 'retailers' ? RETAILER_HEATMAP_COLORS.slice(1) : INDEX_COLORS.slice(1);

  const averageDisplay = useMemo(() => {
    if (mapMode === 'retailers') {
      const vals = Object.values(analytics).map(a => a.total_retailers).filter(v => v > 0);
      if (vals.length === 0) return null;
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      return { label: 'Avg Retailers/State', value: Math.round(avg).toLocaleString() };
    }
    const key: keyof StateIndexAverages =
      mapMode === 'hdi' ? 'hdi' : mapMode === 'health' ? 'healthIndex' : 'standardOfLivingIndex';
    const vals = Object.values(stateIndexAverages).map(s => s[key] as number).filter(v => v > 0);
    if (vals.length === 0) return null;
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    const labelMap = { hdi: 'Avg HDI', health: 'Avg Health', living: 'Avg Std of Living' } as const;
    return { label: labelMap[mapMode as 'hdi' | 'health' | 'living'], value: avg.toFixed(3) };
  }, [mapMode, analytics, stateIndexAverages]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Average pill (top-right, left of zoom controls) */}
      {averageDisplay && (
        <div className="absolute top-3 right-14 z-10 flex items-center gap-1.5 bg-background/90 backdrop-blur-sm border border-border rounded-full px-3 py-1 shadow-sm">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{averageDisplay.label}</span>
          <span className="text-xs font-semibold text-foreground">{averageDisplay.value}</span>
        </div>
      )}

      {/* Zoom controls */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
        <Button variant="outline" size="icon" className="h-8 w-8 bg-background/90 backdrop-blur-sm" onClick={zoomIn} disabled={zoom >= MAX_ZOOM}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8 bg-background/90 backdrop-blur-sm" onClick={zoomOut} disabled={zoom <= MIN_ZOOM}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8 bg-background/90 backdrop-blur-sm" onClick={resetView} disabled={zoom === 1}>
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-hidden flex items-center justify-center p-4"
        style={{ cursor: zoom > 1 ? 'grab' : 'default' }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <svg
          viewBox={`-10 -10 ${SVG_WIDTH + 20} ${SVG_HEIGHT + 20}`}
          className="w-full h-full max-h-[75vh]"
          style={{
            maxWidth: SVG_WIDTH,
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            transformOrigin: 'center center',
            transition: isPanning.current ? 'none' : 'transform 0.2s ease-out',
          }}
        >
          {/* International border outline */}
          <g>
            {INDIA_STATES.map((state) => (
              <path
                key={`outline-${state.dbName}`}
                d={state.path}
                fill="none"
                stroke="#000000"
                strokeWidth={2.5}
                strokeLinejoin="round"
                pointerEvents="none"
              />
            ))}
          </g>

          {/* State fills */}
          {INDIA_STATES.filter(s => s.dbName !== 'LAKSHADWEEP').map((state) => {
            const isHovered = hoveredState === state.dbName;
            return (
              <path
                key={state.dbName}
                d={state.path}
                fill={getFillColor(state.dbName)}
                stroke={isHovered ? 'hsl(var(--primary))' : 'hsl(var(--border))'}
                strokeWidth={isHovered ? 2 : 0.5}
                className="transition-all duration-150 cursor-pointer"
                onMouseMove={(e) => handleMouseMoveSvg(e, state.name, state.dbName)}
                onMouseLeave={handleMouseLeave}
              />
            );
          })}

          {/* Lakshadweep dots */}
          {LAKSHADWEEP_DOTS.map((dot, i) => (
            <circle
              key={`lakshadweep-dot-${i}`}
              cx={dot.cx}
              cy={dot.cy}
              r={3}
              fill="#000000"
              stroke="#000000"
              strokeWidth={1}
              className="cursor-pointer"
              onMouseMove={(e) => handleMouseMoveSvg(e, 'Lakshadweep', 'LAKSHADWEEP')}
              onMouseLeave={handleMouseLeave}
            />
          ))}
          <text x={143} y={780} fontSize={8} fill="#000000" textAnchor="middle" fontWeight="bold" pointerEvents="none">
            Lakshadweep
          </text>
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <Card
            className="absolute pointer-events-none z-50 p-3 shadow-lg border bg-popover text-popover-foreground min-w-[200px]"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            <p className="font-semibold text-sm mb-2">{tooltip.name}</p>
            {mapMode === 'retailers' ? (
              tooltip.analytics ? (
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Districts</span>
                    <span className="font-medium">{tooltip.analytics.total_districts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">PIN Codes</span>
                    <span className="font-medium">{tooltip.analytics.total_pincodes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">External Retailers</span>
                    <span className="font-medium">{tooltip.analytics.total_retailers.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Converted</span>
                    <span className="font-medium text-primary">{tooltip.analytics.converted_retailers.toLocaleString()}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No data available</p>
              )
            ) : (
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{currentConfig.shortLabel}</span>
                  <span className="font-medium">
                    {tooltip.indexValue !== null && tooltip.indexValue !== undefined
                      ? tooltip.indexValue.toFixed(3)
                      : 'N/A'}
                  </span>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Zoom indicator */}
      {zoom > 1 && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground bg-background/80 backdrop-blur-sm rounded-full px-2 py-0.5 border border-border">
          {Math.round(zoom * 100)}%
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-2 pb-2 text-xs text-muted-foreground">
        <span>{mapMode === 'retailers' ? 'Low' : '< 0.45'}</span>
        {legendColors.map((color, i) => (
          <div
            key={i}
            className="w-6 h-4 rounded border border-border"
            style={{ backgroundColor: color }}
          />
        ))}
        <span>{mapMode === 'retailers' ? 'High' : '> 0.75'}</span>
        <span className="ml-2">— {currentConfig.legendText}</span>
      </div>

      {/* Map mode selector */}
      <div className="flex items-center justify-center gap-2 pb-4 px-4 flex-wrap">
        {(Object.keys(MAP_MODE_CONFIG) as MapMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setMapMode(mode)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
              mapMode === mode
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground'
            }`}
          >
            {MAP_MODE_CONFIG[mode].shortLabel}
          </button>
        ))}
      </div>
    </div>
  );
};
