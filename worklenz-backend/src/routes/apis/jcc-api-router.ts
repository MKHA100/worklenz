import express from "express";
import JccWorkflowController from "../../controllers/jcc-workflow-controller";
import safeControllerFunction from "../../shared/safe-controller-function";

const jccApiRouter = express.Router();

jccApiRouter.get("/review-queue", safeControllerFunction(JccWorkflowController.getReviewQueue));
jccApiRouter.put("/submit/:task_id", safeControllerFunction(JccWorkflowController.submitForReview));
jccApiRouter.put("/review/:task_id", safeControllerFunction(JccWorkflowController.review));

export default jccApiRouter;
