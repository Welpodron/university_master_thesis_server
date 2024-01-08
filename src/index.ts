import * as appRoot from 'app-root-path';
import { getProblem } from './reader';
import { clarkeWrightSavingsAlgorithm } from './clarke';
import {
  checkCapacity,
  checkDepotsPlacement,
  checkAllLocationsVisitedOnce,
} from './constrains';

import express from 'express';
import cors from 'cors';
import { log } from './loger';
import { getDistanceWithOpenRouteService } from './pather';
import { ant } from './ant';
import {
  createProblemGraph,
  visualizeCostAll,
  visualizeSolution,
} from './visualizer';
import { getRandomCVRPSolutionForBee } from './random';
import {
  generativeSolution,
  getSolutionRoutesFlat,
  getSolutionTotalDistance,
  getSolutionTotalDistanceFlat,
} from './utils';
import { bee } from './bee';
import {
  random_swap,
  random_swap_sub,
  random_reversing,
  random_swap_sub_reverse,
  random_insert_sub_reverse,
} from './_neighbor';
import { writeFileSync } from 'fs';

type Good = {
  weight: number;
  quantity: number;
  key: string;
};

type Shipment = {
  location: [number, number] | null;
  key: string;
  goods: Good[];
};

export type FormValuesType = {
  shipments: Shipment[];
};

const DEPOT_LOCATION = [55.74878500893904, 37.886805105099434];
const PORT = process.env.PORT || 3000;

// const app = express();

// app.use(cors());
// app.use(express.json());

// app.post("/cvrp", async (request, response) => {
//   const { shipments } = request.body as FormValuesType;

//   const demands = [0];
//   //! HOW TO Calculate ????
//   const capacity = 100;

//   const locationMatrixFlat = [DEPOT_LOCATION];
//   // [[DEPOT_LOCATION_lat, DEPOT_LOCATION_long], [shipment_X_location_lat, shipment_X_location_long]]
//   // X - номер отгрузки

//   // const clarkeDataDistances = [
//   //   [0, 25, 43, 57, 43, 61, 29, 41, 48, 71],
//   //   [25, 0, 29, 34, 43, 68, 49, 66, 72, 91],
//   //   [43, 29, 0, 52, 72, 96, 72, 81, 89, 114],
//   //   [57, 34, 52, 0, 45, 71, 71, 95, 99, 108],
//   //   [43, 43, 72, 45, 0, 27, 36, 65, 65, 65],
//   //   [61, 68, 96, 71, 27, 0, 40, 66, 62, 46],
//   //   [29, 49, 72, 71, 36, 40, 0, 31, 31, 43],
//   //   [41, 66, 81, 95, 65, 66, 31, 0, 11, 46],
//   //   [48, 72, 89, 99, 65, 62, 31, 11, 0, 36],
//   //   [71, 91, 114, 108, 65, 46, 43, 46, 36, 0],
//   // ];

//   for (const shipment of shipments) {
//     const { location, goods } = shipment;

//     if (location && goods.length) {
//       locationMatrixFlat.push(location);

//       demands.push(
//         goods.reduce((acc, good) => acc + good.weight * good.quantity, 0)
//       );
//     }
//   }

//   const distancesMatrix = new Array(locationMatrixFlat.length);

//   //! TODO: Оптимизировать обход матрицы так как она симметричная и нет смысла считать дистанцию дважды
//   for (let i = 0; i < locationMatrixFlat.length; i++) {
//     const row = new Array(locationMatrixFlat.length).fill(0);

//     //! Считаем дистанцию от каждой точки до каждой точки
//     for (let j = 0; j < locationMatrixFlat.length; j++) {
//       const [latitudeI, longitudeI] = locationMatrixFlat[i];
//       const [latitudeJ, longitudeJ] = locationMatrixFlat[j];

//       if (i === j) {
//         continue;
//       }

//       const distance = await getDistanceWithOpenRouteService({
//         startPoint: { latitude: latitudeI, longitude: longitudeI },
//         endPoint: { latitude: latitudeJ, longitude: longitudeJ },
//       });

//       row[j] = distance;
//     }

//     distancesMatrix[i] = row;
//   }

//   const solution = clarkeWrightSavingsAlgorithm({
//     nodes: locationMatrixFlat.length,
//     demands,
//     capacity,
//     distancesMatrix,
//   });

//   const isDepotsPlacementOk = checkDepotsPlacement({
//     routes: solution,
//   });

