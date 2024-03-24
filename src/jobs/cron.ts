import { parentPort } from 'node:worker_threads';
import process from 'node:process';
import { DB } from '../db';
import { log } from '../loger';
import { sleep } from '../utils/utils';
import Cacher from '../cacher';
import { bee } from '../solvers/ABC/bee';
import { ProblemType } from '../solvers/reader';

(async () => {
  // signal to parent that the job is done
  console.log('cron started');
  if (parentPort) parentPort.postMessage('done');
  else process.exit(0);
})();
