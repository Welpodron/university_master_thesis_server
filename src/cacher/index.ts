import { readFile, writeFile } from 'fs/promises';
import { resolve } from 'path';
import { log } from '../loger';

type TCache = {
  startId: number;
  endId: number;
  distance: number;
};

class Cacher {
  constructor(public path: string) {}
  async read() {
    let cache: TCache[] = [];

    try {
      const buffer = await readFile(resolve(this.path));

      let data = buffer.toString().trim();

      if (data.length) {
        cache = JSON.parse(data);
      }
    } catch (error) {
      log({
        message: error,
        code: 'CACHE',
      });
    }

    return cache;
  }
  async write(data: TCache[]) {
    try {
      await writeFile(resolve(this.path), JSON.stringify(data));

      log({
        message: 'Кэш успешно обновлен',
        code: 'CACHE',
      });
    } catch (error) {
      log({
        message: error,
        code: 'CACHE',
      });
    }
  }
}

export default new Cacher(resolve(process.cwd(), './_cache'));
