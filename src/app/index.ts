import express from 'express';
import cors from 'cors';

import cookieParser from 'cookie-parser';

import {
  taskRouter,
  userRouter,
  authRouter,
  vehicleRouter,
  jobRouter,
  assignmentRouter,
} from '../routes';

const app = express();

app.use(
  cors({
    // origin: 'http://localhost:5173',
    origin: true,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(taskRouter);
app.use(userRouter);
app.use(authRouter);
app.use(vehicleRouter);
app.use(jobRouter);
app.use(assignmentRouter);

export { app };
