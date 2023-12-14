import { writeFileSync } from 'fs';
import { JSDOM } from 'jsdom';

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
