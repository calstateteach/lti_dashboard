/* Render module submissions page.
05.23.2018 tps Start refactoring for AJAX calls 
05.26.2018 tps Pass server session data to page, for dev mode.
05.28.2018 tps Don't let user tamper with URL.
06.11.2018 tps Allow CST-Admin users to view faculty dashboard.
06.20.2018 tps Use adapted version of course modules to handle quiz assignments.
08.15.2018 tps Changes for fall 2018 term. Use dashboard module index instead of Canvas module ID.
08.22.2018 tps For "Activity 4.05" submission link, retrieve a URL from the iSupervision course.
10.09.2018 tps Search for iSupervision courses modified for bang-suffix names.
11.01.2018 tps Add annotation link for Activity 4.05.
04.17.2019 tps Don't allow CST-Admin to view faculty not in their campus.
*/

const canvasCache = require('../../libs/canvasCache');
const appConfig   = require('../../libs/appConfig');
const checkDashboardRequest = require('./secureDashboardPage');


function get(req, res) {

  // Gather request parameters
  const userId    = parseInt(req.params.userId, 10);
  const courseId  = parseInt(req.params.courseId, 10);
  const sectionId = parseInt(req.params.sectionId, 10);
  // const moduleId  = parseInt(req.params.moduleId, 10);
  const dashModuleIndex  = parseInt(req.params.moduleId, 10);
  const studentId = parseInt(req.params.studentId, 10);
  // const isDevMode = req.session.userAuthMethod === 'dev';    // Indicate whether user is logged in as developer.
  const userRoles = req.session.fdb_roles;                    // Page needs to know the user's role
  // const isCstAdmin = userRoles.includes('CST-Admin'); 

  // // Don't let faculty user tamper with URL to see another faculty member's page.
  // const userIdSession = parseInt(req.session.custom_canvas_user_id, 10);
  // if ((req.session.userAuthMethod === 'lti')
  //   && (userIdSession != userId)
  //   && (!isCstAdmin)) {
  //   return res.redirect(req.app.locals.APP_URL + 'badRequest');
  // }
  
  // // Don't let CST-Admin look at faculty that is not in their assigned campus.
  // if (isCstAdmin) {
    
  //   // Find out which campus the user administers
  //   const cstAdmin = appConfig.getCstAdmins().find( e => e.email === req.session.custom_canvas_user_login_id);
  //   if (!cstAdmin) return res.redirect(req.app.locals.APP_URL + 'badRequest');
  //   const cstAdminCampus = cstAdmin.campus_code;

  //   if (cstAdminCampus != '*') {  // This code matches all campi.
  //     // Verify that faculty is in this campus.
  //     const facultyUser = canvasCache.getFacultyCam().find( e => e.id === userId);
  //     if (!facultyUser) return res.redirect(req.app.locals.APP_URL + 'badRequest');
  //     if (facultyUser.cam.campus_code != cstAdminCampus) return res.redirect(req.app.locals.APP_URL + 'badRequest');
  //   }
  // }

  // Don't let user tamper with URL.
  if (!checkDashboardRequest(req)) {
    return res.redirect(req.app.locals.APP_URL + 'badRequest');
  }

  // We'll need the user's user object to display user info.
  const facultyEnrollments = canvasCache.getFaculty();
  const enrollments = facultyEnrollments.filter( e => e.user_id === userId);
  const facultyUser = enrollments[0].user;

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
     e => (e.user_id === studentId) && (e.type === "StudentEnrollment")
  );

  // //! 04.18.2019 tps Diagnose TypeError error
  // if (!studentEnrollment) {
  //   console.log('Warning: no studentEnrollment found for:', req.originalUrl);
  // }
  termObject.students = [studentEnrollment.user];
 
  // // Create object containing course modules, indexed by module IDs
  // // const courseModules = canvasCache.getCourseModules(courseId);
  // // const courseModules = canvasCache.getAdaptedCourseModules(courseId);
  // const courseModules = canvasCache.getDashboardModules(courseId);
  // const courseModulesObj = {};
  // courseModulesObj[courseId] = courseModules;

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
  // let activity405iSupe = null;  // Populate with IDs for Term 1 version of assignment

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

        // // Populate object for client-side JS with IDs required to build SpeedGrader link to assignment
        // activity405iSupe = {
        //   course_id: iSupeCourse.id,
        //   assignment_id: activity405Ass.id
        // };
      }
    }

    // // Retrieve Term 1 version of the assignment,
    // // regardless of whether the student is in Term 1 or Term 1B.
    // let term1 = terms.find( e => e.name === 'Term 1');
    // if (term1) {
    //   const term1Assignments = canvasCache.getCourseAssignments(term1.course_id);
    //   const term1Assignment = term1Assignments.find ( e => e.name.startsWith(ACTIVITY_405_NAME));
    //   if (term1Assignment) {
    //     // Populate object with IDs required to build SpeedGrader link to assignment
    //     activity405Term1 = {
    //       course_id: term1.course_id,
    //       assignment_id: term1Assignment.id
    //     };
    //   } // end if assignment found in Term 1
    // } // end if a Term 1 found

  } // end if module contains "Activity 4.05" assignment


  // Prepare to deliver data to the page template.
  const params = {
    // isDevMode: isDevMode,
    userRoles: userRoles,
    user: facultyUser,
    userTerms: [termObject],
    dashboardModule: dashboardModule,
    // courseModules: courseModulesObj,
    // moduleId: moduleId,
    // dashModuleIndex: dashModuleIndex,
    activity405Url: activity405Url,
    // activity405iSupe: activity405iSupe,
    sessionData: req.session
  }
  // return res.render('dev/work', params);
  return res.render('dash/studentModuleSubmissions', params);
}


// ******************** Exports ********************//
module.exports = get;
