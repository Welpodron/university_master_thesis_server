export const getTwoDistinctRandomNumbersInRange = ({
  min,
  max,
}: {
  min: number;
  max: number;
}) => {
  if (min === max) {
    throw new Error(
      `Минимальное: ${min} и максимальное: ${max} значения не должны быть равны`
    );
  }

  if (Math.abs(min - max) === 1) {
    throw new Error(
      `Минимальное: ${min} и максимальное: ${max} значения не должны отличаться на 1`
    );
  }

  const first = Math.floor(Math.random() * (max - min + 1)) + min;
  let second = Math.floor(Math.random() * (max - min + 1)) + min;
  while (first === second) {
    second = Math.floor(Math.random() * (max - min + 1)) + min;
  }
  return [first, second];
};

export const getRandomElementFromArray = ({ array }: { array: any[] }) => {
  const randomIndex = Math.floor(Math.random() * array.length);
  return { element: array[randomIndex], index: randomIndex };
};

export const getRandomElementFromArrayWithoutFirstAndLast = ({
  array,
}: {
  array: any[];
}) => {
  if (array.length < 3) {
    throw new Error(`Массив должен содержать хотя бы 3 элемента`);
  }

  const max = array.length - 2;
  const min = 1;

  const randomIndex = Math.floor(Math.random() * (max - min + 1)) + min;
  return { element: array[randomIndex], index: randomIndex };
};

export const getRandomCVRPSolutionForBee = async ({
  demands,
  trucks,
  capacity,
}: {
  demands: number[];
  trucks: number;
  capacity: number;
}) => {
  const _demands = [...demands];

  let totalDemand = 0;

  for (let i = 1; i < _demands.length; i++) {
    totalDemand += _demands[i];
  }

  const agents: {
    capacity: number;
    route: number[];
  }[] = [];

  for (let i = 0; i < trucks; i++) {
    agents.push({
      capacity,
      route: [],
    });
  }

  let deadlock = 0;
  let ignoreCapacity = false;

  while (totalDemand) {
    if (deadlock > _demands.length + 10) {
      ignoreCapacity = true;
      console.log('WARNING! DEADLOCK DETECTED!');
      // throw new Error(`Возникла ошибка при генерации решения`);
    }

    for (let agent of agents) {
      const indexes = [];

      for (let i = 0; i < _demands.length; i++) {
        if (ignoreCapacity) {
          if (_demands[i] > 0) {
            indexes.push(i);
          }
        } else {
          if (_demands[i] > 0 && agent.capacity - _demands[i] >= 0) {
            indexes.push(i);
          }
        }
      }

      if (!indexes.length) {
        continue;
      }

      deadlock = 0;

      const nextNode = indexes[Math.floor(Math.random() * indexes.length)];

      agent.capacity -= _demands[nextNode];
      agent.route.push(nextNode);
      totalDemand -= _demands[nextNode];
      _demands[nextNode] = 0;
    }

    deadlock++;
  }

  return agents.map((agent) => agent.route);
};
