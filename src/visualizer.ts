import { writeFileSync } from 'fs';
import { JSDOM } from 'jsdom';
import { ProblemType } from './solvers/reader';

export const createProblemGraph = (coords: { x: number; y: number }[]) => {
  const width = 500;
  const height = 500;
  const marginTop = 20;
  const marginRight = 20;
  const marginBottom = 20;
  const marginLeft = 20;

  const dom = new JSDOM(`<!DOCTYPE html><body></body>`);

  import('d3').then((d3) => {
    let body = d3.select(dom.window.document.querySelector('body'));

    // Declare the x (horizontal position) scale.
    const x = d3
      .scaleLinear()
      .domain([0, (d3.max(coords, (d) => d.x) as number) + 10.0])
      .range([marginLeft, width - marginRight]);

    // Declare the y (vertical position) scale.
    const y = d3
      .scaleLinear()
      .domain([0, (d3.max(coords, (d) => d.y) as number) + 10.0])
      .range([height - marginBottom, marginTop]);

    // Create the SVG container.
    const svg = body
      .append('svg')
      .attr('xmlns', 'http://www.w3.org/2000/svg')
      .attr('xmlns:xlink', 'http://www.w3.org/1999/xlink')
      .attr('width', width + 100 + 25)
      .attr('height', height)
      .attr('viewBox', [0, 0, width + 100, height])
      .attr('style', 'max-width: 100%; height: auto; height: intrinsic;');

    // Add the x-axis.
    svg
      .append('g')
      .attr('transform', `translate(0,${height - marginBottom})`)
      .call(d3.axisBottom(x));

    // Add the y-axis.
    svg
      .append('g')
      .attr('transform', `translate(${marginLeft},0)`)
      .call(d3.axisLeft(y));

    // Add the points
    svg
      .append('g')
      .selectAll('circle')
      .data(coords)
      .join('circle')
      .attr('cx', (d) => x(d.x))
      .attr('cy', (d) => y(d.y))
      .attr('r', 2.5)
      .style('fill', (d, i) => (i == 0 ? 'red' : 'black'));

    // Add legend
    // Handmade legend
    svg
      .append('circle')
      .attr('cx', width)
      .attr('cy', 50)
      .attr('r', 4)
      .style('fill', 'red');
    svg
      .append('circle')
      .attr('cx', width)
      .attr('cy', 80)
      .attr('r', 4)
      .style('fill', 'black');
    svg
      .append('text')
      .attr('x', width + 10)
      .attr('y', 50)
      .text('Депо (1)')
      .style('font-size', '15px')
      .attr('alignment-baseline', 'middle');
    svg
      .append('text')
      .attr('x', width + 10)
      .attr('y', 80)
      .text(`Узлы (${coords.length - 1})`)
      .style('font-size', '15px')
      .attr('alignment-baseline', 'middle');

    writeFileSync('problem.svg', body.html());
  });
};

