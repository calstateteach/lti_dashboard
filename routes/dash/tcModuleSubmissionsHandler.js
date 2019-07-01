/* Render module submissions page for a teacher candidate.
12.19.2018 tps Created from moduleSubmissionsHandler.js
02.08.2019 tps Bug fix. Use enrollment role, not type, to identify teacher candidate's faculty member.
06.13.2019 tps In order to use same template for faculty & teacher candidate's, pass tcUser field to template.
*/

const canvasCache = require('../../libs/canvasCache');
const appConfig   = require('../../libs/appConfig');


function get(req, res) {

  // Gather request parameters
  const userId    = parseInt(req.params.userId, 10);
  const courseId  = parseInt(req.params.courseId, 10);
  const sectionId = parseInt(req.params.sectionId, 10);
  // const moduleId  = parseInt(req.params.moduleId, 10);
  const dashModuleIndex  = parseInt(req.params.moduleId, 10);
  // const studentId = parseInt(req.params.studentId, 10);
  // const isDevMode = req.session.userAuthMethod === 'dev';    // Indicate whether user is logged in as developer.
  const userRoles = req.session.fdb_roles;                    // Page needs to know the user's role
  // const isCstAdmin = userRoles.includes('CST-Admin'); 

  // Don't let teacher candidate user tamper with URL to see student's page.
  const userIdSession = parseInt(req.session.custom_canvas_user_id, 10);
  if ((req.session.userAuthMethod === 'lti') && (userIdSession != userId)) {
    return res.redirect(req.app.locals.APP_URL + 'badRequest');
  }

  // We'll need the teacher candidate's user object to display user info.
  const enrollments = canvasCache.getStudents().filter( e => e.user_id === userId);
  const tcUser = enrollments[0].user;
  // const facultyEnrollments = canvasCache.getFaculty();
  // const enrollments = facultyEnrollments.filter( e => e.user_id === userId);
  // const facultyUser = enrollments[0].user;

  // Start building term object containing data for drawing the module detail page 
  const termObject = {
    course_section_id: sectionId
  };

  // Find data for term containing the student of interest.
  const terms = appConfig.getTerms();
  var term = terms.find( e => e.course_id === courseId);

  // Throw in configuration data for the term
  Object.assign(termObject, term);

  // Find the identity of the student of interest.
  const courseEnrollments = canvasCache.getCourseEnrollments(courseId);
  const studentEnrollment = courseEnrollments.find(
     e => (e.user_id === userId) && (e.type === "StudentEnrollment")
  );
  termObject.students = [studentEnrollment.user];

  // Find faculty member for teacher candidate's section,
  // so we can derive the corresponding iSupervision course.  
  let facultyUser = courseEnrollments.find(
      e => (e.course_section_id === sectionId) && (e.role === "TeacherEnrollment")
  );
  facultyUser = facultyUser ? facultyUser.user : null;
  // const facultyUser = courseEnrollments.find(
  //   e => (e.course_section_id === sectionId) && (e.type === "TeacherEnrollment")
  // ).user;

  // Retrieve dashboard module of interest
  const dashboardModule = canvasCache.getDashboardModules(courseId)[dashModuleIndex];

  /** Retrieve special URLs to use for "Activity 4.05" submissions.
   * For fall 2018, the evaluation URL comes from a corresponding iSupervision course assignment.
   * Derive iSupervision course for term in fall 2018 style.
   * The name of the corresponding iSupervision course should look like:
   * <iSupervision prefix> + <faculty login>
   * e.g. "CST1841S-mslade"
   **/  
  const ACTIVITY_405_NAME = "Activity 4.05";
  let activity405Url = null;    // Populate with link to iSupervision version of assignment

  if (dashboardModule.items.find( e => e.title.startsWith(ACTIVITY_405_NAME))) {

    // Retrieve associated assignment in the iSupervision course.
    const iSupeCourseName = term.isupe_prefix + facultyUser.login_id.split('@')[0];
    const courses = canvasCache.getISupeCourses();
    let iSupeCourse = courses.find( e => e.sis_course_id === iSupeCourseName);
    if (!iSupeCourse) {
      iSupeCourse = courses.find( e => e.sis_course_id === (iSupeCourseName + '!'));
    }
    if (iSupeCourse) {
      const iSupeAssignments = canvasCache.getCourseAssignments(iSupeCourse.id);
      const activity405Ass = iSupeAssignments.find( e => e.name.startsWith(ACTIVITY_405_NAME));
      if (activity405Ass) {
        activity405Url = activity405Ass.html_url;
      }
    }
  } // end if module contains "Activity 4.05" assignment


  // Prepare to deliver data to the page template.
  const params = {
    userRoles: userRoles,
    user: tcUser,
    userTerms: [termObject],
    dashboardModule: dashboardModule,
    activity405Url: activity405Url,
    sessionData: req.session,
    faculty: facultyUser,
    tcUser: true  // 06.13.2019 tps Tell template to display teacher candidate version.
  }
  return res.render('dash/studentModuleSubmissions', params);
  // return res.render('dash/tcModuleSubmissions', params);
}


// ******************** Exports ********************//
module.exports = get;
