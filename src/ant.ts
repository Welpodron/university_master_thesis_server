import { ProblemType } from './reader';

//! Выполняется ДО расчета вероятностей чтобы по сути отобрать кандидатов на следующую точку ИЛИ же сразу вернутся в депо
const getNextPossibleNodesForAnt = ({
  distancesMatrix,
  colonyVisitedNodes,
  demands,
  ant,
}: {
  ant: Ant;
  distancesMatrix: number[][];
  colonyVisitedNodes: number[];
  demands: number[];
}) => {
  //! Здесь могут быть ограничения связанные с грузоподъемностью (зависит от следующей точки)
  //! С тем сколько по времени уже отработал муравей (мб ему уже пора возвращаться домой))
  //! Тут также проверяем может ли он вообще посетить следующую точку (типо есть ли дорога или мб она уже была посещена)
  //! По сути данный метод отберет из всех возможных точек те которые могут быть посещены
  //! Затем то что мы отберем ТУТ мы передадим в метод getProbabilities чтобы уже там выбирать среди доступных вариантов следующую точку
  /* 
        !0. Проверяем ограничения которые НЕ ЗАВИСЯТ ОТ СЛЕДУЮЩЕЙ ТОЧКИ например время работы муравья
        Если муравей уже пора возвращаться домой то мы не можем пойти в какую-то точку
    */
  //? EXAMPLE START
  const isAntWorkingTimeOver = false;
  if (isAntWorkingTimeOver) {
    return [];
  }
  //? EXAMPLE END
  //! По сути далее мы производим фильтрацию потенциальных точек в которые мы можем пойти
  return distancesMatrix[ant.currentNodeIndex]
    .filter((distance, nodeIndex) => {
      //! Исключаем само депо и текущую локацию
      if (nodeIndex === 0 || nodeIndex === ant.currentNodeIndex) {
        return false;
      }
      /* 
          !1. Проверяем вообще есть ли туда путь до следующей точки
          Потому что если допустим его нет то мы не можем туда пойти
          поэтому сначала отберем все точки в которые ПОТЕНЦИАЛЬНО можно пойти
          */
      if (distance === 0) {
        return false;
      }
      /*
          !2. Проверка на то была ли в рамках текущей generation посещена данная точка другими муравьями или нет
          Если да то мы не можем туда пойти
          */
      if (colonyVisitedNodes[nodeIndex] !== 0) {
        return false;
      }
      /*
          !3. Проверка на то что муравей не превысит грузоподъемность ЕСЛИ он пойдет в какую-то точку
          Если да то мы не можем туда пойти
          */
      if (ant.currentCapacity - demands[nodeIndex] < 0) {
        return false;
      }
    })
    .map((_, nodeIndex) => nodeIndex);
};

//! Тут нужно исходя из вероятностей выбрать следующую точку
const chooseNextNodeAccordingToProbability = ({
  nodesWithProbabilities,
}: {
  nodesWithProbabilities: {
    nodeIndex: number;
    probability: number;
  }[];
}) => {
  // Calculate the total sum of all the probabilities
  const totalSum = nodesWithProbabilities.reduce(
    (sum, node) => sum + node.probability,
    0
  );

  // Generate a random number between 0 and the total sum
  let randomNum = Math.random() * totalSum;

  // Go through the elements, subtracting their probability from your random number
  for (let i = 0; i < nodesWithProbabilities.length; i++) {
    randomNum -= nodesWithProbabilities[i].probability;

    // If randomNum is less than the current element's probability, return that element
    if (randomNum < 0) {
      return nodesWithProbabilities[i].nodeIndex;
    }
  }

  // If no element is found (which should not happen if probabilities are correctly set), return null
  return null;
};

// file:///F:/%D0%97%D0%90%D0%93%D0%A0%D0%A3%D0%97%D0%9A%D0%98/Calabro2020%20(4).pdf уравнение (5)
const calculateNuComponent = ({
  beta = 0.5,
  distancesMatrix,
  currentNodeIndex,
  nextNodeIndex,
}: {
  beta: number;
  distancesMatrix: number[][];
  currentNodeIndex: number;
  nextNodeIndex: number;
}) => {
  if (currentNodeIndex === nextNodeIndex) {
    throw new Error('currentNodeIndex === nextNodeIndex');
  }

  if (distancesMatrix[currentNodeIndex][nextNodeIndex] == 0) {
    throw new Error('distancesMatrix[currentNodeIndex][nextNodeIndex] == 0');
  }

  return Math.pow(1 / distancesMatrix[currentNodeIndex][nextNodeIndex], beta);
};

const calculateTauComponent = ({
  alpha = 0.5,
  pheromoneMatrix,
  currentNodeIndex,
  nextNodeIndex,
}: {
  alpha: number;
  pheromoneMatrix: number[][];
  currentNodeIndex: number;
  nextNodeIndex: number;
}) => {
  if (currentNodeIndex === nextNodeIndex) {
    throw new Error('currentNodeIndex === nextNodeIndex');
  }

  return Math.pow(pheromoneMatrix[currentNodeIndex][nextNodeIndex], alpha);
};

