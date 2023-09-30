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
