import 'dotenv/config';

import { app } from './app';
import { log } from './loger';

const PORT = Number(process.env.PORT) || 3000;
const HOSTNAME = process.env.HOSTNAME || 'localhost';

try {
  app.listen(PORT, HOSTNAME, async () => {
    log({
      message: `Сервер запущен: http://${HOSTNAME}:${PORT}`,
      code: 'SERVER',
    });
  });
} catch (error) {
  try {
    log({
      message: error,
      code: 'SERVER',
    });
  } catch (error) {
    console.log('При запуске сервера произошла фатальная ошибка:');
    console.error(error);
  }
}
