/* This module populates data structures optimized for laying out the teacher candidate's 
modules dashboard. Main collection is userTerms array. Each element describes structure of one
of the courses the teacher candidate is in.

12.19.2018 tps Created from dashHandler.js
02.08.2019 tps Bug fix. Use enrollment role, not type, to identify teacher candidate's faculty member.
06.13.2019 tps Render to same template as faculty modules dashboard.
*/

// ******************** Module Imports ********************//
const appConfig   = require('../../libs/appConfig');
const canvasCache = require('../../libs/canvasCache');


// ******************** Constants ********************//

function get(req, res) {

  // Gather request parameters
  const userId = parseInt(req.params['userId'], 10);
  const userRoles = req.session.fdb_roles;                    // Page needs to know the user's role
  const userIdSession = parseInt(req.session.custom_canvas_user_id, 10);
  // const isCstAdmin = userRoles.includes('CST-Admin'); 

  // Don't let user tamper with URL
  if ((req.session.userAuthMethod === 'lti') && (userIdSession != userId)) {
    return res.redirect(req.app.locals.APP_URL + 'badRequest');
  }

  /**
   * Initialize array containing candidate's term courses.
   * We should end up with one array item for each
   * term course the faculty user is enrolled in.
   */
  const terms = appConfig.getTerms();
  const tcEnrollments = canvasCache.getStudents();
  var userTerms = [];

  for (let term of terms) {

    // If teacher candidate is enrolled in term course, 
    // add an object for the term to the userTerms collection.
    const courseEnrollments = tcEnrollments.filter(
       e => (e.user_id === userId) && (e.course_id === term.course_id)
    );
    
    if (courseEnrollments.length > 0) {
      const courseEnrollment = courseEnrollments[0];
      const termObject = {
        course_section_id: courseEnrollment.course_section_id
      };
      // Throw in configuration data for the term
      Object.assign(termObject, term);

      userTerms.push( termObject );
    }
  }

  // If the enrollmentList is empty, we probably got an invalid
  // userId, so we can stop the proceedings right now.
  if (userTerms.length <= 0) {
    const s = `No enrollment data found for user ID ${userId}. User might not be in any of the courses configured for the dashboard.`;
    return res.render('dash/facultyDashErr', { 'err': s } );
  }
   
  // We'll need the user's user object to display user info.
  const enrollments = tcEnrollments.filter( e => e.user_id === userId);
  const user = enrollments[0].user;

  for(let term of userTerms) {

    // To parallel the structure of the faculty dashboard data,
    // include a copy of the student's user object under each term they are enrolled in.
    term.students = [Object.assign( {}, user)];

    // /**
    //  * Gather the students in each of the user's sections.
    //  */
    // const sectionEnrollments = canvasCache.getCourseEnrollments(term.course_id);
    // const studentEnrollments = sectionEnrollments.filter(
    //    e => (e.course_section_id === term.course_section_id) && (e.type === "StudentEnrollment")
    // );
    
    // // We just want the students' user objects
    // const cachedStudents = studentEnrollments.map( e => e.user);

    // // We're going to add properties to these student objects,
    // // so use copies of them, so we don't sully the cached versions.
    // var students = cachedStudents.map( e => Object.assign( {}, e));

    // // Populate current enrollment object, which represents a section,
    // // with students in the section. A section may have no students.
    // term.students = students;

    // // Canvas does't return a sorted student list

    // function compareStudents(a, b) {
    //   // Helper function for sorting an enrollee list.
    //   var nameA = a.sortable_name;
    //   var nameB = b.sortable_name;
    //   if (nameA < nameB) {
    //     return -1;
    //   }
    //   if (nameA > nameB) {
    //     return 1;
    //   }
    //   return 0;     // names must be equal
    // }
    // term.students.sort(compareStudents);

    /**
     * For each course, populate a dashboard modules collection containing assignment & quiz
     * data for each course the faculty teaches.
     */
    term.modules = canvasCache.getDashboardModules(term.course_id);

    /**
     * For each course, populate with the grade module, which is assumed to be the
     * final module in the Canvas course.
     */
    const courseModules = canvasCache.getCourseModules(term.course_id);
    term.grade_module = courseModules[courseModules.length - 1];

    /**
     * for each course, include the faculty member for the student's section.
     */
    const courseEnrollments = canvasCache.getCourseEnrollments(term.course_id);
    term.faculty = courseEnrollments.find(
       e => (e.course_section_id === term.course_section_id) && (e.role === "TeacherEnrollment")
      //  e => (e.course_section_id === term.course_section_id) && (e.type === "TeacherEnrollment")
    );
    
  } // End loop through faculty member's terms.
  
  // Prepare to deliver data to the page template.
  const params = {
    userRoles: userRoles,
    user: user,
    userTerms: userTerms,
    addConfig: appConfig.getAdds(),
    sessionData: req.session,
    tcUser: true    // 06.13.2019 tps Tell template to display teacher candidate version.
  }
  return res.render('dash/facultyDash', params);
  // return res.render('dash/tcModulesDash', params);
}

// ******************** Exports ********************//
module.exports = get;