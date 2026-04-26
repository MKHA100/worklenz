-- Migration: JCC phase 1 foundation schema
-- Date: 2026-04-25
-- Notes:
-- - Non-breaking additive migration to introduce domain entities and fields
-- - Existing Worklenz behavior is preserved

BEGIN;

-- ---------------------------------------------------------------------------
-- Offices / locations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS offices (
    id               UUID                     DEFAULT uuid_generate_v4() NOT NULL,
    code             TEXT                                                NOT NULL,
    name             TEXT                                                NOT NULL,
    city             TEXT,
    country          TEXT,
    managing_user_id UUID,
    active           BOOLEAN                  DEFAULT TRUE               NOT NULL,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP  NOT NULL,
    updated_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP  NOT NULL
);

ALTER TABLE offices
    ADD CONSTRAINT offices_pk PRIMARY KEY (id);

ALTER TABLE offices
    ADD CONSTRAINT offices_code_unique UNIQUE (code);

ALTER TABLE offices
    ADD CONSTRAINT offices_code_length_check CHECK (char_length(code) <= 20);

ALTER TABLE offices
    ADD CONSTRAINT offices_name_length_check CHECK (char_length(name) <= 100);

ALTER TABLE offices
    ADD CONSTRAINT offices_city_length_check CHECK (city IS NULL OR char_length(city) <= 100);

ALTER TABLE offices
    ADD CONSTRAINT offices_country_length_check CHECK (country IS NULL OR char_length(country) <= 100);

CREATE INDEX IF NOT EXISTS idx_offices_active ON offices (active);
CREATE INDEX IF NOT EXISTS idx_offices_name ON offices (name);

-- Office linkage for existing entities (nullable to keep migration non-breaking)
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS office_id UUID;

ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS office_id UUID;

ALTER TABLE users
    ADD CONSTRAINT users_office_id_fk
        FOREIGN KEY (office_id) REFERENCES offices (id);

ALTER TABLE projects
    ADD CONSTRAINT projects_office_id_fk
        FOREIGN KEY (office_id) REFERENCES offices (id);

-- Optional manager link after users.office_id exists
ALTER TABLE offices
    ADD CONSTRAINT offices_managing_user_id_fk
        FOREIGN KEY (managing_user_id) REFERENCES users (id);

CREATE INDEX IF NOT EXISTS idx_users_office_id ON users (office_id);
CREATE INDEX IF NOT EXISTS idx_projects_office_id ON projects (office_id);

-- ---------------------------------------------------------------------------
-- Role foundation extension
-- ---------------------------------------------------------------------------
ALTER TABLE roles
    ADD COLUMN IF NOT EXISTS role_key TEXT;

ALTER TABLE roles
    ADD CONSTRAINT roles_role_key_length_check
        CHECK (role_key IS NULL OR char_length(role_key) <= 50);

CREATE INDEX IF NOT EXISTS idx_roles_role_key ON roles (role_key);

-- Backfill existing generic role keys so authorization migration can be staged.
UPDATE roles
SET role_key = 'OWNER'
WHERE owner IS TRUE
  AND role_key IS NULL;

UPDATE roles
SET role_key = 'ADMIN'
WHERE admin_role IS TRUE
  AND role_key IS NULL;

UPDATE roles
SET role_key = 'MEMBER'
WHERE default_role IS TRUE
  AND role_key IS NULL;

-- ---------------------------------------------------------------------------
-- Attendance
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance_records (
    id              UUID                     DEFAULT uuid_generate_v4() NOT NULL,
    user_id         UUID                                                NOT NULL,
    office_id       UUID,
    attendance_date DATE                                                NOT NULL,
    status          TEXT                                                NOT NULL,
    reason          TEXT,
    check_in_at     TIMESTAMP WITH TIME ZONE,
    confirmed       BOOLEAN                  DEFAULT FALSE              NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP  NOT NULL,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP  NOT NULL
);

