import {IWorkLenzRequest} from "../interfaces/worklenz-request";
import {IWorkLenzResponse} from "../interfaces/worklenz-response";
import db from "../config/db";
import {ServerResponse} from "../models/server-response";
import WorklenzControllerBase from "./worklenz-controller-base";
import HandleExceptions from "../decorators/handle-exceptions";

type ReviewOutcome = "approved" | "revision_required" | "rejected" | "on_hold";

const OUTCOME_TO_STATUS_NAME: Record<ReviewOutcome, string> = {
  approved: "Approved",
  revision_required: "Revision Required",
  rejected: "Rejected",
  on_hold: "On Hold"
};

export default class JccWorkflowController extends WorklenzControllerBase {
  private static async getStatusIdByName(projectId: string, statusName: string): Promise<string | null> {
    const q = `
      SELECT id
      FROM task_statuses
      WHERE project_id = $1::UUID
        AND LOWER(name) = LOWER($2)
      LIMIT 1;
    `;
    const result = await db.query(q, [projectId, statusName]);
    return result.rows[0]?.id || null;
  }

  @HandleExceptions()
  public static async getReviewQueue(req: IWorkLenzRequest, res: IWorkLenzResponse): Promise<IWorkLenzResponse> {
    const projectId = req.query.project_id as string | undefined;

    const q = `
      SELECT t.id,
             t.name,
             t.project_id,
             p.name AS project_name,
             t.submitted_at,
             t.revision_count,
             t.review_outcome,
             t.review_comment,
             t.end_date AS due_date,
             (SELECT json_agg(row_to_json(rec))
              FROM (SELECT u.id, u.name, u.avatar_url
                    FROM tasks_assignees ta
                           INNER JOIN team_members tm ON tm.id = ta.team_member_id
                           INNER JOIN users u ON u.id = tm.user_id
                    WHERE ta.task_id = t.id) rec) AS assignees
      FROM tasks t
             INNER JOIN projects p ON p.id = t.project_id
             INNER JOIN task_statuses ts ON ts.id = t.status_id
      WHERE t.archived IS FALSE
        AND LOWER(ts.name) = 'submitted'
        AND ($1::UUID IS NULL OR t.project_id = $1::UUID)
      ORDER BY t.submitted_at DESC NULLS LAST, t.updated_at DESC;
    `;

    const result = await db.query(q, [projectId || null]);
    return res.status(200).send(new ServerResponse(true, result.rows));
  }

  @HandleExceptions()
  public static async submitForReview(req: IWorkLenzRequest, res: IWorkLenzResponse): Promise<IWorkLenzResponse> {
    const {task_id} = req.params;
    if (!task_id) return res.status(400).send(new ServerResponse(false, null, "task_id is required"));

    const taskResult = await db.query(`SELECT id, project_id FROM tasks WHERE id = $1::UUID LIMIT 1;`, [task_id]);
    const task = taskResult.rows[0];
    if (!task) return res.status(404).send(new ServerResponse(false, null, "Task not found"));

    const timeLogResult = await db.query(
      `SELECT COUNT(*)::INT AS count FROM task_work_log WHERE task_id = $1::UUID AND time_spent > 0;`,
      [task_id]
    );
    const logCount = timeLogResult.rows[0]?.count || 0;
    if (logCount <= 0) {
      return res.status(400).send(new ServerResponse(false, null, "Cannot submit without a time log"));
    }

    const submittedStatusId = await this.getStatusIdByName(task.project_id, "Submitted");
    if (!submittedStatusId) {
      return res.status(400).send(new ServerResponse(false, null, "Submitted status is not configured for this project"));
    }

    const q = `
      UPDATE tasks
      SET status_id = $2::UUID,
          submitted_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1::UUID
      RETURNING id, project_id, status_id, submitted_at, updated_at;
    `;
    const result = await db.query(q, [task_id, submittedStatusId]);
    return res.status(200).send(new ServerResponse(true, result.rows[0]));
  }

  @HandleExceptions()
  public static async review(req: IWorkLenzRequest, res: IWorkLenzResponse): Promise<IWorkLenzResponse> {
    const {task_id} = req.params;
    const {outcome, comment} = req.body || {};
    const normalizedOutcome = (outcome || "").toLowerCase() as ReviewOutcome;

    if (!task_id || !normalizedOutcome) {
      return res.status(400).send(new ServerResponse(false, null, "task_id and outcome are required"));
    }

    if (!Object.keys(OUTCOME_TO_STATUS_NAME).includes(normalizedOutcome)) {
      return res.status(400).send(new ServerResponse(false, null, "Invalid review outcome"));
    }

    if (normalizedOutcome === "rejected" && !comment) {
      return res.status(400).send(new ServerResponse(false, null, "Comment is required for rejected outcome"));
    }

    const taskResult = await db.query(`SELECT id, project_id FROM tasks WHERE id = $1::UUID LIMIT 1;`, [task_id]);
    const task = taskResult.rows[0];
    if (!task) return res.status(404).send(new ServerResponse(false, null, "Task not found"));

    const statusName = OUTCOME_TO_STATUS_NAME[normalizedOutcome];
    const targetStatusId = await this.getStatusIdByName(task.project_id, statusName);
    if (!targetStatusId) {
      return res.status(400).send(new ServerResponse(false, null, `${statusName} status is not configured for this project`));
    }

    const revisionIncrement = normalizedOutcome === "revision_required" ? 1 : 0;
    const q = `
      UPDATE tasks
      SET status_id = $2::UUID,
          review_outcome = $3,
          review_comment = CASE WHEN $4::TEXT IS NULL THEN review_comment ELSE TRIM($4::TEXT) END,
          reviewed_at = CURRENT_TIMESTAMP,
          revision_count = revision_count + $5::INT,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1::UUID
      RETURNING id, project_id, status_id, review_outcome, review_comment, reviewed_at, revision_count, updated_at;
    `;

    const result = await db.query(q, [task_id, targetStatusId, normalizedOutcome, comment || null, revisionIncrement]);
    return res.status(200).send(new ServerResponse(true, result.rows[0]));
  }
}
