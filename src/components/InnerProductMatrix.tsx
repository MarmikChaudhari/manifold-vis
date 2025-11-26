'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface InnerProductMatrixProps {
  matrix: number[][];
  width?: number;
  height?: number;
}

export default function InnerProductMatrix({ 
  matrix, 
  width = 500, 
  height = 500 
}: InnerProductMatrixProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || matrix.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const n = matrix.length;
    const cellWidth = width / n;
    const cellHeight = height / n;

    // Find min and max values for color scaling
    let minVal = Infinity;
    let maxVal = -Infinity;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        minVal = Math.min(minVal, matrix[i][j]);
        maxVal = Math.max(maxVal, matrix[i][j]);
      }
    }

    // Symmetric color scale around 0
    const absMax = Math.max(Math.abs(minVal), Math.abs(maxVal));
    
    // Create RdBu diverging color scale (blue for negative, red for positive)
    const colorScale = d3.scaleSequential(d3.interpolateRdBu)
      .domain([absMax, -absMax]); // Reversed to match convention (red = positive)

    // Draw cells
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        ctx.fillStyle = colorScale(matrix[i][j]);
        ctx.fillRect(j * cellWidth, i * cellHeight, cellWidth + 0.5, cellHeight + 0.5);
      }
    }
  }, [matrix, width, height]);

  return (
    <div className="heatmap-container">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ 
          borderRadius: '4px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}
      />
      <div className="heatmap-label">
        <h3>Inner Product Matrix</h3>
      </div>
      <style jsx>{`
        .heatmap-container {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .heatmap-label {
          text-align: center;
          margin-top: 12px;
        }
        .heatmap-label h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #1a1a2e;
        }
      `}</style>
    </div>
  );
}

