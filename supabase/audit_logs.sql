-- Audit logs table for tracking status changes and important actions
create table if not exists audit_logs (
  id uuid default gen_random_uuid() primary key,
  entity_type text not null,           -- 'cardholder', 'company', 'user'
  entity_id uuid not null,
  action text not null,                -- 'status_change', 'activation', 'archive', 'restore', 'delete', 'approval', 'decline'
  old_value text,                      -- previous status/value
  new_value text,                      -- new status/value
  performed_by uuid,                   -- user id of who performed the action
  performed_by_role text,              -- 'qc_admin' or 'company_admin'
  performed_by_name text,              -- full name at time of action
  metadata jsonb default '{}',         -- any extra context (licence dates, etc)
  created_at timestamptz default now()
);

-- Index for fast lookups by entity
create index if not exists idx_audit_logs_entity on audit_logs (entity_type, entity_id);
create index if not exists idx_audit_logs_created on audit_logs (created_at desc);
