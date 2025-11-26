/**
 * Dynamical System Model for N-Sphere Particle Simulation
 * TypeScript port of the Python model for browser-based interactive visualization
 */

export type Topology = 'circle' | 'interval';

export interface SimulationConfig {
  nParticles: number;
  nDimensions: number;
  zoneWidth: number;
  topology: Topology;
  dt: number;
  damping: number;
  dampingLinear: number;
}

export class SphereDynamics {
  private N: number;
  private nDims: number;
  private w: number;
  private topology: Topology;
  private dt: number;
  private damping: number;
  private dampingLinear: number;
  
  public positions: number[][];
  public velocities: number[][];
  public stepCount: number = 0;

  constructor(config: Partial<SimulationConfig> = {}) {
    const {
      nParticles = 100,
      nDimensions = 6,
      zoneWidth = 5.0,
      topology = 'circle',
      dt = 0.01,
      damping = 0.95,
      dampingLinear = 0.05,
    } = config;

    if (nDimensions < 3 || nDimensions > 8) {
      throw new Error('Dimension must be in {3, 4, 5, 6, 7, 8}');
    }

    this.N = nParticles;
    this.nDims = nDimensions;
    this.w = zoneWidth;
    this.topology = topology;
    this.dt = dt;
    this.damping = damping;
    this.dampingLinear = dampingLinear;

    this.positions = this.initializeSphere();
    this.velocities = this.createZeroMatrix();
  }

  private createZeroMatrix(): number[][] {
    return Array.from({ length: this.N }, () => 
      Array.from({ length: this.nDims }, () => 0)
    );
  }

