/* Module functions that query Canvas API endpoints.
07.23.2017 tps Created.
07.25.2017 tps Use Request module.
08.01.2017 tps Try with tiny-json-http npm module instead of request.
08.02.2017 tps tiny-json-http doesn't handle array parameters unless you have
  parameter name like 'type[]'.
08.08.2017 tps Use environment variables as source for configuration items.
08.26.2017 tps Give better hints when Canvas returns an error.
12.07.2017 tps For debugging, log duration of Canvas API calls.
05.24.2018 tps Rewrote post to better reporting and error message.
05.24.2018 tps Construct Canvas base URL off of just base part with no path.
08.09.2018 tps Add timestamps for debugging.
09.21.2018 tps Add Canvas PUT request.
03.28.2019 tps Replace tiny-json-http package with request-json package, because
  more secure version of tiny-json-http has an obscure incompability issue with the
  Canvas API.
*/

// const tiny = require('tiny-json-http');
const linkHeaderParser = require('parse-link-header');
const requestJson = require('request-json');
const queryString = require('querystring');

// ########### Endpoint constants ###########

const REQUEST_HEADERS = {'Authorization':`Bearer ${process.env.CST_CANVAS_ACCESS_TOKEN}`};
// var BASE_URL = process.env[process.env.CST_CANVAS_BASE_URL] + 'api/v1/';
const API_VERSION = 'api/v1/';
const BASE_URL = process.env[process.env.CST_CANVAS_BASE_URL] + API_VERSION;

// Number of results to return per request.
const RESULTS_PER_PAGE = 1000;

// ######## Setup for JSON HTTP requests ##########
var jsonRequestClient = requestJson.createClient(process.env[process.env.CST_CANVAS_BASE_URL]);
jsonRequestClient.headers['Authorization'] = `Bearer ${process.env.CST_CANVAS_ACCESS_TOKEN}`;

// ######## Utility Functions ##########

function pagedCanvasQuery(endpointUrl, jsonList, resultCallback) {
  // Try recursion to create a series of paged calls.
  // console.log('GET ', endpointUrl, params);
  // console.log('GET', endpointUrl);

  // Time the call
  const startTime = new Date();

  // endpointUrl is a full URL, but we need to pull out just the path & query string
  // in order to use the request-json library.
  const endpointPath = endpointUrl.slice(endpointUrl.indexOf('/', 8));

  jsonRequestClient.get(
    endpointPath,
    (err, response, body) => {
      const callDuration = (new Date() - startTime) / 1000;

      // Pass errors to callback
      if (err) {
        // Try to give hints about the call that failed.
        var errString = `Got "${err}" from ${endpointUrl} after ${callDuration.toFixed(2)} seconds.`;
        console.log((new Date()).toLocaleString('en-US') + ': ' + errString);
        return resultCallback(errString);
      }

      // console.log(response.headers['x-request-cost'], response.headers['x-rate-limit-remaining']); // Display API costs

      // console.log(`Got status "${response.headers.status}" from ${endpointUrl}`);
      // console.log(`${callDuration.toFixed(2)} Got status "${response.headers.status}" from ${endpointUrl}`);
      console.log((new Date()).toLocaleString('en-US') + `: ${callDuration.toFixed(2)} Got status "${response.statusCode}" from ${endpointUrl}`);

      // The response might be a list of JSON dictionaries or it may be a single
      // JSON dictionary. If we have a list, we want to concatenate it to the
      // result list. If we have a single JSON dictionary, we want to append it
      //to the result list.
      // Return this list filled with JSON from Canvas API call.
      var jsonResp = body;
      if (Array.isArray(jsonResp)) {
        jsonList = jsonList.concat(jsonResp);
      } else {
        jsonList.push(jsonResp);
      }

      // Results are paged, so keep querying until we've got all the data.
      var linkHeader = linkHeaderParser(response.headers['link']);
      // console.log(linkHeader);
      if (linkHeader && linkHeader['next']) {
        let nextUrl = linkHeader['next']['url'];
        pagedCanvasQuery(nextUrl, jsonList, resultCallback);
      } else {
        return resultCallback(null, jsonList);
      }
    }); // end request() callback.


    // tiny.get({
  //   url: endpointUrl,
  //   data: params,
  //   headers: REQUEST_HEADERS
  // },
  //   (err, response) => {
  //     const callDuration = (new Date() - startTime) / 1000;

  //     // Pass errors to callback
  //     if (err) {
  //       // Try to give hints about the call that failed.
  //       var errString = `Got "${err}" from ${endpointUrl} after ${callDuration.toFixed(2)} seconds.`;
  //       console.log((new Date()).toLocaleString('en-US') + ': ' + errString);
  //       return resultCallback(errString);
  //     }

  //     // console.log(response.headers['x-request-cost'], response.headers['x-rate-limit-remaining']); // Display API costs

  //     // console.log(`Got status "${response.headers.status}" from ${endpointUrl}`);
  //     // console.log(`${callDuration.toFixed(2)} Got status "${response.headers.status}" from ${endpointUrl}`);
  //     console.log((new Date()).toLocaleString('en-US') + `: ${callDuration.toFixed(2)} Got status "${response.headers.status}" from ${endpointUrl}`);
  //     // console.log(body);
  //     var jsonResp = response.body;

  //     // The response might be a list of JSON dictionaries or it may be a single
  //     // JSON dictionary. If we have a list, we want to concatenate it to the
  //     // result list. If we have a single JSON dictionary, we want to append it
  //     //to the result list.
  //     // Return this list filled with JSON from Canvas API call.
  //     if (Array.isArray(jsonResp)) {
  //       jsonList = jsonList.concat(jsonResp);
  //     } else {
  //       jsonList.push(jsonResp);
  //     }

  //     // Results are paged, so keep querying until we've got all the data.
  //     var linkHeader = linkHeaderParser(response.headers['link']);
  //     // console.log(linkHeader);
  //     if (linkHeader && linkHeader['next']) {
  //       let nextUrl = linkHeader['next']['url'];
  //       pagedCanvasQuery(nextUrl, params, jsonList, resultCallback);
  //     } else {
  //       return resultCallback(null, jsonList);
  //     }
  //   }); // end request() callback.
} // end defining pagedCanvasQuery()


