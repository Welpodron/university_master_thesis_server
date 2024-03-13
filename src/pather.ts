export type EarthPointType = {
  latitude: number;
  longitude: number;
};

export type OpenRouteServiceResponseType = {
  features: {
    properties: {
      summary: {
        duration: number;
        distance: number;
      };
    };
  }[];
};

//! TODO: Оптимизировать с помощью кэша те запоминать маршруты и их расстояние и время в кэш
export const getDistanceWithOpenRouteService = async ({
  startPoint,
  endPoint,
}: {
  startPoint: EarthPointType;
  endPoint: EarthPointType;
}) => {
  //! ВНИМАНИЕ! Тут координаты передаются сначала longitude (долгота) а потом latitude (широта)
  const url = `https://api.openrouteservice.org/v2/directions/driving-hgv?api_key=${process.env.OPEN_ROUTE_API_KEY}&start=${startPoint.longitude},${startPoint.latitude}&end=${endPoint.longitude},${endPoint.latitude}`;

  const response = await fetch(url);

  if (response.status !== 200) {
    throw new Error(
      `OpenRouteService error: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as OpenRouteServiceResponseType;

  if (!data.features) {
    throw new Error(`OpenRouteService error: ${data}`);
  }

  const feature = data.features[0];

  if (!feature) {
    throw new Error(`OpenRouteService error: ${data}`);
  }

  const { distance } = feature?.properties?.summary;

  if (!distance) {
    throw new Error(`OpenRouteService error: ${data}`);
  }

  return distance;
};

// https://en.wikipedia.org/wiki/Metric_space#Simple_examples

export type TwoPointsType = {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
};

// https://en.wikipedia.org/wiki/Euclidean_distance
export const getDistanceEuclidean = ({ x1, x2, y1, y2 }: TwoPointsType) => {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
};
// https://en.wikipedia.org/wiki/Taxicab_geometry
export const getDistanceManhattan = ({ x1, x2, y1, y2 }: TwoPointsType) => {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
};
// https://en.wikipedia.org/wiki/Chebyshev_distance
export const getDistanceChebyshev = ({ x1, x2, y1, y2 }: TwoPointsType) => {
  return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
};
