import 'dotenv/config';

import { app } from './app';
import { log } from './loger';

import Bree from 'bree';
import path from 'path';

const PORT = Number(process.env.PORT) || 3000;
const HOSTNAME = process.env.HOSTNAME || 'localhost';

import DB, { _models } from './db';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { createWS, readWS, removeWS, updateWS } from './middlewares';
import { vehicleCreationSchema, vehicleUpdateSchema } from './routes';

// const bree = new Bree({
//   root: path.resolve('./jobs'),
//   jobs: [
//     {
//       name: 'cron',
//       interval: '10s',
//     },
//   ],
// });

try {
  const server = createServer(app);

  // const io = new Server(server, {
  //   cors: {
  //     credentials: true,
  //     origin: true,
  //   },
  // });

  // io.engine.use((req: any, res: any, next: any) => {
  //   const isHandshake = req._query.sid === undefined;

  //   if (isHandshake) {
  //     // console.log('header');
  //     // console.log(req.headers.authorization);
  //     next();
  //   } else {
  //     if (!req.headers.cookie) {
  //       return next(
  //         new Error('Не обнаружены cookie авторизации, WebSocket не доступен')
  //       );
  //     }
  //     // console.log('cookies');
  //     // console.log(parse(req.headers.cookie));

  //     next();
  //   }
  // });

  // io.on('connection', (socket) => {
  //   console.log('a user connected');

  //   socket.on('disconnect', () => {
  //     console.log('user disconnected');
  //   });

  //   socket.on(
  //     'DELETE_VEHICLE',
  //     removeWS('vehicle', (data) => {
  //       io.emit('VEHICLE_DELETE', {
  //         data,
  //       });
  //     })
  //   );

  //   socket.on(
  //     'UPDATE_VEHICLE',
  //     updateWS('vehicle', vehicleUpdateSchema, (data) => {
  //       io.emit('VEHICLE_UPDATE', {
  //         data,
  //       });
  //     })
  //   );

  //   socket.on(
  //     'ADD_VEHICLE',
  //     createWS('vehicle', vehicleCreationSchema, (data) => {
  //       io.emit('VEHICLE_ADD', {
  //         data,
  //       });
  //     })
  //   );

  //   socket.on(
  //     'GET_VEHICLES',
  //     readWS('vehicle', (data, model) => {
  //       io.emit('VEHICLES_UPDATE', {
  //         data,
  //         model,
  //       });
  //     })
  //   );
  // });

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