//   if (!isDepotsPlacementOk) {
//     return response.json({
//       message: "Неверное расположение начало и конца маршрута",
//       solution,
//     });
//   }

//   const isCapacityOk = checkCapacity({
//     routes: solution,
//     capacity,
//     demands,
//   });

//   if (!isCapacityOk) {
//     return response.json({ message: "Неверное значение capacity", solution });
//   }

//   const isAllLocationsVisitedOnce = checkAllLocationsVisitedOnce({
//     routes: solution,
//     locations: new Array(locationMatrixFlat.length - 1)
//       .fill(0)
//       .map((_, i) => i + 1),
//   });

//   if (!isAllLocationsVisitedOnce) {
//     return response.json({
//       message: "Не все локации посещены один раз",
//       solution,
//     });
//   }

//   return response.json({ message: "ok", solution });
// });

// app.listen(PORT, async () => {
//   log({
//     message: `Сервер запущен порт: ${PORT}`,
//     code: "SERVER",
//   });
// });

const benchmarks_a = [
  '/benchmarks/A/A-n32-k5.vrp',
  '/benchmarks/A/A-n33-k5.vrp',
  '/benchmarks/A/A-n33-k6.vrp',
  '/benchmarks/A/A-n34-k5.vrp',
  '/benchmarks/A/A-n36-k5.vrp',
  '/benchmarks/A/A-n37-k5.vrp',
  '/benchmarks/A/A-n37-k6.vrp',
  '/benchmarks/A/A-n38-k5.vrp',
  '/benchmarks/A/A-n39-k5.vrp',
  '/benchmarks/A/A-n39-k6.vrp',
  '/benchmarks/A/A-n44-k6.vrp',
  '/benchmarks/A/A-n45-k6.vrp',
  '/benchmarks/A/A-n45-k7.vrp',
  '/benchmarks/A/A-n46-k7.vrp',
  '/benchmarks/A/A-n48-k7.vrp',
  '/benchmarks/A/A-n53-k7.vrp',
  '/benchmarks/A/A-n54-k7.vrp',
  '/benchmarks/A/A-n55-k9.vrp',
  '/benchmarks/A/A-n60-k9.vrp',
  '/benchmarks/A/A-n61-k9.vrp',
  '/benchmarks/A/A-n62-k8.vrp',
  '/benchmarks/A/A-n63-k10.vrp',
  '/benchmarks/A/A-n63-k9.vrp',
  '/benchmarks/A/A-n64-k9.vrp',
  '/benchmarks/A/A-n65-k9.vrp',
  '/benchmarks/A/A-n69-k9.vrp',
  '/benchmarks/A/A-n80-k10.vrp',
];

const benchmarks_b = [
  '/benchmarks/B/B-n31-k5.vrp',
  '/benchmarks/B/B-n34-k5.vrp',
  '/benchmarks/B/B-n38-k6.vrp',
  '/benchmarks/B/B-n39-k5.vrp',
  '/benchmarks/B/B-n41-k6.vrp',
  '/benchmarks/B/B-n43-k6.vrp',
  '/benchmarks/B/B-n44-k7.vrp',
  '/benchmarks/B/B-n45-k5.vrp',
  '/benchmarks/B/B-n45-k6.vrp',
  '/benchmarks/B/B-n50-k7.vrp',
  '/benchmarks/B/B-n50-k8.vrp',
  '/benchmarks/B/B-n51-k7.vrp',
  '/benchmarks/B/B-n52-k7.vrp',
  '/benchmarks/B/B-n56-k7.vrp',
  '/benchmarks/B/B-n57-k7.vrp',
  '/benchmarks/B/B-n57-k9.vrp',
  '/benchmarks/B/B-n64-k9.vrp',
  '/benchmarks/B/B-n66-k9.vrp',
  '/benchmarks/B/B-n67-k10.vrp',
  '/benchmarks/B/B-n68-k9.vrp',
  '/benchmarks/B/B-n78-k10.vrp',
];

