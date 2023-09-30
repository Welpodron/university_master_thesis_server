// https://sci-hub.ru/https://doi.org/10.1016/j.ejor.2011.06.006

import {
  getTwoDistinctRandomNumbersInRange,
  getRandomElementFromArrayWithoutFirstAndLast,
  getRandomElementFromArray,
} from "./random";

export const randomSwap = ({
  _solution,
  patience = 10,
  verbose = false,
}: {
  _solution: number[][];
  patience?: number;
  verbose?: boolean;
}) => {
  /*
      randomSwap выбирает две случайные РАЗНЫЕ i и j точки из РАЗНЫХ маршрутов, 
      главное чтобы они не были депо и чтобы i !== j, после чего меняет их местами.
  
      Предположим что пришедшее решение выглядит: [[0,4,1,0], [0,2,7,5,0], [0,3,6 0]]
      1) Выбираем два РАЗНЫХ маршрута из решения, например [0,4,1,0] и [0,2,7,5,0]
      2) Из каждого маршрута выбираем две случайные точки (не равные друг другу и не равные депо), 
      например i = 1 из маршрута [0,4,1,0] и j = 5 из маршрута [0,2,7,5,0]
      3) Меняем местами точки i и j в каждом маршруте, получаем: [[0,4,5,0], [0,2,7,1,0], [0,3,6 0]]
      */
  const solution = [..._solution];

  //   Проверка что в решении есть хотя бы два маршрута
  if (solution.length < 2) {
    return solution;
  }

  if (verbose) {
    console.log("ПРИМЕНЕНИЕ ОПЕРАТОРА: randomSwap");
  }

  while (patience > 0) {
    const [firstRandomRouteIndex, secondRandomRouteIndex] =
      getTwoDistinctRandomNumbersInRange({
        min: 0,
        max: solution.length - 1,
      });

    const { element: iValue, index: i } =
      getRandomElementFromArrayWithoutFirstAndLast({
        array: solution[firstRandomRouteIndex],
      });
    const { element: jValue, index: j } =
      getRandomElementFromArrayWithoutFirstAndLast({
        array: solution[secondRandomRouteIndex],
      });

    // В принципе можно не проверять, так как мы обычно решения генерируем сами и они должны быть валидными
    if (iValue !== jValue) {
      solution[firstRandomRouteIndex][i] = jValue;
      solution[secondRandomRouteIndex][j] = iValue;
      break;
    }

    patience--;
  }

  return solution;
};

export const randomInsert = ({
  _solution,
  patience = 10,
  verbose = false,
}: {
  _solution: number[][];
  patience?: number;
  verbose?: boolean;
}) => {
  /*
      randomInsert случайно выбирает точку инсерта i из одного маршрута и точку удаления j из другого маршрута (маршруты разные),
      причем точки инсерта i и удаления j обязательно лежат в пределе от 1 до length - 2,
      так как точки 0 и length - 1 являются депо и не могут быть удалены или инсертнуты.
  
      Предположим что пришедшее решение выглядит: [[0,4,1,0], [0,2,7,5,0], [0,3,6 0]]
      1) Выбираем два РАЗНЫХ маршрута из решения, например [0,4,1,0] и [0,2,7,5,0]
      2) Из одного маршрута выбираем случайную точку удаления, из другого точку инсерта,  
      например точку инсерта i = 1 из маршрута [0,4,1,0] и точку удаления j = 5 из маршрута [0,2,7,5,0]
      3) Удаляем точку j из [0,2,7,5,0] и вставляем перед точкой i [0,4,1,0], получаем: [[0,4,5,1,0], [0,2,7,0], [0,3,6 0]]
      */

  const solution = [..._solution];
  //  Проверка что в решении есть хотя бы два маршрута
  if (solution.length < 2) {
    return solution;
  }
  // ! Внимание маршрут, содержащий только одну точку (без учета депо) не может быть взят для операции удаления поэтому сначала нужно провести отбор подходящих маршрутов
  while (patience > 0) {
    const allowedToDeleteRoutes = [];
    for (let routeIndex = 0; routeIndex < solution.length; routeIndex++) {
      if (solution[routeIndex].length > 3) {
        allowedToDeleteRoutes.push(routeIndex);
      }
    }
    // Маршрутов откуда можно удалить точку нет, значит выходим из цикла
    if (allowedToDeleteRoutes.length === 0) {
      break;
    }

    const { element: randomRouteToDeleteFromIndex } = getRandomElementFromArray(
      {
        array: allowedToDeleteRoutes,
      }
    );

    const {
      element: randomDeleteElementValue,
      index: randomDeleteElementIndex,
    } = getRandomElementFromArrayWithoutFirstAndLast({
      array: solution[randomRouteToDeleteFromIndex],
    });

    const allowedToInsertRoutes = [];

    for (let routeIndex = 0; routeIndex < solution.length; routeIndex++) {
      if (routeIndex !== randomRouteToDeleteFromIndex) {
        allowedToInsertRoutes.push(routeIndex);
      }
    }

    // Маршрутов куда можно вставить точку нет, значит выходим из цикла
    if (allowedToInsertRoutes.length === 0) {
      break;
    }

    const { element: randomRouteToInsertIndex } = getRandomElementFromArray({
      array: allowedToInsertRoutes,
    });

    const { index: randomInsertElementIndex } =
      getRandomElementFromArrayWithoutFirstAndLast({
        array: solution[randomRouteToInsertIndex],
      });

    const randomRouteToDeleteFrom = [...solution[randomRouteToDeleteFromIndex]];
    const randomRouteToInsert = [...solution[randomRouteToInsertIndex]];

    randomRouteToDeleteFrom.splice(randomDeleteElementIndex, 1);
    randomRouteToInsert.splice(
      randomInsertElementIndex,
      0,
      randomDeleteElementValue
    );

    solution[randomRouteToDeleteFromIndex] = randomRouteToDeleteFrom;
    solution[randomRouteToInsertIndex] = randomRouteToInsert;

    break;

    patience--;
  }

  return solution;
};

