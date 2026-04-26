import express from "express";
import TaskQueryLogsController from "../../controllers/task-query-logs-controller";
import safeControllerFunction from "../../shared/safe-controller-function";

const taskQueryLogsApiRouter = express.Router();

taskQueryLogsApiRouter.get("/task/:task_id", safeControllerFunction(TaskQueryLogsController.getByTask));
taskQueryLogsApiRouter.post("/", safeControllerFunction(TaskQueryLogsController.create));
taskQueryLogsApiRouter.put("/:id/respond", safeControllerFunction(TaskQueryLogsController.respond));

export default taskQueryLogsApiRouter;