ALTER TABLE attendance_records
    ADD CONSTRAINT attendance_records_pk PRIMARY KEY (id);

ALTER TABLE attendance_records
    ADD CONSTRAINT attendance_records_user_id_fk
        FOREIGN KEY (user_id) REFERENCES users (id)
            ON DELETE CASCADE;

ALTER TABLE attendance_records
    ADD CONSTRAINT attendance_records_office_id_fk
        FOREIGN KEY (office_id) REFERENCES offices (id);

ALTER TABLE attendance_records
    ADD CONSTRAINT attendance_records_user_date_unique
        UNIQUE (user_id, attendance_date);

ALTER TABLE attendance_records
    ADD CONSTRAINT attendance_records_status_check
        CHECK (status = ANY (ARRAY ['present'::TEXT, 'absent'::TEXT, 'half_day'::TEXT, 'on_leave'::TEXT]));

ALTER TABLE attendance_records
    ADD CONSTRAINT attendance_records_reason_length_check
        CHECK (reason IS NULL OR char_length(reason) <= 500);

CREATE INDEX IF NOT EXISTS idx_attendance_records_date ON attendance_records (attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_status ON attendance_records (status);
CREATE INDEX IF NOT EXISTS idx_attendance_records_office_date ON attendance_records (office_id, attendance_date);

-- ---------------------------------------------------------------------------
-- Task domain extensions for JCC flow
-- ---------------------------------------------------------------------------
ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS jcc_task_key TEXT;

ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS trade_code TEXT;

ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS planned_rate NUMERIC;

ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS planned_rate_unit TEXT;

ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS review_outcome TEXT;

ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS review_comment TEXT;

ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS revision_count INTEGER DEFAULT 0 NOT NULL;

ALTER TABLE tasks
    ADD CONSTRAINT tasks_jcc_task_key_unique UNIQUE (jcc_task_key);

ALTER TABLE tasks
    ADD CONSTRAINT tasks_trade_code_length_check
        CHECK (trade_code IS NULL OR char_length(trade_code) <= 20);

ALTER TABLE tasks
    ADD CONSTRAINT tasks_planned_rate_non_negative_check
        CHECK (planned_rate IS NULL OR planned_rate >= 0);

ALTER TABLE tasks
    ADD CONSTRAINT tasks_planned_rate_unit_length_check
        CHECK (planned_rate_unit IS NULL OR char_length(planned_rate_unit) <= 20);

ALTER TABLE tasks
    ADD CONSTRAINT tasks_review_outcome_check
        CHECK (
            review_outcome IS NULL OR
            review_outcome = ANY (ARRAY ['approved'::TEXT, 'revision_required'::TEXT, 'rejected'::TEXT, 'on_hold'::TEXT])
        );

ALTER TABLE tasks
    ADD CONSTRAINT tasks_review_comment_length_check
        CHECK (review_comment IS NULL OR char_length(review_comment) <= 2000);

ALTER TABLE tasks
    ADD CONSTRAINT tasks_revision_count_non_negative_check
        CHECK (revision_count >= 0);

CREATE INDEX IF NOT EXISTS idx_tasks_jcc_task_key ON tasks (jcc_task_key);
CREATE INDEX IF NOT EXISTS idx_tasks_submitted_at ON tasks (submitted_at);
CREATE INDEX IF NOT EXISTS idx_tasks_review_outcome ON tasks (review_outcome);
CREATE INDEX IF NOT EXISTS idx_tasks_trade_code ON tasks (trade_code);

-- ---------------------------------------------------------------------------
-- Query log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS task_query_logs (
    id            UUID                     DEFAULT uuid_generate_v4() NOT NULL,
    task_id        UUID                                                NOT NULL,
    drawing_ref    TEXT,
    description    TEXT                                                NOT NULL,
    impact         TEXT,
    raised_by      UUID                                                NOT NULL,
    response       TEXT,
    responded_by   UUID,
    responded_at   TIMESTAMP WITH TIME ZONE,
    resolved       BOOLEAN                  DEFAULT FALSE              NOT NULL,
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP  NOT NULL,
    updated_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP  NOT NULL
);

ALTER TABLE task_query_logs
    ADD CONSTRAINT task_query_logs_pk PRIMARY KEY (id);

ALTER TABLE task_query_logs
    ADD CONSTRAINT task_query_logs_task_id_fk
        FOREIGN KEY (task_id) REFERENCES tasks (id)
            ON DELETE CASCADE;

ALTER TABLE task_query_logs
    ADD CONSTRAINT task_query_logs_raised_by_fk
        FOREIGN KEY (raised_by) REFERENCES users (id);

ALTER TABLE task_query_logs
    ADD CONSTRAINT task_query_logs_responded_by_fk
        FOREIGN KEY (responded_by) REFERENCES users (id);

ALTER TABLE task_query_logs
    ADD CONSTRAINT task_query_logs_drawing_ref_length_check
        CHECK (drawing_ref IS NULL OR char_length(drawing_ref) <= 100);

ALTER TABLE task_query_logs
    ADD CONSTRAINT task_query_logs_description_length_check
        CHECK (char_length(description) <= 5000);

ALTER TABLE task_query_logs
    ADD CONSTRAINT task_query_logs_impact_length_check
        CHECK (impact IS NULL OR char_length(impact) <= 2000);

CREATE INDEX IF NOT EXISTS idx_task_query_logs_task_id ON task_query_logs (task_id);
CREATE INDEX IF NOT EXISTS idx_task_query_logs_resolved ON task_query_logs (resolved);
CREATE INDEX IF NOT EXISTS idx_task_query_logs_created_at ON task_query_logs (created_at);

-- ---------------------------------------------------------------------------
-- Productivity snapshots
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS task_productivity_rates (
    id               UUID                     DEFAULT uuid_generate_v4() NOT NULL,
    task_id          UUID                                                NOT NULL,
    user_id          UUID                                                NOT NULL,
    activity_type    TEXT,
    planned_rate     NUMERIC,
    actual_rate      NUMERIC,
    efficiency_pct   NUMERIC,
    variance         NUMERIC,
    recorded_date    DATE                     DEFAULT CURRENT_DATE       NOT NULL,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP  NOT NULL
);

ALTER TABLE task_productivity_rates
    ADD CONSTRAINT task_productivity_rates_pk PRIMARY KEY (id);

ALTER TABLE task_productivity_rates
    ADD CONSTRAINT task_productivity_rates_task_id_fk
        FOREIGN KEY (task_id) REFERENCES tasks (id)
            ON DELETE CASCADE;

ALTER TABLE task_productivity_rates
    ADD CONSTRAINT task_productivity_rates_user_id_fk
        FOREIGN KEY (user_id) REFERENCES users (id)
            ON DELETE CASCADE;

ALTER TABLE task_productivity_rates
    ADD CONSTRAINT task_productivity_rates_activity_type_length_check
        CHECK (activity_type IS NULL OR char_length(activity_type) <= 100);

ALTER TABLE task_productivity_rates
    ADD CONSTRAINT task_productivity_rates_planned_rate_non_negative_check
        CHECK (planned_rate IS NULL OR planned_rate >= 0);

ALTER TABLE task_productivity_rates
    ADD CONSTRAINT task_productivity_rates_actual_rate_non_negative_check
        CHECK (actual_rate IS NULL OR actual_rate >= 0);

CREATE INDEX IF NOT EXISTS idx_task_productivity_rates_task_id ON task_productivity_rates (task_id);
CREATE INDEX IF NOT EXISTS idx_task_productivity_rates_user_id ON task_productivity_rates (user_id);
CREATE INDEX IF NOT EXISTS idx_task_productivity_rates_recorded_date ON task_productivity_rates (recorded_date);

COMMIT;
