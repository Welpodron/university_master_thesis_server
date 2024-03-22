import express from 'express';

import { USER_ROLES } from '../../constants';
import { DB, _models } from '../../db';
import { auth } from '../../middlewares';
import { StatusCodes } from 'http-status-codes';
import Cacher from '../../cacher';
import { log } from '../../loger';
import { sleep } from '../../utils/utils';
import { getDistanceWithOpenRouteService } from '../../pather';
import { ProblemType } from '../../solvers/reader';
import { bee } from '../../solvers/ABC/bee';
import { v4 as uuidv4 } from 'uuid';
import { resolve } from 'path';

import * as fs from 'fs';

const MODEL = 'assignment';
const BASE_URL = `${MODEL}s`;

export const router = express.Router();

router.get(`/${BASE_URL}`, auth(USER_ROLES.MANAGER), async (req, res) => {
  try {
    //   const userId = 1;
    //   const vehicleId = 2;
    //   //   const tasksIds = [56, 53, 50, 49];
    //   const assignment = await DB.assignment.create({
    //     data: {
    //       userId,
    //       vehicleId,
    //       tasks: {
    //         connect: [{ id: 56 }, { id: 53 }, { id: 50 }, { id: 49 }],
    //       },
    //     },
    //   });
    const assignments = await DB.assignment.findMany({
      include: {
        tasks: true,
      },
    });

    const _fields =
      _models.find(
        (_model) =>
          _model.name ===
          (MODEL as string).charAt(0).toUpperCase() + (MODEL as string).slice(1)
      )?.fields ?? [];

    const _tree: Record<string, any> = {};

    for (const _field of _fields) {
      if (_field.name === 'pass' || _field.name === 'role') {
        continue;
      }
      _tree[_field.name] = _field;
    }

    res.json({
      data: assignments,
      model: _tree,
    });
  } catch (error) {
    res.status(500).json((error as Error).message);
  }
});

