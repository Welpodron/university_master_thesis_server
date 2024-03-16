import { isCapacityOKFlat } from '../_constrains';
import { random } from './_neighbor';
import { ProblemType } from '../reader';
import { getSolutionTotalDistanceFlat } from '../utils';

export const search = ({
  solution,
  problem,
}: {
  solution: number[];
  problem: ProblemType;
}) => {
  let currentSolution = [...solution];
  let currentCost = getSolutionTotalDistanceFlat({
    solution,
    distancesMatrix: problem.distancesMatrix,
  });

  const ONLY_FEASIBLE = true;

  for (let _ = 0; _ < 12; _++) {
    // console.log('local search cycle ' + _);
    const newSolution = random(currentSolution);
    // console.log('new cost calc');
    const newCost = getSolutionTotalDistanceFlat({
      solution: newSolution,
      distancesMatrix: problem.distancesMatrix,
    });

    // console.log('comparison new cost cals');

    if (currentCost >= newCost) {
      if (ONLY_FEASIBLE) {
        if (
          isCapacityOKFlat({
            solution: newSolution,
            demands: problem.demands,
            capacity: problem.capacity,
          })
        ) {
          currentSolution = [...newSolution];
          currentCost = newCost;
        }
      } else {
        currentSolution = [...newSolution];
        currentCost = newCost;
      }
    }
  }

  return currentSolution;
};
