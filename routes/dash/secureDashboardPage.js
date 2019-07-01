/* Perform checks to prevent user from tampering with dashboard URL to
see data outside their authorization.
04.17.2018 tps Created.
*/
const canvasCache = require('../../libs/canvasCache');
const appConfig   = require('../../libs/appConfig');

function checkDashboardRequest(req) {
  // Return true if request is OK to handle. Return false if permission violation.

  const userId = parseInt(req.params['userId'], 10);
  const userIdSession = parseInt(req.session.custom_canvas_user_id, 10);
  const userEmail = req.session.custom_canvas_user_login_id;
  const userRoles = req.session.fdb_roles;
  const isCstAdmin = userRoles.includes('CST-Admin'); 

  // Don't let faculty user tamper with URL to see another faculty member's page.
  if ((req.session.userAuthMethod === 'lti')
    && (userIdSession != userId)
    && (!isCstAdmin)) {
    return false;
  }
  
  // Don't let CST-Admin look at faculty that is not in their assigned campus.
  if (isCstAdmin) {
    
    // Find out which campus the user administers
    const cstAdmin = appConfig.getCstAdmins().find( e => e.email === userEmail);
    if (!cstAdmin) return false;
    const cstAdminCampus = cstAdmin.campus_code;

    if (cstAdminCampus != '*') {  // This code matches all campi.
      // Verify that faculty is in this campus.
      const facultyUser = canvasCache.getFacultyCam().find( e => e.id === userId);
      if (!facultyUser) return false;
      if (facultyUser.cam.campus_code != cstAdminCampus) return false;
    }
  }

  return true;  // If we got this far, should be OK to give user requested data.
}

  module.exports = checkDashboardRequest;