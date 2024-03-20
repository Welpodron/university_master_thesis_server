export { router as userRouter } from './user/user';
export {
  router as vehicleRouter,
  creationSchema as vehicleCreationSchema,
  updateSchema as vehicleUpdateSchema,
} from './vehicle/vehicle';
export {
  router as taskRouter,
  creationSchema as taskCreationSchema,
  updateSchema as taskUpdateSchema,
} from './task/task';
export {
  router as jobRouter,
  creationSchema as jobCreationSchema,
  updateSchema as jobUpdateSchema,
} from './job/job';
export { authRouter } from './auth/auth';
export { router as assignmentRouter } from './assignment/assignment';
export { router as settingsRouter } from './settings/settings';
export { router as routingRouter } from './routing/routing';
