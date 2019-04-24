/* Module functions that query CritiqueIt API.
API implemented by Julian Poyourow.
09.01.2017 tps Created.
07.03.2018 tps Add call for retrieving assignment by canvas assignment ID.
03.29.2019 tps Replace tiny-json-http package with request-json package, because
  of obscure compability issue with Canvas API.
*/

// const tiny = require('tiny-json-http');
const requestJson = require('request-json');

// ########### Endpoint constants ###########

// const REQUEST_HEADERS = {
//   'token': process.env.CST_CRITIQUEIT_TOKEN,
//   'Content-Type': 'application/json'
// };

const BASE_URL = process.env.CST_CRITIQUEIT_API_URL;

// ######## Setup for JSON HTTP requests ##########

var jsonRequestClient = requestJson.createClient(BASE_URL);
jsonRequestClient.headers['token'] = process.env.CST_CRITIQUEIT_TOKEN;
jsonRequestClient.headers['Content-Type'] = 'application/json';

// ######## Utility Functions ##########

function get(apiEndpoint, callback) {
  // callback signature: (err, json)
  var endpointUrl = BASE_URL + apiEndpoint; // Full URL, for logging messages

  jsonRequestClient.get(
    apiEndpoint,
    (err, response, body) => {
      if (err) {
        // Mostly likely error is requesting non-existent data
        if (response.statusCode) {
          console.log((new Date()).toLocaleString('en-US') + `: Got ${response.statusCode} "${body}" from ${endpointUrl}`);
        } else {
          console.log((new Date()).toLocaleString('en-US') + ': ' + err.message);
        }
        return callback(body);
      }

      // I don't see a status field in the header.
      console.log((new Date()).toLocaleString('en-US') + `: Got ${response.headers["content-length"]} bytes from ${endpointUrl}`);
      return callback(err, body);
    }); // end callback.
} // end function

// function get(apiEndpoint, callback) {
//   // callback signature: (err, json)
//   var endpointUrl = BASE_URL + apiEndpoint;

//   tiny.get({
//     url: endpointUrl,
//     headers: REQUEST_HEADERS
//   },
//     (err, response) => {
//       if (err) {
//         // Try to give hints about request that failed.
//         err.message += ' from ' + endpointUrl;
//         console.log((new Date()).toLocaleString('en-US') + ': ' + err.message);
//         return callback(err);
//       }

//       // I don't see a status field in the header.
//       console.log((new Date()).toLocaleString('en-US') + `: Got ${response.headers["content-length"]} bytes from ${endpointUrl}`);
//       return callback(err, response.body);
//     }); // end callback.
// } // end function


// ######## Module Exports ##########

exports.getAllAssignments = function(callback) {
  get('assignments', callback);
};

exports.getCourseAssignments = function(courseId, callback) {
  get(`assignments/canvasCourseId/${courseId}`, callback);
};

exports.getStats = function(callback) {
  get('stats', callback);
};

exports.getAssignmentByCanvasId = function(assignmentId, callback) {
  get(`assignments/canvasAssignmentId/${assignmentId}`, callback);
}
