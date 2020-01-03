/* Module encapsulating algorithm for priming the cache with Canvas
data for module courses containing students with restored access.
10.03.2019 tps Created.
*/

// const async       = require('async');
const dashSemesters = require('./dashSemesters');

// Should go in .env file
// const RESTORED_ACCESS_CAM_API = process.env.CAM_RESTORED_ACCESS;
const FACULTY_TYPES = ['TeacherEnrollment', 'TaEnrollment'];

const {promisify} = require('util');  // A reason to upgrade to node 12
// const camApi = require('./camApi');
// const getCamDataPromise = promisify(camApi.collectApiResults);
const canvasQuery = require('./canvasQuery');
const getCourseEnrollments = promisify(canvasQuery.getCourseEnrollments);
const canvasCache = require('./canvasCache');
const loadCourseAssignmentsPromise = promisify(canvasCache.loadCourseAssignments);
const loadCourseModulesPromise = promisify(canvasCache.loadCourseModules);
const loadDashboardModulesPromise = promisify(canvasCache.loadDashboardModulesWithTermConfig);
const useCourseEnrollmentsPromise = promisify(canvasCache.useCourseEnrollments);
const restoredAccessUtils = require('./restoredAccessUtils');

async function prefetchCanvasData() {

  // We're interested in the restored access semesters.
  const semesters = dashSemesters.getAll().filter( e => e.use_for === 'restored_access');
  for(let semester of semesters) {
    await prefetchRestoredAccessTerms(semester);
  }
}

async function prefetchRestoredAccessTerms(semester) {
  const terms = semester.terms_config;
  const moduleCourseIds = terms.map( e => e.course_id);

  // Temporary store of enrollments by course
  const enrollmentsStore = {};

  // Temporary store of restored access enrollments by course
  const restoredAccessEnrollmentsStore = {};

  // Most of these course enrollments will be empty.        
  for (let courseId of moduleCourseIds) {
    restoredAccessEnrollmentsStore[courseId] = [];
  }


  /** 
   * Utility function to collect enrollments for restored access students & faculty.
   * Nested function because it needs access to enrollmentsStore & restoredAccessEnrollmentsStore
   * in the enclosing context. 
   */
  async function cacheRestoredAccessEnrollments(courseId, isISupeOnly, studentEmail) {

    // If this is the first time we're handling this course, we need to query
    // Canvas about it & save the data.
    if (!enrollmentsStore[courseId]) {
      // console.log('query restored access module course', courseId);

      enrollmentsStore[courseId] = await getCourseEnrollments(courseId);
      await loadCourseModulesPromise(courseId);
      await loadDashboardModulesPromise(courseId, terms);
      await loadCourseAssignmentsPromise(courseId);

      // Try running the promises in parallel
      // let results = await Promise.all([
      //   getCourseEnrollments(courseId),
      //   loadCourseModulesPromise(courseId),
      //   loadDashboardModulesPromise(courseId, terms),
      //   loadCourseAssignmentsPromise(courseId)
      // ]);
      // console.log('done awaiting all promises');
      // enrollmentsStore[courseId] = results[0];

    } // end if we need to query Canvas for course data.
 
    let enrollments = enrollmentsStore[courseId];

    // Get the student's section, so we can get the faculty enrollments for that section
    const studentEnrollment = enrollments.find( e => e.user.login_id === studentEmail);

    // If we didn't find the student's enrollment in the Canvas course, skip the CAM record
    if (!studentEnrollment) return;

    // Save the student's course enrollment.
    // Slip in a flag indicating whether or not the restored acccess is
    // for the iSupervision course only. We'll use this later when displaying 
    // modules course enrollments in the dashboard.
    if (!restoredAccessEnrollmentsStore[courseId]) {
      restoredAccessEnrollmentsStore[courseId] = [];
    }
    // restoredAccessEnrollmentsStore[courseId].push(studentEnrollment);
    let studentEnrollmentDeepCopy = JSON.parse(JSON.stringify(studentEnrollment));
    studentEnrollmentDeepCopy.isISupeOnly = isISupeOnly;
    restoredAccessEnrollmentsStore[courseId].push(studentEnrollmentDeepCopy);

    // We're also interested in saving the faculty enrollments for this section.
    // If there's more than 1 student in a restored access section, don't
    // collect the teacher enrollments again.

    const teacherEnrollments = enrollments.filter( e => {
      return FACULTY_TYPES.includes(e.type) && e.course_section_id === studentEnrollment.course_section_id;
    });
    for (let teacherEnrollment of teacherEnrollments) {
      if (!restoredAccessEnrollmentsStore[courseId].find( e => e.id === teacherEnrollment.id)) {
        restoredAccessEnrollmentsStore[courseId].push(teacherEnrollment);
      }
    } // end loop through section's teacher enrollments
  } // end function cacheRestoredAccessEnrollments

  // Get the restored access students & the courses we need to display for them.
  // Cache the modules course for each restored access student.
  const students = await restoredAccessUtils.getRestoredAccessBySemester(semester);
  for(let student of students) {
    // console.log('cache restored access enrollments for', student.modules_course_id, student.email);
    await cacheRestoredAccessEnrollments(student.modules_course_id, !!student.isISupeOnly, student.email);
  }

  // // Build semester-specific CAM API query
  // let camUrl = RESTORED_ACCESS_CAM_API.replace('${term}', semester.season);
  // camUrl = camUrl.replace('${year}', semester.year);

  // // Query for restored access students from CAM
  // const camData = await getCamDataPromise([camUrl]);
  // for (let student of camData[0]) {
  //   const courseId = parseInt(student.course_id, 10);
  //   const studentEmail = student.email;
  //   // console.log(courseId, studentEmail);

  //   // If we're looking at restored access to a module course...
  //   if (moduleCourseIds.includes(courseId)) {
  //     await cacheRestoredAccessEnrollments(courseId, studentEmail);
  //   } 
  // } // end loop through restored access student record

  // Save to the app cache the enrollments for restored access users
  for (let courseId of Object.keys(restoredAccessEnrollmentsStore)) {
    console.log('caching', restoredAccessEnrollmentsStore[courseId].length, 'restored access enrollments for modules course', courseId);
    await useCourseEnrollmentsPromise(courseId, restoredAccessEnrollmentsStore[courseId]);
  }

}


//******************** Export module as a function ********************//
module.exports = prefetchCanvasData;
