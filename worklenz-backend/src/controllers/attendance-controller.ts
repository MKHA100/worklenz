import {IWorkLenzRequest} from "../interfaces/worklenz-request";
import {IWorkLenzResponse} from "../interfaces/worklenz-response";
import db from "../config/db";
import {ServerResponse} from "../models/server-response";
import WorklenzControllerBase from "./worklenz-controller-base";
import HandleExceptions from "../decorators/handle-exceptions";

type AttendanceStatus = "present" | "absent" | "half_day" | "on_leave";

const VALID_STATUSES: AttendanceStatus[] = ["present", "absent", "half_day", "on_leave"];
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export default class AttendanceController extends WorklenzControllerBase {
  private static parseDate(value?: string): string | null {
    if (!value || !DATE_REGEX.test(value)) return null;
    return value;
  }

  private static parseStatus(value?: string): AttendanceStatus | null {
    const normalized = (value || "").toLowerCase() as AttendanceStatus;
    return VALID_STATUSES.includes(normalized) ? normalized : null;
  }

  @HandleExceptions()
  public static async get(req: IWorkLenzRequest, res: IWorkLenzResponse): Promise<IWorkLenzResponse> {
    const start = this.parseDate(req.query.start as string) || new Date().toISOString().slice(0, 10);
    const end = this.parseDate(req.query.end as string) || start;
    const requestedUserId = req.query.user_id as string | undefined;
    const canViewOthers = !!(req.user?.owner || req.user?.is_admin);
    const targetUserId = canViewOthers ? requestedUserId : req.user?.id;

    const q = `
      SELECT ar.id,
             ar.user_id,
             u.name AS user_name,
             ar.office_id,
             o.name AS office_name,
             ar.attendance_date,
             ar.status,
             ar.reason,
             ar.check_in_at,
             ar.confirmed,
             ar.created_at,
             ar.updated_at
      FROM attendance_records ar
             LEFT JOIN users u ON u.id = ar.user_id
             LEFT JOIN offices o ON o.id = ar.office_id
      WHERE ar.attendance_date BETWEEN $1::DATE AND $2::DATE
        AND ($3::UUID IS NULL OR ar.user_id = $3::UUID)
      ORDER BY ar.attendance_date DESC, ar.created_at DESC;
    `;

    const result = await db.query(q, [start, end, targetUserId || null]);
    return res.status(200).send(new ServerResponse(true, result.rows));
  }

  @HandleExceptions()
  public static async upsert(req: IWorkLenzRequest, res: IWorkLenzResponse): Promise<IWorkLenzResponse> {
    const attendanceDate = this.parseDate(req.body?.attendance_date);
    const status = this.parseStatus(req.body?.status);
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : null;

    if (!attendanceDate || !status) {
      return res.status(400).send(new ServerResponse(false, null, "attendance_date and valid status are required"));
    }

    const q = `
      INSERT INTO attendance_records (user_id, office_id, attendance_date, status, reason, check_in_at, confirmed)
      VALUES ($1, $2, $3::DATE, $4, $5, COALESCE($6::TIMESTAMPTZ, CURRENT_TIMESTAMP), TRUE)
      ON CONFLICT (user_id, attendance_date)
          DO UPDATE SET status = EXCLUDED.status,
                        reason = EXCLUDED.reason,
                        check_in_at = COALESCE(attendance_records.check_in_at, EXCLUDED.check_in_at),
                        confirmed = TRUE,
                        updated_at = CURRENT_TIMESTAMP
      RETURNING id,
                user_id,
                office_id,
                attendance_date,
                status,
                reason,
                check_in_at,
                confirmed,
                created_at,
                updated_at;
    `;

    const result = await db.query(q, [
      req.user?.id,
      (req.user as any)?.office_id || null,
      attendanceDate,
      status,
      reason,
      req.body?.check_in_at || null
    ]);

    return res.status(200).send(new ServerResponse(true, result.rows[0]));
  }
}
