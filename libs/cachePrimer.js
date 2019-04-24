/* Module encapsulating priming the cache of Canvas data.
05.15.2018 tps Start refactoring of canvasCachePrimer.js.
05.17.2018 tps I don't think we need sections data.
05.28.2018 tps Try pre-fetching isupervision assignments by user.
06.19.2018 tps Pre-fetch course quizzes.
07.06.2018 tps Pre-fetch course list.
08.13.2018 tps Start modifying for module configuration of fall 2018 term.
08.27.2018 tps Fix prefetchISupeAssignmentsByUser async issue?
08.27.2018 tps Don't prefetch assignments by user. Takes too long.
12.19.2018 tps For student dashboard, pre-load student list.
04.05.2019 tps For CST-Admin role, pre-load faculty CAM data.
*/

// const fs          = require('fs');
const async       = require('async');
const appConfig   = require('./appConfig');
const canvasCache = require('./canvasCache');
const moduleCache = require('./moduleCache');
const statusFile  = require('./cacheStatus');

// Pointers to functions that populate the cache.
// Function signature are expected to be (courseId, callback)
const getEnrollments  = canvasCache.loadCourseEnrollments;
// const getSections     = canvasCache.loadCourseSections;
const getModules      = canvasCache.loadCourseModules;
const getAssignments  = canvasCache.loadCourseAssignments;
const getQuizzes      = canvasCache.loadCourseQuizzes;

const DELAY = 1000; // Delay in milliseconds between API calls, Canvas doesn't throttle us.

/**
 * Data we'd like to have prefetched:
 * - Enrollments for each term course.
 * - Modules for each term course.
 * - Assignments for reach term course.
 * - Enrollments for each iSupervision course
 * - Assignments for each iSupervision course.
 * 
 * @param {function} callback
 *    callback signature: (err)
 */
function prefetchCanvasData(callback) {
  const terms = appConfig.getTerms();
  var queryCount = 0;
  var queryFunctions = [];  // Collection of functions with signature (callback)

  // Fetch the course list
  queryFunctions.push(canvasCache.loadCourses);

  // For code readability, this defines a function that queues up the next Canvas query to run.
  function queueUpQuery(f, courseId) {
    return function(cb) {
      return setTimeout(f, ++queryCount * DELAY, courseId, cb);
    };
  }

  // Term courses data to fetch
  const termCourseIds = terms.map( e => e.course_id);
  for (let id of termCourseIds) {

    queryFunctions.push(queueUpQuery(getEnrollments, id));    
    // queryFunctions.push(queueUpQuery(getSections, id));
    queryFunctions.push(queueUpQuery(getModules, id));
    queryFunctions.push(queueUpQuery(getAssignments, id));
    queryFunctions.push(queueUpQuery(getQuizzes, id));

  } // end loop through course terms

  // // iSupervision courses data to fetch.
  // // Term courses can share an iSupervision course.
  // var iSupeCourseIds = new Set(terms.map( e => e.iSupe_course_id));
  // for (let id of iSupeCourseIds) {

  //   queryFunctions.push(queueUpQuery(getEnrollments, id));
  //   // queryFunctions.push(queueUpQuery(getSections, id));
  //   // queryFunctions.push(queueUpQuery(getAssignments, id));

  // } // end loop through iSupervision courses

  function done(err, results) {
    if (err) return callback(err);
    return callback(null);
  }

  console.log("Priming cache with", queryFunctions.length, "queries.");
  async.parallel(queryFunctions, done);
}


/**
 * Prefetch data for the iSupervision courses.
 * Assumes list of iSupervision courses has already been fetched.
 * We're interested in retrieving:
 * - course enrollments
 * - course assignments
 * 
 * callback signature: (err)
 */
function prefetchISupeCourses(callback) {

  var queryFunctions = [];  // Populate with functions with signature (callback)

  const iSupeCourses = canvasCache.getISupeCourses();
  for (let iSupeCourse of iSupeCourses) {
    const courseId = iSupeCourse.id;

    // We're interested in the course enrollments
    queryFunctions.push(
      function(cb) { return canvasCache.loadCourseEnrollments(courseId, cb); }
    );

    // We're interested in the course assignments
    queryFunctions.push(
      function (cb) { return canvasCache.loadCourseAssignments(courseId, cb); }
    );
  }

  // /**
  //  * Faculty member can have up to 3 iSupervision courses, named like:
  //  * 
  //  * "CST1841S-" + <mailbox part of user login>
  //  * "CST1842S-" + <mailbox part of user login>
  //  * "CST1843S-" + <mailbox part of user login>
  //  * 
  //  * e.g. "CST1841S-rplaugher"
  //  **/
  
  // const facultyLogins = Array.from(
  //   new Set(
  //     canvasCache.getFaculty().map(
  //        e => e.user.login_id.split('@')[0] )));

  // // Get list of prefixes for iSupervision course names from the terms configuration
  // const terms = appConfig.getTerms();
  // const iSupePrefixes = Array.from(new Set(terms.map( e => e.isupe_prefix )));
  // // console.log("isupe_prefixes", iSupePrefixes);

  // // Build list of all possible iSupervision course names
  // let iSupeCourseNames = [];
  // for (let iSupePrefix of iSupePrefixes) {
  //   iSupeCourseNames = iSupeCourseNames.concat(facultyLogins.map( e => iSupePrefix + e));
  // }
  // // let iSupeCourseNames = [].concat(
  // //   facultyLogins.map( e => "CST1841S-" + e),
  // //   facultyLogins.map( e => "CST1842S-" + e),
  // //   facultyLogins.map( e => "CST1843S-" + e)
  // // );

  // // for (let courseName of iSupeCourseNames) {
  // //   console.log(courseName);
  // // }

  // // See how many of these iSupervision course names we can find
  // const courses = canvasCache.getCourses();
  // for (let iSupeCourseName of iSupeCourseNames) {

  //   const iSupeCourse = courses.find( e => e.name === iSupeCourseName);
  //   if (iSupeCourse) {
  //     const courseId = iSupeCourse.id;

  //     // We're interested in the course enrollments
  //     queryFunctions.push(
  //       function(cb) { return canvasCache.loadCourseEnrollments(courseId, cb); }
  //     );

  //     // We're interested in the course assignments
  //     queryFunctions.push(
  //       function (cb) { return canvasCache.loadCourseAssignments(courseId, cb); }
  //     );

  //   } // end if iSupervision course found for faculty member
  // } // end loop through faculty logins

  console.log(`Priming cache with iSupervision courses, ${queryFunctions.length} queries.`);
  // async.parallel(queryFunctions, (err, results) => {
  async.series(queryFunctions, (err, results) => {
    return callback(err, results);
  });
} // end function



