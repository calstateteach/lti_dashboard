/* MongoDb schema for collection that tracks hidden
observations assignments in the UI.
07.09.2018 tps Created.
*/

var mongoose = require('mongoose');

/******************** DB Model ********************/

// Create schema for tracking dashboard data for Canvas users.
// hiddenObs -- Array of Canvas assignment IDs for observations
//              assignments that should be hidden in the UI.
// If an assignment is in the collection, it's hidden in the UI.
// Assignments not in the collection are assumed to be visible in the UI.

const dashUserSchema = mongoose.Schema( {
  canvasUserId: Number,
  hiddenObs: [Number],
  mobile: String    // Mobile number for text alerts
});

const DashUser  = mongoose.model('dashUser', dashUserSchema, 'dashUsers');
  // The 3rd argument is the case-sensitive name of the underlying connection.
  // Mongoose converts the 1st argument to a collection called "dashusers", 
  // which is not what we want.


/******************** Exports ********************/
module.exports = DashUser;
