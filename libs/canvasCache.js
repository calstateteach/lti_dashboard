/* Module encapsulating pre-fetching Canvas data.
* 05.15.2018 tps Start refactoring of canvasCache.js.
  05.28.2018 tps Try pre-fetching assignments by user.
  06.19.2018 tps Cache course quizzes.
  06.19.2018 tps Cache modules, adapted for dashboard layout.
  07.06.2018 tps Add course list to cache.
  08.13.2018 tps Load & cache modules especially adapted for the dashboard layout for fall 2018.
  08.22.2018 tps Load list of iSupervision courses for fall 2018.
  10.09.2018 tps Search for iSupervision courses modified for bang-suffix names.
  12.19.2018 tps For student dashboard, add student list to cache.
  04.05.2019 tps Add faculty member CAM data to the cache.
*/

// const fs          = require('fs');
const async       = require('async');
const canvasQuery = require('./canvasQuery');
const appConfig   = require('./appConfig');
const moduleCache = require('./moduleCache');

// const CACHE_DIR = 'canvas_cache/';

// Who to consider a faculty
const FACULTY_TYPES = [ 'TaEnrollment', 'TeacherEnrollment'];

// var storage = {}; // Module object store for prefetched query results.

//******************** Data-Specific Get Functions ********************//
// Return cached objects. Some sort of object is returned by the module
// cache, even if the requested resource is not in the cache.

function getCourseEnrollments(courseId) {
  const queryKey = `courses_${courseId}_enrollments`;
  return moduleCache.get(queryKey).json;
}

function getCourseSections(courseId) {
  const queryKey = `courses_${courseId}_sections`;
  return moduleCache.get(queryKey).json;
}

function getCourseModules(courseId) {
  const queryKey = `courses_${courseId}_modules`;
  return moduleCache.get(queryKey).json;
}

function getCourseAssignments(courseId) {
  const queryKey = `courses_${courseId}_assignments`;
  return moduleCache.get(queryKey).json;
}

function getFaculty() {
  const queryKey = `facultyUsers`;
  return moduleCache.get(queryKey).json;
}

function getStudents() {
  const queryKey = `studentUsers`;
  return moduleCache.get(queryKey).json;
}

function getUserAssignments(userId, courseId) {
  const queryKey = `users_${userId}_courses_${courseId}_assignments`;
  return moduleCache.get(queryKey).json;
}

function getCourseQuizzes(courseId) {
  const queryKey = `courses_${courseId}_quizzes`;
  return moduleCache.get(queryKey).json;
}

function getAdaptedCourseModules(courseId) {
  const queryKey = `courses_${courseId}_modules_adapted`;
  return moduleCache.get(queryKey).json;
}

function getDashboardModules(courseId) {
  const queryKey = `courses_${courseId}_modules_dashboard`;
  return moduleCache.get(queryKey).json;
}

function getCourses() {
  const queryKey = `courses`;
  return moduleCache.get(queryKey).json;
}

function getISupeCourses() {
  const queryKey = `iSupeCourses`;
  return moduleCache.get(queryKey).json;
}

function getFacultyCam() {
  const queryKey = `facultyListCam`;
  return moduleCache.get(queryKey).json;
}

//******************** Data-Specific Load Functions ********************//

function loadCourseEnrollments(courseId, callback) {
  const queryKey = `courses_${courseId}_enrollments`;
  const queryFunction = function(callback) {
    return canvasQuery.getCourseEnrollments(courseId, callback);
  }
  return moduleCache.loadQuery(queryKey, queryFunction, callback);
}

function loadCourseSections(courseId, callback) {
  const queryKey = `courses_${courseId}_sections`;
  const queryFunction = function(callback) {
    return canvasQuery.getCourseSections(courseId, callback);
  }
  return moduleCache.loadQuery(queryKey, queryFunction, callback);
}

function loadCourseModules(courseId, callback) {
  const queryKey = `courses_${courseId}_modules`;
  const queryFunction = function(callback) {
    return canvasQuery.getModules(courseId, callback);
  }
  return moduleCache.loadQuery(queryKey, queryFunction, callback);
}

