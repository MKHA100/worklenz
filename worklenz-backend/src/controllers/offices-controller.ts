import {IWorkLenzRequest} from "../interfaces/worklenz-request";
import {IWorkLenzResponse} from "../interfaces/worklenz-response";
import db from "../config/db";
import {ServerResponse} from "../models/server-response";
import WorklenzControllerBase from "./worklenz-controller-base";
import HandleExceptions from "../decorators/handle-exceptions";

export default class OfficesController extends WorklenzControllerBase {
  @HandleExceptions()
  public static async get(req: IWorkLenzRequest, res: IWorkLenzResponse): Promise<IWorkLenzResponse> {
    const q = `
      SELECT id,
             code,
             name,
             city,
             country,
             managing_user_id,
             active,
             created_at,
             updated_at
      FROM offices
      ORDER BY name ASC;
    `;

    const result = await db.query(q, []);
    return res.status(200).send(new ServerResponse(true, result.rows));
  }

  @HandleExceptions()
  public static async create(req: IWorkLenzRequest, res: IWorkLenzResponse): Promise<IWorkLenzResponse> {
    if (!(req.user?.owner || req.user?.is_admin)) {
      return res.status(403).send(new ServerResponse(false, null, "Unauthorized"));
    }

    const {code, name, city, country, managing_user_id, active} = req.body || {};
    if (!code || !name) {
      return res.status(400).send(new ServerResponse(false, null, "code and name are required"));
    }

    const q = `
      INSERT INTO offices (code, name, city, country, managing_user_id, active)
      VALUES (UPPER(TRIM($1)), TRIM($2), NULLIF(TRIM($3), ''), NULLIF(TRIM($4), ''), $5, COALESCE($6, TRUE))
      RETURNING id, code, name, city, country, managing_user_id, active, created_at, updated_at;
    `;

    const result = await db.query(q, [code, name, city || "", country || "", managing_user_id || null, active]);
    return res.status(200).send(new ServerResponse(true, result.rows[0]));
  }

  @HandleExceptions()
  public static async update(req: IWorkLenzRequest, res: IWorkLenzResponse): Promise<IWorkLenzResponse> {
    if (!(req.user?.owner || req.user?.is_admin)) {
      return res.status(403).send(new ServerResponse(false, null, "Unauthorized"));
    }

    const {id} = req.params;
    const {code, name, city, country, managing_user_id, active} = req.body || {};
    if (!id) {
      return res.status(400).send(new ServerResponse(false, null, "id is required"));
    }

    const q = `
      UPDATE offices
      SET code             = COALESCE(UPPER(TRIM($2)), code),
          name             = COALESCE(TRIM($3), name),
          city             = COALESCE(NULLIF(TRIM($4), ''), city),
          country          = COALESCE(NULLIF(TRIM($5), ''), country),
          managing_user_id = COALESCE($6, managing_user_id),
          active           = COALESCE($7, active),
          updated_at       = CURRENT_TIMESTAMP
      WHERE id = $1::UUID
      RETURNING id, code, name, city, country, managing_user_id, active, created_at, updated_at;
    `;

    const result = await db.query(q, [id, code || null, name || null, city || null, country || null, managing_user_id || null, active]);
    const [data] = result.rows;
    if (!data) return res.status(404).send(new ServerResponse(false, null, "Office not found"));

    return res.status(200).send(new ServerResponse(true, data));
  }
}
