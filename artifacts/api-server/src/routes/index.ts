import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import tripsRouter from "./trips";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use("/trips", tripsRouter);
router.use("/ai", aiRouter);

export default router;
