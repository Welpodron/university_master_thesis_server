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
import { getRouteCapacity, getSolutionRoutesFlat } from '../../solvers/utils';
import { Mailer } from '../../mailer';

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

router.get(`/works`, auth(USER_ROLES.DRIVER), async (req, res) => {
  try {
    const assignments = await DB.assignment.findMany({
      where: {
        userId: (req as any)?.user?.id ?? -1,
      },
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

    const users = await DB.user.findMany({
      where: {
        role: 'DRIVER',
      },
    });

    if (!users.length) {
      throw new Error('На данный момент не имеется доступного персонала');
    }

    // get depot location from settings
    const settings = await DB.settings.findFirst({ where: { id: -1 } });

    if (!settings) {
      throw new Error('Параметры системы не обнаружены');
    }

    const { depotLocation, routingAlgoIterations, routingKey } = settings;

    if (!depotLocation || !routingAlgoIterations) {
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

    const brokenTasksIds = new Set<number>();
    const readyToWriteToDBAssignments = [];

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
          console.log(
            `Внимание! Обнаружена поврежденная строка кэша с id: ${row.id}`
          );
          continue;
        }
        const endCoords = JSON.parse(row.endCoords);
        if (!Array.isArray(endCoords) || endCoords.length !== 2) {
          console.log(
            `Внимание! Обнаружена поврежденная строка кэша с id: ${row.id}`
          );
          continue;
        }
        cache.push({
          ...row,
        });
      } catch (_) {
        console.log(
          `Внимание! Обнаружена поврежденная строка кэша с id: ${row.id}`
        );
        continue;
      }
    }

    if (!routingKey.trim().length) {
      await log({
        message: `Не найден ключ автоматической маршрутизации, автоматическая маршрутизация отключена`,
        code: 'PATHER',
      });
    } else {
      await log({
        message: 'Запущена автоматическая маршрутизация',
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
        const currentTaskLocation = [
          currentTask.latitude,
          currentTask.longitude,
        ];
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
              apiKey: routingKey.trim(),
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

      await log({
        message: 'Автоматическая маршрутизация завершена',
        code: 'PATHER',
      });
    }

    const updatedCache = await DB.routing.findMany();

    if (!updatedCache.length) {
      throw new Error('Таблица маршрутизации пуста');
    }

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
        console.log(
          `Не удалось проложить маршрут между задачами: ${-1} <-> ${
            currentTask.id
          }`
        );
        // before add to unsafeTasks check if it already there
        brokenTasksIds.add(currentTask.id);
        continue;
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
          console.log(
            `Не удалось проложить маршрут между задачами: ${currentTask.id} <-> ${neighborTask.id}`
          );
          // before add to pathsToCalculate check if it already there
          brokenTasksIds.add(neighborTask.id);
          saveFlag = false;
          continue;
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
            if (currentTask.id !== -1) {
              brokenTasksIds.add(currentTask.id);
            }
            if (nextTask.id !== -1) {
              brokenTasksIds.add(nextTask.id);
            }

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
            if (currentTask.id !== -1) {
              brokenTasksIds.add(currentTask.id);
            }
            if (nextTask.id !== -1) {
              brokenTasksIds.add(nextTask.id);
            }
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

    const beeClarke = await bee({
      problem,
      useClarke: true,
      iterations: routingAlgoIterations,
    });

    console.log('end');

    // console.log(nodesMap);

    let taskedRoutes = getSolutionRoutesFlat({ solution: beeClarke });

    const readyToAssignTasksIds = new Set<number>();

    const readyAssignments = taskedRoutes.map((route) => {
      let tasks = route.map((path) => nodesMap[path]);
      const capacity = getRouteCapacity({ route, demands: problem.demands });

      let distanceInKilometers = 0;
      let durationInHours = 0;
      let brokenFlag = false;

      for (let i = 0; i < tasks.length - 1; i++) {
        const currentTaskId = tasks[i];
        const nextTaskId = tasks[i + 1];

        const currentTask = safeTasks.find((task) => task.id == currentTaskId);

        if (!currentTask) {
          brokenFlag = true;
          if (currentTaskId !== -1) {
            console.log(`Обнаружена сломанная задача: ${currentTaskId}`);
            brokenTasksIds.add(currentTaskId);
          }
          break;
        }

        const nextTask = safeTasks.find((task) => task.id == nextTaskId);

        if (!nextTask) {
          brokenFlag = true;
          if (nextTaskId !== -1) {
            console.log(`Обнаружена сломанная задача: ${nextTaskId}`);
            brokenTasksIds.add(nextTaskId);
          }
          break;
        }

        const currentTaskLocation = [
          currentTask.latitude,
          currentTask.longitude,
        ];
        const currentTaskLocationStringified =
          JSON.stringify(currentTaskLocation);

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
          //! Потенциально исходные данные distance в метрах
          distanceInKilometers += path.distance / 1000;
          //! Потенциально исходные данные duration в секундах
          durationInHours += path.duration / 3600;
        } else {
          if (currentTaskId !== -1) {
            console.log(`Обнаружена задача без маршрута: ${currentTaskId}`);
            brokenTasksIds.add(currentTaskId);
          }
          if (nextTaskId !== -1) {
            console.log(`Обнаружена задача бер маршрута: ${nextTaskId}`);
            brokenTasksIds.add(nextTaskId);
          }
          brokenFlag = true;
          break;
        }
      }

      tasks = tasks.filter((v) => v != -1);

      if (!tasks.length) {
        brokenFlag = true;
      }

      if (!brokenFlag) {
        tasks.forEach((task) => {
          if (task != -1) {
            readyToAssignTasksIds.add(task);
          }
        });
      }

      return {
        tasks,
        capacity,
        durationInHours,
        distanceInKilometers,
        brokenFlag,
      };
    });

    let trucksAssignment = structuredClone(vehicles);

    for (const assignment of readyAssignments) {
      // find first truck that meet capacity criteria
      let firstReady = trucksAssignment.findIndex(
        (truck) => truck.capacity >= assignment.capacity
      );
      if (firstReady == -1) {
        trucksAssignment = structuredClone(vehicles);
      }
      firstReady = trucksAssignment.findIndex(
        (truck) => truck.capacity >= assignment.capacity
      );
      if (firstReady == -1) {
        for (const task of assignment.tasks) {
          console.log(
            `Обнаружена задача, которая не может быть назначена ни одному транспорту: ${task}`
          );
          brokenTasksIds.add(task);
          readyToAssignTasksIds.delete(task);
        }
        continue;
      }
      trucksAssignment[firstReady].capacity =
        trucksAssignment[firstReady].capacity - assignment.capacity;
      readyToWriteToDBAssignments.push({
        ...assignment,
        vehicleId: trucksAssignment[firstReady].id,
        userId: users[Math.floor(Math.random() * users.length)].id,
      });
    }

    for (const assignment of readyToWriteToDBAssignments) {
      try {
        const _assignment = await DB.assignment.create({
          data: {
            userId: assignment.userId,
            vehicleId: assignment.vehicleId,
            tasks: {
              connect: assignment.tasks.map((id) => ({ id })),
            },
          },
        });

        for (const taskId of assignment.tasks) {
          await DB.task.update({
            where: {
              id: taskId,
            },
            data: {
              assigned: true,
              assignedAt: new Date(),
              assignmentId: _assignment.id,
            },
          });
        }
      } catch (error) {
        console.log(error);
      }
    }

    if (brokenTasksIds.size) {
      console.log(
        `Сломанные задачи требуют дальнейшего рассмотрения: ${brokenTasksIds}`
      );

      //! Сломанные задачи распределяются между дополнительным транспортом по степени загруженности
      //! Если задача не может быть назначена ни одному дополнительному транспорту данная задача отправляется
      //! Главному менеджеру компании для дальнейшего рассмотрения причин (в ней будет указана потенциальная причина)
    }

    res.json(readyToWriteToDBAssignments);
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json((error as Error).message);
  }
});

router.get('/document/:id', async (req, res, next) => {
  import('docx').then((_docx) => {
    (async () => {
      try {
        const { id } = req.params;

        const assignment = await DB.assignment.findFirst({
          where: {
            id: Number(id),
          },
          include: {
            user: true,
            vehicle: true,
            tasks: true,
          },
        });

        if (!assignment) {
          throw new Error(
            'Не найдено назначение для создания маршрутного листа'
          );
        }

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
          WidthType,
        } = docx;

        patchDocument(
          fs.readFileSync(
            resolve(process.cwd(), './ROUTING_LIST_TEMPLATE.docx')
          ),
          {
            outputType: 'nodebuffer',
            patches: {
              worker_name: {
                type: PatchType.PARAGRAPH,
                children: [
                  new TextRun({
                    text: `[${assignment.userId ?? ''}] ${
                      assignment.user?.name ?? ''
                    }`,
                    font: 'Times New Roman',
                  }),
                ],
              },
              worker_role: {
                type: PatchType.PARAGRAPH,
                children: [
                  new TextRun({
                    text: 'Водитель',
                    font: 'Times New Roman',
                  }),
                ],
              },
              transport: {
                type: PatchType.PARAGRAPH,
                children: [
                  new TextRun({
                    text: `[${assignment.vehicleId ?? ''}] ${
                      assignment.vehicle?.name ?? ''
                    }`,
                    font: 'Times New Roman',
                  }),
                ],
              },
              number: {
                type: PatchType.PARAGRAPH,
                children: [
                  new TextRun({
                    text: String(assignment.id),
                    font: 'Times New Roman',
                  }),
                ],
              },
              date: {
                type: PatchType.PARAGRAPH,
                children: [
                  new TextRun({
                    text: `${assignment.createdAt.getDate()}.${assignment.createdAt.getMonth()}.${assignment.createdAt.getFullYear()}`,
                    font: 'Times New Roman',
                  }),
                ],
              },
              table: {
                type: PatchType.DOCUMENT,
                children: [
                  new Table({
                    columnWidths: [2252.5, 2252.5, 4505],
                    rows: [
                      new TableRow({
                        children: [
                          new TableCell({
                            width: {
                              size: 2252.5,
                              type: WidthType.DXA,
                            },
                            children: [
                              new Paragraph({
                                children: [
                                  new TextRun({
                                    text: '№ Задачи',
                                    font: 'Times New Roman',
                                  }),
                                ],
                              }),
                            ],
                            verticalAlign: VerticalAlign.CENTER,
                          }),
                          new TableCell({
                            width: {
                              size: 2252.5,
                              type: WidthType.DXA,
                            },
                            children: [
                              new Paragraph({
                                children: [
                                  new TextRun({
                                    text: 'Запрос',
                                    font: 'Times New Roman',
                                  }),
                                ],
                              }),
                            ],
                            verticalAlign: VerticalAlign.CENTER,
                          }),
                          new TableCell({
                            width: {
                              size: 4505,
                              type: WidthType.DXA,
                            },
                            children: [
                              new Paragraph({
                                children: [
                                  new TextRun({
                                    text: 'Координаты',
                                    font: 'Times New Roman',
                                  }),
                                ],
                              }),
                            ],
                            verticalAlign: VerticalAlign.CENTER,
                          }),
                        ],
                      }),
                      ...assignment.tasks.map((task) => {
                        return new TableRow({
                          children: [
                            new TableCell({
                              width: {
                                size: 2252.5,
                                type: WidthType.DXA,
                              },
                              children: [
                                new Paragraph({
                                  children: [
                                    new TextRun({
                                      text: String(task.id),
                                      font: 'Times New Roman',
                                    }),
                                  ],
                                }),
                              ],
                              verticalAlign: VerticalAlign.CENTER,
                            }),
                            new TableCell({
                              width: {
                                size: 2252.5,
                                type: WidthType.DXA,
                              },
                              children: [
                                new Paragraph({
                                  children: [
                                    new TextRun({
                                      text: String(task.demand),
                                      font: 'Times New Roman',
                                    }),
                                  ],
                                }),
                              ],
                              verticalAlign: VerticalAlign.CENTER,
                            }),
                            new TableCell({
                              width: {
                                size: 4505,
                                type: WidthType.DXA,
                              },
                              children: [
                                new Paragraph({
                                  children: [
                                    // new ExternalHyperlink({
                                    //   children: [
                                    //     new TextRun({
                                    //       text: 'This is an external link!',
                                    //       style: 'Hyperlink',
                                    //     }),
                                    //   ],
                                    //   link: `https://yandex.ru/maps/`,
                                    // }),
                                    new TextRun({
                                      text: `${task.latitude}, ${task.longitude}`,
                                      font: 'Times New Roman',
                                    }),
                                    // new ExternalHyperlink({
                                    //   children: [
                                    //     new TextRun({
                                    //       text: `${task.latitude}, ${task.longitude}`,
                                    //       font: 'Times New Roman',
                                    //     }),
                                    //   ],
                                    //   link: `https://yandex.ru/maps/?ll=${task.longitude}%2C${task.latitude}&mode=search&sll=${task.longitude}%2C${task.latitude}&text=${task.latitude}%2C${task.longitude}&z=17`,
                                    // }),
                                  ],
                                }),
                              ],
                              verticalAlign: VerticalAlign.CENTER,
                            }),
                          ],
                        });
                      }),
                    ],
                  }),
                ],
              },
            },
          }
        ).then((doc: any) => {
          res.writeHead(200, {
            'Content-Disposition': `attachment; filename=${encodeURI(
              `Маршрутный лист №${assignment.id}.docx`
            )}`,
            'Content-Type':
              'application/application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          });
          res.end(doc, 'binary');
          // fs.writeFileSync('My Document.docx', doc);
        });

        // res.json(resolve(process.cwd(), './simple-template.docx'));
      } catch (error) {
        res.status(500).json((error as Error).message);
      }
    })();
  });
});

router.get('/notify/:id', async (req, res, next) => {
  import('docx').then((_docx) => {
    (async () => {
      try {
        const { id } = req.params;

        const assignment = await DB.assignment.findFirst({
          where: {
            id: Number(id),
          },
          include: {
            user: true,
            vehicle: true,
            tasks: true,
          },
        });

        if (!assignment) {
          throw new Error('Не найдено назначение');
        }

        if (!assignment?.user) {
          throw new Error(
            'Не найден сотрудник назначенный на данное назначение'
          );
        }

        if (!assignment?.vehicle) {
          throw new Error(
            'Не найден транспорт назначенный на данное назначение'
          );
        }

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
          WidthType,
        } = docx;

        patchDocument(
          fs.readFileSync(
            resolve(process.cwd(), './ROUTING_LIST_TEMPLATE.docx')
          ),
          {
            outputType: 'nodebuffer',
            patches: {
              worker_name: {
                type: PatchType.PARAGRAPH,
                children: [
                  new TextRun({
                    text: `[${assignment.userId ?? ''}] ${
                      assignment.user?.name ?? ''
                    }`,
                    font: 'Times New Roman',
                  }),
                ],
              },
              worker_role: {
                type: PatchType.PARAGRAPH,
                children: [
                  new TextRun({
                    text: 'Водитель',
                    font: 'Times New Roman',
                  }),
                ],
              },
              transport: {
                type: PatchType.PARAGRAPH,
                children: [
                  new TextRun({
                    text: `[${assignment.vehicleId ?? ''}] ${
                      assignment.vehicle?.name ?? ''
                    }`,
                    font: 'Times New Roman',
                  }),
                ],
              },
              number: {
                type: PatchType.PARAGRAPH,
                children: [
                  new TextRun({
                    text: String(assignment.id),
                    font: 'Times New Roman',
                  }),
                ],
              },
              date: {
                type: PatchType.PARAGRAPH,
                children: [
                  new TextRun({
                    text: `${assignment.createdAt.getDate()}.${assignment.createdAt.getMonth()}.${assignment.createdAt.getFullYear()}`,
                    font: 'Times New Roman',
                  }),
                ],
              },
              table: {
                type: PatchType.DOCUMENT,
                children: [
                  new Table({
                    columnWidths: [2252.5, 2252.5, 4505],
                    rows: [
                      new TableRow({
                        children: [
                          new TableCell({
                            width: {
                              size: 2252.5,
                              type: WidthType.DXA,
                            },
                            children: [
                              new Paragraph({
                                children: [
                                  new TextRun({
                                    text: '№ Задачи',
                                    font: 'Times New Roman',
                                  }),
                                ],
                              }),
                            ],
                            verticalAlign: VerticalAlign.CENTER,
                          }),
                          new TableCell({
                            width: {
                              size: 2252.5,
                              type: WidthType.DXA,
                            },
                            children: [
                              new Paragraph({
                                children: [
                                  new TextRun({
                                    text: 'Запрос',
                                    font: 'Times New Roman',
                                  }),
                                ],
                              }),
                            ],
                            verticalAlign: VerticalAlign.CENTER,
                          }),
                          new TableCell({
                            width: {
                              size: 4505,
                              type: WidthType.DXA,
                            },
                            children: [
                              new Paragraph({
                                children: [
                                  new TextRun({
                                    text: 'Координаты',
                                    font: 'Times New Roman',
                                  }),
                                ],
                              }),
                            ],
                            verticalAlign: VerticalAlign.CENTER,
                          }),
                        ],
                      }),
                      ...assignment.tasks.map((task) => {
                        return new TableRow({
                          children: [
                            new TableCell({
                              width: {
                                size: 2252.5,
                                type: WidthType.DXA,
                              },
                              children: [
                                new Paragraph({
                                  children: [
                                    new TextRun({
                                      text: String(task.id),
                                      font: 'Times New Roman',
                                    }),
                                  ],
                                }),
                              ],
                              verticalAlign: VerticalAlign.CENTER,
                            }),
                            new TableCell({
                              width: {
                                size: 2252.5,
                                type: WidthType.DXA,
                              },
                              children: [
                                new Paragraph({
                                  children: [
                                    new TextRun({
                                      text: String(task.demand),
                                      font: 'Times New Roman',
                                    }),
                                  ],
                                }),
                              ],
                              verticalAlign: VerticalAlign.CENTER,
                            }),
                            new TableCell({
                              width: {
                                size: 4505,
                                type: WidthType.DXA,
                              },
                              children: [
                                new Paragraph({
                                  children: [
                                    // new ExternalHyperlink({
                                    //   children: [
                                    //     new TextRun({
                                    //       text: 'This is an external link!',
                                    //       style: 'Hyperlink',
                                    //     }),
                                    //   ],
                                    //   link: `https://yandex.ru/maps/`,
                                    // }),
                                    new TextRun({
                                      text: `${task.latitude}, ${task.longitude}`,
                                      font: 'Times New Roman',
                                    }),
                                    // new ExternalHyperlink({
                                    //   children: [
                                    //     new TextRun({
                                    //       text: `${task.latitude}, ${task.longitude}`,
                                    //       font: 'Times New Roman',
                                    //     }),
                                    //   ],
                                    //   link: `https://yandex.ru/maps/?ll=${task.longitude}%2C${task.latitude}&mode=search&sll=${task.longitude}%2C${task.latitude}&text=${task.latitude}%2C${task.longitude}&z=17`,
                                    // }),
                                  ],
                                }),
                              ],
                              verticalAlign: VerticalAlign.CENTER,
                            }),
                          ],
                        });
                      }),
                    ],
                  }),
                ],
              },
            },
          }
        ).then((doc: any) => {
          Mailer.sendMail({
            from: process.env.MAIL_SMTP_USER,
            to: assignment.user?.email,
            subject: 'Уведомление о транспортном назначении',
            html: `Сообщаем вам о назначеном вам маршрутном листе, его содержимое во вложении:`,
            attachments: [
              {
                filename: `Маршрутный лист №${assignment.id}.docx`,
                content: doc,
              },
            ],
          })
            .then(() => {
              res.json(true);
            })
            .catch(() => {
              res.status(500).json('Ошибка при отправке уведомления');
            });
        });
      } catch (error) {
        res.status(500).json((error as Error).message);
      }
    })();
  });
});
