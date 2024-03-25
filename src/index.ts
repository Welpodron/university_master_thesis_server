import 'dotenv/config';

import { createServer } from 'http';

import { app } from './app';
import { log } from './loger';

import Bree from 'bree';
import path from 'path';

const PORT = Number(process.env.PORT) || 3000;
const HOSTNAME = process.env.HOSTNAME || 'localhost';

try {
  // const bree = new Bree({
  //   root: path.resolve('./jobs'),
  //   jobs: [
  //     {
  //       name: 'cron',
  //       interval: '5m',
  //     },
  //   ],
  // });

  const server = createServer(app);

  server.listen(PORT, HOSTNAME, async () => {
    log({
      message: `Сервер запущен: http://${HOSTNAME}:${PORT}`,
      code: 'SERVER',
    });
  });

  (async () => {
    // await bree.start();
  })();
} catch (error) {
  try {
    console.log((error as any).stack);
    log({
      message: error,
      code: 'SERVER',
    });
  } catch (error) {
    console.log('При запуске сервера произошла фатальная ошибка:');
    console.error(error);
  }
}
