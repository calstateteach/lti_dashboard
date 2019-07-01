/* Module containing functions for manually running the scan for hands.
07.27.2018 tps Created.
*/

const scanForHands = require('../../libs/scanForHands');


function get(req, res) {
  return res.render('dev/scanForHands');
}


function post(req, res) {
  // POST just starts the script
  scanForHands( (err) => {
    let feedbackMsg = 'Scan run at ' + (new Date()).toLocaleString('en-US');
    if (err) {
      feedbackMsg += ' Error: ' + err;
    }
    return res.render('dev/scanForHands', { feedback: feedbackMsg});
  });
}


//******************** Exports ********************//

exports.get = get;
exports.post = post;