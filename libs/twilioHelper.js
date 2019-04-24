/* Module that wraps Twilio access.
07.42.2018 tps Created.
*/
const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken  = process.env.TWILIO_AUTH_TOKEN;
const twilioFrom = process.env.TWILIO_FROM_NUM;

const client = new twilio(accountSid, authToken);

function create(msgTo, msgBody, callback) {
  // callback signature: (err, message)

  client.messages.create({
    body: msgBody,
    to: msgTo,
    from: twilioFrom
  }, callback);
}

function fetch(msgSid, callback) {
  // callback signature: (err, message)

  client.messages(msgSid).fetch(callback);
}


/******************** Exports *********************/
exports.create = create;
exports.fetch = fetch;