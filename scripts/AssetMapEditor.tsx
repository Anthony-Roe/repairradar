// src/app/dashboard/components/AssetMapEditor.tsx
'use client';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  MapPin, Move, Square, Plus, Trash2, Save, Loader2, Info, 
  Undo2, Redo2, ZoomIn, ZoomOut, Maximize2, Minimize2, Type 
} from 'lucide-react';
import { Asset, Call, CallStatus } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { useHotkeys } from 'react-hotkeys-hook';

interface Zone {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  type: string;
  opacity: number;
}

interface FloorPlan {
  name: string;
  image: string;
  width: number;
  height: number;
  zones: Zone[];
  assetPositions: Record<string, { x: number; y: number; zoneId: string | null }>;
}

interface AssetMapEditorProps {
  assets: Asset[];
  calls: Call[];
}

const DEFAULT_ZONE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#6366f1'];
const ZONE_TYPES = ['Office', 'Storage', 'Lab', 'Utility', 'Hallway', 'Meeting', 'Restroom'];
const ZONE_ICONS = {
  'Office': '🖥️',
  'Storage': '📦',
  'Lab': '🔬',
  'Utility': '⚙️',
  'Hallway': '🚶',
  'Meeting': '👥',
  'Restroom': '🚻'
};
const ASSET_ICONS = ['🔧', '🖥️', '🔌', '💡', '🛠️', '📱', '💻', '🖨️', '🔋', '📶'];
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const DEFAULT_ZOOM = 1;

