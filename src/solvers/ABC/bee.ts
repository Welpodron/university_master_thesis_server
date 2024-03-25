// TODO: Написать функцию fitness которая будет считать значение пригодности решения

import { getNeighborSolution } from './neighbor';
import {
  checkAllLocationsVisitedOnce,
  checkCapacity,
  checkDepotsPlacement,
} from '../constrains';
import { ProblemType } from '../reader';
import {
  getSolutionTotalDistanceFlat,
  getSolutionRoutesCapacitiesFlatMax,
  generativeSolution,
} from '../utils';
import { isCapacityOKFlat } from '../_constrains';
import { search } from './local';
import { random } from './_neighbor';
import { clarke } from '../CLARKE/_clarke';

// ! x в функции это 1 (i) solution/решение задачи оно представлено в виде массива маршрутов
export const getFitness = ({
  solution,
  problem,
  alpha = 0.5,
}: {
  solution: number[];
  problem: ProblemType;
  alpha?: number;
}) => {
  const cost = getSolutionTotalDistanceFlat({
    solution,
    distancesMatrix: problem.distancesMatrix,
  });
  // console.log(cost);
  const q =
    getSolutionRoutesCapacitiesFlatMax({
      solution,
      demands: problem.demands,
    }) - problem.capacity;
  // console.log(q);
  return 1 / (cost + alpha * q);
};

export const getRoulette = ({ fitnesses }: { fitnesses: number[] }) => {
  const fitnessesSum = fitnesses.reduce((acc, fitness) => acc + fitness, 0);

  const probabilities = fitnesses.map((fitness) => fitness / fitnessesSum);

  // console.log(fitnesses);

  // Calculate the total sum of all the probabilities
  const totalSum = probabilities.reduce(
    (acc, probability) => acc + probability,
    0
  );

  // Generate a random number between 0 and the total sum
  let randomNum = Math.random() * totalSum;

  // Go through the elements, subtracting their probability from your random number
  for (let i = 0; i < probabilities.length; i++) {
    randomNum -= probabilities[i];

    // If randomNum is less than the current element's probability, return that element
    if (randomNum < 0) {
      return i;
    }
  }

  // If no element is found (which should not happen if probabilities are correctly set), return null
  throw new Error('getFitnessBasedRouletteWheelSelectionSolutionIndex');
};

