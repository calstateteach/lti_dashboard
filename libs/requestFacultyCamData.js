/* Module that adds CAM user data to Canvas faculty Data.
Data used to filter faculty lists based on region, which is stored in CAM.
CST-Admins should be shown only faculty in their own region.
Assumes that Canvas faculty list has already been retrieved & cached.

04.05.2019 tps Created.
*/

const async       = require('async');
const canvasCache = require('./canvasCache');
const camApi      = require('./camApi');


/******************** Module exports single function that populates cache ********************/
module.exports = function (callback) {
  // Callback signature: (err, json)
  
  // We're interested in Canvas teachers.
  // Users can have multiple enrollments, but We're only interested in distinct user records
  let uniqueUsers = [];   // Populate with distinct Canvas users who are faculty.
  
  const facultyList = canvasCache.getFaculty();
  for (let i = 0; i < facultyList.length; ++i) {
    const enrollee = facultyList[i];
    if ( (enrollee.type === 'TeacherEnrollment')
      && (!uniqueUsers.find( (e) => { return e.id === enrollee.user_id } ))) {
        uniqueUsers.push(enrollee.user);
    }
  }

  // Collect CAM data for these users
  let canvasUsersCamData = [];

  async.eachSeries(   // Do this in series to preserve the sort order of the faculty list.
    uniqueUsers,
    (item, callback) => {
      const camUrl = process.env.CAM_USER_SEARCH_URL.replace('${userEmail}', item.login_id);
      camApi.collectApiResults([camUrl], (err, results) => {

        // If something bad happens, just supply a blank campus code.
        // The Canvas user might not be in CAM, in which case also use a blank code
        let userData = {
          cam: { "campus_code": "" }
        };
        if (err) {
          console.log('CAM API error:', err);
        } if (results.length > 0) {   // Store the CAM data for the user
          userData.cam = results[0][0];
        }

        // Combine Canvas user data & CAM user data into one object for storage.
        Object.assign(userData, item);
        canvasUsersCamData.push(userData);

        // Don't let one error stop the rest of the proceedings.
        return callback(null);
      });    
    },
    (err) => {
      // Don't let one error stop the rest of the proceedings.
      return callback(null, canvasUsersCamData);
    });

} // End module export function
