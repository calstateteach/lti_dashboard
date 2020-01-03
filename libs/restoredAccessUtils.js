/* Utility library to retrieve collection of restored access students for a semester.
Each member of the collection as an object like this:

{
  email: student@calstateteach.net,
  modules_course_id: 1234,
  isupe_course_id: 5678,
  isISupeOnly: false
}

12.18.2019 tps Created.
*/
const {promisify} = require('util');
const camApi = require('./camApi');
const getCamDataPromise = promisify(camApi.collectApiResults);
const canvasCache = require('./canvasCache');
const canvasQuery = require('./canvasQuery');
const listAccountUsers = promisify(canvasQuery.listAccountUsers);
const getUserEnrollments = promisify(canvasQuery.getUserEnrollments);


const RESTORED_ACCESS_CAM_API = process.env.CAM_RESTORED_ACCESS;

async function getRestoredAccessBySemester(semester) {
  // semester -- Semester element from dashSemester module.

  let result = [];    // Populate with restored access data for one student.

  function accumulateResult(email, key, value) {
    let resultObj = result.find( e => e.email === email);
    if (!resultObj) {
      resultObj = { email: email};
      result.push(resultObj);
    }
    resultObj[key] = value;
  }

  const terms = semester.terms_config;
  const moduleCourseIds = terms.map( e => e.course_id);
  const courses = canvasCache.getCourses();

  // Build semester-specific CAM API query
  let camUrl = RESTORED_ACCESS_CAM_API.replace('${term}', semester.season);
  camUrl = camUrl.replace('${year}', semester.year);

  // Query for restored access students from CAM
  const camData = await getCamDataPromise([camUrl]);
  for (let student of camData[0]) {
    const courseId = parseInt(student.course_id, 10);
    const studentEmail = student.email;
    // console.log(courseId, studentEmail);

    if (moduleCourseIds.includes(courseId)) {
      // If we're looking at restored access to a module course...
      // console.log(courseId, studentEmail, 'this is a modules course in the term');
      accumulateResult(studentEmail, 'modules_course_id', courseId);
    
    } else if (isISupervisionCourse(courseId, semester.terms_config, courses)) {
      // If we're looking at an isupervision enrollment
      // console.log(courseId, studentEmail, 'this is an isupervision course in the term');
      accumulateResult(studentEmail, 'isupe_course_id', courseId);
    // } else {
      // console.log(courseId, studentEmail, 'this is something else');
    }
  } // end loop through restored access student records

  // It's OK if a record does not have an iSupervision course,
  // but we always need a module course in order to know which term
  // to group the student under for dashboard display.

  for (restoredAccesObj of result) {
    if (!restoredAccesObj.modules_course_id) {
      const email = restoredAccesObj.email;
      console.log('Restored access user', email, 'needs a module course id');

      // Try to figure out the student's corresponding modules course by
      // checking all their enrollments & seeing if one matches one of the semester's
      // term courses.
      const users = await listAccountUsers(email);
      if (!users.length > 0) continue;
      const userId = users[0].id;
      const enrollmentsForStudent = await getUserEnrollments(userId);
      const courseIdsForStudent = enrollmentsForStudent.map( e => e.course_id);
      const matchingModulesTerm = terms.find( e => courseIdsForStudent.includes(e.course_id));
      if (!matchingModulesTerm) continue;
      console.log('Found modules course', matchingModulesTerm.course_id, 'for restored access user', email);
      restoredAccesObj.modules_course_id = matchingModulesTerm.course_id;

      // Record that this is an iSupervision-only restored access, because
      // we'll want to filter this out when we display modules courses in the dashboard.
      restoredAccesObj.isISupeOnly = true;
    }
  }

  return result;
}

//******************** Helper Functions ********************//

function isISupervisionCourse(courseId, terms, courses) {
  // courseId: Canvas ID of course we want to see is an iSupervision course
  // terms: terms config data for a semester. Needed for iSupervision course prefixes.

  // Check if the course name has a prefix that indicates it's an iSupervision course.
  const course = courses.find( e => e.id === courseId);
  if (course) {
    for(let iSupePrefix of terms.map( e => e.isupe_prefix)) {
      if (course.course_code.startsWith(iSupePrefix)) return true;
    } // end loop through iSupervision course prefixes
  } // end if we have a potential iSupervision course
  return false;
}

//******************** Exports ********************//
module.exports.getRestoredAccessBySemester = getRestoredAccessBySemester;