// https://learn.javascript.ru/server-sent-events

import { RequestHandler, Response } from 'express';
import { OutgoingHttpHeaders } from 'http';

let clients: { id: number; res: Response }[] = [];

export const hook: RequestHandler = async (req, res, next) => {
  const headers: OutgoingHttpHeaders = {
    'Content-Type': 'text/event-stream',
    'Access-Control-Allow-Origin': '*',
    Connection: 'keep-alive',
    'Cache-Control': 'no-cache',
  };

  const id = Date.now();

  const data = `data: ${JSON.stringify(`Subscription id: ${id}`)}\n\n`;

  res.writeHead(200, headers);
  res.write(data);

  clients.push({
    id,
    res,
  });

  console.log(`${id} - Connection opened`);

  req.on('close', () => {
    clients = clients.filter((client) => client.id !== id);

    console.log(`${id} - Connection closed`);
  });
};

export const notify = async (data: any) => {
  for (const client of clients) {
    client.res.write(`data: ${JSON.stringify(data)}\n\n`);
  }
};
