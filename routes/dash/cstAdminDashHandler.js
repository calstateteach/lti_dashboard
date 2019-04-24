/* Handler function to render faculty list page for a CST-Admin
04.06.2019 tps Created from routes/dev/facultyListHandler.js
*/

const appConfig   = require('../../libs/appConfig');
const canvasCache = require('../../libs/canvasCache');

// ******************** Constants ********************//


function get(req, res) {

  // Session contains identifying information about the CST-Admin
  const userId = parseInt(req.session.custom_canvas_user_id, 10);
  const userRoles = req.session.fdb_roles;  // Page needs to know the user's role
  const isCstAdmin = userRoles.includes('CST-Admin'); 

  // Don't let faculty user tamper with URL.
  // Only CST-Admins are allowed in here.
  if ((req.session.userAuthMethod === 'lti') && !isCstAdmin) {
    return res.redirect(req.app.locals.APP_URL + 'badRequest');
  }

  // Only show faculty who have the campus code assigned to the CST-Admin

  // Find CST-Admin's email from Canvas data
  const facultyList = canvasCache.getFacultyCam();
  const cstAdminUser = facultyList.find( e => e.id === userId);
  if (!cstAdminUser) {
    const s = `No enrollment data found for user ID ${userId}. User might not be in any of the courses configured for the dashboard.`;
    return res.render('dash/facultyDashErr', { 'err': s } );
  }

  // Lookup CST-Admin's campus code from application settings
  const cstAdminList = appConfig.getCstAdmins();
  const cstAdmin = cstAdminList.find( e => e.email === cstAdminUser.login_id);
  if (!cstAdmin) {
    const s = `No CST-Admin setting found for user ID ${userId}. User might not be a CST-Admin.`;
    return res.render('dash/facultyDashErr', { 'err': s } );
  }
  const campusCode = cstAdmin.campus_code;

  // Filter faculty list by the campus code from CAM data. '*' matches all capmuses. 
  let campusFaculty = canvasCache.getFacultyCam();
  if (campusCode != '*') {
    campusFaculty = campusFaculty.filter( e => e.cam.campus_code === campusCode);
  }

  // We're ready to render the page
  var renderDictionary = {
    teachers: campusFaculty,
    cstAdminUser: cstAdminUser,
    campusCode: campusCode,
    userRoles: req.session.fdb_roles,
    destination: req.query.destination // Let query parameter determine target of faculty links
  };
  res.render('dash/cstAdminFacultyList', renderDictionary );
}


// ******************** Export module as a function ********************//
module.exports = get;