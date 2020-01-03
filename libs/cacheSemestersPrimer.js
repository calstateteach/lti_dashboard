/* Refactored cache primer to cache data for current semester plus past
semesters with students with restored access.
10.03.2019 tps Created.
12.17.2019 tps Run async calls in series, to avoid what may be Canvas throttling.
*/
const async       = require('async');
const statusFile  = require('./cacheStatus');
const canvasCache = require('./canvasCache');
const moduleCache = require('./moduleCache');

// const DELAY = 1000; // Delay in milliseconds between API calls, Canvas doesn't throttle us.

function prefetch(callback) {
  // callback signature: (err);

  // Record how long this takes
  const statusRecorder = statusFile.createStatusRecorder();
  function startTiming(callback) { return statusRecorder.start(callback); }
  function stopTiming(callback) { return statusRecorder.stop(callback); }

  async.series([
    startTiming,
    moduleCache.deleteDiskCache,
    require('./cacheCurrentModuleCourses'),
    require('./cacheCurrentDashboardModules'),
    require('./cacheRestoredModuleCourses'),
    canvasCache.loadFaculty,
    canvasCache.loadStudents,
    canvasCache.loadFacultyCam,
    require('./cacheISupeCourseList'),
    prefetchISupeCourses,
    require('./cacheRestoredISupeCourses'),
    stopTiming
  ], done);

  function done(err) {
    if (err) {
      console.log(err);
      return statusRecorder.logError(err, callback);
    }
    return callback(null);
  }
}


//******************** Utility Functions ********************//

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

  // // Queue up the queries to start at 1 second intervals, to avoid getting throttled by Canvas.
  // let tasks = [];
  // for (let i = 0; i < queryFunctions.length; ++i) {
  //   tasks.push(
  //     function(cb) { return setTimeout( queryFunctions[i], (i * DELAY), cb); } 
  //   );
  // }  

  // console.log(`Priming cache with iSupervision courses, ${tasks.length} queries.`);
  console.log(`Priming cache with iSupervision courses, ${queryFunctions.length} queries.`);
  // async.parallel(tasks, (err, results) => {
  async.series(queryFunctions, (err, results) => {
      return callback(err, results);
  });
} // end function


//******************** Exported Functions ********************//
exports.prefetch = prefetch;