router.get('/calculate', async (req, res, next) => {
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

    // get depot location from settings
    const settings = await DB.settings.findFirst({ where: { id: -1 } });

    if (!settings) {
      throw new Error('Параметры системы не обнаружены');
    }

    const { depotLocation, routingAlgo, routingAlgoIterations } = settings;

    if (!depotLocation || !routingAlgo || !routingAlgoIterations) {
      throw new Error(
        'Параметры системы повреждены и не доступны на данный момент для использования'
      );
    }

    const depot = {
      id: -1,
      longitude: NaN,
      latitude: NaN,
      demand: 0,
    };

    try {
      const _depotLocation = JSON.parse(depotLocation);
      if (!Array.isArray(_depotLocation)) {
        throw new Error(
          'Параметры системы повреждены и не доступны на данный момент для использования'
        );
      }
      const latitude = parseFloat(_depotLocation[0]);
      const longitude = parseFloat(_depotLocation[1]);
      if (isNaN(longitude) || isNaN(latitude)) {
        throw new Error(
          'Параметры системы повреждены и не доступны на данный момент для использования'
        );
      }
      depot.latitude = latitude;
      depot.longitude = longitude;
    } catch (_) {
      throw new Error(
        'Параметры системы повреждены и не доступны на данный момент для использования'
      );
    }

    let cache: {
      id: string;
      distance: number;
      duration: number;
      startCoords: string;
      endCoords: string;
      manual: boolean;
      pathCoords: string | null;
    }[] = [];

    const _cache = await DB.routing.findMany({
      orderBy: {
        createdAt: 'asc',
      },
    });

    for (let row of _cache) {
      try {
        const startCoords = JSON.parse(row.startCoords);
        if (!Array.isArray(startCoords) || startCoords.length !== 2) {
          continue;
        }
        const endCoords = JSON.parse(row.endCoords);
        if (!Array.isArray(endCoords) || endCoords.length !== 2) {
          continue;
        }
        cache.push({
          ...row,
        });
      } catch (_) {
        continue;
      }
    }

    // check missing cache hits
    await log({
      message: 'Запущена маршрутизация',
      code: 'PATHER',
    });

    // tasks to route
    const pathsToCalculate: {
      fromCoords: string;
      toCoords: string;
      fromTaskId: number;
      toTaskId: number;
    }[] = [];

    for (let i = 0; i < tasks.length; i++) {
      //! depotLocation must be string like '[latitude,longitude]'
      // first of all check if path from depot to task is found
      // if not path from depot to task is not found well we already fucked
      const currentTask = tasks[i];
      const currentTaskLocation = [currentTask.latitude, currentTask.longitude];
      const currentTaskLocationStringified =
        JSON.stringify(currentTaskLocation);

      if (
        !cache.some((row) => {
          // check if path FROM depot TO currentTask is found in cache
          if (
            row.startCoords === depotLocation &&
            row.endCoords === currentTaskLocationStringified
          ) {
            return true;
          }
          // check if path FROM currentTask TO depot is found in cache
          if (
            row.startCoords === currentTaskLocationStringified &&
            row.endCoords === depotLocation
          ) {
            return true;
          }
          // record in cache from depot to currentTask was not found
          return false;
        })
      ) {
        // path to task from depot was NOT found so this task is fucked

        // before add to pathsToCalculate check if it already there
        if (
          !pathsToCalculate.some((path) => {
            // check if path starts FROM depot TO currentTaskLocation
            if (
              path.fromCoords === depotLocation &&
              path.toCoords === currentTaskLocationStringified
            ) {
              return true;
            }
            // check if path starts FORM currentTaskLocation TO depot
            if (
              path.fromCoords === currentTaskLocationStringified &&
              path.toCoords === depotLocation
            ) {
              return true;
            }
            // path was not found
            return false;
          })
        ) {
          pathsToCalculate.push({
            fromCoords: depotLocation,
            toCoords: currentTaskLocationStringified,
            fromTaskId: -1,
            toTaskId: currentTask.id,
          });
        }
      }

      // second check if path from currentTask to EVERY neighbor was found
      for (let j = i + 1; j < tasks.length; j++) {
        const neighborTask = tasks[j];
        const neighborTaskLocation = [
          neighborTask.latitude,
          neighborTask.longitude,
        ];
        const neighborTaskLocationStringified =
          JSON.stringify(neighborTaskLocation);

        if (
          !cache.some((row) => {
            // check if path FROM neighborTask TO currentTask is found in cache
            if (
              row.startCoords === neighborTaskLocationStringified &&
              row.endCoords === currentTaskLocationStringified
            ) {
              return true;
            }
            // check if path FROM currentTask TO neighborTask is found in cache
            if (
              row.startCoords === currentTaskLocationStringified &&
              row.endCoords === neighborTaskLocationStringified
            ) {
              return true;
            }
            // record in cache from neighborTask to currentTask was not found
            return false;
          })
        ) {
          // path to task from neighborTask was NOT found so this task is fucked

          // before add to pathsToCalculate check if it already there
          if (
            !pathsToCalculate.some((path) => {
              // check if path starts FROM neighborTask TO currentTaskLocation
              if (
                path.fromCoords === neighborTaskLocationStringified &&
                path.toCoords === currentTaskLocationStringified
              ) {
                return true;
              }
              // check if path starts FORM currentTaskLocation TO neighborTask
              if (
                path.fromCoords === currentTaskLocationStringified &&
                path.toCoords === neighborTaskLocationStringified
              ) {
                return true;
              }
              // path was not found
              return false;
            })
          ) {
            pathsToCalculate.push({
              fromTaskId: currentTask.id,
              toTaskId: neighborTask.id,
              fromCoords: neighborTaskLocationStringified,
              toCoords: currentTaskLocationStringified,
            });
          }
        }
      }
    }

    for (const path of pathsToCalculate) {
      await sleep({ ms: 2500 });

      await log({
        message: `Построение пути: ${path.fromCoords} -> ${path.toCoords} задачи: ${path.fromTaskId} -> ${path.toTaskId}`,
        code: 'PATHER',
      });

      let startCoords = [];
      let endCoords = [];

      try {
        startCoords = JSON.parse(path.fromCoords);
        endCoords = JSON.parse(path.toCoords);
      } catch (_) {
        continue;
      }

      try {
        const { distance, duration, coordinates } =
          await getDistanceWithOpenRouteService({
            startPoint: {
              latitude: startCoords[0],
              longitude: startCoords[1],
            },
            endPoint: {
              latitude: endCoords[0],
              longitude: endCoords[1],
            },
          });

        await DB.routing.create({
          data: {
            id: uuidv4(),
            distance,
            duration,
            pathCoords: JSON.stringify(coordinates),
            manual: false,
            startCoords: path.fromCoords,
            endCoords: path.toCoords,
          },
        });
      } catch (error) {
        console.error(error);
      }
    }

    const updatedCache = await DB.routing.findMany();

    if (!updatedCache.length) {
      throw new Error('Таблица маршрутизации пуста');
    }

    await log({
      message: 'Маршрутизация завершена',
      code: 'PATHER',
    });

    const unsafeTasks: {
      id: number;
      assigned: boolean;
      longitude: number;
      latitude: number;
      demand: number;
      createdAt: Date;
      assignedAt: Date | null;
      assignmentId: number | null;
    }[] = [];
    const safeTasks: {
      id: number;
      assigned: boolean;
      longitude: number;
      latitude: number;
      demand: number;
      createdAt: Date;
      assignedAt: Date | null;
      assignmentId: number | null;
    }[] = [];

    for (let i = 0; i < tasks.length; i++) {
      //! depotLocation must be string like '[latitude,longitude]'
      // first of all check if path from depot to task is found
      // if not path from depot to task is not found well we already fucked
      const currentTask = tasks[i];
      const currentTaskLocation = [currentTask.latitude, currentTask.longitude];
      const currentTaskLocationStringified =
        JSON.stringify(currentTaskLocation);

      if (
        !updatedCache.some((row) => {
          // check if path FROM depot TO currentTask is found in cache
          if (
            row.startCoords === depotLocation &&
            row.endCoords === currentTaskLocationStringified
          ) {
            return true;
          }
          // check if path FROM currentTask TO depot is found in cache
          if (
            row.startCoords === currentTaskLocationStringified &&
            row.endCoords === depotLocation
          ) {
            return true;
          }
          // record in cache from depot to currentTask was not found
          return false;
        })
      ) {
        // path to task from depot was NOT found so this task is fucked

        // before add to unsafeTasks check if it already there
        if (!unsafeTasks.find((task) => task.id == currentTask.id)) {
          unsafeTasks.push(currentTask);
          continue;
        }
      }

      let saveFlag = true;

      // second check if path from currentTask to EVERY neighbor was found
      for (let j = i + 1; j < tasks.length; j++) {
        const neighborTask = tasks[j];
        const neighborTaskLocation = [
          neighborTask.latitude,
          neighborTask.longitude,
        ];
        const neighborTaskLocationStringified =
          JSON.stringify(neighborTaskLocation);

        if (
          !updatedCache.some((row) => {
            // check if path FROM neighborTask TO currentTask is found in cache
            if (
              row.startCoords === neighborTaskLocationStringified &&
              row.endCoords === currentTaskLocationStringified
            ) {
              return true;
            }
            // check if path FROM currentTask TO neighborTask is found in cache
            if (
              row.startCoords === currentTaskLocationStringified &&
              row.endCoords === neighborTaskLocationStringified
            ) {
              return true;
            }
            // record in cache from neighborTask to currentTask was not found
            return false;
          })
        ) {
          // path to task from neighborTask was NOT found so this task is fucked

          // before add to pathsToCalculate check if it already there
          if (!unsafeTasks.find((task) => task.id == neighborTask.id)) {
            unsafeTasks.push(neighborTask);
            saveFlag = false;
            continue;
          }
        }
      }

      if (saveFlag) {
        safeTasks.push(currentTask);
      }
    }
    if (!safeTasks.length) {
      throw new Error(
        'Не удалось составить таблицу маршрутов ни для одной задачи'
      );
    }

    safeTasks.unshift({
      id: -1,
      demand: 0,
      assigned: false,
      createdAt: new Date(),
      assignedAt: null,
      assignmentId: null,
      longitude: depot.longitude,
      latitude: depot.latitude,
    });

    const distancesMatrix: number[][] = [];
    const demands: number[] = [];
    const nodesMap: Record<string, number> = {};

    let counter = 0;

    for (let i = 0; i < safeTasks.length; i++) {
      const currentTask = safeTasks[i];
      const currentTaskLocation = [currentTask.latitude, currentTask.longitude];
      const currentTaskLocationStringified =
        JSON.stringify(currentTaskLocation);

      const before = safeTasks.slice(0, i);
      const after = safeTasks.slice(i + 1);

      let unsafeFlag = false;

      const afterDistances = after
        .map((nextTask) => {
          const nextTaskLocation = [nextTask.latitude, nextTask.longitude];
          const nextTaskLocationStringified = JSON.stringify(nextTaskLocation);

          const path = updatedCache.find(
            (path) =>
              (path.startCoords === currentTaskLocationStringified &&
                path.endCoords === nextTaskLocationStringified) ||
              (path.startCoords === nextTaskLocationStringified &&
                path.endCoords === currentTaskLocationStringified)
          );

          if (path) {
            return path.distance;
          } else {
            unsafeFlag = true;
            console.log(
              'По какой-то причине не найден был пусть между двумя задачами'
            );
            return undefined;
          }
        })
        .filter((v) => v != null) as number[];

      const beforeDistances = before
        .map((nextTask) => {
          const nextTaskLocation = [nextTask.latitude, nextTask.longitude];
          const nextTaskLocationStringified = JSON.stringify(nextTaskLocation);

          const path = updatedCache.find(
            (path) =>
              (path.startCoords === currentTaskLocationStringified &&
                path.endCoords === nextTaskLocationStringified) ||
              (path.startCoords === nextTaskLocationStringified &&
                path.endCoords === currentTaskLocationStringified)
          );

          if (path) {
            return path.distance;
          } else {
            console.log(
              'По какой-то причине не найден был пусть между двумя задачами'
            );
            unsafeFlag = true;
            return undefined;
          }
        })
        .filter((v) => v != null) as number[];

      if (!unsafeFlag) {
        const row = [...beforeDistances, 0, ...afterDistances];
        demands.push(currentTask.demand);
        nodesMap[counter] = currentTask.id;
        distancesMatrix.push(row);
        counter++;
      }
    }

    //TODO: На оч больших capacity алгоритм ломается ?????
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

    console.log('start');

    const beeClarke = await bee({ problem, useClarke: true });

    console.log('end');

    res.json(beeClarke);
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json((error as Error).message);
  }
});

