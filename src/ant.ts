import { writeFileSync } from 'fs';
import { ProblemType } from './reader';
import { JSDOM } from 'jsdom';
// import d3 from 'd3';

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

  const possibleNodesIndexes: number[] = [];
  //! По сути далее мы производим фильтрацию потенциальных точек в которые мы можем пойти
  distancesMatrix[ant.currentNodeIndex].forEach((distance, nodeIndex) => {
    //! Исключаем само депо и текущую локацию
    if (nodeIndex === 0 || nodeIndex === ant.currentNodeIndex) {
      return;
    }
    /* 
              !1. Проверяем вообще есть ли туда путь до следующей точки
              Потому что если допустим его нет то мы не можем туда пойти
              поэтому сначала отберем все точки в которые ПОТЕНЦИАЛЬНО можно пойти
              */
    if (distance === 0) {
      return;
    }
    /*
              !2. Проверка на то была ли в рамках текущей generation посещена данная точка другими муравьями или нет
              Если да то мы не можем туда пойти
              */
    if (colonyVisitedNodes[nodeIndex] !== 0) {
      return;
    }
    /*
              !3. Проверка на то что муравей не превысит грузоподъемность ЕСЛИ он пойдет в какую-то точку
              Если да то мы не можем туда пойти
              */
    if (ant.currentCapacity - demands[nodeIndex] < 0) {
      return;
    }

    possibleNodesIndexes.push(nodeIndex);
  });

  return possibleNodesIndexes;
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
  // Пока что прост вернем nodeIndex с самой большой вероятностью
  // return nodesWithProbabilities.reduce((prev, current) =>
  //   prev.probability > current.probability ? prev : current
  // ).nodeIndex;

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
  beta = 1.0,
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
  alpha = 1.0,
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
  // console.log({ possibleNodes, currentNodeIndex });
  const denominator = possibleNodes.reduce((sum, nextNodeIndex) => {
    return (
      sum +
      calculateNuComponent({
        beta: 1.0,
        distancesMatrix,
        currentNodeIndex,
        nextNodeIndex,
      }) *
        calculateTauComponent({
          alpha: 2.0,
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
          beta: 1.0,
          distancesMatrix,
          currentNodeIndex,
          nextNodeIndex,
        }) *
          calculateTauComponent({
            alpha: 2.0,
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
  problem: ProblemType;

  ants: Ant[] = [];

  visitedNodes: number[];

  constructor({ problem }: { problem: ProblemType }) {
    // create new ant in depot
    this.problem = problem;
    this.visitedNodes = this.problem.distancesMatrix[0].map((_, index) =>
      index === 0 ? 1 : 0
    );
  }

  tryToSolve = ({
    pheromoneMatrix,
    currentBestSolution,
    solutionsByGenerations,
    generation,
  }: {
    generation: number;
    pheromoneMatrix: number[][];
    currentBestSolution: { distance: number; ants: number; routes: number[][] };
    solutionsByGenerations: { distance: number; generation: number }[];
  }) => {
    //! Идеалогически с каждой новой генерацией количество муравьев в колонии
    //! Будет уменьшаться также как и будет уменьшаться суммарная функция затрат

    //! ПОКА ЧТО БУДЕМ СЧИТАТЬ ЧТО КОЛОНИЯ ДОЛЖНА РАБОТАТЬ ПОКА ВСЕ ТОЧКИ НЕ БУДУТ ПОСЕЩЕНЫ
    while (this.visitedNodes.some((v) => v === 0)) {
      //! Спавним нового муравья
      const ant = new Ant({ initialCapacity: this.problem.capacity });

      let nextPossibleNodes = getNextPossibleNodesForAnt({
        distancesMatrix: this.problem.distancesMatrix,
        colonyVisitedNodes: this.visitedNodes,
        demands: this.problem.demands,
        ant,
      });

      while (nextPossibleNodes.length > 0) {
        const probabilities = calculateProbabilityForEachPossibleNode({
          currentNodeIndex: ant.currentNodeIndex,
          distancesMatrix: this.problem.distancesMatrix,
          pheromoneMatrix,
          possibleNodes: nextPossibleNodes,
        });

        const nextNodeIndex = chooseNextNodeAccordingToProbability({
          nodesWithProbabilities: probabilities,
        });

        if (nextNodeIndex === null) {
          throw new Error('nextNodeIndex === null');
        }

        ant.currentDistanceTraveled +=
          this.problem.distancesMatrix[ant.currentNodeIndex][nextNodeIndex];
        ant.currentCapacity -= this.problem.demands[nextNodeIndex];
        ant.currentRoute.push(nextNodeIndex);
        ant.currentNodeIndex = nextNodeIndex;

        this.visitedNodes[nextNodeIndex] = 1;

        nextPossibleNodes = getNextPossibleNodesForAnt({
          distancesMatrix: this.problem.distancesMatrix,
          colonyVisitedNodes: this.visitedNodes,
          demands: this.problem.demands,
          ant,
        });
      }

      //! Возвращаемся в депо
      ant.currentDistanceTraveled +=
        this.problem.distancesMatrix[ant.currentNodeIndex][0];

      // const clone = structuredClone(probabilities);
      // sort by probability
      // clone.sort((a, b) => b.probability - a.probability);

      //! Двигаем муравья пока он может:
      //* 1. Пусть муравей определит все точки в которые может попасть сейчас
      //* 2. Затем исходя из вероятности пусть пойдет в выбранную точку
      //* 3. Придя в новую точку пусть вычтится его грузоподъемность и начнется заново с пункта 1.
      //* 4. Когда он поймет что больше никуда не может идти, то он пойдет обратно в депо
      //* 5. После того как тот муравей вернулся обратно если есть еще точки которые надо посетить
      //* создаем нового монстра и тупо отправляем его тоже ходить

      this.ants.push(ant);
    }

    // CURRENT COLONY SOLUTION
    const totalDistanceTraveled = this.ants.reduce(
      (sum, ant) => sum + ant.currentDistanceTraveled,
      0
    );

    // solutionsByGenerations.push({
    //   distance: totalDistanceTraveled,
    //   generation,
    // });

    // console.log({ totalDistanceTraveled, ants: this.ants.length });
    // CURRENT COLONY SOLUTION

    // UPDATE pheromoneMatrix only for best colony
    if (totalDistanceTraveled < currentBestSolution.distance) {
      // для каждого муравья
      this.ants.forEach((ant) => {
        // debugger;

        const rho = 0.05;

        let fromIndex, toIndex, traveledDistance, objectiveFunctionValue;

        // Движемся из депо в первую точку маршрута
        fromIndex = 0;
        toIndex = ant.currentRoute[0];
        traveledDistance = this.problem.distancesMatrix[fromIndex][toIndex];
        objectiveFunctionValue = 1 / traveledDistance;

        pheromoneMatrix[fromIndex][toIndex] =
          (1 - rho) * pheromoneMatrix[fromIndex][toIndex] +
          objectiveFunctionValue;
        // Симметрия путей
        pheromoneMatrix[toIndex][fromIndex] =
          pheromoneMatrix[fromIndex][toIndex];

        // Движемся по всем точкам маршрута
        for (
          let movingIndex = 0;
          movingIndex < ant.currentRoute.length - 1;
          movingIndex++
        ) {
          fromIndex = ant.currentRoute[movingIndex];
          toIndex = ant.currentRoute[movingIndex + 1];
          traveledDistance = this.problem.distancesMatrix[fromIndex][toIndex];
          objectiveFunctionValue = 1 / traveledDistance;

          pheromoneMatrix[fromIndex][toIndex] =
            (1 - rho) * pheromoneMatrix[fromIndex][toIndex] +
            objectiveFunctionValue;
          // Симметрия путей
          pheromoneMatrix[toIndex][fromIndex] =
            pheromoneMatrix[fromIndex][toIndex];
        }

        // Движемся из последней точки маршрута в депо
        fromIndex = ant.currentRoute[ant.currentRoute.length - 1];
        toIndex = 0;
        traveledDistance = this.problem.distancesMatrix[fromIndex][toIndex];
        objectiveFunctionValue = 1 / traveledDistance;

        pheromoneMatrix[fromIndex][toIndex] =
          (1 - rho) * pheromoneMatrix[fromIndex][toIndex] +
          objectiveFunctionValue;
        // Симметрия путей
        pheromoneMatrix[toIndex][fromIndex] =
          pheromoneMatrix[fromIndex][toIndex];
      });

      currentBestSolution.distance = totalDistanceTraveled;
      currentBestSolution.ants = this.ants.length;
      currentBestSolution.routes = this.ants.map((ant) => [
        0,
        ...ant.currentRoute,
        0,
      ]);
    }
  };
}

export const ant = ({ problem }: { problem: ProblemType }) => {
  //! 1 Создание новой колонии
  //! 2 Новый муравей в депо
  //! 3 Новая итерация
  //! 4 Проверка может ли еще муравей унести груз

  const solutionsByGenerations: { distance: number; generation: number }[] = [];

  let currentGeneration = 0;
  const maxGenerations = 300;
  const maxNumbersOfColonies = 5;

  const pheromoneMatrix = problem.distancesMatrix.map((row) =>
    row.map((_) => 2.0)
  );

  const currentBestSolution: {
    distance: number;
    ants: number;
    routes: number[][];
  } = {
    distance: Infinity,
    ants: Infinity,
    routes: [],
  };

  //   const maxAntsPerColony = maxGenerations;

  const start = performance.now();

  while (currentGeneration < maxGenerations) {
    for (let i = 0; i < maxNumbersOfColonies; i++) {
      const colony = new Colony({
        problem,
      });

      colony.tryToSolve({
        pheromoneMatrix,
        currentBestSolution,
        solutionsByGenerations,
        generation: currentGeneration,
      });
    }

    solutionsByGenerations.push({
      distance: currentBestSolution.distance,
      generation: currentGeneration,
    });

    //! В нашей колонии пока один муравей который попробует пройти что может
    //! Когда он закончит и вернется в депо мы заспавним следующего
    //! Спавнить муравьев нужно ПОКА НЕ произойдет ЧТО-ТО???

    //! ПОКА ЧТО БУДЕМ СЧИТАТЬ ЧТО КОЛОНИЯ ДОЛЖНА РАБОТАТЬ ПОКА ВСЕ ТОЧКИ НЕ БУДУТ ПОСЕЩЕНЫ

    //* Обновить феромоны исходя только из идеи чтобы нужно использовать лучшую феромоную матрицу

    currentGeneration++;
  }

  const end = performance.now();

  console.log(`[ANT] Execution time: ${end - start} ms`);

  //! SAVE SOLUTIONS BY GENERATIONS in ANT.json file
  // writeFileSync('ANT.json', JSON.stringify(solutionsByGenerations));

  // const width = 1000;
  // const height = 500;
  // const marginTop = 20;
  // const marginRight = 30;
  // const marginBottom = 30;
  // const marginLeft = 40;

  // const dom = new JSDOM(`<!DOCTYPE html><body></body>`);

  // import('d3').then((d3) => {
  //   let body = d3.select(dom.window.document.querySelector('body'));

  //   // Declare the x (horizontal position) scale.
  //   const x = d3.scaleUtc(
  //     d3.extent(solutionsByGenerations, (d) => d.generation) as [
  //       number,
  //       number
  //     ],
  //     [marginLeft, width - marginRight]
  //   );

  //   // Declare the y (vertical position) scale.
  //   const y = d3.scaleLinear(
  //     [
  //       Math.ceil(problem.optimal),
  //       (d3.max(solutionsByGenerations, (d) => d.distance) as number) + 100.0,
  //     ] as [number, number],
  //     [height - marginBottom, marginTop]
  //   );

  //   // Declare the line generator.
  //   const line = d3
  //     .line()
  //     .x((d) => x((d as any).generation))
  //     .y((d) => y((d as any).distance));

  //   // Create the SVG container.
  //   const svg = body
  //     .append('svg')
  //     .attr('xmlns', 'http://www.w3.org/2000/svg')
  //     .attr('xmlns:xlink', 'http://www.w3.org/1999/xlink')
  //     .attr('width', width)
  //     .attr('height', height)
  //     .attr('viewBox', [0, 0, width, height])
  //     .attr('style', 'max-width: 100%; height: auto; height: intrinsic;');

  //   // Add the x-axis.
  //   svg
  //     .append('g')
  //     .attr('transform', `translate(0,${height - marginBottom})`)
  //     .call(
  //       d3
  //         .axisBottom(x)
  //         .ticks(width / 80)
  //         .tickSizeOuter(0)
  //     );

  //   // Add the y-axis, remove the domain line, add grid lines and a label.
  //   svg
  //     .append('g')
  //     .attr('transform', `translate(${marginLeft},0)`)
  //     .call(d3.axisLeft(y).ticks(height / 40))
  //     .call((g) => g.select('.domain').remove())
  //     .call((g) =>
  //       g
  //         .selectAll('.tick line')
  //         .clone()
  //         .attr('x2', width - marginLeft - marginRight)
  //         .attr('stroke-opacity', 0.1)
  //     )
  //     .call((g) =>
  //       g
  //         .append('text')
  //         .attr('x', -marginLeft)
  //         .attr('y', 10)
  //         .attr('fill', 'currentColor')
  //         .attr('text-anchor', 'start')
  //         .text('↑ Daily close ($)')
  //     );

  //   svg
  //     .append('path')
  //     .attr('fill', 'none')
  //     .attr('stroke', 'steelblue')
  //     .attr('stroke-width', 1.5)
  //     .attr('d', line(solutionsByGenerations as any));

  //   writeFileSync('out.svg', body.html());
  // });

  // Best solution so far
  console.log('Ant best:');
  // Best solution so far
  console.log({
    distance: currentBestSolution.distance,
    ants: currentBestSolution.ants,
    // routes: currentBestSolution.routes,
  });

  return currentBestSolution;
};
