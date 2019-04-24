/* MongoDb schema for collection that tracks hidden
notifications sent to Canvas users.
07.24.2018 tps Created.
*/

var mongoose = require('mongoose');

/******************** DB Model ********************/

// Create schema for tracking notifications sent to Canvas users.
// canvasUserId -- ID of recipient of notification.
// alert -- Type of notification sent.
// transport -- Method of notification.
// timestamp -- Time when notification created.
// twilioMessage -- Twilio message object as a JSON string.

const dashMessageSchema = mongoose.Schema( {
  canvasUserId: String,
  alert: { type: String, enum: ['HAND_RAISED', 'SMS_TEST'] },
  transport: { type: String, enum: ['TWILIO_SMS'] },
  timestamp: Date,
  twilioMessage: String
});

const DashMessage  = mongoose.model('dashMessage', dashMessageSchema, 'dashMessages');
  // The 3rd argument is the case-sensitive name of the underlying connection.
  // Mongoose converts the 1st argument to a collection called "dashmessages", 
  // which is not what we want.


/******************** Exports ********************/
module.exports = DashMessage;
