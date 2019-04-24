/* Module that ecapsulates timer to
periodically scan CritiqueIt data for hands raised.
07.26.2018 tps Created.
*/

const scanForHands = require('./scanForHands');

//******************** Constants ********************//
const TIMER_INTERVAL_MS = 1000 * 60 * 10;   // 10 minutes


function runScan() {
  console.log('Scan for hands at', (new Date()).toLocaleString('en-US'));
  scanForHands( (err) => {
    if (err) console.log('scan for hands err:' + err);
  });
}

function start() {
  return setInterval(runScan, TIMER_INTERVAL_MS);
}


//******************** Exports ********************//
exports.start = start;