function loadCourseAssignments(courseId, callback) {
  return moduleCache.loadQuery(
    `courses_${courseId}_assignments`,
    (callback) => { return canvasQuery.getAssignments(courseId, callback); },
    callback
  );
}

function loadFaculty(callback) {
  const queryKey = `facultyUsers`;
  const queryFunction = function(callback) {
    return buildFacultyList(callback);
  }
  return moduleCache.loadQuery(queryKey, queryFunction, callback);
}

function loadUserAssignments(userId, courseId, callback) {
  const queryKey = `users_${userId}_courses_${courseId}_assignments`;
  const queryFunction = function(callback) {
    return canvasQuery.getUserAssignments(userId, courseId, callback);
  }
  return moduleCache.loadQuery(queryKey, queryFunction, callback);
}

function loadCourseQuizzes(courseId, callback) {
  const queryKey = `courses_${courseId}_quizzes`;
  const queryFunction = function(callback) {
    return canvasQuery.getCourseQuizzes(courseId, callback);
  }
  return moduleCache.loadQuery(queryKey, queryFunction, callback);
}

// function loadAdaptedCourseModules(courseId, callback) {
//   const queryKey = `courses_${courseId}_modules_adapted`;
//   const queryFunction = function(callback) {
//     return require('./adaptedModules')(courseId, callback);
//   }
//   return moduleCache.loadQuery(queryKey, queryFunction, callback);
// }

function loadDashboardModules(courseId, callback) {
  const queryKey = `courses_${courseId}_modules_dashboard`;
  const queryFunction = function(callback) {
    return require('./dashboardModules')(courseId, callback);
  }
  return moduleCache.loadQuery(queryKey, queryFunction, callback);
}

function loadCourses(callback) {
  const queryKey = `courses`;
  return moduleCache.loadQuery(queryKey, canvasQuery.getCourses, callback);
}

function loadISupeCourses(callback) {
  const queryKey = `iSupeCourses`;
  const queryFunction = function(callback) {
    return buildISupeList(callback);
  }
  return moduleCache.loadQuery(queryKey, queryFunction, callback);
}

function loadFacultyCam(callback) {
  const queryKey = `facultyListCam`;
  const queryFunction = function(callback) {
    return require('./requestFacultyCamData')(callback);
  }
  return moduleCache.loadQuery(queryKey, queryFunction, callback);
}


//******************** Functions to get All Faculty Users ********************//

/**
 * Build list of faculty users of the dashboard.
 * Assume that we've prefetched the term course enrollment lists.
 * 
 * callback signature: (err, facultyListJson) 
 */
function buildFacultyList(callback) {
  const termIds = appConfig.getTerms().map( e => e.course_id);
  var facultyList = [];   // Accumulate faculty user objects

  for (let courseId of termIds) {
    const enrollments = getCourseEnrollments(courseId);
    const facultyUsers = enrollments.filter( e => FACULTY_TYPES.includes(e.type));
    facultyList = facultyList.concat(facultyUsers);
  }
  facultyList.sort(compareEnrollees);
  return process.nextTick(callback, null, facultyList);
}

/**
 * Build a list of iSupervision courses.
 * Assumes we've already prefetched courses & faculty list.
 * There are up to 3 iSupervision courses for each faculty member, named like:
 * 
 * "CST1841S-" + <mailbox part of user login>
 * "CST1842S-" + <mailbox part of user login>
 * "CST1843S-" + <mailbox part of user login>
 * 
 * e.g. "CST1841S-rplaugher"
 * 
 * 10.09.2018 tps There may be a test iSupervision course named with a "!" suffix:

 * "CST1841S-" + <mailbox part of user login>!
 * "CST1842S-" + <mailbox part of user login>!
 * "CST1843S-" + <mailbox part of user login>!
 * 
 * e.g. "CST1841S-misl0908!"
 * 
 * callback signature: (err, <array of JSON course objects>) 
 */
