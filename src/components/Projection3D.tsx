'use client';

import { useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';

interface Point3D {
  x: number;
  y: number;
  z: number;
  index: number;
}

interface Projection3DProps {
  points: Point3D[];
  width?: number;
  height?: number;
}

export default function Projection3D({ points, width = 500, height = 500 }: Projection3DProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const rotationRef = useRef({ x: -0.4, y: 0.8 });
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });

  const project = useCallback((point: Point3D, rotX: number, rotY: number) => {
    // Apply Y rotation (around Y axis)
    let x = point.x * Math.cos(rotY) - point.z * Math.sin(rotY);
    let z = point.x * Math.sin(rotY) + point.z * Math.cos(rotY);
    let y = point.y;

    // Apply X rotation (around X axis)
    const newY = y * Math.cos(rotX) - z * Math.sin(rotX);
    const newZ = y * Math.sin(rotX) + z * Math.cos(rotX);
    y = newY;
    z = newZ;

    // Simple perspective projection
    const scale = 400 / (4 + z);
    return {
      x: x * scale + width / 2,
      y: y * scale + height / 2,
      z: z,
      index: point.index,
    };
  }, [width, height]);

  const render = useCallback(() => {
    if (!svgRef.current || points.length === 0) return;

    const svg = d3.select(svgRef.current);
    const { x: rotX, y: rotY } = rotationRef.current;

    // Project all points
    const projected = points.map(p => project(p, rotX, rotY));

    // Sort by z for proper depth ordering (back to front)
    projected.sort((a, b) => a.z - b.z);

    // Create color scale based on index (HSL rainbow)
    const colorScale = d3.scaleSequential(d3.interpolateRainbow)
      .domain([0, points.length]);

    // Update circles
    type ProjectedPoint = { x: number; y: number; z: number; index: number };
    const circles = svg.selectAll<SVGCircleElement, ProjectedPoint>('circle')
      .data(projected, (d: ProjectedPoint) => d.index.toString());

    circles.enter()
      .append('circle')
      .attr('r', 8)
      .attr('stroke', '#333')
      .attr('stroke-width', 0.5)
      .merge(circles)
      .attr('cx', (d: ProjectedPoint) => d.x)
      .attr('cy', (d: ProjectedPoint) => d.y)
      .attr('fill', (d: ProjectedPoint) => colorScale(d.index))
      .attr('opacity', 0.85);

    circles.exit().remove();
  }, [points, project]);

  useEffect(() => {
    render();
  }, [render]);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = svgRef.current;

    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;

      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;

      rotationRef.current.y += dx * 0.01;
      rotationRef.current.x += dy * 0.01;

      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      render();
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    svg.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      svg.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [render]);

  return (
    <div className="projection-container">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{ 
          cursor: 'grab',
          background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
          borderRadius: '8px'
        }}
      />
      <div className="projection-label">
        <h3>Projection of points</h3>
        <p className="hint">Drag to rotate</p>
      </div>
      <style jsx>{`
        .projection-container {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .projection-label {
          text-align: center;
          margin-top: 12px;
        }
        .projection-label h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #1a1a2e;
        }
        .hint {
          margin: 4px 0 0;
          font-size: 12px;
          color: #888;
        }
      `}</style>
    </div>
  );
}