const calculateProbabilityForEachPossibleNode = ({
  currentNodeIndex,
  distancesMatrix,
  pheromoneMatrix,
  possibleNodes,
}: {
  currentNodeIndex: number;
  possibleNodes: number[];
  distancesMatrix: number[][];
  pheromoneMatrix: number[][];
}) => {
  const denominator = possibleNodes.reduce((sum, nextNodeIndex) => {
    return (
      sum +
      calculateNuComponent({
        beta: 0.5,
        distancesMatrix,
        currentNodeIndex,
        nextNodeIndex,
      }) *
        calculateTauComponent({
          alpha: 0.5,
          pheromoneMatrix,
          currentNodeIndex,
          nextNodeIndex,
        })
    );
  }, 0);

  return possibleNodes.map((nextNodeIndex) => {
    return {
      nodeIndex: nextNodeIndex,
      probability:
        (calculateNuComponent({
          beta: 0.5,
          distancesMatrix,
          currentNodeIndex,
          nextNodeIndex,
        }) *
          calculateTauComponent({
            alpha: 0.5,
            pheromoneMatrix,
            currentNodeIndex,
            nextNodeIndex,
          })) /
        denominator,
    };
  });
};

// https://vc.ru/newtechaudit/353372-muravi-i-python-ishchem-samye-korotkie-puti
//! Там кароч в матрице феромонов ячейка увеличивается каждым муравьем ПОСЛЕ того как все муравьи вернулись в колонию

class Ant {
  currentWorkingTime: number;
  currentDistanceTraveled: number;
  currentNodeIndex: number;
  currentCapacity: number;
  currentRoute: number[];

  constructor({ initialCapacity }: { initialCapacity: number }) {
    // create new ant in depot
    this.currentRoute = [];
    this.currentDistanceTraveled = 0;
    this.currentWorkingTime = 0;
    this.currentNodeIndex = 0;
    this.currentCapacity = initialCapacity;
  }

  moveAroundAndCollectSomeStuff = () => {};
}

//! После того как колония найдет решение его нужно будет проверить на Глобальные органичения:
//! 1. Все локации должны быть посещены один раз
//! 2. Начало и конец маршрута должны быть в депо
//! 3. ???????? Грузоподъемность не должна быть превышена
//! 4. ???????? Все заявки (demands) должны быть выполнены
class Colony {
  ants: Ant[] = [];
  visitedNodes: number[];
  antInitialCapacity: number;

  constructor({
    antInitialCapacity,
    distancesMatrix,
  }: {
    antInitialCapacity: number;
    distancesMatrix: number[][];
  }) {
    // create new ant in depot
    this.antInitialCapacity = antInitialCapacity;
    this.visitedNodes = distancesMatrix[0].map((_, index) =>
      index === 0 ? 1 : 0
    );
  }

  tryToSolve = () => {
    //! Идеалогически с каждой новой генерацией количество муравьев в колонии
    //! Будет уменьшаться также как и будет уменьшаться суммарная функция затрат

    //! ПОКА ЧТО БУДЕМ СЧИТАТЬ ЧТО КОЛОНИЯ ДОЛЖНА РАБОТАТЬ ПОКА ВСЕ ТОЧКИ НЕ БУДУТ ПОСЕЩЕНЫ
    while (this.visitedNodes.some((v) => v === 0)) {
      //! Спавним нового муравья
      const ant = new Ant({ initialCapacity: this.antInitialCapacity });

      //! Двигаем муравья пока он может:
      //* 1. Пусть муравей определит все точки в которые может попасть сейчас
      //* 2. Затем исходя из вероятности пусть пойдет в выбранную точку
      //* 3. Придя в новую точку пусть вычтится его грузоподъемность и начнется заново с пункта 1.
      //* 4. Когда он поймет что больше никуда не может идти, то он пойдет обратно в депо
      //* 5. После того как тот муравей вернулся обратно если есть еще точки которые надо посетить
      //* создаем нового монстра и тупо отправляем его тоже ходить

      this.ants.push(ant);
    }
  };
}

export const ant = ({ problem }: { problem: ProblemType }) => {
  //! 1 Создание новой колонии
  //! 2 Новый муравей в депо
  //! 3 Новая итерация
  //! 4 Проверка может ли еще муравей унести груз

  let currentGeneration = 0;
  const maxGenerations = 300;

  //   const maxAntsPerColony = maxGenerations;

  while (currentGeneration < maxGenerations) {
    const colony = new Colony({
      antInitialCapacity: problem.capacity,
      distancesMatrix: problem.distancesMatrix,
    });

    //! В нашей колонии пока один муравей который попробует пройти что может
    //! Когда он закончит и вернется в депо мы заспавним следующего
    //! Спавнить муравьев нужно ПОКА НЕ произойдет ЧТО-ТО???

    //! ПОКА ЧТО БУДЕМ СЧИТАТЬ ЧТО КОЛОНИЯ ДОЛЖНА РАБОТАТЬ ПОКА ВСЕ ТОЧКИ НЕ БУДУТ ПОСЕЩЕНЫ

    //* Обновить феромоны исходя только из идеи чтобы нужно использовать лучшую феромоную матрицу

    currentGeneration++;
  }
};
