/* Refactoring of faculty dashboard to include past terms.
Use pre-fetched data to populate each term's student list, modules & iSupervision assignments.
Use AJAX to fill in student submissions & assignment status.

This module populates data structures optimized for laying out the faculty user's courses.
Main collection is userTerms array. Each element describes structure of one of the
courses the faculty user teaches.

04.21.2018 tps Created.
05.17.2018 tps Refactor without async calls, using already cached data.
05.23.2018 tps Pass add permissions to the page template.
05.26.2018 tps Pass session data to page for dev mode.
05.28.2018 tps Prevent user from tampering with URL to get to another faculty member's dashboard.
05.28.2018 tps Try retrieving iSupervision assignments by user to speed up refersh after adding an assignment.
06.11.2018 tps Allow CST-Admin users to view faculty dashboard.
06.20.2018 tps Use adapted version of course modules to handle quiz assignments.
08.13.2018 tps Refactor for structure of fall 2018 courses.
08.13.2018 tps We don't need to handle iSupervision courses on this page anymore.
04.16.2019 tps Don't allow CST-Admin to view faculty not in their campus.
09.10.2019 tps Bug fix to handle unpublished modules.
09.30.2019 tps Refactor to include previous terms.
12.19.2019 tps Don't display student with restored access to iSupervision course only.
*/

// ******************** Module Imports ********************//
const dashSemesters = require('../../libs/dashSemesters');
const appConfig    = require('../../libs/appConfig');
const canvasCache  = require('../../libs/canvasCache');
const checkDashboardRequest = require('./secureDashboardPage');

// ******************** Constants ********************//
// const FACULTY_TYPES = [ 'TaEnrollment', 'TeacherEnrollment'];

function get(req, res) {

  // Gather request parameters
  const userId = parseInt(req.params['userId'], 10);
  const userRoles = req.session.fdb_roles;                    // Page needs to know the user's role

  // Don't let user tamper with URL.
  if (!checkDashboardRequest(req)) {
    return res.redirect(req.app.locals.APP_URL + 'badRequest');
  }
  
  // Lookup user object from faculty list cache.
  // If the user ID is invalid, something is really wrong.
  const userEnrollment = canvasCache.getFaculty().find( e => e.user.id === userId);
  if (!userEnrollment) {
    return res.redirect(req.app.locals.APP_URL + 'badRequest');
  }
  const user = userEnrollment.user;

  // Loop through term configuration files
  const allUserTerms = []; // Initialize array containing one element for each semester
  for (let semester of dashSemesters.getAll()) {
    const userTerms = buildTermCourses(userId, semester.terms_config);
    if (userTerms.length > 0) {
      allUserTerms.push(
      {
        "year": semester.year,
        "season": semester.season,
        "use_for": semester.use_for,
        "term_courses": userTerms
      });
    }
    // allUserTerms.push(buildTermCourses(userId, semester.terms_config));
  }

  // /**
  //  * Initialize array containing faculty user's term courses.
  //  * We should end up with one array item for each
  //  * term course the faculty user is enrolled in.
  //  */
  // const terms = appConfig.getTerms();
  // const facultyEnrollments = canvasCache.getFaculty();
  // var userTerms = [];

  // for (let term of terms) {

  //   // If faculty user is enrolled in term course, 
  //   // add an object for the term to the userTerms collection.
  //   const courseEnrollments = facultyEnrollments.filter(
  //      e => (e.user_id === userId) && (e.course_id === term.course_id)
  //   );
    
  //   if (courseEnrollments.length > 0) {
  //     const courseEnrollment = courseEnrollments[0];
  //     const termObject = {
  //       course_section_id: courseEnrollment.course_section_id
  //     };
  //     // Throw in configuration data for the term
  //     Object.assign(termObject, term);

  //     userTerms.push( termObject );
  //   }
  // }

  // // If the enrollmentList is empty, we probably got an invalid
  // // userId, so we can stop the proceedings right now.
  // if (userTerms.length <= 0) {
  //   const s = `No enrollment data found for user ID ${userId}. User might not be in any of the courses configured for the dashboard.`;
  //   return res.render('dash/facultyDashErr', { 'err': s } );
  // }
   
  // // We'll need the user's user object to display user info.
  // const enrollments = facultyEnrollments.filter( e => e.user_id === userId);
  // const user = enrollments[0].user;

  // for(let term of userTerms) {

  //   /**
  //    * Gather the students in each of the user's sections.
  //    */
  //   const sectionEnrollments = canvasCache.getCourseEnrollments(term.course_id);
  //   const studentEnrollments = sectionEnrollments.filter(
  //      e => (e.course_section_id === term.course_section_id) && (e.type === "StudentEnrollment")
  //   );
    
  //   // We just want the students' user objects
  //   const cachedStudents = studentEnrollments.map( e => e.user);

  //   // We're going to add properties to these student objects,
  //   // so use copies of them, so we don't sully the cached versions.
  //   var students = cachedStudents.map( e => Object.assign( {}, e));

  //   // Populate current enrollment object, which represents a section,
  //   // with students in the section. A section may have no students.
  //   term.students = students;

  //   // Canvas does't return a sorted student list

  //   function compareStudents(a, b) {
  //     // Helper function for sorting an enrollee list.
  //     var nameA = a.sortable_name;
  //     var nameB = b.sortable_name;
  //     if (nameA < nameB) {
  //       return -1;
  //     }
  //     if (nameA > nameB) {
  //       return 1;
  //     }
  //     return 0;     // names must be equal
  //   }
  //   term.students.sort(compareStudents);

  //   /**
  //    * For each course, populate a dashboard modules collection containing assignment & quiz
  //    * data for each course the faculty teaches.
  //    */
  //   term.modules = canvasCache.getDashboardModules(term.course_id);

  //   /**
  //    * For each course, populate with the grade module, which is assumed to be the
  //    * final module in the Canvas course.
  //    * 09.10.2019 tps Bug fix. Don't pick a module that is unpublished. Assume there is 
  //    *                at least 1 published module.
  //    */
  //   const courseModules = canvasCache.getCourseModules(term.course_id);
  //   // term.grade_module = courseModules[courseModules.length - 1];
  //   let lastModule = null;
  //   for (let i = courseModules.length - 1; i >= 0; --i) {
  //     if (courseModules[i].published) {
  //       lastModule = courseModules[i];
  //       break;
  //     }
  //   }
  //   term.grade_module = lastModule;

  // } // End loop through faculty member's terms.

  
  // Prepare to deliver data to the page template.
  const params = {
    userRoles: userRoles,
    user: user,
    semesters: allUserTerms,
    addConfig: appConfig.getAdds(),
    sessionData: req.session
  }
  return res.render('dash/facultyRestoredDash', params);
  // return res.render('dev/work', params);
}