export const visualizeSolution = (
  solution: number[][],
  coords: { x: number; y: number }[]
) => {
  const width = 500;
  const height = 500;
  const marginTop = 20;
  const marginRight = 20;
  const marginBottom = 20;
  const marginLeft = 20;

  const dom = new JSDOM(`<!DOCTYPE html><body></body>`);

  import('d3').then((d3) => {
    let body = d3.select(dom.window.document.querySelector('body'));

    // Declare the x (horizontal position) scale.
    const x = d3
      .scaleLinear()
      .domain([0, (d3.max(coords, (d) => d.x) as number) + 10.0])
      .range([marginLeft, width - marginRight]);

    // Declare the y (vertical position) scale.
    const y = d3
      .scaleLinear()
      .domain([0, (d3.max(coords, (d) => d.y) as number) + 10.0])
      .range([height - marginBottom, marginTop]);

    // Create the SVG container.
    const svg = body
      .append('svg')
      .attr('xmlns', 'http://www.w3.org/2000/svg')
      .attr('xmlns:xlink', 'http://www.w3.org/1999/xlink')
      .attr('width', width + 100 + 25)
      .attr('height', height)
      .attr('viewBox', [0, 0, width + 100, height])
      .attr('style', 'max-width: 100%; height: auto; height: intrinsic;');

    // Add the x-axis.
    svg
      .append('g')
      .attr('transform', `translate(0,${height - marginBottom})`)
      .call(d3.axisBottom(x));

    // Add the y-axis.
    svg
      .append('g')
      .attr('transform', `translate(${marginLeft},0)`)
      .call(d3.axisLeft(y));

    // Add the points
    svg
      .append('g')
      .selectAll('circle')
      .data(coords)
      .join('circle')
      .attr('cx', (d) => x(d.x))
      .attr('cy', (d) => y(d.y))
      .attr('r', 2.5)
      .style('fill', (d, i) => (i == 0 ? 'red' : 'black'));

    // Add legend

    let i = 1;

    const colorFunction = d3
      .scaleSequential()
      .domain([0, solution.length - 1])
      .interpolator(d3.interpolateTurbo);

    for (let route of solution) {
      const data = route.map((i) => [coords[i].x, coords[i].y]);
      const lineFunction = d3
        .line()
        .x((d) => x(d[0]))
        .y((d) => y(d[1]));
      // const color = 'hsl(' + Math.random() * 360 + ',100%,50%)';
      const color = colorFunction(i - 1) as string;
      svg
        .append('path')
        .data([data])
        .attr('d', lineFunction as any)
        .attr('stroke', color)
        .attr('fill', 'none');
      if (solution.length <= 32) {
        // Handmade legend
        svg
          .append('circle')
          .attr('cx', width)
          .attr('cy', 15 + (i - 1) * 15)
          .attr('r', 2)
          .style('fill', color);
        svg
          .append('text')
          .attr('x', width + 10)
          .attr('y', 15 + (i - 1) * 15)
          .text(`маршрут ${i}`)
          .style('font-size', '12px')
          .attr('alignment-baseline', 'middle');
      } else {
        if (i == 1) {
          svg
            .append('text')
            .attr('x', width)
            .attr('y', height / 2)
            .text(`маршрутов ${solution.length}`)
            .style('font-size', '12px')
            .style('fill', 'green')
            .attr('alignment-baseline', 'middle');
        }
      }

      i += 1;
    }

    try {
      writeFileSync('solution.svg', body.html());
    } catch (error) {
      console.error(error);
    }
  });
};

