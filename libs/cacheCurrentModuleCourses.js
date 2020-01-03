/* Module encapsulating algorithm for priming the cache with Canvas
data for module courses of the current semeter.
Do we still need quizzes queries?
10.03.2019 tps Created from cachePrimer.js.
12.17.2019 tps Run async calls in series, to avoid what may be Canvas throttling.
*/

// const fs          = require('fs');
const async       = require('async');
const dashSemesters = require('./dashSemesters');
const canvasCache = require('./canvasCache');
// const moduleCache = require('./moduleCache');
// const statusFile  = require('./cacheStatus');

// Pointers to functions that populate the cache.
// Function signature are expected to be (courseId, callback)
const getEnrollments  = canvasCache.loadCourseEnrollments;
const getModules      = canvasCache.loadCourseModules;
const getAssignments  = canvasCache.loadCourseAssignments;
// const getQuizzes      = canvasCache.loadCourseQuizzes;

// const DELAY = 1000; // Delay in milliseconds between API calls, so Canvas doesn't throttle us.

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
  
  console.log("Priming cache for module courses in current semester");

  // Retrieve terms configuration for the current semester.
  // There should be one current semester.
  const currentSemester = dashSemesters.getAll().find( e => e.isCurrentSemester);
  if (!currentSemester) return callback();
  const terms = currentSemester.terms_config;

  // var queryCount = 0;
  var queryFunctions = [];  // Collection of functions with signature (callback)

  // Fetch the course list
  queryFunctions.push(canvasCache.loadCourses);

  // For code readability, this defines a function that queues up the next Canvas query to run.
  function queueUpQuery(f, courseId) {
    return function(cb) {
      // return setTimeout(f, ++queryCount * DELAY, courseId, cb);
      return f(courseId, cb);
    };
  }

  // Term courses data to fetch
  const termCourseIds = terms.map( e => e.course_id);
  for (let id of termCourseIds) {

    queryFunctions.push(queueUpQuery(getEnrollments, id));    
    // queryFunctions.push(queueUpQuery(getSections, id));
    queryFunctions.push(queueUpQuery(getModules, id));
    queryFunctions.push(queueUpQuery(getAssignments, id));
    // queryFunctions.push(queueUpQuery(getQuizzes, id));

  } // end loop through course terms

  function done(err, results) {
    if (err) return callback(err);
    return callback(null);
  }

  // console.log("Priming cache with", queryFunctions.length, "queries.");
  // async.parallel(queryFunctions, done);
  async.series(queryFunctions, done);
}


//******************** Exported Functions ********************//
module.exports = prefetchCanvasData;
