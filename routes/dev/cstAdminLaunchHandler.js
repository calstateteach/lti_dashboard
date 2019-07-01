/* Handler function to simulate LTI launch request for a CST-Admin user.
Use for testing and development of CST-Admin dashboard pages.
04.16.2019 tps Created.
*/

const canvasCache = require('../../libs/canvasCache');


function get(req, res) {

  // Request URL expected to look like: "/dev/cstAdminLaunch/89?destination=modules"
  const destination = req.query.destination;
  const canvasUserId = parseInt(req.params.canvasUserId, 10);

  // Simulate session state for a CST-Admin.
  const CST_ADMIN_ROLE = 'CST-Admin';
  if (!req.session.fdb_roles.includes(CST_ADMIN_ROLE)) {
    req.session.fdb_roles.push(CST_ADMIN_ROLE);
  }
  req.session.custom_canvas_user_id = canvasUserId;
  
  // Lookup up user's email, which we need to look up the campus they administer.                                                
  const user = canvasCache.getFacultyCam().find( e => e.id === canvasUserId);
  if (user) {
    req.session.custom_canvas_user_login_id = user.login_id;
  }
  
  res.redirect(req.app.locals.APP_URL + 'dash/cstAdmin?destination=' + destination);
}


// ******************** Export module as a function ********************//
module.exports = get;