export const visualizeCostAll = ({
  aco,
  problem,
  clarke,
  abcTabu,
  abcClarke,
}: {
  problem: ProblemType;
  clarke: number;
  aco: { distance: number; generation: number }[];
  abcTabu: { distance: number; generation: number }[];
  abcClarke: { distance: number; generation: number }[];
}) => {
  const width = 1000;
  const height = 500;
  const marginTop = 20;
  const marginRight = 30;
  const marginBottom = 30;
  const marginLeft = 100;

  const dom = new JSDOM(`<!DOCTYPE html><body></body>`);

  const MAX_GENERATION = Math.max(
    aco[aco.length - 1].generation,
    abcTabu[abcTabu.length - 1].generation,
    abcClarke[abcClarke.length - 1].generation
  );

  const _clarke: { distance: number; generation: number }[] = [];
  const _optimal: { distance: number; generation: number }[] = [];

  for (let i = 0; i < MAX_GENERATION; i++) {
    _clarke.push({
      distance: clarke,
      generation: i,
    });
    _optimal.push({
      distance: problem.optimal,
      generation: i,
    });
  }

  import('d3').then((d3) => {
    let body = d3.select(dom.window.document.querySelector('body'));

    // Declare the x (horizontal position) scale.
    // const x = d3.scaleUtc(
    //   d3.extent(aco, (d) => d.generation) as [number, number],
    //   [marginLeft, width - marginRight]
    // );
    const x = d3.scaleLinear(
      [0, d3.max(aco, (d) => d.generation) as number] as [number, number],
      [marginLeft, width - marginRight]
    );

    // Declare the y (vertical position) scale.
    const y = d3.scaleLinear(
      [
        Math.ceil(problem.optimal) - 100000.0,
        (d3.max(aco, (d) => d.distance) as number) + 100.0,
      ] as [number, number],
      [height - marginBottom, marginTop]
    );

    // Declare the line generator.
    const line = d3
      .line()
      .x((d) => x((d as any).generation))
      .y((d) => y((d as any).distance));

    // Create the SVG container.
    const svg = body
      .append('svg')
      .attr('xmlns', 'http://www.w3.org/2000/svg')
      .attr('xmlns:xlink', 'http://www.w3.org/1999/xlink')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width + 200, height])
      .attr('style', 'max-width: 100%; height: auto; height: intrinsic;');

    // Add the x-axis.
    svg
      .append('g')
      .attr('transform', `translate(0,${height - marginBottom})`)
      .call(
        d3
          .axisBottom(x)
          .ticks(width / 80)
          .tickSizeOuter(0)
      );

    // Add the y-axis, remove the domain line, add grid lines and a label.
    svg
      .append('g')
      .attr('transform', `translate(${marginLeft},0)`)
      .call(d3.axisLeft(y).ticks(height / 40))
      .call((g) =>
        g
          .selectAll('.tick line')
          .clone()
          .attr('x2', width - marginLeft - marginRight)
          .attr('stroke-opacity', 0.1)
      )
      .call((g) =>
        g
          .append('text')
          .attr('x', -marginLeft)
          .attr('y', 10)
          .attr('fill', 'currentColor')
          .attr('text-anchor', 'start')
          .text('Расходы (км)')
      );

    svg
      .append('text')
      .attr('class', 'x label')
      .attr('text-anchor', 'end')
      .attr('x', width)
      .attr('y', height - 6)
      .text('Итерации')
      .style('font-size', '12px');

    svg
      .append('path')
      .attr('fill', 'none')
      .attr('stroke', 'steelblue')
      .attr('stroke-width', 1.5)
      .attr('d', line(aco as any));

    svg
      .append('path')
      .attr('fill', 'none')
      .attr('stroke', 'red')
      .attr('stroke-width', 1.5)
      .attr('d', line(abcClarke as any));

    svg
      .append('path')
      .attr('fill', 'none')
      .attr('stroke', 'yellow')
      .attr('stroke-width', 1.5)
      .attr('d', line(abcTabu as any));

    svg
      .append('path')
      .attr('fill', 'none')
      .attr('stroke', 'green')
      .attr('stroke-width', 2)
      .attr('d', line(_optimal as any));

    svg
      .append('path')
      .attr('fill', 'none')
      .attr('stroke', 'black')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', 4)
      .attr('d', line(_clarke as any));

    // Handmade legend
    svg
      .append('circle')
      .attr('cx', width)
      .attr('cy', 15)
      .attr('r', 4)
      .style('fill', 'steelblue');
    svg
      .append('text')
      .attr('x', width + 10)
      .attr('y', 15)
      .text('ACO(Нат)')
      .style('font-size', '12px')
      .style('fill', 'steelblue')
      .attr('alignment-baseline', 'middle');
    svg
      .append('circle')
      .attr('cx', width)
      .attr('cy', 30)
      .attr('r', 4)
      .style('fill', 'yellow');
    svg
      .append('text')
      .attr('x', width + 10)
      .attr('y', 30)
      .text(`ABC(Мод)+Табу(Мод)`)
      .style('font-size', '12px')
      .style('fill', 'yellow')
      .attr('alignment-baseline', 'middle');
    svg
      .append('circle')
      .attr('cx', width)
      .attr('cy', 45)
      .attr('r', 4)
      .style('fill', 'red');
    svg
      .append('text')
      .attr('x', width + 10)
      .attr('y', 45)
      .text(`ABC(Мод)+Кларк(Мод)`)
      .style('font-size', '12px')
      .style('fill', 'red')
      .attr('alignment-baseline', 'middle');
    svg
      .append('circle')
      .attr('cx', width)
      .attr('cy', 60)
      .attr('r', 4)
      .style('fill', 'black');
    svg
      .append('text')
      .attr('x', width + 10)
      .attr('y', 60)
      .text(`Кларк(Мод)`)
      .style('font-size', '12px')
      .style('fill', 'black')
      .attr('alignment-baseline', 'middle');
    svg
      .append('circle')
      .attr('cx', width)
      .attr('cy', 75)
      .attr('r', 4)
      .style('fill', 'green');
    svg
      .append('text')
      .attr('x', width + 10)
      .attr('y', 75)
      .text(`ОПТИМАЛЬНОЕ(Полный перебор)`)
      .style('font-size', '12px')
      .style('fill', 'green')
      .attr('alignment-baseline', 'middle');

    writeFileSync('TDC.svg', body.html());
  });
};

export const generateTable = () => {};