  private initializeSphere(): number[][] {
    // Sample from standard normal distribution and normalize
    const positions: number[][] = [];
    for (let i = 0; i < this.N; i++) {
      const point: number[] = [];
      for (let d = 0; d < this.nDims; d++) {
        // Box-Muller transform for normal distribution
        const u1 = Math.random();
        const u2 = Math.random();
        point.push(Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2));
      }
      positions.push(point);
    }
    return this.normalizeToSphere(positions);
  }

  private normalizeToSphere(points: number[][]): number[][] {
    return points.map(point => {
      const norm = Math.sqrt(point.reduce((sum, x) => sum + x * x, 0));
      const safeNorm = Math.max(norm, 1e-10);
      return point.map(x => x / safeNorm);
    });
  }

  private computeIndexDistances(): number[][] {
    const distances: number[][] = [];
    for (let i = 0; i < this.N; i++) {
      const row: number[] = [];
      for (let j = 0; j < this.N; j++) {
        if (this.topology === 'circle') {
          const diff = j - i;
          row.push(Math.min(
            Math.abs(diff),
            Math.abs(diff + this.N),
            Math.abs(diff - this.N)
          ));
        } else {
          row.push(Math.abs(j - i));
        }
      }
      distances.push(row);
    }
    return distances;
  }

  private computeSpatialDistances(): {
    rij: number[][];
    rHatIj: number[][][];
  } {
    const rij: number[][] = [];
    const rHatIj: number[][][] = [];

    for (let i = 0; i < this.N; i++) {
      const rijRow: number[] = [];
      const rHatRow: number[][] = [];

      for (let j = 0; j < this.N; j++) {
        // Compute difference vector x_j - x_i
        const diff: number[] = [];
        for (let d = 0; d < this.nDims; d++) {
          diff.push(this.positions[j][d] - this.positions[i][d]);
        }

        // Compute distance
        const dist = Math.sqrt(diff.reduce((sum, x) => sum + x * x, 0));
        rijRow.push(dist);

        // Compute unit direction vector
        const safeDist = dist > 1e-10 ? dist : 1.0;
        rHatRow.push(diff.map(x => x / safeDist));
      }

      rij.push(rijRow);
      rHatIj.push(rHatRow);
    }

    return { rij, rHatIj };
  }

  private computeForces(): number[][] {
    const dij = this.computeIndexDistances();
    const { rij, rHatIj } = this.computeSpatialDistances();

    const forces: number[][] = this.createZeroMatrix();

    for (let i = 0; i < this.N; i++) {
      for (let j = 0; j < this.N; j++) {
        if (i === j) continue;

        const r = rij[i][j];
        const safeR = r > 1e-10 ? r : 1.0;
        let magnitude: number;

        if (dij[i][j] <= this.w) {
          // Attractive force
          magnitude = (1 - (dij[i][j] - 1) / 2) / safeR;
        } else {
          // Repulsive force
          magnitude = -Math.min(5.0, 1.0 / safeR) / safeR;
        }

        for (let d = 0; d < this.nDims; d++) {
          forces[i][d] += magnitude * rHatIj[i][j][d];
        }
      }
    }

    return forces;
  }

  public step(): void {
    const forces = this.computeForces();

    // Update velocities
    for (let i = 0; i < this.N; i++) {
      for (let d = 0; d < this.nDims; d++) {
        const dvdt = forces[i][d] - this.dampingLinear * this.velocities[i][d];
        this.velocities[i][d] += dvdt * this.dt;
        this.velocities[i][d] *= this.damping;
        this.positions[i][d] += this.velocities[i][d] * this.dt;
      }
    }

    // Normalize to sphere
    this.positions = this.normalizeToSphere(this.positions);
    this.stepCount++;
  }

  /**
   * Compute total kinetic energy: sum of |v_i|^2 for all particles
   * Used to detect convergence (when energy drops below threshold)
   */
  public getTotalKineticEnergy(): number {
    let totalEnergy = 0;
    for (let i = 0; i < this.N; i++) {
      for (let d = 0; d < this.nDims; d++) {
        totalEnergy += this.velocities[i][d] * this.velocities[i][d];
      }
    }
    return totalEnergy;
  }

  /**
   * Check if simulation has converged (stabilized)
   * Returns true when kinetic energy is below threshold
   */
  public hasConverged(threshold: number = 1e-6): boolean {
    return this.getTotalKineticEnergy() < threshold;
  }

  public stepMultiple(n: number): void {
    for (let i = 0; i < n; i++) {
      this.step();
    }
  }

  public reset(): void {
    this.positions = this.initializeSphere();
    this.velocities = this.createZeroMatrix();
    this.stepCount = 0;
  }

  public getInnerProductMatrix(): number[][] {
    const matrix: number[][] = [];
    for (let i = 0; i < this.N; i++) {
      const row: number[] = [];
      for (let j = 0; j < this.N; j++) {
        let dotProduct = 0;
        for (let d = 0; d < this.nDims; d++) {
          dotProduct += this.positions[i][d] * this.positions[j][d];
        }
        row.push(dotProduct);
      }
      matrix.push(row);
    }
    return matrix;
  }

  public getPositions3D(): { x: number; y: number; z: number; index: number }[] {
    // Simple PCA-like projection: use first 3 principal directions
    // For simplicity, we'll compute covariance and eigenvectors
    return this.projectToPCA3D();
  }

  private projectToPCA3D(): { x: number; y: number; z: number; index: number }[] {
    // Center the data
    const mean: number[] = Array(this.nDims).fill(0);
    for (let i = 0; i < this.N; i++) {
      for (let d = 0; d < this.nDims; d++) {
        mean[d] += this.positions[i][d] / this.N;
      }
    }

    const centered = this.positions.map(p => p.map((v, d) => v - mean[d]));

    // Compute covariance matrix
    const cov: number[][] = Array.from({ length: this.nDims }, () =>
      Array(this.nDims).fill(0)
    );

    for (let i = 0; i < this.nDims; i++) {
      for (let j = 0; j < this.nDims; j++) {
        let sum = 0;
        for (let k = 0; k < this.N; k++) {
          sum += centered[k][i] * centered[k][j];
        }
        cov[i][j] = sum / (this.N - 1);
      }
    }

    // Power iteration for top 3 eigenvectors
    const eigenvectors = this.powerIteration3(cov);

    // Project data onto top 3 eigenvectors
    return centered.map((point, idx) => {
      const x = point.reduce((sum, v, d) => sum + v * eigenvectors[0][d], 0);
      const y = point.reduce((sum, v, d) => sum + v * eigenvectors[1][d], 0);
      const z = point.reduce((sum, v, d) => sum + v * eigenvectors[2][d], 0);
      return { x, y, z, index: idx };
    });
  }

  private powerIteration3(matrix: number[][]): number[][] {
    const n = matrix.length;
    const eigenvectors: number[][] = [];
    const matrixCopy = matrix.map(row => [...row]);

    for (let ev = 0; ev < 3; ev++) {
      // Initialize random vector
      let v = Array.from({ length: n }, () => Math.random() - 0.5);
      let norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
      v = v.map(x => x / norm);

      // Power iteration
      for (let iter = 0; iter < 50; iter++) {
        // Multiply by matrix
        const newV = Array(n).fill(0);
        for (let i = 0; i < n; i++) {
          for (let j = 0; j < n; j++) {
            newV[i] += matrixCopy[i][j] * v[j];
          }
        }

        // Normalize
        norm = Math.sqrt(newV.reduce((s, x) => s + x * x, 0));
        v = newV.map(x => x / Math.max(norm, 1e-10));
      }

      eigenvectors.push(v);

      // Deflate matrix
      const eigenvalue = v.reduce((sum, vi, i) => {
        let mv = 0;
        for (let j = 0; j < n; j++) {
          mv += matrixCopy[i][j] * v[j];
        }
        return sum + vi * mv;
      }, 0);

      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          matrixCopy[i][j] -= eigenvalue * v[i] * v[j];
        }
      }
    }

    return eigenvectors;
  }

  // Getters and setters for parameters
  public setZoneWidth(w: number): void {
    this.w = w;
  }

  public setTopology(topology: Topology): void {
    this.topology = topology;
  }

  public setDimensions(nDims: number): void {
    if (nDims < 3 || nDims > 8) {
      throw new Error('Dimension must be in {3, 4, 5, 6, 7, 8}');
    }
    this.nDims = nDims;
    this.reset();
  }

  public getConfig(): SimulationConfig {
    return {
      nParticles: this.N,
      nDimensions: this.nDims,
      zoneWidth: this.w,
      topology: this.topology,
      dt: this.dt,
      damping: this.damping,
      dampingLinear: this.dampingLinear,
    };
  }
}

