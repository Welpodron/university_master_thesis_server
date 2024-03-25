import { ProblemType } from '../reader';
import { getRouteCapacity } from '../utils';

const getLinkInfo = ({
  link,
  routes,
}: {
  link: { i: number; j: number };
  routes: number[][];
}) => {
  //! Внимание! Мы предполагаем что link.i и link.j не встречаются несколько раз в разных маршрутах
  const result = { iRoute: -1, jRoute: -1, counter: 0 };

  for (let k = 0; k < routes.length; k++) {
    if (result.counter > 2) {
      break;
    }
    const route = routes[k];

    if (route.includes(link.i)) {
      result.iRoute = k;
      result.counter++;
    }

    if (route.includes(link.j)) {
      result.jRoute = k;
      result.counter++;
    }
  }

  return result;
};

const isInterior = ({ node, route }: { node: number; route: number[] }) => {
  const index = route.indexOf(node);
  return index > 0 && index < route.length - 1;
};

const mergeRoutes = ({
  route1,
  route2,
  link,
}: {
  route1: number[];
  route2: number[];
  link: { i: number; j: number };
}) => {
  const route1Temp = [...route1];
  const route2Temp = [...route2];

  if (route1.indexOf(link.i) !== route1.length - 1) {
    route1Temp.reverse();
  }

  if (route2.indexOf(link.j) !== 0) {
    route2Temp.reverse();
  }

  return [...route1Temp, ...route2Temp];
};