// ######## Module Exports ##########

exports.useLiveData = () => {
  BASE_URL = BASE_URL_LIVE;
  return exports;
}

exports.get = (endpoint, queryParams, resultCallback) => {
  /* Async call to populate list with JSON objects from Canvas API query.
  */
  // Build full endpoint URL
  let endpointUrl = BASE_URL + endpoint

  // Specify number of results to return in each request.
  // Client may override the default.
  let queryParamsCopy = { per_page: RESULTS_PER_PAGE };
  queryParamsCopy = Object.assign(queryParamsCopy, queryParams);

  // Add query string to the GET
  endpointUrl = endpointUrl + '?' + queryString.stringify(queryParamsCopy);

  pagedCanvasQuery(endpointUrl, [], resultCallback);
};  // end get function definition.


exports.post = (endpoint, postParams, callback) => {
  const endpointUrl = BASE_URL + endpoint;    // Build full URL for logging

  // Time the call
  const startTime = new Date();

  jsonRequestClient.post(
    API_VERSION + endpoint, 
    postParams,
    (err, response, body) => {
      const callDuration = (new Date() - startTime) / 1000;

      if (err) {
        console.log((new Date()).toLocaleString('en-US') + ': ' + `Got "${err}" from POST to ${endpointUrl} after ${callDuration.toFixed(2)} seconds.`);
        return callback(err);
      }
      console.log((new Date()).toLocaleString('en-US') + ': ' + `${callDuration.toFixed(2)} Got status "${response.statusCode}" from POST to ${endpointUrl}`);
      return callback(null, body);
      // Return error to callback with hints about what happened.
      // var statusMsg = `Got status "${response.headers.status}" from ${endpoint}`;
      // var statusMsg = `Got error from ${endpoint}: ${err}`;
      // console.log(statusMsg);
      // resultCallback((err ? statusMsg : err), response.body);
    }); // end request callback.

};  // end post function definition.

// exports.post = (endpoint, postParams, callback) => {
//   let endpointUrl = BASE_URL + endpoint;    // Build full endpoint URL

//   // Time the call
//   const startTime = new Date();

//   tiny.post({
//     url: endpointUrl, 
//     data: postParams,
//     headers: REQUEST_HEADERS
//   },
//     (err, response) => {
//       const callDuration = (new Date() - startTime) / 1000;

//       if (err) {
//         console.log((new Date()).toLocaleString('en-US') + ': ' + `Got "${err}" from POST to ${endpointUrl} after ${callDuration.toFixed(2)} seconds.`);
//         return callback(err);
//       }
//       console.log((new Date()).toLocaleString('en-US') + ': ' + `${callDuration.toFixed(2)} Got status "${response.headers.status}" from POST to ${endpointUrl}`);
//       return callback(null, response.body);
//       // Return error to callback with hints about what happened.
//       // var statusMsg = `Got status "${response.headers.status}" from ${endpoint}`;
//       // var statusMsg = `Got error from ${endpoint}: ${err}`;
//       // console.log(statusMsg);
//       // resultCallback((err ? statusMsg : err), response.body);
//     }); // end request callback.

// };  // end post function definition.


exports.put = (endpoint, postParams, callback) => {
  let endpointUrl = BASE_URL + endpoint;    // Build full URL for logging

  // Time the call
  const startTime = new Date();

  jsonRequestClient.put(
    API_VERSION + endpoint, 
    postParams,
    (err, response, body) => {
      const callDuration = (new Date() - startTime) / 1000;

      if (err) {
        console.log((new Date()).toLocaleString('en-US') + ': ' + `Got "${err}" from PUT to ${endpointUrl} after ${callDuration.toFixed(2)} seconds.`);
        return callback(err);
      }
      console.log((new Date()).toLocaleString('en-US') + ': ' + `${callDuration.toFixed(2)} Got status "${response.statusCode}" from PUT to ${endpointUrl}`);
      return callback(null, body);
    }); // end request callback.
};  // end post function definition.

// exports.put = (endpoint, postParams, callback) => {
//   let endpointUrl = BASE_URL + endpoint;    // Build full endpoint URL

//   // Time the call
//   const startTime = new Date();

//   tiny.put({
//     url: endpointUrl, 
//     data: postParams,
//     headers: REQUEST_HEADERS
//   },
//     (err, response) => {
//       const callDuration = (new Date() - startTime) / 1000;

//       if (err) {
//         console.log((new Date()).toLocaleString('en-US') + ': ' + `Got "${err}" from PUT to ${endpointUrl} after ${callDuration.toFixed(2)} seconds.`);
//         return callback(err);
//       }
//       console.log((new Date()).toLocaleString('en-US') + ': ' + `${callDuration.toFixed(2)} Got status "${response.headers.status}" from PUT to ${endpointUrl}`);
//       return callback(null, response.body);
//     }); // end request callback.
// };  // end post function definition.