export const bee = async ({
  problem,
  useClarke = true,
  iterations = 500,
}: {
  problem: ProblemType;
  useClarke?: boolean;
  iterations?: number;
}) => {
  if (problem.dimension == 2) {
    return [0, 1, 0];
  }

  // TODO: Реализовать многопоточность
  //! x ТУТ это массив решений solutions: Randomly generate a set of solutions as initial food source
  const solutions: number[][] = [];

  const tau = problem.dimension;

  const CLARKE_CACHED = clarke(problem);

  const solutionsByGenerations: { distance: number; generation: number }[] = [];

  for (let i = 0; i < tau; i++) {
    if (useClarke) {
      // CLARKE WRIGHT SOLUTIONS
      solutions.push(structuredClone(CLARKE_CACHED));
    } else {
      let generatedSolution = generativeSolution(problem);
      while (!generatedSolution) {
        generatedSolution = generativeSolution(problem);
      }
      solutions.push(generatedSolution);
    }
  }

  // console.log(CLARKE_CACHED);

  // ! fitnesses это массив значений пригодности решений

  // ! l это массив с нулями, его длина равна количеству решений см. пункт 3 https://sci-hub.ru/https://doi.org/10.1016/j.ejor.2011.06.006
  const counters = new Array(solutions.length).fill(0);

  let v = 0;
  // const maxIterations = problem.dimension > 100 ? 300 : 150;
  const maxIterations = iterations;

  const onlookers = 5;

  const localSearchLimit = problem.dimension;

  let alpha = problem.dimension / 100;
  let delta = 0.01;

  const ONLY_FEASIBLE = true;

  let fitnesses = solutions.map((solution) =>
    getFitness({ solution, problem })
  );

  // let distances = solutions.map((solution) =>
  //   getSolutionTotalDistanceFlat({
  //     solution,
  //     distancesMatrix: problem.distancesMatrix,
  //   })
  // );

  // distances.sort((a, b) => a - b);

  // console.log(distances);

  while (v < maxIterations) {
    // console.log(v);
    if (maxIterations > 300) {
      if (v % 250 === 0) {
        console.log('Iteration: ' + v);
      }
    } else {
      if (v % 100 === 0) {
        console.log('Iteration: ' + v);
      }
    }

    fitnesses = solutions.map((solution) => getFitness({ solution, problem }));

    // console.log('fitnesses');
    //! Начало раздела a)
    for (let i = 0; i < tau; i++) {
      /*
      # for each food source apply neighbor operator
      # *enhanced with local search based on neighbors operators
      for i, solution in enumerate(solutions):
          alg.set_params(solution, n_iter=12)
          neighbor, _ = alg.solve(only_feasible=True)
          nfitness    = self.fitness(self.problem, neighbor, alpha=alpha, betta=betta)
          if nfitness > fitnesses[i]:
              solutions[i] = neighbor
              fitnesses[i] = nfitness
              counters[i]  = 0
          else:
              counters[i] += 1
      */
      // console.log('local');
      const local = search({
        solution: solutions[i],
        problem,
      });
      // console.log('local fitness');
      const fitness = getFitness({
        solution: local,
        problem,
        alpha,
      });
      // console.log('local fitness comparison');

      if (fitness > fitnesses[i]) {
        solutions[i] = [...local];
        fitnesses[i] = fitness;
        counters[i] = 0;
      } else {
        counters[i] = counters[i] + 1;
      }
    }
    // console.log('neighborhood');
    //! Начало раздела b)
    const neighborhood: number[][][] = [];
    for (let k = 0; k < tau; k++) {
      neighborhood.push([]);
    }
    //! Начало раздела c)
    /*
      # for each onlooker select food source
      # *based on roulette wheel choice
      neighborhood = [[] for _ in range(self.n_initials)]
      nn_operator  = neighbor_operator.NeighborOperator()
      f_sum  = sum(fitnesses)
      probs  = [f / f_sum  for f in fitnesses]
      for _ in range(self.n_onlookers):
          roulette = np.random.choice(range(len(probs)), p=probs)
          solution = solutions[roulette]
          neighbor = nn_operator.random_operator(solution, patience=20)
          neighborhood[roulette].append(neighbor)
          # enhanced version
          for i, neighs in enumerate(neighborhood):
              # if i != roulette and common.check_depots_sanity(neighbor):
              if common.check_capacity_criteria(self.problem, neighbor):
                  neighs.append(neighbor)
    */
    for (let _ = 0; _ < onlookers; _++) {
      // ! Пункт i. раздела c)
      let roulette = 0;
      try {
        roulette = getRoulette({ fitnesses });
      } catch (error) {
        return CLARKE_CACHED;
      }

      // ! Пункт ii. раздела c)
      const neighbor = random(solutions[roulette]);
      // ! Пункт iii. раздела c)
      neighborhood[roulette].push([...neighbor]);
      /*
      # enhanced version
      for i, neighs in enumerate(neighborhood):
          # if i != roulette and common.check_depots_sanity(neighbor):
          if common.check_capacity_criteria(self.problem, neighbor):
              neighs.append(neighbor)
      */
      for (let i = 0; i < neighborhood.length; i++) {
        for (const capacity of problem.capacities) {
          if (
            isCapacityOKFlat({
              solution: neighbor,
              capacity,
              demands: problem.demands,
            })
          ) {
            neighborhood[i].push([...neighbor]);
          }
        }
      }
    }
    //! Начало раздела d)
    /*
    for i, neighbors in enumerate(neighborhood):
      if neighbors:
          fits = [self.fitness(self.problem, neighbor, alpha=alpha, betta=betta)
                  for neighbor in neighbors]
          if max(fits) > fitnesses[i]:
              solutions[i] = neighbors[np.argmax(fits)]
              fitnesses[i] = max(fits)
              counters[i]  = 0
          else:
              counters[i] += 1
    */
    for (let i = 0; i < tau; i++) {
      if (neighborhood[i].length) {
        const groupFitnesses = neighborhood[i].map((solution) =>
          getFitness({
            solution,
            problem,
            alpha,
          })
        );

        let groupMaxFitnessIndex = -Infinity;
        let groupMaxFitness = -1;

        for (let j = 0; j < neighborhood[i].length; j++) {
          if (groupFitnesses[j] > groupMaxFitness) {
            groupMaxFitness = groupFitnesses[j];
            groupMaxFitnessIndex = j;
          }
        }

        if (groupMaxFitness > fitnesses[i]) {
          solutions[i] = [...neighborhood[i][groupMaxFitnessIndex]];
          fitnesses[i] = groupMaxFitness;
          counters[i] = 0;
        } else {
          counters[i] = counters[i] + 1;
        }
      }
    }
    //! Начало раздела e)
    /*
    # for each food source check limit
      # if counter = limit then replace with neighbor
      for i, solution in enumerate(solutions):
          if counters[i] == self.search_limit:
              solutions[i] = nn_operator.random_operator(solution, patience=10)

      # check capacity criteria and adjust fitness parameters
      criteria = [common.check_capacity_criteria(self.problem, solution)
                  for solution in solutions]
      if sum(criteria) > (len(criteria) / 2):
          alpha -= delta#alpha / (1 + delta)
      else:
          alpha += delta

      self.history.append(1 / np.mean(fitnesses))
      self.history_alpha.append(alpha)

    */
    for (let i = 0; i < tau; i++) {
      if (counters[i] >= localSearchLimit) {
        solutions[i] = [...random(solutions[i])];
      }
    }

    let criteria = 0;

    for (let i = 0; i < tau; i++) {
      if (
        isCapacityOKFlat({
          solution: solutions[i],
          capacity: problem.capacity,
          demands: problem.demands,
        })
      ) {
        criteria++;
      }
    }

    if (criteria > tau / 2) {
      alpha -= delta;
    } else {
      alpha += delta;
    }

    // let bestIndex = -1;
    // let bestFitness = -Infinity;

    // for (let i = 0; i < solutions.length; i++) {
    //   // const totalDistance = getSolutionTotalDistanceFlat({
    //   //   solution: solutions[i],
    //   //   distancesMatrix: problem.distancesMatrix,
    //   // });
    //   const solutionFitness = getFitness({
    //     solution: solutions[i],
    //     problem,
    //   });
    //   if (ONLY_FEASIBLE) {
    //     if (
    //       isCapacityOKFlat({
    //         solution: solutions[i],
    //         capacity: problem.capacity,
    //         demands: problem.demands,
    //       })
    //     ) {
    //       if (solutionFitness > bestFitness) {
    //         bestFitness = solutionFitness;
    //         bestIndex = i;
    //       }
    //     }
    //   } else {
    //     if (solutionFitness > bestFitness) {
    //       bestFitness = solutionFitness;
    //       bestIndex = i;
    //     }
    //   }
    // }

    // if (bestIndex === -1) {
    //   throw new Error('bestSolutionIndex === -1');
    // }

    // let dist = getSolutionTotalDistanceFlat({
    //   solution: solutions[bestIndex],
    //   distancesMatrix: problem.distancesMatrix,
    // });

    // solutionsByGenerations.push({
    //   distance: dist,
    //   generation: v,
    // });

    //! Конец раздела e)
    v++;
  }

  // FIND BEST SOLUTION IN SOLUTIONS
  let bestIndex = -1;
  let bestFitness = -Infinity;

  // distances = solutions.map((solution) =>
  //   getSolutionTotalDistanceFlat({
  //     solution,
  //     distancesMatrix: problem.distancesMatrix,
  //   })
  // );

  // distances.sort((a, b) => a - b);

  // console.log(distances);

  for (let i = 0; i < solutions.length; i++) {
    // const totalDistance = getSolutionTotalDistanceFlat({
    //   solution: solutions[i],
    //   distancesMatrix: problem.distancesMatrix,
    // });
    const solutionFitness = getFitness({
      solution: solutions[i],
      problem,
    });
    if (ONLY_FEASIBLE) {
      if (
        isCapacityOKFlat({
          solution: solutions[i],
          capacity: problem.capacity,
          demands: problem.demands,
        })
      ) {
        if (solutionFitness > bestFitness) {
          bestFitness = solutionFitness;
          bestIndex = i;
        }
      }
    } else {
      if (solutionFitness > bestFitness) {
        bestFitness = solutionFitness;
        bestIndex = i;
      }
    }
  }

  if (bestIndex === -1) {
    return CLARKE_CACHED;
    // throw new Error('bestSolutionIndex === -1');
  }

  return solutions[bestIndex];
  // return { solutionsByGenerations };
};
