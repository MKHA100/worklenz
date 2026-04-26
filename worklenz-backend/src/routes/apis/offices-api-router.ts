import express from "express";
import OfficesController from "../../controllers/offices-controller";
import safeControllerFunction from "../../shared/safe-controller-function";

const officesApiRouter = express.Router();

officesApiRouter.get("/", safeControllerFunction(OfficesController.get));
officesApiRouter.post("/", safeControllerFunction(OfficesController.create));
officesApiRouter.put("/:id", safeControllerFunction(OfficesController.update));

export default officesApiRouter;