function buildISupeList(callback) {

  var iSupeCourses = [];  // Populate with list of iSupervision courses.
  
  // Get list of faculty logins
  const facultyLogins = Array.from(
    new Set(getFaculty().map(e => e.user.login_id.split('@')[0] )) );

  // Get list of prefixes for iSupervision course names
  const terms = appConfig.getTerms();
  const iSupePrefixes = Array.from(new Set(terms.map( e => e.isupe_prefix )));

  // See how many of these iSupervision course names we can find
  const courses = getCourses();
  for (let facultyLogin of facultyLogins) {
    for (let iSupePrefix of iSupePrefixes) {

      const iSupeCourseName = iSupePrefix + facultyLogin;
      // const iSupeCourse = courses.find( e => e.name === iSupeCourseName);
      // const iSupeCourse = courses.find( e => e.sis_course_id === iSupeCourseName);

      // If there is both a bang suffix & non-bang suffix version of the
      // iSupervision course name, use the non-bang version.
      let iSupeCourse = courses.find( e => e.sis_course_id === iSupeCourseName);
      if (!iSupeCourse) {
        iSupeCourse = courses.find( e => e.sis_course_id === (iSupeCourseName + '!'));
      }

      if (iSupeCourse) {
        iSupeCourses.push({
          id: iSupeCourse.id,
          sis_course_id: iSupeCourse.sis_course_id
        });
      }

    } // end loop through iSupervision course name prefixes
  } // end loop through faculty logins

  return process.nextTick(callback, null, iSupeCourses);
}


//******************** Functions to get All Student Users ********************//

function loadStudents(callback) {
  const queryKey = `studentUsers`;
  const queryFunction = function(callback) {
    return buildStudentList(callback);
  }
  return moduleCache.loadQuery(queryKey, queryFunction, callback);
}

/**
 * Build list of student users of the dashboard.
 * Assume that we've prefetched the term course enrollment lists.
 * 
 * callback signature: (err, <array of student enrollment JSON objects>) 
 */
function buildStudentList(callback) {
  const termIds = appConfig.getTerms().map( e => e.course_id);
  var enrollmentList = [];   // Accumulate user objects

  for (let courseId of termIds) {
    const enrollments = getCourseEnrollments(courseId);
    const studentUsers = enrollments.filter( e => 'StudentEnrollment' === e.type);
    enrollmentList = enrollmentList.concat(studentUsers);
  }
  enrollmentList.sort(compareEnrollees);
  return process.nextTick(callback, null, enrollmentList);
}


//******************** Helper Functions ********************//

function compareEnrollees(a, b) {
  /* Helper function for sorting an enrollee list. */
  var nameA = a.user.sortable_name;
  var nameB = b.user.sortable_name;
  if (nameA < nameB) {
    return -1;
  }
  if (nameA > nameB) {
    return 1;
  }

  return 0; // names must be equal
}


//******************** Exported Functions ********************//
exports.getCourseEnrollments = getCourseEnrollments;
exports.getCourseSections = getCourseSections;
exports.getCourseModules = getCourseModules;
exports.getCourseAssignments = getCourseAssignments;
exports.getCourseQuizzes = getCourseQuizzes;
exports.getFaculty = getFaculty;
exports.getStudents = getStudents;
exports.getUserAssignments = getUserAssignments;
// exports.getAdaptedCourseModules = getAdaptedCourseModules;
exports.getDashboardModules = getDashboardModules;
exports.getCourses = getCourses;
exports.getISupeCourses = getISupeCourses;
exports.getFacultyCam = getFacultyCam;

exports.loadCourseEnrollments = loadCourseEnrollments;
exports.loadCourseSections = loadCourseSections;
exports.loadCourseModules = loadCourseModules;
exports.loadCourseAssignments = loadCourseAssignments;
exports.loadCourseQuizzes = loadCourseQuizzes;
exports.loadFaculty = loadFaculty;
exports.loadStudents = loadStudents;
exports.loadUserAssignments = loadUserAssignments;
// exports.loadAdaptedCourseModules = loadAdaptedCourseModules;
exports.loadDashboardModules = loadDashboardModules;
exports.loadCourses = loadCourses;
exports.loadISupeCourses = loadISupeCourses;
exports.loadFacultyCam = loadFacultyCam;