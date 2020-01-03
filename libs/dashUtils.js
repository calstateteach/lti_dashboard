/* Canvas data utilities.

10.16.2019 tps Add function to find the faculty member for a given course section.
*/

const canvasCache = require('./canvasCache');

exports.findSectionFaculty = function (courseId, courseSectionId) {
  const FACULTY_ROLES = ["TeacherEnrollment", "Test-Teacher", "Demo-Teacher"];
  const courseEnrollments = canvasCache.getCourseEnrollments(courseId);
  return courseEnrollments.find(
    e => (e.course_section_id === courseSectionId) && FACULTY_ROLES.includes(e.role)
  );  
}