/* Handler function to render faculty list for Observations page testing.
07.01.2018 tps Created from facultyListHandler.js.
               This is actually identical to facultyListHandler.js except for
               pug template used.
*/

const canvasCache = require('../../libs/canvasCache');

// ******************** Constants ********************//


function get(req, res) {
  // Make sure we're not simulating a CST-Admin, so that we can
  // request any faculty member's dashboard.
  const cstAdminIndex = req.session.fdb_roles.indexOf('CST-Admin');
  if (cstAdminIndex >= 0) {
    req.session.fdb_roles.splice(cstAdminIndex, 1);
  }

  const facultyList = canvasCache.getFaculty();

  // Filter into Teacher & TA lists
  var renderDictionary = {
    teachers: filterEnrollmentsByType(facultyList, 'TeacherEnrollment'),
    tas: filterEnrollmentsByType(facultyList, 'TaEnrollment'),
    userRoles: req.session.fdb_roles
  };
  res.render('dev/obsFacultyList', renderDictionary );
}


// ******************** Helper Functions ********************//

filterEnrollmentsByType = (enrollmentList, enrollmentType) => {
  /* Extract unique users from enrollment list, filtered by type.
  */
  var filteredList = [];
  for (let o of enrollmentList) {
    if (o.type === enrollmentType) {

      // Don't add duplicate users to list
      if (!filteredList.find((e) => { return e.id === o.user_id } )) {
        filteredList.push(o.user);
      }
    }
  }
  return filteredList;
};


// ******************** Export module as a function ********************//
module.exports = get;