// Return populated array for all faculty member's module courses in one semester
function buildTermCourses(userId, terms) {
  /**
   * Initialize array containing faculty user's term courses.
   * We should end up with one array item for each
   * term course the faculty user is enrolled in.
   */
  // const terms = appConfig.getTerms();
  const facultyEnrollments = canvasCache.getFaculty();
  var userTerms = [];

  for (let term of terms) {

    // If faculty user is enrolled in term course, 
    // add an object for the term to the userTerms collection.
    const courseEnrollments = facultyEnrollments.filter(
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
    return [];
    // const s = `No enrollment data found for user ID ${userId}. User might not be in any of the courses configured for the dashboard.`;
    // return res.render('dash/facultyDashErr', { 'err': s } );
  }
   
  // We'll need the user's user object to display user info.
  // const enrollments = facultyEnrollments.filter( e => e.user_id === userId);
  // const user = enrollments[0].user;

  for(let term of userTerms) {

    /**
     * Gather the students in each of the user's sections.
     * Exclude modules course if teacher candidate only has
     * restored access to the isupervision course.
     */
    const sectionEnrollments = canvasCache.getCourseEnrollments(term.course_id);
    const studentEnrollments = sectionEnrollments.filter(
      // e => (e.course_section_id === term.course_section_id) && (e.type === "StudentEnrollment")
      e => (e.course_section_id === term.course_section_id) && (e.type === "StudentEnrollment") && !e.isISupeOnly
    );
    
    // We just want the students' user objects
    const cachedStudents = studentEnrollments.map( e => e.user);

    // We're going to add properties to these student objects,
    // so use copies of them, so we don't sully the cached versions.
    var students = cachedStudents.map( e => Object.assign( {}, e));

    // Populate current enrollment object, which represents a section,
    // with students in the section. A section may have no students.
    term.students = students;

    // Canvas does't return a sorted student list

    function compareStudents(a, b) {
      // Helper function for sorting an enrollee list.
      var nameA = a.sortable_name;
      var nameB = b.sortable_name;
      if (nameA < nameB) {
        return -1;
      }
      if (nameA > nameB) {
        return 1;
      }
      return 0;     // names must be equal
    }
    term.students.sort(compareStudents);

    /**
     * For each course, populate a dashboard modules collection containing assignment & quiz
     * data for each course the faculty teaches.
     */
    term.modules = canvasCache.getDashboardModules(term.course_id);

    /**
     * For each course, populate with the grade module, which is assumed to be the
     * final module in the Canvas course.
     * 09.10.2019 tps Bug fix. Don't pick a module that is unpublished. Assume there is 
     *                at least 1 published module.
     */
    const courseModules = canvasCache.getCourseModules(term.course_id);
    // term.grade_module = courseModules[courseModules.length - 1];
    let lastModule = null;
    for (let i = courseModules.length - 1; i >= 0; --i) {
      if (courseModules[i].published) {
        lastModule = courseModules[i];
        break;
      }
    }
    term.grade_module = lastModule;

  } // End loop through faculty member's terms.

  return userTerms;
} // end function

// ******************** Exports ********************//
module.exports = get;