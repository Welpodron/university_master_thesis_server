export const getRouteCapacity = ({
  route,
  demands,
}: {
  route: number[];
  demands: number[];
}) => {
  return route.reduce((acc, node) => {
    return acc + demands[node];
  }, 0);
};
