export async function writeAuditLog(supabaseAdmin, {
  entityType,
  entityId,
  action,
  oldValue = null,
  newValue = null,
  performedBy = null,
  performedByRole = null,
  performedByName = null,
  metadata = {},
}) {
  const { error } = await supabaseAdmin
    .from("audit_logs")
    .insert({
      entity_type: entityType,
      entity_id: entityId,
      action,
      old_value: oldValue,
      new_value: newValue,
      performed_by: performedBy,
      performed_by_role: performedByRole,
      performed_by_name: performedByName,
      metadata,
    })

  if (error) {
    console.error("Audit log write failed:", error.message)
  }
}