const main = async () => {
  const problemsSolutions = [];

  for (const benchmark of benchmarks_b) {
    console.log(benchmark);

    const problem = await getProblem({
      path: `${appRoot}${benchmark}`,
    });

    const beeTabu = await bee({ problem, useClarke: false });
    const _beeTabuCost = getSolutionTotalDistanceFlat({
      solution: beeTabu,
      distancesMatrix: problem.distancesMatrix,
    });
    // // console.log(beeTabu.solutionsByGenerations);
    const beeClarke = await bee({ problem, useClarke: true });
    const _beeClarkeCost = getSolutionTotalDistanceFlat({
      solution: beeClarke,
      distancesMatrix: problem.distancesMatrix,
    });
    const antSolutionCost = ant({ problem });
    const clarke = clarkeWrightSavingsAlgorithm({
      nodes: problem.dimension,
      demands: problem.demands,
      capacity: problem.capacity,
      distancesMatrix: problem.distancesMatrix,
    });
    const _clarkeCost = getSolutionTotalDistanceFlat({
      solution: clarke,
      distancesMatrix: problem.distancesMatrix,
    });

    problemsSolutions.push({
      name: benchmark.split('/').pop(),
      capacity: problem.capacity,
      trucks: problem.trucks,
      dimension: problem.dimension,
      optimal: problem.optimal,
      abcTabu: _beeTabuCost,
      abcClarke: _beeClarkeCost,
      antCost: antSolutionCost,
      clarkeCost: _clarkeCost,
      iteration: 300,
    });
  }

  writeFileSync(
    `${appRoot}/benchmarks/B/results.json`,
    JSON.stringify(problemsSolutions, null, 2)
  );
  // random_insert_sub_reverse();
  // const problem = await getProblem({
  //   path: `${appRoot}/benchmarks/A/A-n32-k5.vrp`,
  // });
  // const problem = await getProblem({
  //   path: `${appRoot}/benchmarks/A/A-n32-k5.vrp`,
  // });
  // const problem = await getProblem({
  //   path: `${appRoot}/benchmarks/DIMACS/ORTEC-n701-k64.vrp`,
  // });
  // const problem = await getProblem({
  //   path: `${appRoot}/benchmarks/DIMACS/Loggi-n1001-k31.vrp`,
  // });
  // const problem = await getProblem({
  //   path: `${appRoot}/benchmarks/DIMACS/toy.vrp`,
  // });
  // createProblemGraph(problem.coords);

  // Problem optimal solution
  // console.log('Problem optimal solution');
  // console.log({
  //   distance: problem.optimal,
  //   trucks: problem.trucks,
  // });

  // visualizeCostAll({
  //   problem,
  //   clarke: getSolutionTotalDistanceFlat({
  //     solution: clarke,
  //     distancesMatrix: problem.distancesMatrix,
  //   }),
  //   aco: antSolution.solutionsByGenerations,
  //   abcTabu: beeTabu.solutionsByGenerations,
  //   abcClarke: beeClarke.solutionsByGenerations,
  // });
  // console.log('Bee best:');
  // console.log(
  //   getSolutionTotalDistanceFlat({
  //     solution: beeSolution,
  //     distancesMatrix: problem.distancesMatrix,
  //   })
  // );
  // console.log({
  //   distance: beeSolution.totalDistanceTraveled,
  //   trucks: beeSolution.trucks,
  // });
  // console.log({ problem });

  // console.log(antSolution.solutionsByGenerations);

  // const isCapacityOk = checkCapacity({
  //   routes: beeSolution,
  //   capacity: problem.capacity,
  //   demands: problem.demands,
  //   isNotMuted: true,
  // });
  // const isAllLocationsVisitedOnce = checkAllLocationsVisitedOnce({
  //   routes: beeSolution,
  //   locations: new Array(problem.dimension - 1).fill(0).map((_, i) => i + 1),
  // });
  // // console.log(clarkeSolution);
  // console.log('Clarke best:');
  // console.log(
  //   getSolutionTotalDistanceFlat({
  //     solution: clarkeSolution,
  //     distancesMatrix: problem.distancesMatrix,
  //   })
  // );
  // visualizeSolution(
  //   getSolutionRoutesFlat({ solution: beeTabu }),
  //   problem.coords
  // );
  // console.log(clarkeSolution);
  // console.log();
  // const clarkeRoutes = structuredClone(clarkeSolution.routes);
  // clarkeRoutes.forEach((route) => {
  //   route.pop();
  //   route.shift();
  // });
  // debugger;
  // const isDepotsPlacementOk = checkDepotsPlacement({
  //   routes: beeSolution.routes,
  // });
  // console.log('Clarke best:');
  // console.log({
  //   distance: clarkeSolution.totalDistanceTraveled,
  //   trucks: clarkeSolution.trucks,
  // });
};

main();
