import { getRouteCapacity } from "./utils";

export const checkDepotsPlacement = ({
  routes,
  depotValue = 0,
}: {
  routes: number[][];
  depotValue?: number;
}) => {
  //! Начало и конец маршрута должны быть депо, а также их количество в одном маршруте должно быть равно 2
  for (const route of routes) {
    let depotCount = 0;

    if (route[0] !== depotValue || route[route.length - 1] !== depotValue) {
      console.log(
        `ПРОВЕРКА ОГРАНИЧЕНИЙ РЕШЕНИЯ (ПРОВАЛ): Начало и конец маршрута [${route.join()}] должны быть равны ${depotValue} (начинаться и заканчиваться в депо)`
      );
      return false;
    }

    for (const node of route) {
      if (node === depotValue) depotCount++;
    }

    if (depotCount !== 2) {
      console.log(
        `ПРОВЕРКА ОГРАНИЧЕНИЙ РЕШЕНИЯ (ПРОВАЛ): В маршруте [${route.join()}] количество депо не равно 2`
      );
      return false;
    }
  }
  console.log(`ПРОВЕРКА ОГРАНИЧЕНИЙ РЕШЕНИЯ: Проверка депо успешно пройдена`);
  return true;
};

export const checkCapacity = ({
  routes,
  capacity,
  demands,
}: {
  routes: number[][];
  capacity: number;
  demands: number[];
}) => {
  //! Проверка на вместимость маршрута
  for (const route of routes) {
    const routeCapacity = getRouteCapacity({ route, demands });
    if (routeCapacity > capacity) {
      console.log(
        `ПРОВЕРКА ОГРАНИЧЕНИЙ РЕШЕНИЯ (ПРОВАЛ): Вместимость маршрута [${route.join()}] превышает ограничение вместимости ${capacity}`
      );
      return false;
    }
  }
  console.log(
    `ПРОВЕРКА ОГРАНИЧЕНИЙ РЕШЕНИЯ: Проверка на вместимость маршрута успешно пройдена`
  );
  return true;
};

export const checkAllLocationsVisitedOnce = ({
  routes,
  locations,
  depotValue = 0,
}: {
  routes: number[][];
  locations: number[];
  depotValue?: number;
}) => {
  const _locations = new Map<number, number>();
  //! Проверка что все точки посещены ровно один раз (нет дубликатов и прочее)
  for (const route of routes) {
    for (const node of route) {
      if (node === depotValue) continue;
      if (_locations.has(node)) {
        console.log(
          `ПРОВЕРКА ОГРАНИЧЕНИЙ РЕШЕНИЯ (ПРОВАЛ): Точка ${node} содержится более одного раза`
        );
        return false;
      } else {
        _locations.set(node, 1);
      }
    }
  }
  for (const location of locations) {
    if (!_locations.has(location)) {
      console.log(
        `ПРОВЕРКА ОГРАНИЧЕНИЙ РЕШЕНИЯ (ПРОВАЛ): Точка ${location} не содержится в маршрутах`
      );
      return false;
    }
  }

  console.log(
    `ПРОВЕРКА ОГРАНИЧЕНИЙ РЕШЕНИЯ: Проверка что все точки посещены ровно один раз успешно пройдена`
  );
  return true;
};