router.post('/calculate', async (req, res, next) => {
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

    // get depot location from settings
    const settings = await DB.settings.findFirst({ where: { id: -1 } });

    if (!settings) {
      throw new Error('Параметры системы не обнаружены');
    }

    const { depotLocation, routingAlgo, routingAlgoIterations } = settings;

    if (!depotLocation || !routingAlgo || !routingAlgoIterations) {
      throw new Error(
        'Параметры системы повреждены и не доступны на данный момент для использования'
      );
    }

    const depot = {
      id: -1,
      longitude: NaN,
      latitude: NaN,
      demand: 0,
    };

    try {
      const _depotLocation = JSON.parse(depotLocation);
      if (!Array.isArray(_depotLocation)) {
        throw new Error(
          'Параметры системы повреждены и не доступны на данный момент для использования'
        );
      }
      const latitude = parseFloat(_depotLocation[0]);
      const longitude = parseFloat(_depotLocation[1]);
      if (isNaN(longitude) || isNaN(latitude)) {
        throw new Error(
          'Параметры системы повреждены и не доступны на данный момент для использования'
        );
      }
      depot.latitude = latitude;
      depot.longitude = longitude;
    } catch (_) {
      throw new Error(
        'Параметры системы повреждены и не доступны на данный момент для использования'
      );
    }

    let cache: {
      id: string;
      distance: number;
      duration: number;
      startCoords: string;
      endCoords: string;
      manual: boolean;
      pathCoords: string | null;
    }[] = [];

    const _cache = await DB.routing.findMany({
      orderBy: {
        createdAt: 'asc',
      },
    });

    for (let row of _cache) {
      try {
        const startCoords = JSON.parse(row.startCoords);
        if (!Array.isArray(startCoords) || startCoords.length !== 2) {
          continue;
        }
        const endCoords = JSON.parse(row.endCoords);
        if (!Array.isArray(endCoords) || endCoords.length !== 2) {
          continue;
        }
        cache.push({
          ...row,
        });
      } catch (_) {
        continue;
      }
    }

    // check missing cache hits
    await log({
      message: 'Запущена маршрутизация',
      code: 'PATHER',
    });

    // tasks to route
    const pathsToCalculate: {
      fromCoords: string;
      toCoords: string;
      fromTaskId: number;
      toTaskId: number;
    }[] = [];

    for (let i = 0; i < tasks.length; i++) {
      //! depotLocation must be string like '[latitude,longitude]'
      // first of all check if path from depot to task is found
      // if not path from depot to task is not found well we already fucked
      const currentTask = tasks[i];
      const currentTaskLocation = [currentTask.latitude, currentTask.longitude];
      const currentTaskLocationStringified =
        JSON.stringify(currentTaskLocation);

      if (
        !cache.some((row) => {
          // check if path FROM depot TO currentTask is found in cache
          if (
            row.startCoords === depotLocation &&
            row.endCoords === currentTaskLocationStringified
          ) {
            return true;
          }
          // check if path FROM currentTask TO depot is found in cache
          if (
            row.startCoords === currentTaskLocationStringified &&
            row.endCoords === depotLocation
          ) {
            return true;
          }
          // record in cache from depot to currentTask was not found
          return false;
        })
      ) {
        // path to task from depot was NOT found so this task is fucked

        // before add to pathsToCalculate check if it already there
        if (
          !pathsToCalculate.some((path) => {
            // check if path starts FROM depot TO currentTaskLocation
            if (
              path.fromCoords === depotLocation &&
              path.toCoords === currentTaskLocationStringified
            ) {
              return true;
            }
            // check if path starts FORM currentTaskLocation TO depot
            if (
              path.fromCoords === currentTaskLocationStringified &&
              path.toCoords === depotLocation
            ) {
              return true;
            }
            // path was not found
            return false;
          })
        ) {
          pathsToCalculate.push({
            fromCoords: depotLocation,
            toCoords: currentTaskLocationStringified,
            fromTaskId: -1,
            toTaskId: currentTask.id,
          });
        }
      }

      // second check if path from currentTask to EVERY neighbor was found
      for (let j = i + 1; j < tasks.length; j++) {
        const neighborTask = tasks[j];
        const neighborTaskLocation = [
          neighborTask.latitude,
          neighborTask.longitude,
        ];
        const neighborTaskLocationStringified =
          JSON.stringify(neighborTaskLocation);

        if (
          !cache.some((row) => {
            // check if path FROM neighborTask TO currentTask is found in cache
            if (
              row.startCoords === neighborTaskLocationStringified &&
              row.endCoords === currentTaskLocationStringified
            ) {
              return true;
            }
            // check if path FROM currentTask TO neighborTask is found in cache
            if (
              row.startCoords === currentTaskLocationStringified &&
              row.endCoords === neighborTaskLocationStringified
            ) {
              return true;
            }
            // record in cache from neighborTask to currentTask was not found
            return false;
          })
        ) {
          // path to task from neighborTask was NOT found so this task is fucked

          // before add to pathsToCalculate check if it already there
          if (
            !pathsToCalculate.some((path) => {
              // check if path starts FROM neighborTask TO currentTaskLocation
              if (
                path.fromCoords === neighborTaskLocationStringified &&
                path.toCoords === currentTaskLocationStringified
              ) {
                return true;
              }
              // check if path starts FORM currentTaskLocation TO neighborTask
              if (
                path.fromCoords === currentTaskLocationStringified &&
                path.toCoords === neighborTaskLocationStringified
              ) {
                return true;
              }
              // path was not found
              return false;
            })
          ) {
            pathsToCalculate.push({
              fromTaskId: currentTask.id,
              toTaskId: neighborTask.id,
              fromCoords: neighborTaskLocationStringified,
              toCoords: currentTaskLocationStringified,
            });
          }
        }
      }
    }

    for (const path of pathsToCalculate) {
      await sleep({ ms: 2500 });

      await log({
        message: `Построение пути: ${path.fromCoords} -> ${path.toCoords} задачи: ${path.fromTaskId} -> ${path.toTaskId}`,
        code: 'PATHER',
      });

      let startCoords = [];
      let endCoords = [];

      try {
        startCoords = JSON.parse(path.fromCoords);
        endCoords = JSON.parse(path.toCoords);
      } catch (_) {
        continue;
      }

      try {
        const { distance, duration, coordinates } =
          await getDistanceWithOpenRouteService({
            startPoint: {
              latitude: startCoords[0],
              longitude: startCoords[1],
            },
            endPoint: {
              latitude: endCoords[0],
              longitude: endCoords[1],
            },
          });

        await DB.routing.create({
          data: {
            id: uuidv4(),
            distance,
            duration,
            pathCoords: JSON.stringify(coordinates),
            manual: false,
            startCoords: path.fromCoords,
            endCoords: path.toCoords,
          },
        });
      } catch (error) {
        console.error(error);
      }
    }

    const updatedCache = await DB.routing.findMany();

    if (!updatedCache.length) {
      throw new Error('Таблица маршрутизации пуста');
    }

    await log({
      message: 'Маршрутизация завершена',
      code: 'PATHER',
    });

    const unsafeTasks: {
      id: number;
      assigned: boolean;
      longitude: number;
      latitude: number;
      demand: number;
      createdAt: Date;
      assignedAt: Date | null;
      assignmentId: number | null;
    }[] = [];
    const safeTasks: {
      id: number;
      assigned: boolean;
      longitude: number;
      latitude: number;
      demand: number;
      createdAt: Date;
      assignedAt: Date | null;
      assignmentId: number | null;
    }[] = [];

    for (let i = 0; i < tasks.length; i++) {
      //! depotLocation must be string like '[latitude,longitude]'
      // first of all check if path from depot to task is found
      // if not path from depot to task is not found well we already fucked
      const currentTask = tasks[i];
      const currentTaskLocation = [currentTask.latitude, currentTask.longitude];
      const currentTaskLocationStringified =
        JSON.stringify(currentTaskLocation);

      if (
        !updatedCache.some((row) => {
          // check if path FROM depot TO currentTask is found in cache
          if (
            row.startCoords === depotLocation &&
            row.endCoords === currentTaskLocationStringified
          ) {
            return true;
          }
          // check if path FROM currentTask TO depot is found in cache
          if (
            row.startCoords === currentTaskLocationStringified &&
            row.endCoords === depotLocation
          ) {
            return true;
          }
          // record in cache from depot to currentTask was not found
          return false;
        })
      ) {
        // path to task from depot was NOT found so this task is fucked

        // before add to unsafeTasks check if it already there
        if (!unsafeTasks.find((task) => task.id == currentTask.id)) {
          unsafeTasks.push(currentTask);
          continue;
        }
      }

      let saveFlag = true;

      // second check if path from currentTask to EVERY neighbor was found
      for (let j = i + 1; j < tasks.length; j++) {
        const neighborTask = tasks[j];
        const neighborTaskLocation = [
          neighborTask.latitude,
          neighborTask.longitude,
        ];
        const neighborTaskLocationStringified =
          JSON.stringify(neighborTaskLocation);

        if (
          !updatedCache.some((row) => {
            // check if path FROM neighborTask TO currentTask is found in cache
            if (
              row.startCoords === neighborTaskLocationStringified &&
              row.endCoords === currentTaskLocationStringified
            ) {
              return true;
            }
            // check if path FROM currentTask TO neighborTask is found in cache
            if (
              row.startCoords === currentTaskLocationStringified &&
              row.endCoords === neighborTaskLocationStringified
            ) {
              return true;
            }
            // record in cache from neighborTask to currentTask was not found
            return false;
          })
        ) {
          // path to task from neighborTask was NOT found so this task is fucked

          // before add to pathsToCalculate check if it already there
          if (!unsafeTasks.find((task) => task.id == neighborTask.id)) {
            unsafeTasks.push(neighborTask);
            saveFlag = false;
            continue;
          }
        }
      }

      if (saveFlag) {
        safeTasks.push(currentTask);
      }
    }
    if (!safeTasks.length) {
      throw new Error(
        'Не удалось составить таблицу маршрутов ни для одной задачи'
      );
    }

    safeTasks.unshift({
      id: -1,
      demand: 0,
      assigned: false,
      createdAt: new Date(),
      assignedAt: null,
      assignmentId: null,
      longitude: depot.longitude,
      latitude: depot.latitude,
    });

    const distancesMatrix: number[][] = [];
    const demands: number[] = [];
    const nodesMap: Record<string, number> = {};

    let counter = 0;

    for (let i = 0; i < safeTasks.length; i++) {
      const currentTask = safeTasks[i];
      const currentTaskLocation = [currentTask.latitude, currentTask.longitude];
      const currentTaskLocationStringified =
        JSON.stringify(currentTaskLocation);

      const before = safeTasks.slice(0, i);
      const after = safeTasks.slice(i + 1);

      let unsafeFlag = false;

      const afterDistances = after
        .map((nextTask) => {
          const nextTaskLocation = [nextTask.latitude, nextTask.longitude];
          const nextTaskLocationStringified = JSON.stringify(nextTaskLocation);

          const path = updatedCache.find(
            (path) =>
              (path.startCoords === currentTaskLocationStringified &&
                path.endCoords === nextTaskLocationStringified) ||
              (path.startCoords === nextTaskLocationStringified &&
                path.endCoords === currentTaskLocationStringified)
          );

          if (path) {
            return path.distance;
          } else {
            unsafeFlag = true;
            console.log(
              'По какой-то причине не найден был пусть между двумя задачами'
            );
            return undefined;
          }
        })
        .filter((v) => v != null) as number[];

      const beforeDistances = before
        .map((nextTask) => {
          const nextTaskLocation = [nextTask.latitude, nextTask.longitude];
          const nextTaskLocationStringified = JSON.stringify(nextTaskLocation);

          const path = updatedCache.find(
            (path) =>
              (path.startCoords === currentTaskLocationStringified &&
                path.endCoords === nextTaskLocationStringified) ||
              (path.startCoords === nextTaskLocationStringified &&
                path.endCoords === currentTaskLocationStringified)
          );

          if (path) {
            return path.distance;
          } else {
            console.log(
              'По какой-то причине не найден был пусть между двумя задачами'
            );
            unsafeFlag = true;
            return undefined;
          }
        })
        .filter((v) => v != null) as number[];

      if (!unsafeFlag) {
        const row = [...beforeDistances, 0, ...afterDistances];
        demands.push(currentTask.demand);
        nodesMap[counter] = currentTask.id;
        distancesMatrix.push(row);
        counter++;
      }
    }

    //TODO: На оч больших capacity алгоритм ломается ?????
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

    console.log('start');

    const beeClarke = await bee({ problem, useClarke: true });

    console.log('end');

    res.json(beeClarke);
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json((error as Error).message);
  }
});

