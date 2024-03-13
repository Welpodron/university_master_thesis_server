import fs from 'fs/promises';

import express from 'express';
import cors from 'cors';
import { getDistanceWithOpenRouteService } from './pather';
import {
  getSolutionRoutesFlat,
  getSolutionTotalDistanceFlat,
} from './solvers/utils';
import { ProblemType } from './solvers/reader';
import { bee } from './solvers/ABC/bee';
import {
  checkAllLocationsVisitedOnce,
  checkCapacity,
  checkDepotsPlacement,
} from './solvers/constrains';

import { hook, notify } from './middlewares/_debugger';
import { taskRouter } from './routes/task.router';
import DB from './db';
import { userRouter } from './routes/user.router';
import { authRouter } from './routes/auth.router';
import cookieParser from 'cookie-parser';
import { vehicleRouter } from './routes/vehicle.router';
import { jobRouter } from './routes/job.router';

const sleep = ({ ms }: { ms: number }) => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(1), ms);
  });
};

const app = express();

app.use(
  cors({
    // origin: 'http://localhost:5173',
    origin: true,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(taskRouter);
app.use(userRouter);
app.use(authRouter);
app.use(vehicleRouter);
app.use(jobRouter);

// app.get('/_debug', hook);

// app.get('/cache', async (req, res) => {
//   try {
//     const depot = {
//       id: -1,
//       latitude: 55.746081,
//       longitude: 37.887085,
//       demand: -1,
//       completed: false,
//     };

//     const tasks = await DB.task.findMany();

//     if (!tasks.length) {
//       return;
//     }

//     tasks.unshift(depot);

//     let cache: {
//       startId: number;
//       endId: number;
//       distance: number;
//     }[] = [];

//     try {
//       const buffer = await fs.readFile('./_cache');

//       let data = buffer.toString().trim();

//       if (data.length) {
//         cache = JSON.parse(data);
//       }
//     } catch (_) {
//       console.log('Cache file was not found or corrupted');
//     }

//     for (let i = 0; i < tasks.length; i++) {
//       for (let j = i + 1; j < tasks.length; j++) {
//         if (
//           cache.some(
//             (data) =>
//               (data.startId == tasks[i].id && data.endId == tasks[j].id) ||
//               (data.endId == tasks[i].id && data.startId == tasks[j].id)
//           )
//         ) {
//           continue;
//         }

//         try {
//           await sleep({ ms: 2500 });

//           console.log(`Fetching path from: ${tasks[i].id} to: ${tasks[j].id}`);

//           const distance = await getDistanceWithOpenRouteService({
//             startPoint: {
//               latitude: tasks[i].latitude,
//               longitude: tasks[i].longitude,
//             },
//             endPoint: {
//               latitude: tasks[j].latitude,
//               longitude: tasks[j].longitude,
//             },
//           });

//           cache.push({
//             startId: tasks[i].id,
//             endId: tasks[j].id,
//             distance,
//           });
//         } catch (error) {
//           console.error(error);
//         }
//       }
//     }

//     await fs.writeFile('./_cache', JSON.stringify(cache));

//     res.json(cache);
//   } catch (error) {
//     res.status(500).json((error as Error).message);
//   }
// });

// app.get('/cvrp', async (req, res) => {
//   try {
//     const depot = {
//       id: -1,
//       latitude: 55.746081,
//       longitude: 37.887085,
//       demand: 0,
//       completed: false,
//     };

//     const tasks = await DB.task.findMany();

//     if (!tasks.length) {
//       return;
//     }

//     tasks.unshift(depot);

//     let cache: {
//       startId: number;
//       endId: number;
//       distance: number;
//     }[] = [];

//     notify('Getting cache');

//     try {
//       const buffer = await fs.readFile('./_cache');

//       let data = buffer.toString().trim();

//       if (data.length) {
//         cache = JSON.parse(data);
//       }
//     } catch (error) {
//       console.error(error);

//       notify(error);

//       throw new Error('Cache file was not found or corrupted');
//     }

//     notify('Cache found');

//     const distancesMatrix: number[][] = [];

//     const nodesMap: Record<string, number> = {};

//     const demands: number[] = [];

//     for (let i = 0; i < tasks.length; i++) {
//       if (
//         tasks[i].latitude &&
//         tasks[i].longitude &&
//         (tasks[i].demand || tasks[i].id === -1)
//       ) {
//         if (
//           !cache.some(
//             (data) => data.startId == tasks[i].id || data.endId == tasks[i].id
//           )
//         ) {
//           // Task was not found inside cache
//           console.log(`Path was not found for task with id: ${tasks[i].id}`);
//           continue;
//         }

//         // row structure: [endForSome,endForSome,0,startForSome,startForSome]

//         const end = cache
//           .filter((data) => data.endId == tasks[i].id)
//           .map((data) => data.distance);
//         const start = cache
//           .filter((data) => data.startId == tasks[i].id)
//           .map((data) => data.distance);

//         const row = [...end, 0, ...start];

//         nodesMap[i] = tasks[i].id;

//         distancesMatrix.push(row);

//         demands.push(tasks[i].demand);
//       }
//     }

//     //! TODO: На оч больших capacity алгоритм ломается ?????
//     const problem: ProblemType = {
//       author: '',
//       name: '',
//       type: 'unique',
//       edgeWeightType: 'unique',
//       distancesMatrix,
//       coords: [],
//       demands,
//       capacity: Math.floor(
//         [7000, 10000].reduce((acc, cur) => acc + cur, 0) / 2
//       ),
//       capacities: [],
//       dimension: distancesMatrix.length,
//       trucks: 2,
//       optimal: Infinity,
//     };

//     // notify('Bee clarke started');
//     // console.log(problem.demands);
//     const beeClarke = await bee({ problem, useClarke: true });

//     // notify('Bee clarke ended');

//     // const mappedSolution = clarkeSolution.map((i) =>
//     //   nodesMap[i] == -1 ? 0 : nodesMap[i]
//     // );

//     // const solution = getSolutionRoutesFlat({ solution: mappedSolution });

//     // checkDepotsPlacement({
//     //   routes: solution,
//     //   isNotMuted: true,
//     // });

//     // checkAllLocationsVisitedOnce({
//     //   routes: solution,
//     //   // locations: tasks.map((_, i) => i).filter((i) => i !== 0),
//     //   locations: tasks.map((task) => task.id).filter((i) => i != -1),
//     //   isNotMuted: true,
//     // });

//     // checkCapacity({
//     //   routes: solution,
//     //   capacity: problem.capacity,
//     //   demands,
//     //   isNotMuted: true,
//     // });

//     // const _beeClarkeCost = getSolutionTotalDistanceFlat({
//     //   solution: beeClarke,
//     //   distancesMatrix: problem.distancesMatrix,
//     // });

//     // const mappedLocations = solution.map((path) =>
//     //   path.map((id) => {
//     //     const task = tasks.find((task) => task.id == (id == 0 ? -1 : id));

//     //     return {
//     //       longitude: task ? task.longitude : null,
//     //       latitude: task ? task.latitude : null,
//     //     };
//     //   })
//     // );

//     // res.send({
//     //   solution: solution,
//     //   locations: mappedLocations,
//     //   cost: _beeClarkeCost,
//     //   capacity: problem.capacity,
//     //   trucks: problem.trucks,
//     //   iteration: 300,
//     // });

//     res.send(beeClarke);
//   } catch (error) {
//     res.status(500).json((error as Error).message);
//   }
// });

export { app };
