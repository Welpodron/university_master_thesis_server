import { parentPort } from 'node:worker_threads';
import process from 'node:process';
import DB from '../db';
import { log } from '../loger';
import { sleep } from '../utils/utils';
import Cacher from '../cacher';
import { bee } from '../solvers/ABC/bee';
import { ProblemType } from '../solvers/reader';

(async () => {
  try {
    const tasks = await DB.task.findMany({
      where: {
        assigned: false,
      },
    });

    if (!tasks.length) {
      throw new Error('На данный момент отсутствуют задачи для расчета');
    }

    const vehicles = await DB.vehicle.findMany();

    if (!vehicles.length) {
      throw new Error('На данный момент не имеется доступного транспорта');
    }

    // insert depot
    tasks.unshift({
      id: -1,
      demand: 0,
      latitude: 55.746081,
      longitude: 37.887085,
    } as any);

    // check cache file
    const cache = await Cacher.read();
    // check missing cache hits
    await log({
      message: 'Запущена маршрутизация',
      code: 'PATHER',
    });

    // save to calculate tasks
    const tasksSave: Set<number> = new Set();
    // NOT save to calculate tasks
    const tasksUnSave: Set<number> = new Set();

    for (let i = 0; i < tasks.length; i++) {
      for (let j = i + 1; j < tasks.length; j++) {
        if (
          cache.some(
            (data) =>
              (data.startId == tasks[i].id && data.endId == tasks[j].id) ||
              (data.endId == tasks[i].id && data.startId == tasks[j].id)
          )
        ) {
          tasksSave.add(tasks[i].id);
          tasksSave.add(tasks[j].id);
          continue;
        }

        try {
          await log({
            message: `Не найден путь от: ${tasks[i].id} до: ${tasks[j].id}`,
            code: 'CACHE_MISS',
          });

          await log({
            message: `Построение пути от: ${tasks[i].id} до: ${tasks[j].id}`,
            code: 'PATHER',
          });

          // await sleep({ ms: 2500 });

          // const distance = await getDistanceWithOpenRouteService({
          //   startPoint: {
          //     latitude: tasks[i].latitude,
          //     longitude: tasks[i].longitude,
          //   },
          //   endPoint: {
          //     latitude: tasks[j].latitude,
          //     longitude: tasks[j].longitude,
          //   },
          // });

          // tasksSave.add(tasks[i].id);
          // tasksSave.add(tasks[j].id);

          // cache.push({
          //   startId: tasks[i].id,
          //   endId: tasks[j].id,
          //   distance,
          // });
        } catch (error) {
          tasksUnSave.add(tasks[i].id);
          tasksUnSave.add(tasks[j].id);
          tasksSave.delete(tasks[i].id);
          tasksSave.delete(tasks[j].id);
          await log({
            message: error,
            code: 'PATHER',
          });
        }
      }
    }
    await log({
      message: 'Маршрутизация завершена',
      code: 'PATHER',
    });

    // pre calculation finished write cache back
    await Cacher.write(cache);

    // deploy algo calculation
    const distancesMatrix: number[][] = [];

    const nodesMap: Record<string, number> = {};

    const demands: number[] = [];

    let counter = 0;

    for (const id of tasksSave) {
      const task = tasks.find((task) => task.id === id);

      if (!task) {
        continue;
      }

      if (
        task.latitude == null ||
        task.longitude == null ||
        isNaN(task.latitude) ||
        isNaN(task.longitude)
      ) {
        continue;
      }

      if (!task.demand && task.id !== -1) {
        continue;
      }

      if (!cache.some((data) => data.startId == id || data.endId == id)) {
        // Task was not found inside cache
        await log({
          message: `Не найден маршрут для задачи: ${id} при работе решателя, данная задача была пропущена`,
          code: 'SOLVER',
        });
        continue;
      }

      const neighbors = Array.from(tasksSave).filter((value) => value !== id);

      // row structure: [endForSome,endForSome,0,startForSome,startForSome]

      const end = cache
        .filter((data) => data.endId == id && neighbors.includes(data.startId))
        .map((data) => data.distance);
      const start = cache
        .filter((data) => data.startId == id && neighbors.includes(data.endId))
        .map((data) => data.distance);

      const row = [...end, 0, ...start];

      nodesMap[counter] = id;
      counter++;

      distancesMatrix.push(row);

      demands.push(task.demand);
    }

    // //TODO: На оч больших capacity алгоритм ломается ?????
    const problem: ProblemType = {
      author: '',
      name: '',
      type: 'unique',
      edgeWeightType: 'unique',
      distancesMatrix,
      coords: [],
      demands,
      capacity: Math.floor(
        vehicles
          .map((vehicle) => vehicle.capacity)
          .reduce((acc, cur) => acc + cur, 0) / vehicles.length
      ),
      capacities: [],
      dimension: distancesMatrix.length,
      trucks: vehicles.length,
      optimal: Infinity,
    };

    // console.log(tasksSave.map((task) => task.id));
    console.log('start');

    const beeClarke = await bee({ problem, useClarke: true });

    console.log('end');

    console.log(beeClarke);
  } catch (error) {
    console.error(error);
  }

  // signal to parent that the job is done
  if (parentPort) parentPort.postMessage('done');
  else process.exit(0);
})();
