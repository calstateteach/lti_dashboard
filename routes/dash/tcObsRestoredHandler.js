/* This module populates data structures optimized for rendering observations pages
for a teacher candidate with restored access to past courses.
Assignment status might be from Canvas or legacy version of CritiqueIt.

Main collection is userTerms array. Each element describes structure of one of the
courses the teacher candidate is in.

Try building data to send to template in multiple passes: A base pass, then another pass, whose
algorithm depends on the assignment style of the semester.

10.09.2019 tps Created from tcObsHandler.js
12.19.2019 tps Don't include students who do not have an iSupervision course enrollment
*/

// ******************** Module Imports ********************//
// const appConfig   = require('../../libs/appConfig');
const canvasCache = require('../../libs/canvasCache');
const dashSemesters = require('../../libs/dashSemesters');

// ******************** Constants ********************//
const VIEW_TEMPLATE = 'dash/obsRestored';

function get(req, res) {

  // Gather request parameters
  const userId = parseInt(req.params['userId'], 10);
  const userRoles = req.session.fdb_roles;                    // Page needs to know the user's role
  const userIdSession = parseInt(req.session.custom_canvas_user_id, 10);
  // const isCstAdmin = userRoles.includes('CST-Admin'); 

  // Don't let teacher candidate user tamper with URL
  if ((req.session.userAuthMethod === 'lti') && (userIdSession != userId)) {
    return res.redirect(req.app.locals.APP_URL + 'badRequest');
  }

  // Lookup user object from student list cache.
  // If the user ID is invalid, something is really wrong.
  const studentEnrollments = canvasCache.getStudents().filter( e => e.user_id === userId);
  // const userEnrollment = studentEnrollments.find( e => e.user.id === userId);
  // if (!userEnrollment) {
  if (studentEnrollments.length <= 0) {
    return res.redirect(req.app.locals.APP_URL + 'badRequest');
  }
  const user = studentEnrollments[0].user;

  // Loop through all semesters
  const userSemesters = []; // Initialize array containing one element for each semester
  for (let semester of dashSemesters.getAll()) {

    // How to build terms for user depends on style of iSupervision course organization
    // in that semester.
    let userTerms = buildUserTerms(user, studentEnrollments, semester.terms_config);
    if (userTerms.length > 0) {
      if (semester.isupe_assignment_style === 'overrides') {
        // Assignment overrides (CritiqueIt)
        addAssignmentOverrides(userTerms);
      }  else {
        // Standard style
        addStandardAssignments(userTerms);
      }

      // 12.19.2019 tps Don't include students who do not have an iSupervision course enrollment
      for (let userTerm of userTerms) {
        userTerm.students = userTerm.students.filter( e => e.iSupe_course_section_id );
      }

      // 12.19.2019 tps Don't include terms that have no student enrollments
      userTerms = userTerms.filter( e => e.students.length > 0);

      userSemesters.push( {...semester, ...{"term_courses": userTerms} });
    } // end if teacher candidate has enrollments in this semester

  } // end loop through semesters.
  
  // Prepare to deliver data to the page template.
  const params = {
    userRoles: userRoles,
    user: user,
    semesters: userSemesters,
    sessionData: req.session,
    tcUser: true  // 06.03.2019 tps Tell template to display faculty version.
  }

  return res.render(VIEW_TEMPLATE, params);
}

  
function buildUserTerms(user, enrollments, terms) {
  // Build array containing teacher candidate's term courses.
  // Each element contains data describing a term course,
  // the corresponding iSupervision course, & the students in it.

  var userTerms = [];

  for (let term of terms) {

    // If teacher candidate is enrolled in term course, 
    // add an object for the term to the userTerms collection.
    
    const courseEnrollments = enrollments.filter(
      e => (e.user_id === user.id) && (e.course_id === term.course_id)
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

  // If the enrollmentList is empty, we can stop the proceedings right now.
  if (userTerms.length <= 0) {
    return userTerms; 
  }
  
  /**
   * The student's iSupervision section can be looked up in their iSupervision course enrollment.
   */
  const courses = canvasCache.getISupeCourses();  // Search for iSupervision course name in here
  for (let termCourse of userTerms) {

    // To parallel the structure of the faculty dashboard data,
    // include a copy of the student's user object under each term they are enrolled in.
    termCourse.students = [Object.assign( {}, user)];

    // For each course, include the faculty member for the student's section.
    // 06.12.2019 tps Match "Test-Teacher" role as well as "TeacherEnrollment" role. I don't know why
    // we use enrollment role instead of type. 
    // 09.16.2019 tps Match new "Demo-Teacher" role.
    const FACULTY_ROLES = ["TeacherEnrollment", "Test-Teacher", "Demo-Teacher"];
    const courseEnrollments = canvasCache.getCourseEnrollments(termCourse.course_id);
    termCourse.faculty = courseEnrollments.find(
      e => (e.course_section_id === termCourse.course_section_id) && FACULTY_ROLES.includes(e.role)
    );
 
    if (termCourse.faculty) {
      // Derive iSupervision course for term in fall 2018 style.
      // The name of the corresponding iSupervision course should look like:
      // <iSupervision prefix> + <faculty login>
      // e.g. "CST1841S-mslade"
      const facultyLogin = termCourse.faculty.user.login_id.split('@')[0];
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

      for (let student of termCourse.students) {  // In practice, there is only 1 student

        // Lookup the student's section in the iSupervision course, assuming we can.
        let studentEnrollment = null;
        if (iSupeEnrollments) {
          studentEnrollment = iSupeEnrollments.find(
            e => (e.user_id === student.id) && (e.course_id === iSupeCourseId)
          );
        }
        const iSupeSectionId = studentEnrollment ? studentEnrollment.course_section_id : null;

        // Store the iSupervision course information
        student.iSupe_course_id = iSupeCourseId;  // Don't really need this? Already stored in term object
        student.iSupe_course_section_id = iSupeSectionId;

      } // end loop through students
    } // end if faculty member found for teacher candidate's section
  } // end loop through term courses

  return userTerms;
}


function addAssignmentOverrides(userTerms) {
  // Add Canvas assignment data for term using assignment overrides for sections for
  // CritiqueIt assignments. This is how it was stored in Canvas before Fall 2019.

  for (let term of userTerms) {
    const iSupeAssignments
      = term.iSupe_course_id ? canvasCache.getCourseAssignments(term.iSupe_course_id) : [];

    for (let student of term.students) {
      // Collect any assignment overrides for student's section

      // We're only interested in overrides for the student's section
      assOverrides = iSupeAssignments.filter(
        e => e.overrides && e.overrides.find( f => f.course_section_id === student.iSupe_course_section_id) );
      
      // This particular Canvas query includes more assignments than we really want,
      // so try this to see only assignment overrides:
      assOverrides = assOverrides.filter( e => e.only_visible_to_overrides);

      // We're only interested in the CritiqueAssignments
      assOverrides = assOverrides.filter( e => e.submission_types.includes("external_tool"));

      student.assignment_overrides = assOverrides;

    } // end loop through students

    // Look for the iSupervision course's final status assignment
    // and include it, if found.
    term.assignment_final_status = iSupeAssignments.find( e => e.name === "Final iSupervision Status");

  } // end loop through terms

  // Help the rendering template by including the maximum number of iSupervision
  // assignments per students for each term.
  for (let term of userTerms) {
    const assCounts = term.students.map( e => e.assignment_overrides.length);
    term.maxAssignmentCount = Math.max(assCounts);
  } // end loop through terms
}


function addStandardAssignments(userTerms) {
  // Add Canvas assignment data for term. Starting Fall 2019, these are the assignments
  // in the iSupervision course.
  for (let term of userTerms) {
    // 09.12.2019 tps Add iSupervision course's assignments
    term.assignments = [];
    if (term.iSupe_course_id) {
      term.assignments = canvasCache.getCourseAssignments(term.iSupe_course_id);
    }
  }
}


// ******************** Exports ********************//
module.exports = get;