router.get('/document', async (req, res, next) => {
  import('docx').then((_docx) => {
    const docx = _docx as any;
    const {
      ExternalHyperlink,
      HeadingLevel,
      Paragraph,
      patchDocument,
      PatchType,
      Table,
      TableCell,
      TableRow,
      TextDirection,
      TextRun,
      VerticalAlign,
    } = docx;

    patchDocument(
      fs.readFileSync(resolve(process.cwd(), './simple-template.docx')),
      {
        outputType: 'nodebuffer',
        patches: {
          name: {
            type: PatchType.PARAGRAPH,
            children: [
              new TextRun('Sir. '),
              new TextRun('John Doe'),
              new TextRun('(The Conqueror)'),
            ],
          },
          header_adjective: {
            type: PatchType.PARAGRAPH,
            children: [new TextRun('Delightful Header')],
          },
          footer_text: {
            type: PatchType.PARAGRAPH,
            children: [
              new TextRun('replaced just as'),
              new TextRun(' well'),
              new ExternalHyperlink({
                children: [
                  new TextRun({
                    text: 'BBC News Link',
                  }),
                ],
                link: 'https://www.bbc.co.uk/news',
              }),
            ],
          },
          table: {
            type: PatchType.DOCUMENT,
            children: [
              new Table({
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph({}), new Paragraph({})],
                        verticalAlign: VerticalAlign.CENTER,
                      }),
                      new TableCell({
                        children: [new Paragraph({}), new Paragraph({})],
                        verticalAlign: VerticalAlign.CENTER,
                      }),
                      new TableCell({
                        children: [
                          new Paragraph({ text: 'bottom to top' }),
                          new Paragraph({}),
                        ],
                        textDirection:
                          TextDirection.BOTTOM_TO_TOP_LEFT_TO_RIGHT,
                      }),
                      new TableCell({
                        children: [
                          new Paragraph({ text: 'top to bottom' }),
                          new Paragraph({}),
                        ],
                        textDirection:
                          TextDirection.TOP_TO_BOTTOM_RIGHT_TO_LEFT,
                      }),
                    ],
                  }),
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [
                          new Paragraph({
                            text: 'Blah Blah Blah Blah Blah Blah Blah Blah Blah Blah Blah Blah Blah Blah Blah Blah Blah Blah Blah Blah Blah Blah Blah Blah Blah',
                            heading: HeadingLevel.HEADING_1,
                          }),
                        ],
                      }),
                      new TableCell({
                        children: [
                          new Paragraph({
                            text: 'This text should be in the middle of the cell',
                          }),
                        ],
                        verticalAlign: VerticalAlign.CENTER,
                      }),
                      new TableCell({
                        children: [
                          new Paragraph({
                            text: 'Text above should be vertical from bottom to top',
                          }),
                        ],
                        verticalAlign: VerticalAlign.CENTER,
                      }),
                      new TableCell({
                        children: [
                          new Paragraph({
                            text: 'Text above should be vertical from top to bottom',
                          }),
                        ],
                        verticalAlign: VerticalAlign.CENTER,
                      }),
                    ],
                  }),
                ],
              }),
            ],
          },
        },
      }
    ).then((doc: any) => {
      fs.writeFileSync('My Document.docx', doc);
    });

    res.json(resolve(process.cwd(), './simple-template.docx'));
  });
});

// router.get('/cache', async (req, res) => {
//   try {
//     const cache = await Cacher.read();

//     for (const row of cache) {

//     }

//     res.json(cache);
//   } catch (error) {
//     res
//       .status(StatusCodes.INTERNAL_SERVER_ERROR)
//       .json((error as Error).message);
//   }
// });
