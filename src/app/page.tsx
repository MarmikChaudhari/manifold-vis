'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { SphereDynamics, Topology } from '@/lib/sphereDynamics';
import Projection3D from '@/components/Projection3D';
import InnerProductMatrix from '@/components/InnerProductMatrix';

export default function Home() {
  const [dimensions, setDimensions] = useState(6);
  const [topology, setTopology] = useState<Topology>('circle');
  const [zoneWidth, setZoneWidth] = useState(6);
  const [speed, setSpeed] = useState(5);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isConverged, setIsConverged] = useState(false);
  const [stepCount, setStepCount] = useState(0);
  
  const [positions3D, setPositions3D] = useState<{ x: number; y: number; z: number; index: number }[]>([]);
  const [innerProductMatrix, setInnerProductMatrix] = useState<number[][]>([]);

  const simulationRef = useRef<SphereDynamics | null>(null);
  const animationRef = useRef<number | null>(null);
  
  // Fixed number of simulation steps
  const MAX_STEPS = 50000;

  // Initialize simulation
  useEffect(() => {
    simulationRef.current = new SphereDynamics({
      nParticles: 100,
      nDimensions: dimensions,
      zoneWidth: zoneWidth,
      topology: topology,
    });
    updateVisualization();
  }, []);

  const updateVisualization = useCallback(() => {
    if (!simulationRef.current) return;
    setPositions3D(simulationRef.current.getPositions3D());
    setInnerProductMatrix(simulationRef.current.getInnerProductMatrix());
    setStepCount(simulationRef.current.stepCount);
  }, []);

  // Animation loop
  useEffect(() => {
    if (!isPlaying || isConverged) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const animate = () => {
      if (simulationRef.current) {
        // More steps per frame for higher speeds
        simulationRef.current.stepMultiple(speed * 10);
        updateVisualization();
        
        // Stop at MAX_STEPS
        if (simulationRef.current.stepCount >= MAX_STEPS) {
          setIsConverged(true);
          setIsPlaying(false);
          return;
        }
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, isConverged, speed, updateVisualization]);

  // Handle dimension change
  const handleDimensionChange = (newDim: number) => {
    setDimensions(newDim);
    if (simulationRef.current) {
      simulationRef.current.setDimensions(newDim);
      setIsConverged(false);
      updateVisualization();
    }
  };

  // Handle topology change
  const handleTopologyChange = (newTopology: Topology) => {
    setTopology(newTopology);
    if (simulationRef.current) {
      simulationRef.current.setTopology(newTopology);
      simulationRef.current.reset();
      setIsConverged(false);
      updateVisualization();
    }
  };

  // Handle zone width change
  const handleZoneWidthChange = (newWidth: number) => {
    setZoneWidth(newWidth);
    if (simulationRef.current) {
      simulationRef.current.setZoneWidth(newWidth);
    }
  };

  // Reset simulation
  const handleReset = () => {
    if (simulationRef.current) {
      simulationRef.current.reset();
      setIsConverged(false);
      updateVisualization();
    }
  };

  return (
    <main className="container">
      <header className="header">
        <div className="title-section">
          <h1>Physical Simulation</h1>
          <p className="description">
            Interactive visualization of particle dynamics on an n-dimensional sphere. 
            Particles attract neighbors and repel distant points.
          </p>
        </div>

        <div className="controls-row">
          <div className="playback-controls">
            <button 
              className={`control-btn play-btn ${isPlaying ? 'active' : ''}`}
              onClick={() => setIsPlaying(!isPlaying)}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
              )}
            </button>
            <button 
              className="control-btn"
              onClick={() => setIsPlaying(false)}
              aria-label="Pause"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            </button>
            <button 
              className="control-btn"
              onClick={handleReset}
              aria-label="Reset"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>
          </div>

          <div className="dimension-controls">
            <span className="label">Dimensions:</span>
            <div className="btn-group">
              {[3, 4, 5, 6, 7, 8].map(dim => (
                <button
                  key={dim}
                  className={`dim-btn ${dimensions === dim ? 'active' : ''}`}
                  onClick={() => handleDimensionChange(dim)}
                >
                  {dim}D
                </button>
              ))}
            </div>
          </div>

          <div className="topology-controls">
            <span className="label">Topology:</span>
            <div className="btn-group">
              <button
                className={`topology-btn ${topology === 'circle' ? 'active' : ''}`}
                onClick={() => handleTopologyChange('circle')}
              >
                Circle
              </button>
              <button
                className={`topology-btn ${topology === 'interval' ? 'active' : ''}`}
                onClick={() => handleTopologyChange('interval')}
              >
                Interval
              </button>
            </div>
          </div>
        </div>

        <div className="slider-row">
          <div className="slider-control">
            <span className="label">Zone Width: <span className="value">{zoneWidth}</span></span>
            <input
              type="range"
              min="1"
              max="20"
              value={zoneWidth}
              onChange={(e) => handleZoneWidthChange(Number(e.target.value))}
              className="slider"
            />
          </div>

          <div className="slider-control">
            <span className="label">Speed: <span className="value">{speed}</span></span>
            <input
              type="range"
              min="1"
              max="20"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="slider"
            />
          </div>
        </div>

        <div className="status-row">
          <span className="status-item">
            Steps: <span className="value">{stepCount.toLocaleString()}</span> / {MAX_STEPS.toLocaleString()}
          </span>
          {isConverged && (
            <span className="status-badge converged">✓ Complete</span>
          )}
          {isPlaying && !isConverged && (
            <span className="status-badge running">Running...</span>
          )}
        </div>
      </header>

      <div className="visualization-container">
        <Projection3D points={positions3D} width={520} height={520} />
        <InnerProductMatrix matrix={innerProductMatrix} width={520} height={520} />
      </div>

      <style jsx>{`
        .container {
          min-height: 100vh;
          padding: 32px 48px;
          background: #fefefe;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .header {
          max-width: 1200px;
          margin: 0 auto 32px;
        }

        .title-section {
          margin-bottom: 24px;
        }

        h1 {
          font-size: 20px;
          font-weight: 700;
          color: #1a1a2e;
          margin: 0 0 8px;
          letter-spacing: -0.02em;
        }

        .description {
          font-size: 14px;
          color: #666;
          margin: 0;
          max-width: 480px;
          line-height: 1.5;
        }

        .controls-row {
          display: flex;
          align-items: center;
          gap: 40px;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }

        .playback-controls {
          display: flex;
          gap: 8px;
        }

        .control-btn {
          width: 36px;
          height: 36px;
          border: 1px solid #ddd;
          border-radius: 6px;
          background: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #333;
          transition: all 0.15s ease;
        }

        .control-btn:hover {
          background: #f5f5f5;
          border-color: #ccc;
        }

        .control-btn.play-btn {
          background: #1a1a2e;
          border-color: #1a1a2e;
          color: white;
        }

        .control-btn.play-btn:hover {
          background: #2d2d4a;
        }

        .label {
          font-size: 13px;
          color: #555;
          font-weight: 500;
        }

        .dimension-controls,
        .topology-controls {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .btn-group {
          display: flex;
          gap: 4px;
        }

        .dim-btn,
        .topology-btn {
          padding: 8px 14px;
          border: 1px solid #ddd;
          background: white;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.15s ease;
          color: #444;
        }

        .dim-btn {
          border-radius: 4px;
        }

        .topology-btn:first-child {
          border-radius: 20px 0 0 20px;
        }

        .topology-btn:last-child {
          border-radius: 0 20px 20px 0;
          border-left: none;
        }

        .dim-btn:hover,
        .topology-btn:hover {
          background: #f5f5f5;
        }

        .dim-btn.active {
          background: #1a1a2e;
          border-color: #1a1a2e;
          color: white;
        }

        .topology-btn.active {
          background: #1a1a2e;
          border-color: #1a1a2e;
          color: white;
        }

        .slider-row {
          display: flex;
          gap: 48px;
          flex-wrap: wrap;
        }

        .status-row {
          display: flex;
          align-items: center;
          gap: 24px;
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #eee;
        }

        .status-item {
          font-size: 13px;
          color: #666;
        }

        .status-item .value {
          font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
          color: #1a1a2e;
        }

        .status-badge {
          font-size: 12px;
          padding: 4px 10px;
          border-radius: 12px;
          font-weight: 500;
        }

        .status-badge.converged {
          background: #d4edda;
          color: #155724;
        }

        .status-badge.running {
          background: #fff3cd;
          color: #856404;
        }

        .slider-control {
          display: flex;
          align-items: center;
          gap: 16px;
          min-width: 250px;
        }

        .value {
          color: #1a1a2e;
          font-weight: 600;
          min-width: 24px;
        }

        .slider {
          flex: 1;
          height: 4px;
          -webkit-appearance: none;
          appearance: none;
          background: #e0e0e0;
          border-radius: 2px;
          outline: none;
        }

        .slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #1a1a2e;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }

        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #1a1a2e;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }

        .visualization-container {
          display: flex;
          justify-content: center;
          gap: 48px;
          flex-wrap: wrap;
          max-width: 1200px;
          margin: 0 auto;
        }
      `}</style>
    </main>
  );
}

