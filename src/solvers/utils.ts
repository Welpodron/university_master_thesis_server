import { isCapacityOKFlat } from './_constrains';
import { ProblemType } from './reader';

export const getRouteCapacity = ({
  route,
  demands,
}: {
  route: number[];
  demands: number[];
}) => {
  return route.reduce((acc, node) => {
    return typeof node === 'number' ? acc + demands[node] : acc + 0;
  }, 0);
};

export const getMaxRouteCapacity = ({
  solution,
  demands,
}: {
  solution: number[][];
  demands: number[];
}) => {
  return Math.max(
    ...solution.map((route) => getRouteCapacity({ route, demands }))
  );
};

/**
 * ! ВНИМАНИЕ ФУНКЦИЯ ПРИНИМАЕТ ПУТЬ БЕЗ ДЕПО В НАЧАЛЕ И КОНЦЕ
 */
export const getRouteTotalDistance = ({
  route,
  distancesMatrix,
}: {
  route: number[];
  distancesMatrix: number[][];
}) => {
  let result = distancesMatrix[0][route[0]];

  for (let i = 0; i < route.length - 1; i++) {
    result += distancesMatrix[route[i]][route[i + 1]];
  }

  return result + distancesMatrix[route[route.length - 1]][0];
};

/**
 * ! ВНИМАНИЕ ФУНКЦИЯ ПРИНИМАЕТ ПУТЬ БЕЗ ДЕПО В НАЧАЛЕ И КОНЦЕ
 */
export const getSolutionTotalDistance = ({
  solution,
  distancesMatrix,
}: {
  solution: number[][];
  distancesMatrix: number[][];
}) => {
  return solution.reduce((acc, route) => {
    return acc + getRouteTotalDistance({ route, distancesMatrix });
  }, 0);
};

export const getSolutionTotalCapacity = ({
  solution,
  demands,
}: {
  solution: number[][];
  demands: number[];
}) => {
  return solution.reduce((acc, route) => {
    return acc + getRouteCapacity({ route, demands });
  }, 0);
};

/**
 * ! ВНИМАНИЕ формат решения сильно отличается и имеет вид:
 * [0, 4, 1, 0, 2, 7, 5, 0]
 */
export const getSolutionTotalDistanceFlat = ({
  solution,
  distancesMatrix,
}: {
  solution: number[];
  distancesMatrix: number[][];
}) => {
  let total = 0;

  for (let i = 0; i < solution.length - 1; i++) {
    total += distancesMatrix[solution[i]][solution[i + 1]];
    if (isNaN(total)) {
      // console.log(distancesMatrix[0].length);
      console.log(solution[i]);
      console.log(solution[i + 1]);

      throw new Error('smth went wrong');
    }
  }

  return total;
};

/**
 * ! ВНИМАНИЕ формат решения сильно отличается и имеет вид:
 * [0, 4, 1, 0, 2, 7, 5, 0]
 */
export const getSolutionTotalCapacityFlat = ({
  solution,
  demands,
}: {
  solution: number[];
  demands: number[];
}) => {
  return solution.reduce((acc, node) => {
    return node === 0 ? acc : acc + demands[node];
  }, 0);
};

/**
 * ! ВНИМАНИЕ формат решения сильно отличается и имеет вид:
 * [0, 4, 1, 0, 2, 7, 5, 0]
 */
export const getSolutionRoutesCapacitiesFlat = ({
  solution,
  demands,
}: {
  solution: number[];
  demands: number[];
}) => {
  const routesCapacities = [];
  let routeCapacity = 0;

  // console.log('getSolutionRoutesCapacitiesFlat SOLUTION:');
  // console.log(solution);

  for (let i = 0; i < solution.length; i++) {
    if (solution[i] === 0) {
      routesCapacities.push(routeCapacity);
      routeCapacity = 0;
    } else {
      routeCapacity += demands[solution[i]];
    }
  }

  // console.log('getSolutionRoutesCapacitiesFlat RESULT:');
  // console.log(routesCapacities);

  return routesCapacities;
};

/**
 * ! ВНИМАНИЕ формат решения сильно отличается и имеет вид:
 * [0, 4, 1, 0, 2, 7, 5, 0]
 */
export const getSolutionRoutesCapacitiesFlatMax = ({
  solution,
  demands,
}: {
  solution: number[];
  demands: number[];
}) => {
  return Math.max(...getSolutionRoutesCapacitiesFlat({ solution, demands }));
};

/**
 * ! ВНИМАНИЕ формат решения сильно отличается и имеет вид:
 * [0, 4, 1, 0, 2, 7, 5, 0]
 */
export const getSolutionRoutesFlat = ({ solution }: { solution: number[] }) => {
  const routes = [];
  let route = [0];

  for (let i = 1; i < solution.length; i++) {
    if (solution[i] === 0) {
      route.push(0);
      routes.push(route);
      route = [0];
    } else {
      route.push(solution[i]);
    }
  }

  return routes;
};

export const generativeSolution = (
  problem: ProblemType,
  alpha = 0.01,
  betta = 50,
  patience = 1
) => {
  const MAXIMUM_PENALTY = 10000000;
  const dists = problem.distancesMatrix;
  const demands = problem.demands;

  for (let _ = 0; _ < patience; _++) {
    let i_loc: number[] = [];

    for (let i = 1; i < problem.dimension; i++) {
      i_loc.push(i);
    }

    const routes: number[][] = [];

    for (let k = 0; k < problem.trucks; k++) {
      routes.push([0]);
    }

    let i = 0;

    while (i_loc.length > 0) {
      let route_dists = [];
      let random_loc = i_loc[Math.floor(Math.random() * i_loc.length)];

      for (let route of routes) {
        const dist_to_loc = dists[route[route.length - 1]][random_loc];
        let route_demand = 0;
        for (let node of route) {
          route_demand += demands[node];
        }
        route_demand += demands[random_loc];

        let coef = 0;

        if (route_demand > problem.capacity) {
          coef = MAXIMUM_PENALTY;
        } else {
          coef =
            alpha * i * route.length +
            betta * Math.max(0, route_demand - problem.capacity) +
            dist_to_loc;
        }

        route_dists.push(coef);
      }

      // routes[np.argmin(route_dists)].append(random_loc)
      // i_loc.remove(random_loc)

      let minIndex = -1;
      let minValue = Infinity;

      for (let j = 0; j < route_dists.length; j++) {
        if (route_dists[j] < minValue) {
          minValue = route_dists[j];
          minIndex = j;
        }
      }

      routes[minIndex].push(random_loc);

      i_loc = i_loc.filter((loc) => loc !== random_loc);

      i++;
    }

    // solution = [loc for route in routes for loc in route]
    // solution.append(0)
    // solution = np.array(solution, dtype=np.int32)
    const solution = [];

    for (let route of routes) {
      for (let node of route) {
        solution.push(node);
      }
    }

    solution.push(0);

    let flag = true;

    for (let iterator = 0; iterator < solution.length - 1; iterator++) {
      if (solution[iterator] === solution[iterator + 1]) {
        flag = false;
        break;
      }
    }

    if (flag) {
      if (isCapacityOKFlat({ solution, capacity: problem.capacity, demands })) {
        return solution;
      }
    }
  }
};
