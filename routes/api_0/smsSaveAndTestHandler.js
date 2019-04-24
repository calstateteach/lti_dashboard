/* Handler for AJAX endpoint that saves & tests a dashboard user's SMS phone number.
07.26.2018 tps Created.
*/
const async = require('async');
const mustache = require('mustache');

const appConfig     = require('../../libs/appConfig');
const twilioHelper  = require('../../libs/twilioHelper');
const DashUser      = require('../../libs_db/dashUserModel');
const DashMessage   = require('../../libs_db/dashMessageModel');

/**
 * Handle restful PUT to save and test user's SMS phone number.
 * Content of request is expected to be a JSON object containing
 * new phone number for dashboard user, like this:
 * { mobile: "555-121-1001" }
 */
function post(req, res) {

  const canvasUserId = parseInt(req.params['canvasUserId'], 10);
  const query = { canvasUserId: canvasUserId };
  const userData = req.body;
  const phoneNumber = userData.mobile;
  const userName = userData.userName;
  let twilioMessage = null;   // Populate with twilio message sent.

  /******************** Async Steps ********************/

  function saveUserData(callback) {
    DashUser.findOneAndUpdate(
      query,
      userData,
      { new: true, upsert: true}, // Insert doc if it doesn't exist
      (err, doc) => { return callback(err); }
    );  
  }

  function sendTestSms(callback) {
    if (phoneNumber) {

      const msgTo = '+1' + phoneNumber;  // Convert to US-based E.164 format

      // Use template to build message text.
      const template = appConfig.getMustacheTemplates().sms_test;
      const templateData = { userName: userName };
      const msgBody = mustache.render(template, templateData);
      // const msgBody = `CST dashboard alerts for ${userName} will be sent to this number.`;
      
      twilioHelper.create(msgTo, msgBody,  (err, message) => {
        if (err) {
          return callback(err.message);   // Attempt to report twilio message nicely
        }
        twilioMessage = message;
        return callback(null);
      });
    } else {
      return process.nextTick(callback, null);
    }
  }

  function logSms(callback) {
    if (twilioMessage) {
      const newObj = new DashMessage({
        canvasUserId: canvasUserId,
        alert: 'SMS_TEST',
        transport: 'TWILIO_SMS',
        timestamp: new Date(),
        twilioMessage: JSON.stringify(twilioMessage)
      });
      newObj.save( (err) => {
        return callback(err);
      });  
    } else {
      return process.nextTick(callback, null, dataBag);
    }
  }

  function done(err) {
    // Error messages are the only things that are useful to the end user.
    return res.json( { err: err} );
  }

  /******************** Async Series ********************/
  async.series([
    sendTestSms,
    saveUserData,   // Don't save phone numbers that cause errors
    logSms
  ], done);
}

/******************** Exports *********************/
module.exports = post;
