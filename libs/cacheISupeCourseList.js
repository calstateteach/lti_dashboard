/**
 * Module that encapsules building a list of iSupervision available to the dashboard.
 * 
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
 * 
 * 10.04.2019 tps Moved out of canvasCache.js into its own module.
 */

const dashSemesters = require('./dashSemesters');
const canvasCache = require('./canvasCache');

function buildISupeList(callback) {
  console.log('Build iSupervision course list for current semester');

  var iSupeCourses = [];  // Populate with list of iSupervision courses.
  
  // Get list of faculty logins
  const facultyLogins = Array.from(
    new Set(canvasCache.getFaculty().map(e => e.user.login_id.split('@')[0] )) );

  // Loop through all a semester's iSupervision prefixes.
  // For the moment, we're just interested in the current semester.
  // const semester = dashSemesters.getAll().find( e => e.isCurrentSemester);

  // Get list of prefixes for iSupervision course names
  // const terms = semester.terms_config;
  const terms = dashSemesters.getCurrentTerms();
  const iSupePrefixes = Array.from(new Set(terms.map( e => e.isupe_prefix )));

  // See how many of these iSupervision course names we can find
  const courses = canvasCache.getCourses();
  for (let facultyLogin of facultyLogins) {
    for (let iSupePrefix of iSupePrefixes) {

      const iSupeCourseName = iSupePrefix + facultyLogin;
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

  // Store this list to the cache
  canvasCache.useISupeCourses(iSupeCourses, callback);
}

//******************** Exported Functions ********************//
module.exports = buildISupeList;
