import { memo } from 'react';
import { EdgeProps, getBezierPath } from 'reactflow';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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

  // Determine the color of the edge based on the voltage
  let strokeColor = '#94a3b8'; // Default gray
  
  if (data?.voltage) {
    if (data.voltage.includes('22kV') || parseInt(data.voltage) > 1000) {
      strokeColor = '#ef4444'; // Red for high voltage
    } else if (data.voltage.includes('400V')) {
      strokeColor = '#3b82f6'; // Blue for low voltage
    }
  }
  
  // Determine the width based on power flow
  let strokeWidth = 2;
  if (data?.power) {
    const power = parseFloat(data.power);
    if (power > 30) {
      strokeWidth = 4;
    } else if (power > 10) {
      strokeWidth = 3;
    }
  }

  // Combine the style with our calculated styles
  const edgeStyle = {
    ...style,
    stroke: strokeColor,
    strokeWidth,
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
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <foreignObject
              width={80}
              height={40}
              x={labelX - 40}
              y={labelY - 20}
              className="edgebutton"
              requiredExtensions="http://www.w3.org/1999/xhtml"
            >
              <div className="flex items-center justify-center h-full bg-transparent">
                <div className="px-2 py-1 text-xs font-medium bg-white/90 rounded-md shadow-sm border border-gray-100 backdrop-blur-sm">
                  {data?.power || '0kW'}
                </div>
              </div>
            </foreignObject>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs">
              <div>Voltage: {data?.voltage || 'N/A'}</div>
              <div>Power: {data?.power || '0kW'}</div>
              <div>Direction: {data?.direction || 'N/A'}</div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </>
  );
});