const ZoneComponent = ({
  zone,
  isSelected,
  isEditing,
  onSelect,
  onMouseDown,
  onDelete,
  zoomLevel,
  onTypeChange
}: {
  zone: Zone;
  isSelected: boolean;
  isEditing: boolean;
  onSelect: (id: string) => void;
  onMouseDown: (e: React.MouseEvent, type: 'zone' | 'asset' | 'resize', id: string, direction?: string) => void;
  onDelete: (id: string) => void;
  zoomLevel: number;
  onTypeChange: (id: string, type: string) => void;
}) => {
  const zoneStyle = {
    left: `${zone.x}%`,
    top: `${zone.y}%`,
    width: `${zone.width}%`,
    height: `${zone.height}%`,
    backgroundColor: `${zone.color}${Math.floor(zone.opacity * 255).toString(16).padStart(2, '0')}`,
    borderColor: zone.color,
    borderWidth: `${Math.max(1, 2 * zoomLevel)}px`,
    borderRadius: `${Math.max(4, 6 * zoomLevel)}px`,
  };

  return (
    <div 
      className={`absolute flex flex-col transition-all duration-200
        ${isSelected ? 'ring-2 ring-offset-2 ring-blue-500 z-20 shadow-lg' : 'z-10'}
        ${isEditing ? 'cursor-move hover:bg-opacity-70' : ''}`}
      style={zoneStyle}
      onClick={() => isEditing && onSelect(zone.id)}
      onMouseDown={(e) => isEditing && onMouseDown(e, 'zone', zone.id)}
    >
      <div className="flex items-center justify-center h-full w-full relative p-1">
        {zoomLevel > 0.4 && (
          <div className="absolute top-1 left-1 bg-white/80 rounded-full p-1 text-xs">
            {ZONE_ICONS[zone.type as keyof typeof ZONE_ICONS] || '📍'}
          </div>
        )}
        {zoomLevel > 0.6 && (
          <div 
            className="text-sm font-medium p-1 bg-white/80 rounded text-center truncate max-w-full"
            style={{
              fontSize: `${Math.max(10, 12 * zoomLevel)}px`,
              padding: `${Math.max(2, 4 * zoomLevel)}px`
            }}
          >
            {zone.name}
          </div>
        )}
      </div>

      {isEditing && isSelected && (
        <>
          {['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map(dir => (
            <div
              key={dir}
              className={`absolute bg-white border border-gray-400 rounded-full cursor-${dir}-resize z-30`}
              style={{
                width: `${Math.max(8, 12 * zoomLevel)}px`,
                height: `${Math.max(8, 12 * zoomLevel)}px`,
                left: dir.includes('w') ? '0' : dir.includes('e') ? '100%' : '50%',
                top: dir.includes('n') ? '0' : dir.includes('s') ? '100%' : '50%',
                transform: 'translate(-50%, -50%)',
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                onMouseDown(e, 'resize', zone.id, dir);
              }}
            />
          ))}
          
          <div className="absolute -bottom-8 left-0 right-0 flex justify-center gap-1 z-30">
            <Select
              value={zone.type}
              onValueChange={(value) => onTypeChange(zone.id, value)}
            >
              <SelectTrigger className="h-6 w-24 text-xs">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                {ZONE_TYPES.map(type => (
                  <SelectItem key={type} value={type} className="text-xs">
                    {type} {ZONE_ICONS[type as keyof typeof ZONE_ICONS]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 rounded-full bg-white border shadow-sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(zone.id);
              }}
            >
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

const AssetMarker = ({
  asset,
  position,
  activeCalls,
  isSelected,
  isEditing,
  onClick,
  onMouseDown,
  zoomLevel,
  assetTypes,
  onDoubleClick
}: {
  asset: Asset;
  position: { x: number; y: number; zoneId: string | null };
  activeCalls: Call[];
  isSelected: boolean;
  isEditing: boolean;
  onClick: () => void;
  onMouseDown: (e: React.MouseEvent) => void;
  zoomLevel: number;
  assetTypes: Record<string, string>;
  onDoubleClick: () => void;
}) => {
  const markerSize = Math.max(24, 32 * zoomLevel);
  const pulseEffect = activeCalls.length > 0 ? 'animate-pulse' : '';
  const selectedEffect = isSelected ? 'ring-4 ring-blue-400 scale-125 z-20' : 'z-10';
  const statusColor = activeCalls.length > 0 ? '#ef4444' : 
                    asset.status === 'maintenance' ? '#f59e0b' : '#3b82f6';
  const borderColor = activeCalls.length > 0 ? '#dc2626' : 
                     asset.status === 'maintenance' ? '#d97706' : '#2563eb';

  return (
    <div
      className={`absolute rounded-full flex items-center justify-center cursor-pointer transition-all duration-200
        ${pulseEffect} ${selectedEffect}
        ${isEditing ? 'cursor-move hover:scale-110' : ''}`}
      style={{
        width: `${markerSize}px`,
        height: `${markerSize}px`,
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, -50%)',
        backgroundColor: statusColor,
        border: `${Math.max(2, 3 * zoomLevel)}px solid ${borderColor}`,
        boxShadow: isSelected ? '0 0 0 3px rgba(59, 130, 246, 0.5)' : 'none'
      }}
      onClick={onClick}
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
    >
      <div className="relative flex flex-col items-center">
        <span 
          className="font-bold text-white"
          style={{ fontSize: `${Math.max(10, 12 * zoomLevel)}px` }}
        >
          {assetTypes[asset.type] || asset.name.charAt(0)}
        </span>
        {activeCalls.length > 0 && (
          <span 
            className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full flex items-center justify-center"
            style={{
              width: `${Math.max(16, 20 * zoomLevel)}px`,
              height: `${Math.max(16, 20 * zoomLevel)}px`,
              fontSize: `${Math.max(8, 10 * zoomLevel)}px`
            }}
          >
            {activeCalls.length}
          </span>
        )}
      </div>
    </div>
  );
};

export default function AssetMapEditor({ assets, calls }: AssetMapEditorProps) {
  const [selectedFloor, setSelectedFloor] = useState<string>('ground');
  const [floorPlans, setFloorPlans] = useState<Record<string, FloorPlan>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [newZoneName, setNewZoneName] = useState('');
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [history, setHistory] = useState<FloorPlan[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [zoomLevel, setZoomLevel] = useState(DEFAULT_ZOOM);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [assetTypes, setAssetTypes] = useState<Record<string, string>>({});
  const [zoneType, setZoneType] = useState('Office');
  const [zoneOpacity, setZoneOpacity] = useState(70);
  const [showAssetLabels, setShowAssetLabels] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{
    type: 'zone' | 'asset' | 'resize' | 'pan';
    id: string;
    startX: number;
    startY: number;
    initialData: any;
    resizeDirection?: string;
  } | null>(null);

  // Initialize asset types and floor plans
  useEffect(() => {
    const loadData = async () => {
      try {
        // Generate unique icons for asset types
        const types: Record<string, string> = {};
        const uniqueTypes = [...new Set(assets.map(a => a.type))];
        
        uniqueTypes.forEach((type, i) => {
          types[type] = ASSET_ICONS[i % ASSET_ICONS.length];
        });
        
        setAssetTypes(types);

        // Load floor plans
        const savedPlans = await getFloorPlan();
        if (savedPlans) {
          setFloorPlans(savedPlans);
          setHistory([savedPlans[selectedFloor] || createDefaultFloorPlan()]);
          setHistoryIndex(0);
        } else {
          const defaultPlan = createDefaultFloorPlan();
          setFloorPlans({ ground: defaultPlan });
          setHistory([defaultPlan]);
          setHistoryIndex(0);
        }
      } catch (error) {
        toast.error('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [selectedFloor, assets]);

  const createDefaultFloorPlan = (): FloorPlan => ({
    name: 'Ground Floor',
    image: '/floor-plans/ground-floor.png',
    width: 800,
    height: 600,
    zones: [],
    assetPositions: {}
  });

  const currentFloor = useMemo(() => {
    return floorPlans[selectedFloor] || createDefaultFloorPlan();
  }, [floorPlans, selectedFloor]);

  const updateHistory = useCallback((newPlan: FloorPlan) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newPlan);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  // Zoom and pan handlers
  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(MAX_ZOOM, prev + 0.1));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(MIN_ZOOM, prev - 0.1));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoomLevel(DEFAULT_ZOOM);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  const handleZoomToFit = useCallback(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;
    
    const contentWidth = currentFloor.width * DEFAULT_ZOOM;
    const contentHeight = currentFloor.height * DEFAULT_ZOOM;
    
    const scale = Math.min(
      containerWidth / contentWidth,
      containerHeight / contentHeight,
      MAX_ZOOM
    );
    
    setZoomLevel(scale);
    setPanOffset({ x: 0, y: 0 });
  }, [currentFloor]);

  const handlePanStart = useCallback((e: React.MouseEvent) => {
    if (!isEditing && containerRef.current) {
      e.preventDefault();
      setIsPanning(true);
      dragStateRef.current = {
        type: 'pan',
        id: 'map',
        startX: e.clientX - panOffset.x,
        startY: e.clientY - panOffset.y,
        initialData: panOffset
      };
    }
  }, [isEditing, panOffset]);

  const handlePanMove = useCallback((e: MouseEvent) => {
    if (isPanning && dragStateRef.current) {
      e.preventDefault();
      const newX = e.clientX - dragStateRef.current.startX;
      const newY = e.clientY - dragStateRef.current.startY;
      setPanOffset({ x: newX, y: newY });
    }
  }, [isPanning]);

  const handlePanEnd = useCallback(() => {
    setIsPanning(false);
    dragStateRef.current = null;
  }, []);

  useEffect(() => {
    if (isPanning) {
      window.addEventListener('mousemove', handlePanMove);
      window.addEventListener('mouseup', handlePanEnd);
      return () => {
        window.removeEventListener('mousemove', handlePanMove);
        window.removeEventListener('mouseup', handlePanEnd);
      };
    }
  }, [isPanning, handlePanMove, handlePanEnd]);

  // Editing handlers
  const handleMouseDown = useCallback((e: React.MouseEvent, type: 'zone' | 'asset' | 'resize', id: string, direction?: string) => {
    if (!isEditing || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    dragStateRef.current = {
      type,
      id,
      startX: e.clientX,
      startY: e.clientY,
      initialData: type === 'zone' || type === 'resize'
        ? currentFloor.zones.find(z => z.id === id)
        : currentFloor.assetPositions[id] || { x: 0, y: 0, zoneId: null },
      resizeDirection: direction
    };

    e.stopPropagation();
    e.preventDefault();
  }, [isEditing, currentFloor]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragStateRef.current || !containerRef.current) return;

    const { type, id, startX, startY, initialData, resizeDirection } = dragStateRef.current;
    const rect = containerRef.current.getBoundingClientRect();
    const deltaX = ((e.clientX - startX) / rect.width) * 100;
    const deltaY = ((e.clientY - startY) / rect.height) * 100;

    setFloorPlans(prev => {
      const currentFloorPlan = prev[selectedFloor] || { ...currentFloor };
      let newPlan = { ...currentFloorPlan };
      
      if (type === 'zone' || type === 'resize') {
        newPlan.zones = [...newPlan.zones];
        const zoneIndex = newPlan.zones.findIndex(z => z.id === id);
        if (zoneIndex === -1) return prev;

        let { x, y, width, height } = newPlan.zones[zoneIndex];
        
        if (type === 'resize' && resizeDirection) {
          if (resizeDirection.includes('n')) {
            const newHeight = Math.max(5, initialData.height - deltaY);
            y = initialData.y + (initialData.height - newHeight);
            height = newHeight;
          }
          if (resizeDirection.includes('s')) height = Math.max(5, initialData.height + deltaY);
          if (resizeDirection.includes('w')) {
            const newWidth = Math.max(5, initialData.width - deltaX);
            x = initialData.x + (initialData.width - newWidth);
            width = newWidth;
          }
          if (resizeDirection.includes('e')) width = Math.max(5, initialData.width + deltaX);
        } else if (type === 'zone') {
          x = Math.max(0, Math.min(100 - width, initialData.x + deltaX));
          y = Math.max(0, Math.min(100 - height, initialData.y + deltaY));
        }

        newPlan.zones[zoneIndex] = { ...newPlan.zones[zoneIndex], x, y, width, height };
      } else if (type === 'asset') {
        const newX = Math.max(0, Math.min(100, initialData.x + deltaX));
        const newY = Math.max(0, Math.min(100, initialData.y + deltaY));
        
        newPlan.assetPositions = {
          ...newPlan.assetPositions,
          [id]: { x: newX, y: newY, zoneId: getZoneAtPosition(newPlan, newX, newY) }
        };
      }

      return { ...prev, [selectedFloor]: newPlan };
    });
  }, [selectedFloor, currentFloor]);

  const handleMouseUp = useCallback(() => {
    if (dragStateRef.current) updateHistory(currentFloor);
    dragStateRef.current = null;
  }, [currentFloor, updateHistory]);

  useEffect(() => {
    if (isEditing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isEditing, handleMouseMove, handleMouseUp]);

  const getZoneAtPosition = (floor: FloorPlan, x: number, y: number) => {
    return floor.zones.find(z => 
      x >= z.x && x <= z.x + z.width && 
      y >= z.y && y <= z.y + z.height
    )?.id || null;
  };

  const addZone = () => {
    if (!newZoneName.trim()) {
      toast.error('Please enter a zone name');
      return;
    }

    const newZone: Zone = {
      id: `zone-${Date.now()}`,
      name: newZoneName,
      x: 10,
      y: 10,
      width: 20,
      height: 15,
      color: DEFAULT_ZONE_COLORS[Math.floor(Math.random() * DEFAULT_ZONE_COLORS.length)],
      type: zoneType,
      opacity: zoneOpacity / 100
    };

    const newPlan = {
      ...currentFloor,
      zones: [...currentFloor.zones, newZone]
    };

    setFloorPlans(prev => ({ ...prev, [selectedFloor]: newPlan }));
    updateHistory(newPlan);
    setNewZoneName('');
    setSelectedZone(newZone.id);
  };

  const deleteZone = (zoneId: string) => {
    if (!confirm('Are you sure you want to delete this zone?')) return;

    const newPlan = {
      ...currentFloor,
      zones: currentFloor.zones.filter(z => z.id !== zoneId),
      assetPositions: Object.fromEntries(
        Object.entries(currentFloor.assetPositions)
          .map(([id, pos]) => [id, { ...pos, zoneId: pos.zoneId === zoneId ? null : pos.zoneId }])
      )
    };

    setFloorPlans(prev => ({ ...prev, [selectedFloor]: newPlan }));
    updateHistory(newPlan);
    setSelectedZone(null);
  };

  const updateZoneType = (zoneId: string, type: string) => {
    setFloorPlans(prev => {
      const currentFloorPlan = prev[selectedFloor] || { ...currentFloor };
      const zoneIndex = currentFloorPlan.zones.findIndex(z => z.id === zoneId);
      if (zoneIndex === -1) return prev;

      const newZones = [...currentFloorPlan.zones];
      newZones[zoneIndex] = { ...newZones[zoneIndex], type };

      return {
        ...prev,
        [selectedFloor]: {
          ...currentFloorPlan,
          zones: newZones
        }
      };
    });
  };

  const savePlans = async () => {
    setIsSaving(true);
    try {
      await saveFloorPlan(floorPlans);
      toast.success('Floor plans saved successfully');
      setIsEditing(false);
    } catch (error) {
      toast.error('Failed to save floor plans');
    } finally {
      setIsSaving(false);
    }
  };

  const getActiveCalls = (assetId: string) => {
    return calls.filter(call => 
      call.assetId === assetId && 
      call.status !== CallStatus.CLOSED
    );
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isEditing) return;

    // Handle zone movement/resizing
    if (selectedZone) {
      setFloorPlans(prev => {
        const currentFloorPlan = prev[selectedFloor];
        const zoneIndex = currentFloorPlan.zones.findIndex(z => z.id === selectedZone);
        if (zoneIndex === -1) return prev;

        const zone = currentFloorPlan.zones[zoneIndex];
        let newX = zone.x;
        let newY = zone.y;
        let newWidth = zone.width;
        let newHeight = zone.height;

        // Arrow keys for movement
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          newX = Math.max(0, zone.x - 0.5);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          newX = Math.min(100 - zone.width, zone.x + 0.5);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          newY = Math.max(0, zone.y - 0.5);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          newY = Math.min(100 - zone.height, zone.y + 0.5);
        }

        // Shift + Arrow keys for resizing
        if (e.shiftKey) {
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            newWidth = Math.max(5, zone.width - 0.5);
          } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            newWidth = Math.min(100 - zone.x, zone.width + 0.5);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            newHeight = Math.max(5, zone.height - 0.5);
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            newHeight = Math.min(100 - zone.y, zone.height + 0.5);
          }
        }

        // Only update if something changed
        if (newX !== zone.x || newY !== zone.y || newWidth !== zone.width || newHeight !== zone.height) {
          const newZones = [...currentFloorPlan.zones];
          newZones[zoneIndex] = {
            ...zone,
            x: newX,
            y: newY,
            width: newWidth,
            height: newHeight
          };

          const newPlan = {
            ...currentFloorPlan,
            zones: newZones
          };

          updateHistory(newPlan);
          return {
            ...prev,
            [selectedFloor]: newPlan
          };
        }

        return prev;
      });
    }

    // Handle asset movement
    if (selectedAsset) {
      setFloorPlans(prev => {
        const currentFloorPlan = prev[selectedFloor];
        const position = currentFloorPlan.assetPositions[selectedAsset.id] || { x: 10, y: 10, zoneId: null };

        let newX = position.x;
        let newY = position.y;

        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          newX = Math.max(0, position.x - 0.5);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          newX = Math.min(100, position.x + 0.5);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          newY = Math.max(0, position.y - 0.5);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          newY = Math.min(100, position.y + 0.5);
        }

        // Only update if position changed
        if (newX !== position.x || newY !== position.y) {
          const newPlan = {
            ...currentFloorPlan,
            assetPositions: {
              ...currentFloorPlan.assetPositions,
              [selectedAsset.id]: {
                x: newX,
                y: newY,
                zoneId: getZoneAtPosition(currentFloorPlan, newX, newY)
              }
            }
          };

          updateHistory(newPlan);
          return {
            ...prev,
            [selectedFloor]: newPlan
          };
        }

        return prev;
      });
    }

    // Escape key to deselect
    if (e.key === 'Escape') {
      setSelectedZone(null);
      setSelectedAsset(null);
    }
  }, [isEditing, selectedZone, selectedAsset, selectedFloor, currentFloor, updateHistory]);

  // Hotkeys
  useHotkeys('ctrl+s, cmd+s', (e) => {
    e.preventDefault();
    if (isEditing) savePlans();
  }, { enabled: isEditing }, [isEditing, savePlans]);

  useHotkeys('ctrl+z, cmd+z', (e) => {
    e.preventDefault();
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setFloorPlans(prev => ({
        ...prev,
        [selectedFloor]: history[historyIndex - 1]
      }));
    }
  }, { enabled: isEditing }, [history, historyIndex, selectedFloor]);

  useHotkeys('ctrl+shift+z, cmd+shift+z', (e) => {
    e.preventDefault();
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setFloorPlans(prev => ({
        ...prev,
        [selectedFloor]: history[historyIndex + 1]
      }));
    }
  }, { enabled: isEditing }, [history, historyIndex, selectedFloor]);

  useHotkeys('+=, ctrl+=', (e) => {
    e.preventDefault();
    handleZoomIn();
  }, { preventDefault: true }, [handleZoomIn]);

  useHotkeys('-, ctrl+-', (e) => {
    e.preventDefault();
    handleZoomOut();
  }, { preventDefault: true }, [handleZoomOut]);

  useHotkeys('0, ctrl+0', (e) => {
    e.preventDefault();
    handleZoomReset();
  }, { preventDefault: true }, [handleZoomReset]);

  const toggleFullscreen = () => {
    if (!isFullscreen && mapContainerRef.current) {
      mapContainerRef.current.requestFullscreen().catch(err => {
        toast.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  if (isLoading) {
    return (
      <Card className="h-full flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </Card>
    );
  }

  return (
    <Card className={`h-full flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 m-0' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Asset Location Map
          </CardTitle>
          <div className="flex gap-2 flex-wrap">
            {isEditing ? (
              <>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => historyIndex > 0 && setHistoryIndex(prev => prev - 1)}
                      disabled={historyIndex <= 0}
                    >
                      <Undo2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => historyIndex < history.length - 1 && setHistoryIndex(prev => prev + 1)}
                      disabled={historyIndex >= history.length - 1}
                    >
                      <Redo2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Redo (Ctrl+Shift+Z)</TooltipContent>
                </Tooltip>
                <Button 
                  size="sm"
                  onClick={savePlans}
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                  Save (Ctrl+S)
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Move className="mr-2 h-4 w-4" />
                  Edit Map
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleFullscreen}
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
        
        <Tabs 
          value={selectedFloor} 
          onValueChange={setSelectedFloor}
          className="mt-2"
        >
          <TabsList className="flex flex-wrap">
            {Object.keys(floorPlans).map(floorKey => (
              <TabsTrigger key={floorKey} value={floorKey}>
                {floorPlans[floorKey].name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent className="flex-1 relative p-0" ref={mapContainerRef}>
        <div 
          ref={containerRef}
          className="relative bg-gray-50 rounded-md w-full h-full focus:outline-none"
          style={{ 
            transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
            transformOrigin: '0 0',
            transition: 'transform 0.2s ease-out',
            cursor: isPanning ? 'grabbing' : isEditing ? 'default' : 'grab'
          }}
          onMouseDown={handlePanStart}
          tabIndex={0}
          onKeyDown={handleKeyDown}
        >
          {/* Floor plan image with reduced opacity when editing */}
          <img 
            src={currentFloor.image} 
            alt={`${currentFloor.name} floor plan`} 
            className={`w-full h-full object-contain pointer-events-none ${isEditing ? 'opacity-50' : 'opacity-80'}`}
            draggable={false}
          />
          
          {/* Zones with improved visualization */}
          {currentFloor.zones.map(zone => (
            <ZoneComponent
              key={zone.id}
              zone={zone}
              isSelected={selectedZone === zone.id}
              isEditing={isEditing}
              onSelect={setSelectedZone}
              onMouseDown={handleMouseDown}
              onDelete={deleteZone}
              zoomLevel={zoomLevel}
              onTypeChange={updateZoneType}
            />
          ))}

          {/* Asset markers with type icons */}
          {assets.map(asset => {
            const position = currentFloor.assetPositions[asset.id] || { x: 10, y: 10, zoneId: null };
            const activeCalls = getActiveCalls(asset.id);
            
            return (
              <AssetMarker
                key={asset.id}
                asset={asset}
                position={position}
                activeCalls={activeCalls}
                isSelected={selectedAsset?.id === asset.id}
                isEditing={isEditing}
                onClick={() => !isEditing && setSelectedAsset(asset)}
                onMouseDown={(e) => isEditing && handleMouseDown(e, 'asset', asset.id)}
                zoomLevel={zoomLevel}
                assetTypes={assetTypes}
                onDoubleClick={() => {
                  // Center the asset in view when double-clicked
                  if (containerRef.current) {
                    const containerWidth = containerRef.current.offsetWidth;
                    const containerHeight = containerRef.current.offsetHeight;
                    const centerX = containerWidth / 2 - (position.x * containerWidth / 100 * zoomLevel);
                    const centerY = containerHeight / 2 - (position.y * containerHeight / 100 * zoomLevel);
                    setPanOffset({ x: centerX, y: centerY });
                  }
                }}
              />
            );
          })}

          {/* Enhanced editing controls */}
          {isEditing && (
            <div className="absolute top-4 left-4 bg-white/90 p-3 rounded-md shadow-sm border flex flex-col gap-3 w-[280px]">
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2 flex items-center gap-2">
                  <Square className="w-4 h-4" />
                  <span className="text-sm font-medium">Add Zone</span>
                </div>
                <Input
                  placeholder="Zone name"
                  value={newZoneName}
                  onChange={(e) => setNewZoneName(e.target.value)}
                  className="h-8 col-span-2"
                  onKeyDown={(e) => e.key === 'Enter' && addZone()}
                />
                <Select
                  value={zoneType}
                  onValueChange={setZoneType}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Zone type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ZONE_TYPES.map(type => (
                      <SelectItem key={type} value={type}>
                        {type} {ZONE_ICONS[type as keyof typeof ZONE_ICONS]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={addZone} className="h-8">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid gap-2">
                <Label className="flex items-center gap-2">
                  <span>Zone Opacity: {zoneOpacity}%</span>
                </Label>
                <Slider
                  value={[zoneOpacity]}
                  onValueChange={([value]) => setZoneOpacity(value)}
                  min={20}
                  max={100}
                  step={5}
                />
              </div>

              {selectedZone && (
                <div className="mt-2 pt-2 border-t">
                  <Label className="text-sm">Selected Zone</Label>
                  <div className="text-sm font-medium mt-1">
                    {currentFloor.zones.find(z => z.id === selectedZone)?.name}
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                    <div>
                      <Label className="text-xs">Position</Label>
                      <div>
                        X: {currentFloor.zones.find(z => z.id === selectedZone)?.x.toFixed(1)}%
                        <br />
                        Y: {currentFloor.zones.find(z => z.id === selectedZone)?.y.toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Size</Label>
                      <div>
                        W: {currentFloor.zones.find(z => z.id === selectedZone)?.width.toFixed(1)}%
                        <br />
                        H: {currentFloor.zones.find(z => z.id === selectedZone)?.height.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Zoom controls */}
          <div className="absolute bottom-4 right-4 bg-white/90 p-2 rounded-md shadow-sm border flex flex-col gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={handleZoomIn}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom In (Ctrl++)</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={handleZoomReset}>
                  <span className="text-xs">{Math.round(zoomLevel * 100)}%</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reset Zoom (Ctrl+0)</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={handleZoomOut}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom Out (Ctrl+-)</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={handleZoomToFit}>
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom to Fit</TooltipContent>
            </Tooltip>
          </div>

          {/* Legend */}
          <div className="absolute top-4 right-4 bg-white/90 p-2 rounded-md shadow-sm border flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-blue-500 border-2 border-blue-700 w-4 h-4"></div>
              <span className="text-xs">Operational</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-yellow-500 border-2 border-yellow-700 w-4 h-4"></div>
              <span className="text-xs">Maintenance</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-red-500 border-2 border-red-700 w-4 h-4 animate-pulse"></div>
              <span className="text-xs">Active Call</span>
            </div>
          </div>
        </div>

        {/* Selected Asset Panel */}
        {selectedAsset && !isEditing && (
          <div 
            className="absolute bottom-4 left-4 right-4 bg-white rounded-md shadow-lg border z-30 max-h-[40vh] overflow-y-auto"
            style={{ maxWidth: 'min(500px, 90vw)' }}
          >
            <div className="flex justify-between items-center p-3 border-b">
              <h3 className="font-bold flex items-center gap-2">
                <Info className="w-4 h-4" />
                {selectedAsset.name}
                <Badge variant="outline" className="ml-2">
                  {selectedAsset.type}
                </Badge>
              </h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedAsset(null)}
              >
                Close
              </Button>
            </div>
            
            <div className="p-3">
              <div className="grid gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium">{selectedAsset.location || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    {getActiveCalls(selectedAsset.id).length > 0 ? (
                      <Badge variant="destructive">
                        {getActiveCalls(selectedAsset.id).length} active call(s)
                      </Badge>
                    ) : selectedAsset.status === 'maintenance' ? (
                      <Badge variant="secondary">Under Maintenance</Badge>
                    ) : (
                      <Badge variant="default">Operational</Badge>
                    )}
                  </div>
                </div>

                {getActiveCalls(selectedAsset.id).length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Active Calls</p>
                    <div className="space-y-2">
                      {getActiveCalls(selectedAsset.id).map(call => (
                        <div key={call.id} className="p-2 bg-red-50 rounded-md border border-red-100">
                          <div className="flex justify-between">
                            <p className="font-medium text-sm">{call.issue}</p>
                            <Badge variant="outline">CRITICAL</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Reported: {new Date(call.callTime).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}