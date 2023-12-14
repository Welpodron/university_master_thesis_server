import fs from 'fs';
import readline from 'readline';
import { resolve } from 'path';
import { getDistanceEuclidean, getDistanceManhattan } from './pather';
// import { getDistanceEuclidean, getDistanceManhattan } from "./math";

export type ProblemType = {
  author: string;
  name: string;
  type: string;
  edgeWeightType: string;
  distancesMatrix: number[][];
  coords: { x: number; y: number }[];
  demands: number[];
  capacity: number;
  dimension: number;
  trucks: number;
  optimal: number;
};

export const getProblem = async ({ path }: { path: string }) => {
  const fileStream = fs.createReadStream(resolve(path));

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  const problem: ProblemType = {
    author: '',
    name: '',
    type: '',
    edgeWeightType: '',
    distancesMatrix: [],
    coords: [],
    demands: [],
    capacity: 0,
    dimension: 0,
    trucks: 0,
    optimal: 0,
  };

  let isReadingNodes = false;
  let isReadingDemands = false;

  let isReadingWeights = false;

  let distancesMatrix = null;

  for await (const line of rl) {
    if (line.includes('NAME : ')) {
      problem.name = line.split('NAME : ')[1].trim();
    }
    if (line.includes('COMMENT : ')) {
      const [authorRaw, trucksRaw, optimalRaw] = line
        .split('COMMENT : ')[1]
        .trim()
        .slice(1, -1)
        .split(', ');
      problem.author = authorRaw ?? null;
      problem.trucks = trucksRaw ? parseInt(trucksRaw.split(': ')[1]) : NaN;
      problem.optimal = optimalRaw ? parseInt(optimalRaw.split(': ')[1]) : NaN;
    }
    if (line.includes('TYPE : ')) {
      problem.type = line.split('TYPE : ')[1].trim();
    }
    if (line.includes('DIMENSION : ')) {
      problem.dimension = parseInt(line.split('DIMENSION : ')[1].trim());
      distancesMatrix = new Array(problem.dimension)
        .fill(0)
        .map(() => new Array(problem.dimension).fill(0));
    }
    if (line.includes('EDGE_WEIGHT_TYPE : ')) {
      problem.edgeWeightType = line.split('EDGE_WEIGHT_TYPE : ')[1].trim();
    }
    if (line.includes('CAPACITY : ')) {
      problem.capacity = parseInt(line.split('CAPACITY : ')[1].trim());
    }
    if (
      distancesMatrix &&
      isReadingWeights &&
      !line.includes('NODE_COORD_SECTION')
    ) {
      const weights = line.trim().split(' ');
      const i = weights.length;
      for (let j = 0; j < i; j++) {
        distancesMatrix[i][j] = parseInt(weights[j]);
        distancesMatrix[j][i] = distancesMatrix[i][j];
      }
    }
    if (line.includes('EDGE_WEIGHT_SECTION')) {
      isReadingWeights = true;
    }
    if (isReadingNodes && !line.includes('DEMAND_SECTION')) {
      const [_, x, y] = line.trim().split(' ');
      problem.coords.push({
        x: parseInt(x),
        y: parseInt(y),
      });
    }
    if (line.includes('NODE_COORD_SECTION')) {
      isReadingNodes = true;
      isReadingWeights = false;
    }
    if (isReadingDemands && !line.includes('DEPOT_SECTION')) {
      const [_, demand] = line.trim().split(' ');
      problem.demands.push(parseInt(demand));
    }
    if (line.includes('DEMAND_SECTION')) {
      isReadingDemands = true;
      isReadingNodes = false;
    }
    if (line.includes('DEPOT_SECTION')) {
      isReadingDemands = false;
      break;
    }
  }

  if (!distancesMatrix) {
    throw new Error('distancesMatrix is not defined');
  }

  if (problem.edgeWeightType !== 'EXPLICIT') {
    for (let i = 0; i < problem.dimension; i++) {
      for (let j = i + 1; j < problem.dimension; j++) {
        const x1 = problem.coords[i].x;
        const y1 = problem.coords[i].y;
        const x2 = problem.coords[j].x;
        const y2 = problem.coords[j].y;

        if (problem.edgeWeightType === 'EUC_2D') {
          distancesMatrix[i][j] = getDistanceEuclidean({ x1, x2, y1, y2 });
        } else {
          distancesMatrix[i][j] = getDistanceManhattan({ x1, x2, y1, y2 });
        }

        distancesMatrix[j][i] = distancesMatrix[i][j];
      }
    }
  }

  problem.distancesMatrix = distancesMatrix;

  return problem;
};
