/* Module representing process to build dashboard module data for the current semester
module courses.
10.03.2019 tps Created from cachePrimer.js
*/

const async       = require('async');
const canvasCache = require('./canvasCache');
const dashSemesters = require('./dashSemesters');


//******************** Caching Functions ********************//

function buildDashboardModules(callback) {
  // Build dashboard modules data for current semester module courses.
  // callback signature: (err)

  // Accumulate list of functions that build the JSON for each course
  // in the current semester.

  const currentSemester = dashSemesters.getAll().find( e => e.isCurrentSemester);
  if (!currentSemester) return callback();
  const terms = currentSemester.terms_config;
  const courseIds = new Set(terms.map( e => e.course_id));
  var queryFunctions = [];
  for (let courseId of courseIds) {
    queryFunctions.push(
      function(cb) {
        return canvasCache.loadDashboardModulesWithTermConfig(courseId, terms, cb);
      }
    );
  }

  console.log("Building dashboard modules for current semester module courses");
  async.parallel(queryFunctions, (err, results) => { return callback(err); });
}

//******************** Exported Functions ********************//
module.exports = buildDashboardModules;
