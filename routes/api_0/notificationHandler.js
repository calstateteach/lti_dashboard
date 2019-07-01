/* Route handler for notifications API.
07.18.2018 tps Created.
07.24.2018 tps Use twilioHelper.
*/

const twilioHelper = require('../../libs/twilioHelper');

function post(req, res) {

  const msgTo = '+1' + req.body.msgTo;  // Convert to US-based E.164 format
  const msgBody = req.body.msgBody;

  twilioHelper.create(msgTo, msgBody, (err, message) => {
    if (err) return res.json({err: err.message});
    return res.json(message);
  });
}

function get(req, res) {
  const msgSid = req.params['sid'];
  twilioHelper.fetch(msgSid, (err, message) => {
    if (err) return res.json({err: err.message});
    return res.json(message);
  });
}


/******************** Exports *********************/
module.exports.post = post;
module.exports.get = get;