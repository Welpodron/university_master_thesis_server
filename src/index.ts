import * as appRoot from "app-root-path";
import { getProblem } from "./reader";
import { clarkeWrightSavingsAlgorithm } from "./clarke";
import {
  checkCapacity,
  checkDepotsPlacement,
  checkAllLocationsVisitedOnce,
} from "./constrains";

import express from "express";
import cors from "cors";
import { log } from "./loger";
import { getDistanceWithOpenRouteService } from "./pather";

type Good = {
  weight: number;
  quantity: number;
  key: string;
};

type Shipment = {
  location: [number, number] | null;
  key: string;
  goods: Good[];
};

export type FormValuesType = {
  shipments: Shipment[];
};

const DEPOT_LOCATION = [55.74878500893904, 37.886805105099434];
const PORT = process.env.PORT || 3000;

const app = express();

app.use(cors());
app.use(express.json());

app.post("/cvrp", async (request, response) => {
  const { shipments } = request.body as FormValuesType;

  const demands = [0];
  //! HOW TO Calculate ????
  const capacity = 100;

  const locationMatrixFlat = [DEPOT_LOCATION];
  // [[DEPOT_LOCATION_lat, DEPOT_LOCATION_long], [shipment_X_location_lat, shipment_X_location_long]]
  // X - номер отгрузки

  // const clarkeDataDistances = [
  //   [0, 25, 43, 57, 43, 61, 29, 41, 48, 71],
  //   [25, 0, 29, 34, 43, 68, 49, 66, 72, 91],
  //   [43, 29, 0, 52, 72, 96, 72, 81, 89, 114],
  //   [57, 34, 52, 0, 45, 71, 71, 95, 99, 108],
  //   [43, 43, 72, 45, 0, 27, 36, 65, 65, 65],
  //   [61, 68, 96, 71, 27, 0, 40, 66, 62, 46],
  //   [29, 49, 72, 71, 36, 40, 0, 31, 31, 43],
  //   [41, 66, 81, 95, 65, 66, 31, 0, 11, 46],
  //   [48, 72, 89, 99, 65, 62, 31, 11, 0, 36],
  //   [71, 91, 114, 108, 65, 46, 43, 46, 36, 0],
  // ];

  for (const shipment of shipments) {
    const { location, goods } = shipment;

    if (location && goods.length) {
      locationMatrixFlat.push(location);

      demands.push(
        goods.reduce((acc, good) => acc + good.weight * good.quantity, 0)
      );
    }
  }

  const distancesMatrix = new Array(locationMatrixFlat.length);

  //! TODO: Оптимизировать обход матрицы так как она симметричная и нет смысла считать дистанцию дважды
  for (let i = 0; i < locationMatrixFlat.length; i++) {
    const row = new Array(locationMatrixFlat.length).fill(0);

    //! Считаем дистанцию от каждой точки до каждой точки
    for (let j = 0; j < locationMatrixFlat.length; j++) {
      const [latitudeI, longitudeI] = locationMatrixFlat[i];
      const [latitudeJ, longitudeJ] = locationMatrixFlat[j];

      if (i === j) {
        continue;
      }

      const distance = await getDistanceWithOpenRouteService({
        startPoint: { latitude: latitudeI, longitude: longitudeI },
        endPoint: { latitude: latitudeJ, longitude: longitudeJ },
      });

      row[j] = distance;
    }

    distancesMatrix[i] = row;
  }

  const solution = clarkeWrightSavingsAlgorithm({
    nodes: locationMatrixFlat.length,
    demands,
    capacity,
    distancesMatrix,
  });

  const isDepotsPlacementOk = checkDepotsPlacement({
    routes: solution,
  });

  if (!isDepotsPlacementOk) {
    return response.json({
      message: "Неверное расположение начало и конца маршрута",
      solution,
    });
  }

  const isCapacityOk = checkCapacity({
    routes: solution,
    capacity,
    demands,
  });

  if (!isCapacityOk) {
    return response.json({ message: "Неверное значение capacity", solution });
  }

  const isAllLocationsVisitedOnce = checkAllLocationsVisitedOnce({
    routes: solution,
    locations: new Array(locationMatrixFlat.length - 1)
      .fill(0)
      .map((_, i) => i + 1),
  });

  if (!isAllLocationsVisitedOnce) {
    return response.json({
      message: "Не все локации посещены один раз",
      solution,
    });
  }

  return response.json({ message: "ok", solution });
});

app.listen(PORT, async () => {
  log({
    message: `Сервер запущен порт: ${PORT}`,
    code: "SERVER",
  });
});

const main = async () => {
  // const problem = await getProblem({
  //   path: `${appRoot}/benchmarks/A/A-n32-k5.vrp`,
  // });
  // console.log({ problem });
  // const solution = clarkeWrightSavingsAlgorithm({
  //   nodes: problem.dimension,
  //   demands: problem.demands,
  //   capacity: problem.capacity,
  //   distancesMatrix: problem.distancesMatrix,
  // });
  // const isDepotsPlacementOk = checkDepotsPlacement({
  //   routes: solution,
  // });
  // const isCapacityOk = checkCapacity({
  //   routes: solution,
  //   capacity: problem.capacity,
  //   demands: problem.demands,
  // });
  // const isAllLocationsVisitedOnce = checkAllLocationsVisitedOnce({
  //   routes: solution,
  //   locations: new Array(problem.dimension - 1).fill(0).map((_, i) => i + 1),
  // });
  // console.log({ solution });
};

main();