/* Dummy module containing routines for doing authorization for CAM with JWT tokens.
09.25.2019 tps Created.
*/

const fs = require('fs');
const jwt = require('jsonwebtoken');


//******************** Exports ********************//

exports.loadKey = function(callback) {
  // Callback signature: (err)

  const KEY_FILE = 'config/' + process.env['CAM_AUTH_KEY_FILE'];
  fs.readFile(KEY_FILE, 'utf8', (err, data) => {
    if (err) {
      return callback(err);
    } else {
      process.env.CAM_AUTH_PRIV_KEY = data; // Retrieve private key from environment variable.
      return callback();
    }
  });
};

exports.createToken = function(payloadSubject) {
  const payload = {
    sub: payloadSubject
  };
  
  const options = {
    algorithm: 'RS256',
    // expiresIn: '2h', // 2 hours
    issuer: 'fdb.calstateteach.net',
    audience: 'ce'
  };
  
  console.log((new Date()).toLocaleString('en-US'), 'Creating auth token for', payloadSubject);
  return jwt.sign(payload, process.env.CAM_AUTH_PRIV_KEY, options);
};