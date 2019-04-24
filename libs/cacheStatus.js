/* Module containing functions for writing Canvas cache status files.
05.16.2018 tps Created.
08.27.2018 tps Record error messages.
08.30.2018 tps 
*/

const fs = require('fs');

const FILE_PATH = 'canvas_cache/status.txt';
const LOCALE    = 'en-US';


function currentStatus(callback) {
  // Callback signature: (err, statusText)
  fs.readFile(FILE_PATH, 'utf8', (err, data) => {
    // if (err) return callback(err);
    // 08.13.201 tps It's OK if the file doesn't exist yet.
    if (err) return callback(null, err.toString());
    return callback(null, data);
  }); // end readFile callback
}

//******************** Status File Class ********************//
// Class to use for timing of a process.

class StatusRecorder {

  start(callback) {
    // Callback signature: (err)
    this.startTime = new Date();
    const timeString = this.startTime.toLocaleString(LOCALE);
    // const statusText = 'Priming of data cache started at ' + timeString;

    const statusObj = {
      last_run: this.startTime,
      status: 'pending',
      msg: 'Priming of data cache started at ' + timeString
    };

    return writeStatus(statusObj, callback);
    return writeStatus(statusText, callback);
  }

  stop(callback) {
    // Callback signature: (err)
    // const endTime = new Date();
    // const timeString = endTime.toLocaleString(LOCALE);
    // const duration = ((endTime - this.startTime) / 1000).toFixed(2);
    // const statusText = 'Priming of data cache finished at ' + timeString + ' after ' + duration + ' seconds.'
    // return writeStatus(statusText, callback);
    
    const endTime = new Date();
    const timeString = endTime.toLocaleString(LOCALE);
    const duration = ((endTime - this.startTime) / 1000).toFixed(2);

    const statusObj = {
      last_run: this.startTime,
      status: 'primed',
      msg: 'Priming of data cache finished at ' + timeString + ' after ' + duration + ' seconds.'
    };
    return writeStatus(statusObj, callback);
  }

  logError(primingError, callback) {
    // callback signature: (err)
    const endTime = new Date();
    const timeString = endTime.toLocaleString(LOCALE);

    const statusObj = {
      last_run: this.startTime,
      status: 'error',
      msg: 'Priming of data cache encountered error at ' + timeString + '.',
      error: primingError.toString()
    };
    return writeStatus(statusObj, callback);
  }


  // logMessage(s, callback) {
  //   // callback signature: (err)
  //   const endTime = new Date();
  //   const timeString = endTime.toLocaleString(LOCALE);
  //   const duration = ((endTime - this.startTime) / 1000).toFixed(2);
  //   return writeStatus(s, callback);
  // }

}


//******************** Helper Functions ********************//

function writeStatus(statusObj, callback) {
  // Callback signature: (err)
  fs.writeFile(FILE_PATH, JSON.stringify(statusObj, null, 2), 'utf8', (err) => {
    return callback(err);
  });
}
// function writeStatus(statusText, callback) {
//   // Callback signature: (err)
//   fs.writeFile(FILE_PATH, statusText, 'utf8', (err) => {
//     return callback(err);
//   });
// }

//******************** Exported Functions ********************//
exports.writeStatus = writeStatus;
exports.currentStatus = currentStatus;
exports.createStatusRecorder = function() { return new StatusRecorder() };
