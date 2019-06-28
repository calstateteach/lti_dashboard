/* Module to create folder in root of a user's Google Drive
Don't create the folder if one of the same name already exists.
Requires use of service account with domain-wide authority.

05.21.2019 tps Created.
05.24.2019 tps Test for duplicate file name before making copy.
05.30.2019 tps Return more stuff in the result object.
05.31.2019 tps Distinguish between Google API unexpected errors & duplicate file name condition.
               Returns { 'errGoogleApi': <Google API err> } for Google API errors.
               Returns { 'errDuplicateName': <string> } for duplicate name condition.
*/

const async = require('async');
const {google} = require('googleapis');
const buildDictionary = require('./mergeDictionary');

const SCOPES = [
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/drive'
];

const KEY_FILE = '../config/' + process.env['GOOGLE_DRIVE_KEY_FILE'];

function mergeDoc(targetUser, candidateName, templateDocId, folderName, docName, data, callback) {
  // Callback signature: (err, result)
  // result object looks like: { docLink: '...', folderName: '...', docName: '...' }

  // Using Service Account authorization
  const key = require(KEY_FILE);
  const jwt = new google.auth.JWT(key.client_email, null, key.private_key, SCOPES, targetUser);


  /******************** Async Steps ********************/

  function authorize(callback) {
    return jwt.authorize( (err, result) => {

      // Object for passing data between async calls.
      let dataBag = {
        auth: jwt,
        authResponse: result,
        targetUser: targetUser,
        candidateName: candidateName,
        templateDocId: templateDocId,
        folderName: folderName,
        docName: docName,
        data: data,
        folderId: null,     // We'll fill this in with async calls
        documentId: null,   // We'll fill this in with async calls
        documentLink: null, // We'll fill this in with async calls
      }

      if (err) {
        // console.log('Google authorization error.');
        // return callback(err, dataBag);
        return callbackWithGoogleApiErr('Google authorization error', err, dataBag, callback);
      } else {
        return callback(null, dataBag);
      }
    });
  }

  function getUploadFolderId(dataBag, callback) {
    // callback signature: (err, dataBag)
    // Identifying upload folder can be tricky if:
    // - there is a trashed folder with the same name
    // - there is a shared folder belonging to another user with the same name
  
    const drive = google.drive({version: 'v3', auth: dataBag.auth });
    drive.files.list({
      pageSize: 10,
      // fields: '*',
      q: `name = '${dataBag.folderName}' and trashed = false and '${dataBag.targetUser}' in owners`
      // q: `name = "${dataBag.folderName}" and trashed = false and "${dataBag.targetUser}" in owners`
    }, (err, res) => {
      if (err) {
        // console.log('Google drive list error.');
        return callbackWithGoogleApiErr('Google Drive list error', err, dataBag, callback);
        // return callback(err, dataBag);
      }
  
      // Create the upload folder if none exists yet.
      if (res.data.files.length < 1) {
        return createFolder(dataBag, callback);
      } else {
        // console.log('folder already exists');
        dataBag.folderId = res.data.files[0].id;
        return callback(null, dataBag);
      }
    });
  }

  function createFolder(dataBag, callback) {
    // Callback signature: (err, dataBag)
  
    var folderMetadata = {
      'name': dataBag.folderName,
      'mimeType': 'application/vnd.google-apps.folder'
    };
    const drive = google.drive({version: 'v3', auth: dataBag.auth });
    drive.files.create({
      resource: folderMetadata,
      fields: 'id'    // We just care about getting the ID of the folder
    }, function (err, file) {
      if (err) {
        // console.log('Google Drive create folder error:');
        return callbackWithGoogleApiErr('Google Drive create folder error', err, dataBag, callback);
        // return callback(err, dataBag);
      }
      logWithTimestamp('created Google Drive folder', dataBag.folderName, 'for', dataBag.targetUser);
      dataBag.folderId = file.data.id;
      return callback(null, dataBag);
    });
  }

  function checkFileExists(dataBag,callback) {
    // Callback signature: (err, dataBag)

    // Return an error if we would have created a file with the same name
    // in the target folder.

    // Create escaped doc name
    // https://developers.google.com/drive/api/v3/reference/query-ref
    const escapedDocName = dataBag.docName.replace(/'/g, "\\'");
    
    const drive = google.drive({version: 'v3', auth: dataBag.auth });
    drive.files.list({
      pageSize: 10,
      // fields: '*',
      q: `name = '${escapedDocName}' and trashed = false and '${dataBag.targetUser}' in owners and '${dataBag.folderId}' in parents`
    }, (err, res) => {
      if (err) {
        // console.log('Google drive list error.');
        return callbackWithGoogleApiErr('Google Drive list error', err, dataBag, callback);
        // return callback(err, dataBag);
      }
  
      // We're in danger of creating 2 files with the same name
      // This is not technically an unexpected exception, but return it as an error object
      if (res.data.files.length > 0) {
        return callback({ 'errDuplicateName': `Google Drive name exists: ${dataBag.docName}` }, dataBag);
      } else {
        // We're less in danger of creating a file with a duplicate name
        return callback(null, dataBag);
      }
    }); // end list callback
  }

  function copyTemplate(dataBag, callback) {
    // Callback signature: (err, dataBag)

    const drive = google.drive({version: 'v3', auth: dataBag.auth });
    const resource = {
      name: dataBag.docName,
      parents: [dataBag.folderId]
    };
    drive.files.copy({
      fileId: dataBag.templateDocId,
      resource: resource,
      fields: 'id, webViewLink' // What we want to know about the copy
    }, function (err, res) {
      if (err) {
        // console.log('Google Drive copy error:');
        return callbackWithGoogleApiErr('Google Drive copy error', err, dataBag, callback);
        // return callback(err, dataBag);
      }

      // Here's our copy of the template document.
      dataBag.documentLink = res.data.webViewLink;
      dataBag.documentId = res.data.id;
      logWithTimestamp('created Google doc', dataBag.documentId);
      return callback(null, dataBag);
    });
  }
  
  function replaceText(dataBag, callback) {
    // Callback signature: (err, dataBag)

    // Build description of replacements.
    // We have to explicitly list all the replacements we do, & the string we're replacing them with.
    const replacementDictionary = buildDictionary(dataBag.data, dataBag.candidateName);
    const replacementTargets = Object.getOwnPropertyNames(replacementDictionary);

    // Build out replacement requests
    let requests = [];
    for (let i = 0; i < replacementTargets.length; ++i) {
      requests.push({
        replaceAllText: {
          containsText: {
            text: '{{' + replacementTargets[i] + '}}',
            matchCase: true,
          },
          replaceText: replacementDictionary[replacementTargets[i]],
        }
      });
    }

    const updateParams = 
    {
      'documentId': dataBag.documentId,
      resource: {
        requests,
      }
    };

    const docs = google.docs({version: 'v1', auth: dataBag.auth });
    docs.documents.batchUpdate(updateParams, function(err, results) {
      // console.log(results);
      if (err) {
        // console.log('Google Doc batch update error.');
        return callbackWithGoogleApiErr('Google Doc batch update error', err, dataBag, callback);
        // return callback(err, dataBag);
      } else {
        return callback(null, dataBag);
      }
    });
  }

  /******************** Helper Functions ********************/

  function callbackWithGoogleApiErr(errDescription, googleApiErr, dataBag, callback) {
    // Google API errors are JSON objects.
    logWithTimestamp(errDescription + ':');
    console.log(JSON.stringify(googleApiErr));
    return callback( { 'errGoogleApi': googleApiErr}, dataBag );
  }

  function logWithTimestamp() {
    // Create array of arguments to console.log, adding our timestamp to the front
    let applyArguments = [(new Date()).toLocaleString('en-US') + ':'];
    for (let i = 0; i < arguments.length; ++i) {
      applyArguments.push(arguments[i]);
    }
    console.log.apply(null, applyArguments);
  }

  /******************** Async Waterfall ********************/
  async.waterfall([
    authorize,
    getUploadFolderId,
    checkFileExists,
    copyTemplate,
    replaceText
  ], function (err, dataBag) {
    // if (err) console.log(JSON.stringify(err));  // Google API errors are JSON objects
    return callback(err, {
      docLink: dataBag.documentLink,
      folderName: dataBag.folderName,
      docName: dataBag.docName
    });
    // return callback(err, dataBag.documentLink);
  });
} // end function mergeDoc

/******************** Module Exports ********************/
exports.mergeDoc = mergeDoc;