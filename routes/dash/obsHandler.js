/* This module populates data structures optimized for laying out observations pages
displaying CritiqueIt status for assignments.
Main collection is userTerms array. Each element describes structure of one of the
courses the faculty user teaches.

07.01.2018 tps Created from dashHandler.js.
07.03.2018 tps Only send CritiqueIt assignments to be rendered.
08.16.2018 tps Redo for fall 2018, with faculty-specific iSupervision courses.
08.27.2018 tps Use cached iSupervision assignments collection instead of user assignments cache,
               which is taking too long to load.
09.13.2018 tps Send iSupervision course's final status assignment to the template.
10.09.2018 tps Search for iSupervision courses modified for bang-suffix names.
04.17.2019 tps Don't allow CST-Admin to view faculty not in their campus.
06.03.2019 tps In order to use same template for faculty & teacher candidate's, pass tcUser field to template.
*/

// ******************** Module Imports ********************//
const appConfig   = require('../../libs/appConfig');
const canvasCache = require('../../libs/canvasCache');
const checkDashboardRequest = require('./secureDashboardPage');


// ******************** Constants ********************//
const viewTemplate = 'dash/obs';

function get(req, res) {

  // Gather request parameters
  const userId = parseInt(req.params['userId'], 10);
  // const isDevMode = req.session.userAuthMethod === 'dev';    // Indicate whether user is logged in as developer.
  const userRoles = req.session.fdb_roles;                    // Page needs to know the user's role
  // const userIdSession = parseInt(req.session.custom_canvas_user_id, 10);
  // const isCstAdmin = userRoles.includes('CST-Admin'); 

  // // Don't let faculty user tamper with URL
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

  /**
   * Initialize array containing faculty user's term courses.
   * We should end up with one array item for each
   * term course the faculty user is enrolled in.
   */
  const terms = appConfig.getTerms();
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
    const s = `No enrollment data found for user ID ${userId}. User might not be in any of the courses configured for the dashboard.`;
    return res.render('dash/facultyDashErr', { 'err': s } );
  }
   
  // We'll need the user's user object to display user info.
  const enrollments = facultyEnrollments.filter( e => e.user_id === userId);
  const user = enrollments[0].user;

  /**
   * Gather the students in each of the user's sections.
   */
  for(let enrollment of userTerms) {
    const sectionEnrollments = canvasCache.getCourseEnrollments(enrollment.course_id);
    const studentEnrollments = sectionEnrollments.filter(
       e => (e.course_section_id === enrollment.course_section_id) && (e.type === "StudentEnrollment")
    );
    
    // We just want the students' user objects
    const cachedStudents = studentEnrollments.map( e => e.user);

    // We're going to add properties to these student objects,
    // so use copies of them, so we don't sully the cached versions.
    var students = cachedStudents.map( e => Object.assign( {}, e));

    // Populate current enrollment object, which represents a section,
    // with students in the section. A section may have no students.
    enrollment.students = students;

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
    enrollment.students.sort(compareStudents);
  }
  
  /**
   * Populate the iSupervision course assignments for each student.
   * The student's iSupervision section can be looked up in their iSupervision course enrollment.
   */
  const facultyLogin = user.login_id.split('@')[0];   // Needed to build iSupervision course name
  // const courses = canvasCache.getCourses();           // Needed to build iSupervision course name
  const courses = canvasCache.getISupeCourses();  // Search for iSupervision course name in here
  for (let termCourse of userTerms) {

    // Derive iSupervision course for term in fall 2018 style.
    // The name of the corresponding iSupervision course should look like:
    // <iSupervision prefix> + <faculty login>
    // e.g. "CST1841S-mslade"    
    const iSupeCourseName = termCourse.isupe_prefix + facultyLogin;
    // const iSupeCourse = courses.find( e => e.sis_course_id === iSupeCourseName);
    let iSupeCourse = courses.find( e => e.sis_course_id === iSupeCourseName);
    if (!iSupeCourse) {
      iSupeCourse = courses.find( e => e.sis_course_id === (iSupeCourseName + '!'));
    }
    const iSupeCourseId = iSupeCourse ? iSupeCourse.id : null;

    termCourse.iSupe_course_id = iSupeCourseId; // Pass corresponding iSupervision course to the template

    // Canvas data we'll need to search to get each student's iSupervision course section.
    // No guarantee that we'll have a corresponding iSupervision course.
    const iSupeEnrollments = iSupeCourseId ? canvasCache.getCourseEnrollments(iSupeCourseId) : null;
    // const iSupeAssignments  = canvasCache.getCourseAssignments(iSupeCourseId);

    for (let student of termCourse.students){

      // Lookup the student's section in the iSupervision course, assuming we can.
      let studentEnrollment = null;
      if (iSupeEnrollments) {
        studentEnrollment = iSupeEnrollments.find(
          e => (e.user_id === student.id) && (e.course_id === iSupeCourseId)
        );
      }
      // const studentEnrollments = iSupeEnrollments.filter(
      //   e => (e.user_id === student.id) && (e.course_id === iSupeCourseId)
      // );

      // We're interested in the section ID.
      // The student may not be enrolled in an iSupervision course
      // const iSupeSectionId = studentEnrollments[0] ? studentEnrollments[0].course_section_id : null;
      const iSupeSectionId = studentEnrollment ? studentEnrollment.course_section_id : null;
      
      // Collect any assignment overrides for this section
      var assOverrides = [];
      if (iSupeSectionId) {
        // assOverrides = canvasCache.getUserAssignments(student.id, iSupeCourseId);
        assOverrides = canvasCache.getCourseAssignments(iSupeCourseId);

        // We're only interested in overrides for the student's section
        assOverrides = assOverrides.filter( e => e.overrides && e.overrides.find( f => f.course_section_id === iSupeSectionId) );
        
        // This particular Canvas query includes more assignments than we really want,
        // so try this to see only assignment overrides:
        assOverrides = assOverrides.filter( e => e.only_visible_to_overrides);

        // We're only interested in the CritiqueAssignments
        assOverrides = assOverrides.filter( e => e.submission_types.includes("external_tool"));

        // assOverrides = iSupeAssignments.filter(
        //   e => e.has_overrides && e.overrides.find( override => override.course_section_id === iSupeSectionId)
        // );
      }

      // Store the data we've collected
      student.iSupe_course_id = iSupeCourseId;
      student.iSupe_course_section_id = iSupeSectionId;
      student.assignment_overrides = assOverrides;

    } // end loop through students

    // Look for the iSupervision course's final status assignment
    // and include it in template data, if found.
    if (iSupeCourseId) {
      const iSupeAssignments = canvasCache.getCourseAssignments(iSupeCourseId);
      termCourse.assignment_final_status = iSupeAssignments.find( e => e.name === "Final iSupervision Status");
    }

  } // end loop through term courses

  // Help the rendering template by including the maximum number of iSupervision
  // assignments per students for each term.
  for (let termCourse of userTerms) {
    var maxAssCount = 0;
    for (let student of termCourse.students) {
      const assCount = student.assignment_overrides.length;
      maxAssCount = (assCount > maxAssCount) ? assCount : maxAssCount;
    } // end loop through term students
    termCourse.maxAssignmentCount = maxAssCount;
  } // end loop through terms

  // /**
  //  * Populate a course modules collection containing module, assignment & quiz
  //  * data for each course the faculty teaches.
  //  * The collection is indexed by the canvas course ID.
  //  * 06.20.2018 tps Use adapted version of module collection so we can properly
  //  *                handle quizzes that are assignments.
  //  */
  // var courseModules = { }; // Initialize collection to hold modules, indexed by course ID.
  // for (let courseId of userTerms.map(e => e.course_id)) {
  //   // We're going to manipulate the modules collection, so use a copy   
  //   // const modules = JSON.parse(JSON.stringify(canvasCache.getCourseModules(courseId)));
  //   const modules = JSON.parse(JSON.stringify(canvasCache.getAdaptedCourseModules(courseId)));

  //   // // Include only "Assignment" & "Quiz" items.
  //   // for (module of modules) {
  //   //   module.items = module.items.filter( e => ['Assignment', 'Quiz'].includes(e.type));
  //   // }
  //   courseModules[courseId] = modules;
  // }
  
  // Prepare to deliver data to the page template.
  const params = {
    // isDevMode: isDevMode,
    userRoles: userRoles,
    user: user,
    userTerms: userTerms.filter( e => e.students.length > 0), // We only care about terms with students.
    // courseModules: courseModules,
    // addConfig: appConfig.getAdds(),
    sessionData: req.session,
    tcUser: false  // 06.03.2019 tps Tell template to display faculty version.
  }
  return res.render(viewTemplate, params);
}

// ******************** Exports ********************//
module.exports = get;