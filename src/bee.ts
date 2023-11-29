// TODO: Написать функцию fitness которая будет считать значение пригодности решения

import { getNeighborSolution } from './neighbor';
import {
  checkAllLocationsVisitedOnce,
  checkCapacity,
  checkDepotsPlacement,
} from './constrains';
import { ProblemType } from './reader';

// ! x в функции это 1 (i) solution/решение задачи оно представлено в виде массива маршрутов
export const getFitness = ({ solution }: { solution: number[][] }) => {
  return 1;
};

export const bee = ({ problem }: { problem: ProblemType }) => {
  // TODO: Реализовать многопоточность
  //! x ТУТ это массив решений solutions: Randomly generate a set of solutions as initial food source
  // TODO: Написать функцию generateSolutions которая будет генерировать решения и заполнять массив solutions
  const solutions: number[][][] = [];
  // ! fitnesses это массив значений пригодности решений
  const fitnesses = solutions.map((solution) => getFitness({ solution }));
  // ! l это массив с нулями, его длина равна количеству решений см. пункт 3 https://sci-hub.ru/https://doi.org/10.1016/j.ejor.2011.06.006
  const l = new Array(solutions.length).fill(0);

  let v = 0;
  const maxIterations = 300;

  const onlookers = 10;

  const localSearchLimit = 10;

  while (v < maxIterations) {
    //! Начало раздела a)
    solutions.forEach((solution, solutionIndex) => {
      // ! Пункт i. раздела a)
      const neighborhoodSolution = getNeighborSolution({ solution });
      // ! Пункт ii. раздела a)
      // Перед добавлением нужно проверить что решение удовлетворяет ограничениям ???
      if (
        checkDepotsPlacement({ routes: neighborhoodSolution }) &&
        checkCapacity({
          routes: neighborhoodSolution,
          capacity: problem.capacity,
          demands: problem.demands,
        }) &&
        checkAllLocationsVisitedOnce({
          routes: neighborhoodSolution,
          locations: new Array(problem.dimension - 1)
            .fill(0)
            .map((_, i) => i + 1),
        })
      ) {
        if (
          getFitness({ solution: neighborhoodSolution }) >
          getFitness({ solution })
        ) {
          solutions[solutionIndex] = neighborhoodSolution;
          fitnesses[solutionIndex] = getFitness({
            solution: neighborhoodSolution,
          });
          l[solutionIndex] = 0;
        } else {
          l[solutionIndex] = l[solutionIndex] + 1;
        }
      }
    });
    //! Конец раздела a)
    //! Начало раздела b)
    //   const G: number[][][][] = new Array(solutions.length).fill([]);
    const groups: number[][][][] = new Array(solutions.length).fill([]);
    //! Конец раздела b)
    //! Начало раздела c)
    // for (let _ = 0; _ < onlookers; _++) {
    //   // ! Пункт i. раздела c)
    //   // Select a solution using the fitness-based roulette wheel selection method
    //   // TODO: Написать функцию rouletteWheelSelection которая будет выбирать решение
    //   const solutionIndex = unknown;
    //   const solution = solutions[solutionIndex];
    //   // ! Пункт ii. раздела c)
    //   const neighborhoodSolution = getNeighborSolution({ solution });
    //   // ! Пункт iii. раздела c)
    //   // Перед добавлением нужно проверить что решение удовлетворяет ограничениям ???
    //   if (
    //     checkDepotsPlacement({ routes: neighborhoodSolution }) &&
    //     checkCapacity({
    //       routes: neighborhoodSolution,
    //       capacity: problem.capacity,
    //       demands: problem.demands,
    //     }) &&
    //     checkAllLocationsVisitedOnce({
    //       routes: neighborhoodSolution,
    //       locations: new Array(problem.dimension - 1)
    //         .fill(0)
    //         .map((_, i) => i + 1),
    //     })
    //   ) {
    //     // Добавим решение в группу с индексом solutionIndex
    //     groups[solutionIndex].push(neighborhoodSolution);
    //   }
    // }
    //! Конец раздела c)
    //! Начало раздела d)
    groups.forEach((group, groupIndex) => {
      if (group.length) {
        // ! Пункт i. раздела d)
        const groupFitnesses = group.map((solution) =>
          getFitness({ solution })
        );
        const { groupMaxFitness, groupMaxFitnessIndex } = groupFitnesses.reduce(
          (acc, fitness, index) => {
            if (fitness > acc.groupMaxFitness) {
              return { groupMaxFitness: fitness, groupMaxFitnessIndex: index };
            }
            return acc;
          },
          { groupMaxFitness: -Infinity, groupMaxFitnessIndex: -1 }
        );
        // ! Пункт ii. раздела d)
        if (groupMaxFitness > fitnesses[groupIndex]) {
          solutions[groupIndex] = group[groupMaxFitnessIndex];
          fitnesses[groupIndex] = groupMaxFitness;
          l[groupIndex] = 0;
        } else {
          l[groupIndex] = l[groupIndex] + 1;
        }
      }
    });
    //! Конец раздела d)
    //! Начало раздела e)
    solutions.forEach((solution, solutionIndex) => {
      if (l[solutionIndex] > localSearchLimit) {
        // ! Пункт i. раздела e)
        const neighborhoodSolution = getNeighborSolution({ solution });
        // Перед добавлением нужно проверить что решение удовлетворяет ограничениям ???
        if (
          checkDepotsPlacement({ routes: neighborhoodSolution }) &&
          checkCapacity({
            routes: neighborhoodSolution,
            capacity: problem.capacity,
            demands: problem.demands,
          }) &&
          checkAllLocationsVisitedOnce({
            routes: neighborhoodSolution,
            locations: new Array(problem.dimension - 1)
              .fill(0)
              .map((_, i) => i + 1),
          })
        ) {
          solutions[solutionIndex] = neighborhoodSolution;
        }
      }
    });
    //! Конец раздела e)
    v++;
  }
};
