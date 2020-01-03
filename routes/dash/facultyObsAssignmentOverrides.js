/* This module encapsulates algorithm for building out observations assignments
where each student in an iSupervision course is an their own section with their
own assignment overrides. This applies to terms up to & including 2019 Summer.

10.06.2019 tps Created.
*/

// ******************** Module Imports ********************//
const canvasCache = require('../../libs/canvasCache');


// Return array for containing all faculty member's module courses in one semester
function buildTermsForUser(user, facultyEnrollments, terms) {
  const userId = user.id;

  /**
   * Initialize array containing faculty user's term courses.
   * We should end up with one array item for each
   * term course the faculty user is enrolled in.
   */
  // const terms = appConfig.getTerms();
  // const facultyEnrollments = canvasCache.getFaculty();
  var userTerms = [];

  for (let term of terms) {

    // If faculty user is enrolled in term course, 
    // add an object for the term to the userTerms collection.
    let courseEnrollments = facultyEnrollments.filter(
       e => (e.user_id === userId) && (e.course_id === term.course_id)
    );
    
    // // Could be that faculty has a restored access student enrolled in the
    // // the corresponding iSupervision course but no restored access enrolled 
    // // in this modules course. In this case we make it look like the faculty
    // // is enrolled in the modules course.
    // if (courseEnrollments.length <= 0) {

    //   // Build sis course id for faculty user's corresponding isupervision course.
    //   // See if such a sis course id exists in the isupervision course list.
    //   // If it does, see if has a student in it that is in the modules course.
    //   // If it does, create a term object just for this case.

    //   const sisCourseId = term.isupe_prefix + user.login_id.split('@')[0];
    //   const iSupeCourse = canvasCache.getISupeCourses().find( e => e.sis_course_id === sisCourseId);
    //   if (iSupeCourse) {
    //     console.log('found restored access isupervision course', term.name, sisCourseId);
    //     const iSupeCourseEnrollments = canvasCache.getCourseEnrollments(iSupeCourse.id);
    //     console.log('course enrollments for', iSupeCourse.id, iSupeCourseEnrollments.length);
    //     const iSupeCourseEnrollment = iSupeCourseEnrollments.find( e => e.modules_term_course_id === term.course_id);
    //     if (iSupeCourseEnrollment) {
    //       console.log('found students in isupervision course for', term.name, sisCourseId);
    //       courseEnrollments = [ {course_section_id : null} ];
    //     }
    //   }
    // }

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
  // if (userTerms.length <= 0) {
  //   const s = `No enrollment data found for user ID ${userId}. User might not be in any of the courses configured for the dashboard.`;
  //   return res.render('dash/facultyDashErr', { 'err': s } );
  // }
  if (userTerms.length <= 0) return [];

  // // We'll need the user's user object to display user info.
  // const enrollments = facultyEnrollments.filter( e => e.user_id === userId);
  // const user = enrollments[0].user;

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

  return userTerms;
}

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
  

// ******************** Exports ********************//
module.exports.build = buildTermsForUser;
