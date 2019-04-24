/* Module containing functions that render assignments URL page.
Experiment to see if this table can be used to automate
creation of configuration data for redirect LTI.
05.19.2018 tps Created.
06.29.2018 tps Imported into fdb2 from older version. Refactored to use
               synchronous calls for data from cache.
07.05.2018 tps Add column with URL encoded assignment name.
07.05.2018 tps Parse assignment URLs into destination targets for redirect LTI.
07.06.2018 tps Output CSV as download if query string parameter "out=csv"
07.06.2018 tps Include Canvas course information in page display.
07.06.2018 tps Modify so that it queries live data instead of using cache.
07.09.2018 tps Further parse encoded string to replace encoded characters with '_' & '-'
*/
const async = require('async');
const appConfig   = require('../../libs/appConfig');
const canvasCache = require('../../libs/canvasCache');
const canvasQuery = require('../../libs/canvasQuery');
const csv = require('express-csv');

function get(req, res) {

  if (req.query.out === 'csv') {
    // Run live assignment queries.

    // Collect all assignment names in the term courses into a collection.
    // Each element of the collection is an object representing one
    // assignment, identified by its name.
    // Each element has an object with a property indexed by term name,
    // whose value is the assignment URL for that course.
    // So all the urls for assignments with the same name across courses
    // are collected in the same object.
    // The object structure looks like:
    // {
    //  name: <assignment name>,
    //  name_encoded: <URL encoded assignment name>,
    //  urls: <object>
    // }
    let assignments = []; // Collection of assignments across all courses.

    /** 
     * Async function that runs a live Canvas query for assignments in one course.
     */
    function iteratee(item, callback) {
      const courseId = item.course_id;
      canvasQuery.getAssignments(courseId, (err, json) => {
        if (err) return callback(err);

        // Accumulate assignment URLs indexed by assignment name & course.
        for( let assignment of json) {

          // See if we've already stashed an assignment object for this assignment name
          var stashedAssignment = assignments.find( e => e.name === assignment.name);

          // If we haven't an object with this assignment name yet, make one and stash it.
          if (!stashedAssignment) {
            stashedAssignment = {
              name: assignment.name,
              url: {}
            };
            assignments.push(stashedAssignment);
          }

          // Add the course's assignment URL to the collection
          stashedAssignment.url[item.name] = assignment.html_url;
          } // end loop through course's assignments

          return callback();  // We're done processing assignments without incident
        }); // end callback function to retrieve course assignments
      } // end async iteratee function

      // Populate the assignments collection
      async.eachSeries(appConfig.getAssUrlCourses(), iteratee, (err) => {
        if (err) return res.render('dev/err', { err: err });

        // Parse out destination targets
        const destinations = assignments.map(mapAssignmentDestinations);

        // Return as CSV download
        var csvCollection = destinations.map(mapAsCsv);
        csvCollection.unshift(['name', 'assignment_name', 'destination_1', 'destination_2', 'destination_3']);

        res.setHeader('Content-disposition', 'attachment; filename=assignments.csv')
        return res.csv(csvCollection);
      });
  
  } else {
    // Display to user what's going to be extracted.
    const params = {
      // terms: appConfig.getTerms(),
      terms: appConfig.getAssUrlCourses(),
      // courseAssignments: courseAssignments,
      // assignmentDestinations: assignmentDestinations,
      courses: canvasCache.getCourses()
      // csv:csvCollection
    };
    return res.render('dev/assignmentRedirectUrls', params);
  }
}

//******************** Utility Functions ********************//

function mapAssignmentDestinations(assignment) {
  // Version for use with array map function.

  /**
   * Utility function to find a URL for one of the
   * courses in the destination list. It's possible that there
   * are no URLs for any of the courses in the destination list.
   */
  function findDestination(obj, destinationList) {
    for (courseName of destinationList) {
      if (obj[courseName]) return obj[courseName];
    }
    return null;  // Found no URL for any of the courses in the destination list

  }

  /**
   * Utility function to replace URI encoded characters in string.
   * Replace '%20' with "_"
   * Replace any other %?? with "-" 
   */

  function replaceEncodedChars(s) {
    s = s.replace(/%20/g, '_');
    s = s.replace(/%\w\w/g, '-');
    return s;
  }

  return {
    name: assignment.name,
    name_encoded: replaceEncodedChars(encodeURIComponent(assignment.name)),
    destination_1: findDestination(assignment.url, ['Term 1', 'Term 2', 'Term 3']),
    destination_2: findDestination(assignment.url, ['Term 1A', 'Term 2A']),
    destination_3: findDestination(assignment.url, ['Term 1B', 'Term 2B'])
  }
}


function mapAsCsv(assignment) {
  return [
    assignment.name,
    assignment.name_encoded,
    assignment.destination_1,
    assignment.destination_2,
    assignment.destination_3
  ];
}


//******************** Exports ********************//

exports.get = get;