// function prefetchISupeAssignmentsByUser(callback) {
//   // callback signature: (err)

//   // const terms = appConfig.getTerms();
//   // var queryCount = 0;
//   var queryFunctions = [];

//   // For code readability, this defines a function that queues up the next Canvas query to run.
//   // function queueUpQuery(userId, courseId) {
//   //   return function(cb) {
//   //     return setTimeout(canvasCache.loadUserAssignments, ++queryCount * DELAY, userId, courseId, cb);
//   //   };
//   // }

//   // iSupervision courses data to fetch.
//   // Term courses can share an iSupervision course.
//   // var iSupeCourseIds = new Set(terms.map( e => e.iSupe_course_id));
//   var iSupeCourseIds = canvasCache.getISupeCourses().map( e => e.id);
//   for (let courseId of iSupeCourseIds) {

//     // Students whose assignments overrides we want to query for:
//     const courseEnrollments = canvasCache.getCourseEnrollments(courseId);
//     const students = courseEnrollments.filter( e => e.type === 'StudentEnrollment');
//     for (let student of students) {
//       // queryFunctions.push(queueUpQuery(student.user_id, courseId));
//       queryFunctions.push(
//         function(cb) { return canvasCache.loadUserAssignments(student.user_id, courseId, cb); }
//       );
//     }
//   } // end loop through course terms

//   // function done(err, results) {
//   //   if (err) return callback(err);
//   //   return callback(null);
//   // }

//   console.log("Priming cache with", queryFunctions.length, "queries for user iSupervision assignments.");
//   // async.parallel(queryFunctions, done);
//   async.series(queryFunctions, callback);
// }

// /**
//  * Build version of module collections for each course that is
//  * convenient for the dashboard layout & assignment navigation.
//  */

// function buildAdaptedCourseModules(callback) {
//   // callback signature: (err)

//   // Accumulate list of functions that build the JSON for each course.
//   const terms = appConfig.getTerms();
//   const courseIds = new Set(terms.map( e => e.course_id));
//   var queryFunctions = [];
//   for (let courseId of courseIds) {
//     queryFunctions.push(
//       function(cb) {
//         return canvasCache.loadAdaptedCourseModules(courseId, cb);
//       }
//     );
//   }

//   console.log("Building dashboard modules for", queryFunctions.length, "courses.");
//   async.parallel(queryFunctions, (err, results) => { return callback(err); });
// }

  /**
 * Build version of module collections for each course for fall 2018 that is
 * convenient for the dashboard layout & assignment navigation.
 */

function buildDashboardModules(callback) {
  // callback signature: (err)

  // Accumulate list of functions that build the JSON for each course.
  const terms = appConfig.getTerms();
  const courseIds = new Set(terms.map( e => e.course_id));
  var queryFunctions = [];
  for (let courseId of courseIds) {
    queryFunctions.push(
      function(cb) {
        return canvasCache.loadDashboardModules(courseId, cb);
      }
    );
  }

  console.log("Building dashboard modules for", queryFunctions.length, "courses.");
  async.parallel(queryFunctions, (err, results) => { return callback(err); });
}


function prefetch(callback) {
  // callback signature: (err);

  // Record how long this takes
  const statusRecorder = statusFile.createStatusRecorder();
  function startTiming(callback) { return statusRecorder.start(callback); }
  function stopTiming(callback) { return statusRecorder.stop(callback); }

  async.series([
    startTiming,
    moduleCache.deleteDiskCache,
    prefetchCanvasData,
    canvasCache.loadFaculty,
    canvasCache.loadStudents,
    canvasCache.loadISupeCourses,
    buildDashboardModules,
    prefetchISupeCourses,
    canvasCache.loadFacultyCam,
    // prefetchISupeAssignmentsByUser,  //? Doing loadISueCourses is enough?
    // buildAdaptedCourseModules,
    // function(callback) { return statusRecorder.logError(new Error("this is a fake error"), callback); }  // Test error logging
    stopTiming
  ], done);

  function done(err) {
    if (err) {
      return statusRecorder.logError(err, callback);
      // return callback(err);
    }
    return callback(null);
  }
}


//******************** Exported Functions ********************//
exports.prefetch = prefetch;
// exports.buildAdaptedCourseModules = buildAdaptedCourseModules;