export const clarke = ({
  distancesMatrix,
  dimension,
  demands,
  capacity,
}: ProblemType) => {
  if (dimension == 2) {
    return [0, 1, 0];
  }

  // Calculate savings between each pair of customers
  // index 0 is the depot
  const savings = [];

  for (let row = 1; row < dimension; row++) {
    for (let column = row; column < dimension; column++) {
      // console.log({ row, column });
      if (row !== column) {
        const saving =
          distancesMatrix[0][row] +
          distancesMatrix[0][column] -
          distancesMatrix[row][column];
        savings.push({ i: row, j: column, saving });
      }
    }
  }

  // Sort the savings in decreasing order
  savings.sort((a, b) => b.saving - a.saving);

  // Initialize routes
  const routes = [];
  const nodeList = new Array(dimension - 1).fill(0).map((_, i) => i + 1);
  for (const link of savings) {
    const { iRoute, jRoute, counter } = getLinkInfo({ link, routes });
    //! Вариант a. Ни i ни j из link еще ни разу не присутствовали ни в одном маршруте,
    //! ...в таком случае добавляем новый маршрут состоящий из i и j.
    if (counter === 0) {
      //? Проверить ограничения на вместимость или другие ограничения
      const isRouteCapacityOk =
        getRouteCapacity({ route: [link.i, link.j], demands }) <= capacity;
      if (isRouteCapacityOk) {
        //* Ограничения соблюдены - добавляем новый маршрут
        routes.push([link.i, link.j]);
        const indexOfNodeI = nodeList.indexOf(link.i);
        if (indexOfNodeI !== -1) {
          nodeList.splice(indexOfNodeI, 1);
        }
        // ! Важно поставить поиск индекса сюда так как массив обновился
        const indexOfNodeJ = nodeList.indexOf(link.j);
        if (indexOfNodeJ !== -1) {
          nodeList.splice(indexOfNodeJ, 1);
        }
      } else {
        //! Ограничения не соблюдены - пропускаем link
      }
    }
    //! Вариант b. Только одна точка либо i либо j уже присутствует в каком-либо маршруте (те если i присутствует, то j точно не присутствует и наоборот)
    //! ...и только если эта точка (которая уже присутствует) являются 0 элементом маршрута ИЛИ являются последним элементом маршрута (route.length - 1)
    //! ...то тогда если точка является 0 элементом маршрута, добавляем точку которая НЕ ПРИСУТСТВУЕТ в начало маршрута unshift, иначе добавляем не присутствующую точку в конец маршрута push
    else if (counter === 1) {
      const existingRoute = iRoute !== -1 ? iRoute : jRoute;
      const existingNode = iRoute !== -1 ? link.i : link.j;
      const existingNodePosition = routes[existingRoute].indexOf(existingNode);
      const nodeToAdd = iRoute !== -1 ? link.j : link.i;
      const isExistingNodeNotInterior = !isInterior({
        node: existingNode,
        route: routes[existingRoute],
      });
      if (isExistingNodeNotInterior) {
        //? Проверить ограничения на вместимость или другие ограничения
        const isRouteCapacityOk =
          getRouteCapacity({
            route: [...routes[existingRoute], nodeToAdd],
            demands,
          }) <= capacity;
        if (isRouteCapacityOk) {
          //* Ограничения соблюдены - добавляем точку в маршрут
          if (existingNodePosition === 0) {
            routes[existingRoute].unshift(nodeToAdd);
          } else {
            routes[existingRoute].push(nodeToAdd);
          }
          const nodeToAddIndex = nodeList.indexOf(nodeToAdd);
          if (nodeToAddIndex !== -1) {
            nodeList.splice(nodeToAddIndex, 1);
          }
        } else {
          //! Ограничения не соблюдены - пропускаем link
        }
      } else {
        //! Условие b. не соблюдено (имеющаяся точка не является 0 или последней точкой маршрута) - пропускаем link
      }
    }
    //! Вариант c. Точка i и точка j уже обе находятся в РАЗНЫХ маршрутах и каждая из них является 0 элементом маршрута ИЛИ является последним элементом маршрута (route.length - 1)
    //! ...то тогда следует объединить эти два маршрута в один
    else {
      if (iRoute !== jRoute) {
        //* Точки лежат в разных маршрутах проверяем дальше условия
        const isINotInterior = !isInterior({
          node: link.i,
          route: routes[iRoute],
        });
        const isJNotInterior = !isInterior({
          node: link.j,
          route: routes[jRoute],
        });
        if (isINotInterior && isJNotInterior) {
          //? Проверить ограничения на вместимость или другие ограничения
          const isRouteCapacityOk =
            getRouteCapacity({
              route: [...routes[iRoute], ...routes[jRoute]],
              demands,
            }) <= capacity;
          if (isRouteCapacityOk) {
            //* Ограничения соблюдены - объединяем маршруты
            const routeMerged = mergeRoutes({
              route1: routes[iRoute],
              route2: routes[jRoute],
              link,
            });
            routes[iRoute] = [...routeMerged];
            // routes.splice(iRoute, 1);
            routes.splice(jRoute, 1);
            // routes.push(routeMerged);
            const indexOfNodeI = nodeList.indexOf(link.i);
            if (indexOfNodeI !== -1) {
              nodeList.splice(indexOfNodeI, 1);
            }
            // ! Важно поставить поиск индекса сюда так как массив обновился
            const indexOfNodeJ = nodeList.indexOf(link.j);
            if (indexOfNodeJ !== -1) {
              nodeList.splice(indexOfNodeJ, 1);
            }
          } else {
            //! Ограничения не соблюдены - пропускаем link
          }
        } else {
          //! Условие с. не выполняется - пропускаем link
        }
      } else {
        //! Точки лежат в одном и том же маршруте - пропускаем link
      }
    }
  }
  //! Проверяем оставшиеся точки
  for (const node of nodeList) {
    // Проверяем ограничения на вместимость ????
    // Добавляем каждую оставшуюся точку в новый собственный маршрут
    // routes.push([node]);
    // const isRouteCapacityOk = getRouteCapacity([node], demands) <= capacity;
    // if (isRouteCapacityOk) {
    //   routes.push([node]);
    // } else {
    //   // Ограничения не соблюдены - пропускаем link
    // }
  }

  const flat = [0];

  for (const route of routes) {
    for (const node of route) {
      flat.push(node);
    }
    flat.push(0);
  }

  return flat;
};
