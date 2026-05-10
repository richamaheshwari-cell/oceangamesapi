/**
 * Editors and seo_editors can only edit/delete content they created (createdById === their id).
 * Admin and super_admin can edit/delete any content.
 */
function canModifyContent(adminRole, createdById, adminSub) {
  if (adminRole === "super_admin" || adminRole === "admin") return true;
  if (adminRole === "editor" || adminRole === "seo_editor") {
    return createdById != null && createdById === adminSub;
  }
  return false;
}

module.exports = { canModifyContent };
