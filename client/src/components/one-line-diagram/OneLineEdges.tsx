import { memo, useMemo } from 'react';
import { EdgeProps, getBezierPath, getSmoothStepPath } from 'reactflow';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { MoveRight, MoveLeft, ChevronUp, ChevronDown, ArrowUp, ArrowDown, ArrowRight, ArrowLeft } from 'lucide-react';

// PowerLine Edge Component
export const PowerLineEdge = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  markerEnd,
  markerStart,
}: EdgeProps) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  
  // Determine the direction properties
  const isHorizontal = Math.abs(targetX - sourceX) > Math.abs(targetY - sourceY);
  const direction = data?.direction || 'import';

  // Calculate the midpoint for arrow placement
  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;
  
  // Calculate flow direction angle to rotate the arrows
  const angle = Math.atan2(targetY - sourceY, targetX - sourceX) * (180 / Math.PI);
  
  // Determine the color of the edge based on the voltage
  let strokeColor = '#94a3b8'; // Default gray
  let flowColor = '#2563eb'; // Default blue for import
  
  if (direction === 'export') {
    flowColor = '#16a34a'; // Green for export
  }
  
  if (data?.voltage) {
    if (data.voltage.includes('22kV') || parseInt(data.voltage) > 1000) {
      strokeColor = '#ef4444'; // Red for high voltage
    } else if (data.voltage.includes('400V')) {
      strokeColor = '#3b82f6'; // Blue for low voltage
    }
  }
  
  // Determine the width and number of arrows based on power flow
  let strokeWidth = 2;
  let numArrows = 1;
  
  if (data?.power) {
    const power = parseFloat(data.power);
    if (power > 30) {
      strokeWidth = 4;
      numArrows = 3;
    } else if (power > 10) {
      strokeWidth = 3;
      numArrows = 2;
    } else if (power < 0.5) {
      numArrows = 0; // No arrows for very low power
    }
  }
  
  // Calculate the magnitude of flow for visualization
  const magnitude = data?.magnitude || 1;
  
  // Adjust arrow spacing based on distance
  const distance = Math.sqrt(Math.pow(targetX - sourceX, 2) + Math.pow(targetY - sourceY, 2));
  const spacing = Math.min(Math.max(30, distance / (numArrows + 1)), 50);
  
  // Calculate arrow positions
  const arrowPositions = useMemo(() => {
    const positions = [];
    
    // Skip if no arrows or very low power
    if (numArrows <= 0) return positions;
    
    for (let i = 1; i <= numArrows; i++) {
      const ratio = i / (numArrows + 1);
      const x = sourceX + (targetX - sourceX) * ratio;
      const y = sourceY + (targetY - sourceY) * ratio;
      positions.push({ x, y });
    }
    
    return positions;
  }, [sourceX, sourceY, targetX, targetY, numArrows]);

  // Combine the style with our calculated styles
  const edgeStyle = {
    ...style,
    stroke: strokeColor,
    strokeWidth,
  };
  
  // Determine the appropriate arrow based on direction and orientation
  const getArrow = (position: { x: number, y: number }, index: number) => {
    // Animation delay based on index for staggered effect
    const animationDelay = `${index * 0.2}s`;
    const animationDuration = '1.5s';
    
    // Calculate size proportional to power magnitude
    const size = Math.min(Math.max(16, magnitude * 2), 28);
    
    // Flow direction determines arrow type
    const arrowStyle = {
      color: flowColor,
      width: size,
      height: size,
      transform: `rotate(${angle}deg)`,
      animation: `${direction === 'import' ? 'flow-right' : 'flow-left'} ${animationDuration} infinite`,
      animationDelay,
    };
    
    return (
      <foreignObject
        key={`arrow-${id}-${index}`}
        width={size + 4}
        height={size + 4}
        x={position.x - (size + 4) / 2}
        y={position.y - (size + 4) / 2}
        requiredExtensions="http://www.w3.org/1999/xhtml"
        style={{ overflow: 'visible' }}
      >
        <div className="flex items-center justify-center h-full">
          {direction === 'import' ? (
            <ArrowRight style={arrowStyle} className="power-flow-arrow" />
          ) : (
            <ArrowLeft style={arrowStyle} className="power-flow-arrow" />
          )}
        </div>
      </foreignObject>
    );
  };

  return (
    <>
      <path
        id={id}
        style={edgeStyle}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
        markerStart={markerStart}
      />
      
      {/* Power flow arrows */}
      {arrowPositions.map((pos, idx) => getArrow(pos, idx))}
      
      {/* Power value label */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <foreignObject
              width={120}
              height={40}
              x={labelX - 60}
              y={labelY - 20}
              className="edgebutton"
              requiredExtensions="http://www.w3.org/1999/xhtml"
            >
              <div className="flex items-center justify-center h-full bg-transparent">
                <div 
                  className={`px-3 py-1.5 text-xs font-medium rounded-md shadow-sm border backdrop-blur-sm ${
                    direction === 'import' 
                      ? 'bg-blue-50 text-blue-700 border-blue-200' 
                      : 'bg-green-50 text-green-700 border-green-200'
                  }`}
                >
                  {data?.power || '0kW'}
                </div>
              </div>
            </foreignObject>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs space-y-1">
              <div className="font-semibold">Power Flow Details</div>
              <div><span className="font-medium">Voltage:</span> {data?.voltage || 'N/A'}</div>
              <div><span className="font-medium">Power:</span> {data?.power || '0kW'}</div>
              <div><span className="font-medium">Direction:</span> {direction}</div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </>
  );
});