/* Module encapsulating algorithm for priming the cache with Canvas
data for iSupervision courses containing students with restored access.
Non-optimized. During the cache priming process, cacheRestoredModuleCourses
makes the same query to the Canvas API & loop through all the data.
But I was having a hard time maintaining a module that did both module courses
& iSupervision courses.

Assumes that cacheISuperCourseList.js has already been run to populate the ISupeCourses
list in the cache. We'll be appending to this collection.

10.04.2019 tps Created.
*/

// const async       = require('async');
const dashSemesters = require('./dashSemesters');

// const RESTORED_ACCESS_CAM_API = process.env.CAM_RESTORED_ACCESS;
const FACULTY_TYPES = ['TeacherEnrollment', 'TaEnrollment'];

const {promisify} = require('util');  // A reason to upgrade to node 12
// const camApi = require('./camApi');
// const getCamDataPromise = promisify(camApi.collectApiResults);
const canvasQuery = require('./canvasQuery');
const getCourseEnrollments = promisify(canvasQuery.getCourseEnrollments);
const getUserEnrollments = promisify(canvasQuery.getUserEnrollments);
const canvasCache = require('./canvasCache');
const loadCourseAssignmentsPromise = promisify(canvasCache.loadCourseAssignments);
// const loadCourseModulesPromise = promisify(canvasCache.loadCourseModules);
// const loadDashboardModulesPromise = promisify(canvasCache.loadDashboardModulesWithTermConfig);
const useCourseEnrollmentsPromise = promisify(canvasCache.useCourseEnrollments);
const useISupeCourses = promisify(canvasCache.useISupeCourses);
const restoredAccessUtils = require('./restoredAccessUtils');


async function prefetchCanvasData() {

  console.log('Cache iSupervision courses with restored access');
  const courses = canvasCache.getCourses();
  var iSupeCourses = [];  // Populate with list of iSupervision courses.

  // We're interested in the restored access semesters.
  const semesters = dashSemesters.getAll().filter( e => e.use_for === 'restored_access');
  for(let semester of semesters) {
    await processSemester(semester, courses, iSupeCourses);
  }

  // Append the iSupervision courses with restored access students to the
  // existing list of iSupervisions in the cache.
  const cachedISupeCourses = canvasCache.getISupeCourses();
  await useISupeCourses(cachedISupeCourses.concat(iSupeCourses));
}

async function processSemester(semester, courses, iSupeCourses) {
  // Temporary store of enrollments by course
  const enrollmentsStore = {};

  // Temporary store of restored access enrollments by course
  const restoredAccessEnrollmentsStore = {};

  // Get the restored access students & the courses we need to display for them.
  // Cache the isupervision course for each restored access student.
  const students = await restoredAccessUtils.getRestoredAccessBySemester(semester);
  for(let student of students) {
    if (student.isupe_course_id) {
      await processCourse(student.isupe_course_id, semester.terms_config, student.email, enrollmentsStore, restoredAccessEnrollmentsStore, courses, iSupeCourses);
    }
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

  //   // Check if the course name has a prefix that indicates it's an iSupervision course.
  //   if (isISupervisionCourse(courseId, semester.terms_config, courses)) {
  //     await processCourse(courseId, semester.terms_config, studentEmail, enrollmentsStore, restoredAccessEnrollmentsStore, courses, iSupeCourses);
  //     // Accumulate list of iSupervision courses.
  //   }
  // } // end loop through restored access student record

  // Save the enrollments for restored access users to the app cache
  for (let courseId of Object.keys(restoredAccessEnrollmentsStore)) {
    console.log('caching', restoredAccessEnrollmentsStore[courseId].length, 'restored access enrollments for iSupervision course', courseId);
    await useCourseEnrollmentsPromise(courseId, restoredAccessEnrollmentsStore[courseId]);
  }
  
  // Save list iSupervision courses
}


/** 
 * Utility function to collect enrollments for restored access students & faculty.
 */
async function processCourse(courseId, termsConfig, studentEmail, enrollmentsStore, restoredAccessEnrollmentsStore, courses, iSupeCourses) {

  // If this is the first time we're handling this course, we need to query
  // Canvas about it & save the data.
  if (!enrollmentsStore[courseId]) {
    // console.log('query restored access iSupervision course', courseId);

    enrollmentsStore[courseId] = await getCourseEnrollments(courseId);
    await loadCourseAssignmentsPromise(courseId);

    restoredAccessEnrollmentsStore[courseId] = []

    // Accumulate list of all restored access iSupervision courses.
    // We should stash the same structure for iSupervision courses as cacheISupeCourseList.js.
    const course = courses.find( e => e.id === courseId);
    if (course) {
      iSupeCourses.push({
        id: course.id,
        sis_course_id: course.sis_course_id
      });
    }
  } // end if we need to query Canvas for course data.

  let enrollments = enrollmentsStore[courseId];

  // Get the student's section, so we can get the faculty enrollments for that section
  const studentEnrollment = enrollments.find( e => e.user.login_id === studentEmail);

  // If we didn't find the student's enrollment in the Canvas course, skip the CAM record
  if (!studentEnrollment) return;

  // 12.18.2019 tps Try to figure out the student's corresponding modules course by
  // checking all their enrollments & seeing if one matches one of the semester's
  // term courses.
  // console.log('find corresponding modules term for restored access isupervision course for', studentEnrollment.user.login_id, studentEnrollment.user.id);
  const enrollmentsForStudent = await getUserEnrollments(studentEnrollment.user_id);
  const courseIdsForStudent = enrollmentsForStudent.map( e => e.course_id);
  const matchingModulesTerm = termsConfig.find( e => courseIdsForStudent.includes(e.course_id));
  // if (matchingModulesTerm) {
  //   console.log('Found matching term', matchingModulesTerm.name, matchingModulesTerm.course_id,'for', studentEnrollment.user.login_id);
  //   studentEnrollment.modules_term_course_id = matchingModulesTerm.course_id;
  // } else {
  //   console.log('Found no matching term for', studentEnrollment.user.login_id);
  // }
  studentEnrollment.modules_term_course_id = matchingModulesTerm ? matchingModulesTerm.course_id : null;

  // Save the student's course enrollment
  restoredAccessEnrollmentsStore[courseId].push(studentEnrollment);

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
} // end function


//******************** Helper Functions ********************//

// function isISupervisionCourse(courseId, terms, courses) {
//   // courseId: Canvas ID of course we want to see is an iSupervision course
//   // terms: terms config data for a semester. Needed for iSupervision course prefixes.
//   // courses: Canvas course data. Needed to lookup course's name

//   // Check if the course name has a prefix that indicates it's an iSupervision course.
//   const course = courses.find( e => e.id === courseId);
//   if (course) {
//     for(let iSupePrefix of terms.map( e => e.isupe_prefix)) {
//       if (course.course_code.startsWith(iSupePrefix)) return true;
//     } // end loop through iSupervision course prefixes
//   } // end if we have a potential iSupervision course
//   return false;
// }


//******************** Export module as a function ********************//
module.exports = prefetchCanvasData;
