import {IWorkLenzRequest} from "../interfaces/worklenz-request";
import {IWorkLenzResponse} from "../interfaces/worklenz-response";
import db from "../config/db";
import {ServerResponse} from "../models/server-response";
import WorklenzControllerBase from "./worklenz-controller-base";
import HandleExceptions from "../decorators/handle-exceptions";

export default class TaskQueryLogsController extends WorklenzControllerBase {
  @HandleExceptions()
  public static async getByTask(req: IWorkLenzRequest, res: IWorkLenzResponse): Promise<IWorkLenzResponse> {
    const {task_id} = req.params;
    if (!task_id) return res.status(400).send(new ServerResponse(false, null, "task_id is required"));

    const q = `
      SELECT q.id,
             q.task_id,
             q.drawing_ref,
             q.description,
             q.impact,
             q.raised_by,
             rb.name AS raised_by_name,
             q.response,
             q.responded_by,
             rs.name AS responded_by_name,
             q.responded_at,
             q.resolved,
             q.created_at,
             q.updated_at
      FROM task_query_logs q
             LEFT JOIN users rb ON rb.id = q.raised_by
             LEFT JOIN users rs ON rs.id = q.responded_by
      WHERE q.task_id = $1::UUID
      ORDER BY q.created_at DESC;
    `;

    const result = await db.query(q, [task_id]);
    return res.status(200).send(new ServerResponse(true, result.rows));
  }

  @HandleExceptions()
  public static async create(req: IWorkLenzRequest, res: IWorkLenzResponse): Promise<IWorkLenzResponse> {
    const {task_id, drawing_ref, description, impact} = req.body || {};
    if (!task_id || !description) {
      return res.status(400).send(new ServerResponse(false, null, "task_id and description are required"));
    }

    const q = `
      INSERT INTO task_query_logs (task_id, drawing_ref, description, impact, raised_by)
      VALUES ($1::UUID, NULLIF(TRIM($2), ''), TRIM($3), NULLIF(TRIM($4), ''), $5::UUID)
      RETURNING id, task_id, drawing_ref, description, impact, raised_by, response, responded_by, responded_at, resolved, created_at, updated_at;
    `;

    const result = await db.query(q, [task_id, drawing_ref || "", description, impact || "", req.user?.id]);
    return res.status(200).send(new ServerResponse(true, result.rows[0]));
  }

  @HandleExceptions()
  public static async respond(req: IWorkLenzRequest, res: IWorkLenzResponse): Promise<IWorkLenzResponse> {
    const {id} = req.params;
    const {response, resolved} = req.body || {};
    if (!id || !response) {
      return res.status(400).send(new ServerResponse(false, null, "id and response are required"));
    }

    const q = `
      UPDATE task_query_logs
      SET response = TRIM($2),
          responded_by = $3::UUID,
          responded_at = CURRENT_TIMESTAMP,
          resolved = COALESCE($4, resolved),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1::UUID
      RETURNING id, task_id, drawing_ref, description, impact, raised_by, response, responded_by, responded_at, resolved, created_at, updated_at;
    `;

    const result = await db.query(q, [id, response, req.user?.id, resolved]);
    const [data] = result.rows;
    if (!data) return res.status(404).send(new ServerResponse(false, null, "Query log not found"));

    return res.status(200).send(new ServerResponse(true, data));
  }
}
