import { useEffect, useRef } from 'react';
import { formatNumber } from '@/lib/utils/data-utils';

interface EnergyFlowDiagramProps {
  gridPower: number;
  solarPower: number;
  batteryPower: number; // Positive for charging, negative for discharging
  evPower: number;
  homePower: number;
  batterySOC: number; // State of charge percentage
  fullscreen?: boolean;
}

export default function EnergyFlowDiagram({
  gridPower,
  solarPower,
  batteryPower,
  evPower,
  homePower,
  batterySOC,
  fullscreen = false
}: EnergyFlowDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  // Convert numerical values to display values
  const gridValue = formatNumber(gridPower, 1);
  const solarValue = formatNumber(solarPower, 1);
  const batteryValue = formatNumber(Math.abs(batteryPower), 1);
  const evValue = formatNumber(evPower, 1);
  const homeValue = formatNumber(homePower, 1);

  // Determine flow direction for visual elements
  const isBatteryCharging = batteryPower > 0;
  const isGridImporting = gridPower > 0;
  
  // Animation effect for energy flows
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    
    // Animate energy flow paths
    const paths = svg.querySelectorAll('.energy-flow-path');
    paths.forEach((path) => {
      const pathElement = path as SVGPathElement;
      
      // Reset the animation
      pathElement.style.animation = 'none';
      // Force reflow
      void pathElement.offsetWidth;
      // Start animation
      pathElement.style.animation = 'flowAnimation 1s linear infinite';
    });
  }, [gridPower, solarPower, batteryPower, evPower, homePower]);

  return (
    <svg 
      ref={svgRef} 
      className="w-full h-full" 
      viewBox="0 0 800 300" 
      xmlns="http://www.w3.org/2000/svg"
      style={{ overflow: 'visible' }}
    >
      {/* Grid Connection */}
      <g>
        <rect x="20" y="120" width="80" height="60" rx="5" fill="#6B7280" className="dark:fill-gray-600"/>
        <text x="60" y="155" fontSize="14" textAnchor="middle" fill="white">Grid</text>
        
        {/* Grid Connection Values */}
        <rect x="20" y="190" width="80" height="30" rx="3" fill="#F3F4F6" className="dark:fill-gray-800"/>
        <text x="60" y="210" fontSize="12" textAnchor="middle" fill="#374151" className="dark:fill-white">
          {gridValue} kW
        </text>
      </g>

      {/* Solar Panels */}
      <g>
        <rect x="150" y="40" width="80" height="60" rx="5" fill="#FCD34D" className="dark:fill-amber-500"/>
        <text x="190" y="75" fontSize="14" textAnchor="middle" fill="#422006" className="dark:fill-white">Solar PV</text>
        
        {/* Solar Values */}
        <rect x="150" y="110" width="80" height="30" rx="3" fill="#F3F4F6" className="dark:fill-gray-800"/>
        <text x="190" y="130" fontSize="12" textAnchor="middle" fill="#374151" className="dark:fill-white">
          {solarValue} kW
        </text>
      </g>

      {/* Battery Storage */}
      <g>
        <rect x="150" y="200" width="80" height="60" rx="5" fill="#60A5FA" className="dark:fill-blue-600"/>
        <text x="190" y="235" fontSize="14" textAnchor="middle" fill="white">Battery</text>
        
        {/* Battery Values */}
        <rect x="150" y="270" width="80" height="30" rx="3" fill="#F3F4F6" className="dark:fill-gray-800"/>
        <text x="190" y="290" fontSize="12" textAnchor="middle" fill="#374151" className="dark:fill-white">
          {batterySOC}% SoC
        </text>
      </g>

      {/* Home Energy Management */}
      <g>
        <rect x="360" y="120" width="100" height="60" rx="5" fill="#10B981" className="dark:fill-green-600"/>
        <text x="410" y="145" fontSize="14" textAnchor="middle" fill="white">Smart Home</text>
        <text x="410" y="165" fontSize="14" textAnchor="middle" fill="white">Manager</text>
        
        {/* Home Values */}
        <rect x="370" y="190" width="80" height="30" rx="3" fill="#F3F4F6" className="dark:fill-gray-800"/>
        <text x="410" y="210" fontSize="12" textAnchor="middle" fill="#374151" className="dark:fill-white">
          {/* Total managed power */}
          {formatNumber(Math.abs(gridPower) + solarPower, 1)} kW
        </text>
      </g>

      {/* EV Charger */}
      <g>
        <rect x="570" y="40" width="80" height="60" rx="5" fill="#6366F1" className="dark:fill-indigo-600"/>
        <text x="610" y="75" fontSize="14" textAnchor="middle" fill="white">EV Charger</text>
        
        {/* EV Values */}
        <rect x="570" y="110" width="80" height="30" rx="3" fill="#F3F4F6" className="dark:fill-gray-800"/>
        <text x="610" y="130" fontSize="12" textAnchor="middle" fill="#374151" className="dark:fill-white">
          {evValue} kW
        </text>
      </g>

      {/* Home Consumption */}
      <g>
        <rect x="570" y="200" width="80" height="60" rx="5" fill="#F97316" className="dark:fill-orange-600"/>
        <text x="610" y="235" fontSize="14" textAnchor="middle" fill="white">Home</text>
        
        {/* Home Values */}
        <rect x="570" y="270" width="80" height="30" rx="3" fill="#F3F4F6" className="dark:fill-gray-800"/>
        <text x="610" y="290" fontSize="12" textAnchor="middle" fill="#374151" className="dark:fill-white">
          {homeValue} kW
        </text>
      </g>

      {/* Flow Paths */}
      {/* Grid to/from Home Manager */}
      <path 
        d={isGridImporting ? "M100 150 L360 150" : "M360 150 L100 150"} 
        stroke="#6B7280" 
        strokeWidth="4" 
        className="dark:stroke-gray-600 energy-flow-path" 
        markerEnd={isGridImporting ? "url(#arrowheadGrid)" : "url(#arrowheadManager)"}
      />
      
      {/* Solar to Home Manager */}
      <path 
        d="M190 100 L190 150 L360 150" 
        stroke="#FCD34D" 
        strokeWidth="4" 
        className="energy-flow-path"
        markerEnd="url(#arrowheadSolar)"
      />
      
      {/* Battery to/from Home Manager */}
      <path 
        d={isBatteryCharging ? "M360 150 L320 150 L320 230 L230 230" : "M230 230 L320 230 L320 150 L360 150"} 
        stroke="#60A5FA" 
        strokeWidth="4" 
        className="dark:stroke-blue-600 energy-flow-path"
        markerEnd={isBatteryCharging ? "url(#arrowheadBattery)" : "url(#arrowheadManager)"}
      />
      
      {/* Home Manager to EV */}
      <path 
        d="M460 150 L520 150 L520 70 L570 70" 
        stroke="#10B981" 
        strokeWidth="4" 
        className="dark:stroke-green-600 energy-flow-path"
        markerEnd="url(#arrowheadEV)"
      />
      
      {/* Home Manager to Home */}
      <path 
        d="M460 150 L520 150 L520 230 L570 230" 
        stroke="#10B981" 
        strokeWidth="4" 
        className="dark:stroke-green-600 energy-flow-path"
        markerEnd="url(#arrowheadHome)"
      />
      
      {/* Flow Status Points */}
      <circle cx="235" cy="150" r="6" fill="#FCD34D" />
      <circle cx="320" cy="190" r="6" fill="#60A5FA" className="dark:fill-blue-600" />
      <circle cx="520" cy="110" r="6" fill="#10B981" className="dark:fill-green-600" />
      <circle cx="520" cy="190" r="6" fill="#10B981" className="dark:fill-green-600" />

      {/* Arrowhead markers */}
      <defs>
        <marker
          id="arrowheadGrid"
          markerWidth="10"
          markerHeight="7"
          refX="10"
          refY="3.5"
          orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#6B7280" className="dark:fill-gray-600" />
        </marker>
        <marker
          id="arrowheadManager"
          markerWidth="10"
          markerHeight="7"
          refX="10"
          refY="3.5"
          orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#10B981" className="dark:fill-green-600" />
        </marker>
        <marker
          id="arrowheadSolar"
          markerWidth="10"
          markerHeight="7"
          refX="10"
          refY="3.5"
          orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#FCD34D" className="dark:fill-amber-500" />
        </marker>
        <marker
          id="arrowheadBattery"
          markerWidth="10"
          markerHeight="7"
          refX="10"
          refY="3.5"
          orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#60A5FA" className="dark:fill-blue-600" />
        </marker>
        <marker
          id="arrowheadEV"
          markerWidth="10"
          markerHeight="7"
          refX="10"
          refY="3.5"
          orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#10B981" className="dark:fill-green-600" />
        </marker>
        <marker
          id="arrowheadHome"
          markerWidth="10"
          markerHeight="7"
          refX="10"
          refY="3.5"
          orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#10B981" className="dark:fill-green-600" />
        </marker>
      </defs>

      {/* Animation styling */}
      <style>
        {`
          .energy-flow-path {
            stroke-dasharray: 10;
            animation: flowAnimation 1s linear infinite;
          }
          
          @keyframes flowAnimation {
            to {
              stroke-dashoffset: -20;
            }
          }
        `}
      </style>
    </svg>
  );
}
