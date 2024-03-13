const NEIGHBOR_TEST = [[4, 1], [2, 7, 5], [3, 6], [9], [8]];

const randomSwap = ({
  solution,
  patience = 2,
}: {
  solution: number[][];
  patience?: number;
}) => {
  // Проверка что в решении есть хотя бы два маршрута
  if (solution.length < 2) {
    return solution;
  }
  /*
      randomSwap выбирает две случайные РАЗНЫЕ i и j точки из РАЗНЫХ маршрутов, 
      главное чтобы они не были депо и чтобы i !== j, после чего меняет их местами.
  
      Предположим что пришедшее решение выглядит: [[0,4,1,0], [0,2,7,5,0], [0,3,6 0]]
      1) Выбираем два РАЗНЫХ маршрута из решения, например [0,4,1,0] и [0,2,7,5,0]
      2) Из каждого маршрута выбираем две случайные точки (не равные друг другу и не равные депо), 
      например i = 1 из маршрута [0,4,1,0] и j = 5 из маршрута [0,2,7,5,0]
      3) Меняем местами точки i и j в каждом маршруте, получаем: [[0,4,5,0], [0,2,7,1,0], [0,3,6 0]]
      */
  const _solution = structuredClone(solution);

  while (patience > 0) {
    const i = Math.floor(Math.random() * _solution.length);
    let j = Math.floor(Math.random() * _solution.length);

    while (i === j) {
      j = Math.floor(Math.random() * _solution.length);
    }

    const iIndex = Math.floor(Math.random() * _solution[i].length);
    const iValue = _solution[i][iIndex];
    const jIndex = Math.floor(Math.random() * _solution[j].length);
    const jValue = _solution[j][jIndex];

    // В принципе можно не проверять, так как мы обычно решения генерируем сами и они должны быть валидными
    _solution[i][iIndex] = jValue;
    _solution[j][jIndex] = iValue;

    patience--;
  }

  return _solution;
};

const randomInsert = ({
  solution,
  patience = 2,
}: {
  solution: number[][];
  patience?: number;
}) => {
  //  Проверка что в решении есть хотя бы два маршрута
  if (solution.length < 2) {
    return solution;
  }
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

  const _solution = structuredClone(solution);

  // ! Внимание маршрут, содержащий только одну точку (без учета депо) не может быть взят для операции удаления поэтому сначала нужно провести отбор подходящих маршрутов
  while (patience > 0) {
    const allowedToDelete = [];

    for (let i = 0; i < _solution.length; i++) {
      if (_solution[i].length > 1) {
        allowedToDelete.push(i);
      }
    }

    // Маршрутов откуда можно удалить точку нет, значит выходим из цикла
    if (!allowedToDelete.length) {
      break;
    }

    const deleteFrom =
      allowedToDelete[Math.floor(Math.random() * allowedToDelete.length)];

    const allowedToInsert = [];

    for (let j = 0; j < _solution.length; j++) {
      if (deleteFrom !== j) {
        allowedToInsert.push(j);
      }
    }

    if (!allowedToInsert.length) {
      break;
    }

    const insertTo =
      allowedToInsert[Math.floor(Math.random() * allowedToInsert.length)];

    const deletedValue =
      _solution[deleteFrom][
        Math.floor(Math.random() * _solution[deleteFrom].length)
      ];

    _solution[deleteFrom] = _solution[deleteFrom].filter(
      (v) => v !== deletedValue
    );

    _solution[insertTo].push(deletedValue);

    patience--;
  }

  return _solution;
};

const randomize = ({ solution }: { solution: number[][] }) => {
  const operators = [randomSwap, randomInsert];
  return structuredClone(
    operators[Math.floor(Math.random() * operators.length)]({ solution })
  );
};

const random_swap_sub_data = [0, 4, 1, 0, 2, 7, 5, 0, 9, 0];
const random_swap_data = [0, 4, 1, 0, 2, 7, 5, 0];

export const random_swap = (solution: number[]) => {
  const _solution = [...solution];

  const length = _solution.length;

  let patience = 1;

  while (patience > 0) {
    const i = Math.floor(Math.random() * (length - 1 - 1)) + 1;
    const j = Math.floor(Math.random() * (length - 1 - 1)) + 1;

    if (i !== j && _solution[i] !== _solution[j]) {
      const temp = _solution[i];
      _solution[i] = _solution[j];

      _solution[j] = temp;

      break;
    }

    patience--;
  }

  return _solution;
};

export const random_swap_sub = (solution: number[]) => {
  let _solution = [...solution];

  const length = _solution.length;

  let patience = 10;

  while (patience > 0) {
    const k = Math.floor(Math.random() * (7 - 2)) + 2;

    const i = Math.floor(Math.random() * (length - k - 1 - 1)) + 1;
    const j = Math.floor(Math.random() * (length - k - 1 - 1)) + 1;

    if (
      _solution[i] &&
      _solution[j] &&
      i !== j &&
      _solution[i] !== _solution[j] &&
      Math.abs(i - j) > k
    ) {
      const leftStart = i > j ? j : i;
      const leftEnd = leftStart + k;

      const rightStart = i > j ? i : j;
      const rightEnd = rightStart + k;

      const result = [];

      let mainIterator = 0;

      for (let iterator = mainIterator; iterator < leftStart; iterator++) {
        result.push(_solution[iterator]);
        mainIterator++;
      }

      for (let iterator = rightStart; iterator < rightEnd; iterator++) {
        result.push(_solution[iterator]);
        mainIterator++;
      }

      for (let iterator = mainIterator; iterator < rightStart; iterator++) {
        result.push(_solution[iterator]);
        mainIterator++;
      }

      for (let iterator = leftStart; iterator < leftEnd; iterator++) {
        result.push(_solution[iterator]);
        mainIterator++;
      }

      for (let iterator = mainIterator; iterator < length; iterator++) {
        result.push(_solution[iterator]);
      }

      let flag = true;

      for (let iterator = 0; iterator < result.length - 1; iterator++) {
        if (result[iterator] === result[iterator + 1]) {
          flag = false;
          break;
        }
      }

      if (flag) {
        return result;
      }
    }

    patience--;
  }

  return _solution;
};

