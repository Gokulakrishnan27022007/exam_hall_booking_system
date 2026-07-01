const AuditLog = require("../models/AuditLog");

exports.logAction = async (user, action, module, details = {}) => {
  await AuditLog.create({ user, action, module, details });
};
