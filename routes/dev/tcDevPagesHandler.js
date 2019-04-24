/* Handler function to render pages with teacher candidate listings.
12.19.2018 tps Created from facultyListHandler.js.
*/

const canvasCache = require('../../libs/canvasCache');


function getModulesLinks(req, res) {
  return renderLinks(req, res, 'dev/tcModulesLinks');
}


function getObservationsLinks(req, res) {
  return renderLinks(req, res, 'dev/tcObsLinks');
}


function renderLinks(req, res, renderTarget) {
  var renderDictionary = {
    students: getUniqueStudentUsers(),
    userRoles: req.session.fdb_roles
  };
  return res.render(renderTarget, renderDictionary );
}


function getUniqueStudentUsers() {
  // Extract unique users from the student enrollment list
  const students = canvasCache.getStudents().map( e => e.user);
  let uniqueStudents = [];

  for (let student of students) {
    // Don't add duplicate users to list
    if (!uniqueStudents.find( e => e.id === student.id )) {
      uniqueStudents.push(student);
    }
  }
  return uniqueStudents;
}


// ******************** Exports ********************//
module.exports.getModulesLinks = getModulesLinks;
module.exports.getObservationsLinks = getObservationsLinks;