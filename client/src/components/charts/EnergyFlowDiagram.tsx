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

  // Calculating line opacity/intensity based on power values (for modern look)
  const maxPower = Math.max(
    Math.abs(gridPower), 
    solarPower, 
    Math.abs(batteryPower), 
    evPower, 
    homePower
  );
  
  const getOpacity = (power: number) => {
    const minOpacity = 0.3;
    const normalizedValue = Math.abs(power) / (maxPower || 1);
    return Math.max(minOpacity, normalizedValue);
  };
  
  const getStrokeWidth = (power: number) => {
    const minWidth = 2;
    const maxWidth = 5;
    const normalizedValue = Math.abs(power) / (maxPower || 1);
    return minWidth + normalizedValue * (maxWidth - minWidth);
  };

  return (
    <svg 
      ref={svgRef} 
      className="w-full h-full" 
      viewBox="0 0 800 300" 
      xmlns="http://www.w3.org/2000/svg"
      style={{ overflow: 'visible' }}
    >
      {/* Background grid */}
      <rect width="800" height="300" fill="#111827" rx="8" />

      {/* Grid Connection */}
      <g>
        <rect x="20" y="120" width="80" height="60" rx="5" fill="#222" stroke="#444" strokeWidth="1"/>
        <text x="60" y="155" fontSize="14" textAnchor="middle" fill="#fff" className="font-medium">Grid</text>
        
        {/* Grid Connection Values */}
        <rect x="20" y="190" width="80" height="40" rx="3" fill="#333" strokeWidth="1" stroke="#444"/>
        <text x="60" y="210" fontSize="12" textAnchor="middle" fill="#fff" className="font-medium">
          {gridValue} kW
        </text>
        <circle cx="60" cy="228" r="6" fill={isGridImporting ? "#16a34a" : "#dc2626"} />
      </g>

      {/* Solar Panels */}
      <g>
        <rect x="150" y="40" width="80" height="60" rx="5" fill="#222" stroke="#444" strokeWidth="1"/>
        <text x="190" y="75" fontSize="14" textAnchor="middle" fill="#fff" className="font-medium">Solar PV</text>
        
        {/* Solar Values */}
        <rect x="150" y="110" width="80" height="40" rx="3" fill="#333" stroke="#444" strokeWidth="1"/>
        <text x="190" y="130" fontSize="12" textAnchor="middle" fill="#fff" className="font-medium">
          {solarValue} kW
        </text>
        <circle cx="190" cy="148" r="6" fill={solarPower > 0 ? "#16a34a" : "#555"} />
      </g>

      {/* Battery Storage */}
      <g>
        <rect x="150" y="200" width="80" height="60" rx="5" fill="#222" stroke="#444" strokeWidth="1"/>
        <text x="190" y="235" fontSize="14" textAnchor="middle" fill="#fff" className="font-medium">Battery</text>
        
        {/* Battery Values */}
        <rect x="150" y="270" width="80" height="40" rx="3" fill="#333" stroke="#444" strokeWidth="1"/>
        <text x="190" y="290" fontSize="12" textAnchor="middle" fill="#fff" className="font-medium">
          {batterySOC}% SoC
        </text>
        <circle cx="190" cy="308" r="6" fill={isBatteryCharging ? "#16a34a" : "#dc2626"} />
      </g>

      {/* Smart Home Hub */}
      <g>
        <rect x="360" y="120" width="100" height="60" rx="5" fill="#222" stroke="#444" strokeWidth="1"/>
        <text x="410" y="145" fontSize="14" textAnchor="middle" fill="#fff" className="font-medium">Smart Home</text>
        <text x="410" y="165" fontSize="14" textAnchor="middle" fill="#fff" className="font-medium">Hub</text>
        
        {/* Home Hub Values */}
        <rect x="370" y="190" width="80" height="40" rx="3" fill="#333" stroke="#444" strokeWidth="1"/>
        <text x="410" y="210" fontSize="12" textAnchor="middle" fill="#fff" className="font-medium">
          {/* Total managed power */}
          {formatNumber(Math.abs(gridPower) + solarPower, 1)} kW
        </text>
        <circle cx="410" cy="228" r="6" fill="#16a34a" />
      </g>

      {/* EV Charger */}
      <g>
        <rect x="570" y="40" width="80" height="60" rx="5" fill="#222" stroke="#444" strokeWidth="1"/>
        <text x="610" y="75" fontSize="14" textAnchor="middle" fill="#fff" className="font-medium">EV Charger</text>
        
        {/* EV Values */}
        <rect x="570" y="110" width="80" height="40" rx="3" fill="#333" stroke="#444" strokeWidth="1"/>
        <text x="610" y="130" fontSize="12" textAnchor="middle" fill="#fff" className="font-medium">
          {evValue} kW
        </text>
        <circle cx="610" cy="148" r="6" fill={evPower > 0 ? "#16a34a" : "#555"} />
      </g>

      {/* Home Consumption */}
      <g>
        <rect x="570" y="200" width="80" height="60" rx="5" fill="#222" stroke="#444" strokeWidth="1"/>
        <text x="610" y="235" fontSize="14" textAnchor="middle" fill="#fff" className="font-medium">Home</text>
        
        {/* Home Values */}
        <rect x="570" y="270" width="80" height="40" rx="3" fill="#333" stroke="#444" strokeWidth="1"/>
        <text x="610" y="290" fontSize="12" textAnchor="middle" fill="#fff" className="font-medium">
          {homeValue} kW
        </text>
        <circle cx="610" cy="308" r="6" fill={homePower > 0 ? "#16a34a" : "#555"} />
      </g>

      {/* Flow Paths */}
      {/* Grid to/from Home Hub - dynamic thickness based on power */}
      <path 
        d={isGridImporting ? "M100 150 C200 150, 250 150, 360 150" : "M360 150 C250 150, 200 150, 100 150"} 
        stroke="#3f9" 
        strokeWidth={getStrokeWidth(gridPower)}
        strokeOpacity={getOpacity(gridPower)}
        className="energy-flow-path" 
        fill="none"
        markerEnd={isGridImporting ? "url(#arrowheadGrid)" : "url(#arrowheadManager)"}
      />
      
      {/* Solar to Home Hub - curved */}
      <path 
        d="M190 100 C190 120, 190 130, 230 140 C270 150, 300 150, 360 150" 
        stroke="#3f9" 
        strokeWidth={getStrokeWidth(solarPower)}
        strokeOpacity={getOpacity(solarPower)}
        fill="none"
        className="energy-flow-path"
        markerEnd="url(#arrowheadSolar)"
      />
      
      {/* Battery to/from Home Hub - curved */}
      <path 
        d={isBatteryCharging 
          ? "M360 150 C320 150, 300 150, 280 160 C260 170, 250 200, 230 230" 
          : "M230 230 C250 200, 260 170, 280 160 C300 150, 320 150, 360 150"} 
        stroke="#3f9" 
        strokeWidth={getStrokeWidth(batteryPower)}
        strokeOpacity={getOpacity(batteryPower)}
        fill="none"
        className="energy-flow-path"
        markerEnd={isBatteryCharging ? "url(#arrowheadBattery)" : "url(#arrowheadManager)"}
      />
      
      {/* Home Hub to EV - curved */}
      <path 
        d="M460 150 C500 150, 520 140, 530 120 C540 100, 550 70, 570 70" 
        stroke="#3f9" 
        strokeWidth={getStrokeWidth(evPower)}
        strokeOpacity={getOpacity(evPower)}
        fill="none"
        className="energy-flow-path"
        markerEnd="url(#arrowheadEV)"
      />
      
      {/* Home Hub to Home - curved */}
      <path 
        d="M460 150 C500 150, 520 160, 530 180 C540 200, 550 230, 570 230" 
        stroke="#3f9" 
        strokeWidth={getStrokeWidth(homePower)}
        strokeOpacity={getOpacity(homePower)}
        fill="none"
        className="energy-flow-path"
        markerEnd="url(#arrowheadHome)"
      />
      
      {/* Arrowhead markers */}
      <defs>
        <marker
          id="arrowheadGrid"
          markerWidth="10"
          markerHeight="7"
          refX="10"
          refY="3.5"
          orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#3f9" />
        </marker>
        <marker
          id="arrowheadManager"
          markerWidth="10"
          markerHeight="7"
          refX="10"
          refY="3.5"
          orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#3f9" />
        </marker>
        <marker
          id="arrowheadSolar"
          markerWidth="10"
          markerHeight="7"
          refX="10"
          refY="3.5"
          orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#3f9" />
        </marker>
        <marker
          id="arrowheadBattery"
          markerWidth="10"
          markerHeight="7"
          refX="10"
          refY="3.5"
          orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#3f9" />
        </marker>
        <marker
          id="arrowheadEV"
          markerWidth="10"
          markerHeight="7"
          refX="10"
          refY="3.5"
          orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#3f9" />
        </marker>
        <marker
          id="arrowheadHome"
          markerWidth="10"
          markerHeight="7"
          refX="10"
          refY="3.5"
          orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#3f9" />
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