export const getNeighborSolution = ({
  solution,
  patience = 10,
  verbose = false,
}: {
  solution: number[][];
  patience?: number;
  verbose?: boolean;
}) => {
  const operators = [randomSwap, randomInsert];
  const randomOperator = getRandomElementFromArray({
    array: operators,
  }).element;
  return randomOperator({
    _solution: solution,
    patience,
    verbose,
  }) as number[][];
};

// ! Внимание все решения Flat сводятся к одномерному массиву и потом собираются заново в двумерный
// ! Flat решения работают быстрее, однако меньше шансов что они произведут операцию замены, свапа и тд. и сильно зависят от patience

export const randomSwapFlat = ({
  _solution,
  patience = 10,
  verbose = false,
}: {
  _solution: number[];
  patience?: number;
  verbose?: boolean;
}) => {
  /*
        randomSwap выбирает два случайных РАЗНЫХ i и j индекса 
        главное чтобы их значение не было депо и чтобы solution[i] !== solution[j], после чего меняет их значения местами.
    
        Предположим что пришедшее решение выглядит: [0,4,1,0,0,2,7,5,0,0,3,6 0]
        например i = 1 из маршрута и j = 5 
        меняем местами точки i и j, получаем: [0,4,5,0,0,2,7,1,0,0,3,6 0]
        */
  const solution = [..._solution];

  if (verbose) {
    console.log("ПРИМЕНЕНИЕ ОПЕРАТОРА: randomSwap");
  }

  while (patience > 0) {
    const [i, j] = getTwoDistinctRandomNumbersInRange({
      min: 1,
      max: solution.length - 2,
    });

    if (i !== j && solution[i] !== 0 && solution[j] !== 0) {
      const temp = solution[i];
      solution[i] = solution[j];
      solution[j] = temp;
      break;
    }

    patience--;
  }

  return solution;
};

export const randomInsertFlat = ({
  _solution,
  patience = 10,
  verbose = false,
}: {
  _solution: number[];
  patience?: number;
  verbose?: boolean;
}) => {
  /*
        randomInsert случайно выбирает индекс инсерта i и индекс удаления j,
        затем удаляет значение j из маршрута и вставляет перед точкой i.
        значение у индекса удаления не может быть депо
    
        Предположим что пришедшее решение выглядит: [0,4,1,0,0,2,7,5,0,0,3,6 0]
        например i = 2 и j = 7
        удаляем точку j и вставляем перед точкой i, получаем: [0,4,5,1,0,0,2,7,0,0,3,6 0]
        */

  const solution = [..._solution];

  while (patience > 0) {
    let [i, j] = getTwoDistinctRandomNumbersInRange({
      min: 1,
      max: solution.length - 2,
    });

    if (i !== j && solution[i] !== 0 && solution[j] !== 0) {
      [i, j] = [Math.min(i, j), Math.max(i, j)];
      if (solution[j + 1] !== 0 && solution[j - 1] !== 0) {
        const element = solution[j];
        solution.splice(j, 1);
        solution.splice(i, 0, element);
        break;
      }
    }

    patience--;
  }

  return solution;
};