export const random_reversing = (solution: number[]) => {
  let _solution = [...solution];

  const length = _solution.length;

  let patience = 10;

  while (patience > 0) {
    const i = Math.floor(Math.random() * (length - 1 - 1)) + 1;
    const j = Math.floor(Math.random() * (length - 1 - 1)) + 1;

    if (
      _solution[i] &&
      _solution[j] &&
      i !== j &&
      _solution[i] !== _solution[j]
    ) {
      const start = i > j ? j : i;
      const end = i > j ? i : j;

      const result = [];

      for (let iterator = 0; iterator < start; iterator++) {
        result.push(_solution[iterator]);
      }

      for (let iterator = end; iterator >= start; iterator--) {
        result.push(_solution[iterator]);
      }

      for (let iterator = end + 1; iterator < length; iterator++) {
        result.push(_solution[iterator]);
      }

      return result;
    }

    patience--;
  }

  return _solution;
};

export const random_swap_sub_reverse = (solution: number[]) => {
  let _solution = [...solution];

  const length = _solution.length;

  let patience = 10;

  while (patience > 0) {
    const k = Math.floor(Math.random() * (7 - 2)) + 2;

    const i = Math.floor(Math.random() * (length - k - 1 - 1)) + 1;
    const j = Math.floor(Math.random() * (length - k - 1 - 1)) + 1;

    if (
      _solution[i] &&
      _solution[j] &&
      i !== j &&
      _solution[i] !== _solution[j] &&
      Math.abs(i - j) > k
    ) {
      const leftStart = i > j ? j : i;
      const leftEnd = leftStart + k;

      const rightStart = i > j ? i : j;
      const rightEnd = rightStart + k;

      const result = [];

      let mainIterator = 0;

      for (let iterator = mainIterator; iterator < leftStart; iterator++) {
        result.push(_solution[iterator]);
        mainIterator++;
      }

      for (let iterator = rightEnd; iterator >= rightStart; iterator--) {
        result.push(_solution[iterator]);
        mainIterator++;
      }

      for (let iterator = mainIterator; iterator < rightStart; iterator++) {
        result.push(_solution[iterator]);
        mainIterator++;
      }

      for (let iterator = leftEnd; iterator >= leftStart; iterator--) {
        result.push(_solution[iterator]);
        mainIterator++;
      }

      for (let iterator = mainIterator; iterator < length; iterator++) {
        result.push(_solution[iterator]);
      }

      let flag = true;

      for (let iterator = 0; iterator < result.length - 1; iterator++) {
        if (result[iterator] === result[iterator + 1]) {
          flag = false;
          break;
        }
      }

      if (flag) {
        return result;
      }
    }

    patience--;
  }

  return _solution;
};

export const random_insert_sub_reverse = (solution: number[]) => {
  let _solution = [...solution];

  const length = _solution.length;

  let patience = 10;

  while (patience > 0) {
    const k = Math.floor(Math.random() * (7 - 2)) + 2;

    const i = Math.floor(Math.random() * (length - k - 1 - 1)) + 1;
    const j = Math.floor(Math.random() * (length - k - 1 - 1)) + 1;

    if (Math.abs(i - j) <= k) {
      continue;
    }

    const start = i > j ? j : i;
    const end = i > j ? i : j;

    if (
      _solution[i] &&
      _solution[j] &&
      i !== j &&
      _solution[i] !== _solution[j]
    ) {
      const result = [];

      let mainIterator = 0;

      for (let iterator = mainIterator; iterator < start; iterator++) {
        result.push(_solution[iterator]);
      }

      for (let iterator = end + k; iterator >= end; iterator--) {
        result.push(_solution[iterator]);
      }

      for (let iterator = start; iterator < end; iterator++) {
        result.push(_solution[iterator]);
      }

      for (let iterator = end + k + 1; iterator < length; iterator++) {
        result.push(_solution[iterator]);
      }

      let flag = true;

      for (let iterator = 0; iterator < result.length - 1; iterator++) {
        if (result[iterator] === result[iterator + 1]) {
          flag = false;
          break;
        }
      }

      if (flag) {
        return result;
      }
    }

    patience--;
  }

  return _solution;
};

export const random = (solution: number[]) => {
  const operators = [
    random_swap,
    random_swap_sub,
    random_reversing,
    random_swap_sub_reverse,
    random_insert_sub_reverse,
  ];

  return structuredClone(
    operators[Math.floor(Math.random() * operators.length)](solution)
  );
};
