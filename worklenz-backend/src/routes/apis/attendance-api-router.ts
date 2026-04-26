import express from "express";
import AttendanceController from "../../controllers/attendance-controller";
import safeControllerFunction from "../../shared/safe-controller-function";

const attendanceApiRouter = express.Router();

attendanceApiRouter.get("/", safeControllerFunction(AttendanceController.get));
attendanceApiRouter.post("/", safeControllerFunction(AttendanceController.upsert));

export default attendanceApiRouter;
