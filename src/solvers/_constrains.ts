import { getRouteCapacity } from './utils';

export const isCapacityOK = ({
  solution,
  capacity,
  demands,
}: {
  solution: number[][];
  capacity: number;
  demands: number[];
}) => {
  return solution.every(
    (route) => getRouteCapacity({ route, demands }) <= capacity
  );
};

/**
 * ! ВНИМАНИЕ формат решения сильно отличается и имеет вид:
 * [0, 4, 1, 0, 2, 7, 5, 0]
 */
export const isCapacityOKFlat = ({
  solution,
  capacity,
  demands,
}: {
  solution: number[];
  capacity: number;
  demands: number[];
}) => {
  let current = 0;
  for (let i = 1; i < solution.length - 1; i++) {
    if (solution[i] === 0) {
      current = 0;
      continue;
    } else {
      current += demands[solution[i]];
      if (current > capacity) {
        return false;
      }
    }
  }
  return true;
};
