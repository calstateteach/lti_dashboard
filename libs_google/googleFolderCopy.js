/* Module to copy contents of Google Drive folder "MyRICA Study Guides" to
a user's google Drive account.

Requires use of service account with domain-wide authority.
Search query syntax: https://developers.google.com/drive/api/v3/search-files

The async calls pass around a data bag object containing the data context for each async. The object 
has these members:

  targetUser                String specifying the Google account to make the copy for.
  jwt                       Google API authorization object.
  targetFolderName          String specifying unique name for the target folder in the user's Drive.
  targetFolderId            String specifying Google Drive ID for target folder.
  targetFolderWebViewLink   String specifying link to the target folder.
  sourceFolderChildren      Array of objects describing the files being copied from the source folder
                            to the target folder. At the end of the process, a copied file object looks like:

    { kind: 'drive#file',
       id: '1isCTl0SKoTUvh-NOogD2wGtBrZ7BpcOe8J3b00r5TC0',
       name: 'Activity 7.15 - Listening and Speaking MyRICA Study Guide',
       mimeType: 'application/vnd.google-apps.document',
       copyId: '1w8-cciXg5KCoP_v5Aij3wGkwtnEU1etGx8Cpr1Nb0ls',
       CopyWebViewLink: 'https://docs.google.com/document/d/1w8-cciXg5KCoP_v5Aij3wGkwtnEU1etGx8Cpr1Nb0ls/edit?usp=drivesdk'
    }
  
12.10.2019 tps Created.
*/

const async = require('async');
const {google} = require('googleapis');

const SCOPES = [
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/drive'
];

const KEY_FILE = require('../config/' + process.env['GOOGLE_DRIVE_KEY_FILE']);
const DEFAULT_FOLDER_NAME = process.env.GOOGLE_MY_RICA_TARGET_FOLDER_NAME;
const SOURCE_FOLDER_ID = process.env.GOOGLE_MY_RICA_SOURCE_FOLDER_ID;

/******************** Async Waterfall Functions ********************/

function authorize(dataBag, callback) {
  // callback signature: (err, databag)

  // dataBag contains the user account to get us started.
  const targetUser = dataBag.targetUser;

  // Using Service Account authorization
  const jwt = new google.auth.JWT(KEY_FILE.client_email, null, KEY_FILE.private_key, SCOPES, targetUser);

  return jwt.authorize( (err, response) => {
    // log('authorize response:', response);
    // log('authorize err:', err);
    if (err) return callback(err);

    // Pass along a data bag containing contextual data for Google API calls
    dataBag.jwt = jwt;
    return callback(null, dataBag);
  });
}

// Make a target folder name that doesn't already exist in the user's account.
function makeUniqueFolderName(dataBag, callback) {
  // callback signature: (err, dataBag + unique name for folder)

  // Get list of possible folder name collisions
  const jwt = dataBag.jwt;
  const targetUser = dataBag.targetUser;
  const Q = `name contains "${DEFAULT_FOLDER_NAME}" and mimeType = "application/vnd.google-apps.folder" and trashed = false and "${targetUser}" in owners`;
  getFileList(jwt, Q, (err, res) => {
    if (err) return callback(err);

    let targetFolderName = DEFAULT_FOLDER_NAME; // Base folder name on this string
    let copyCount = 0;
    const files = res.data.files;

    // We're looking for a unique folder name
    while (files.find( e => e.name === targetFolderName)) {
      // The candidate folder name already exists, so try again with a new name
      targetFolderName = "Copy " + (++copyCount) + " of " + DEFAULT_FOLDER_NAME;
    }

    // Return the potentially unique folder name
    dataBag.targetFolderName = targetFolderName;
    return callback(null, dataBag);
  });
}

function createTargetFolder(dataBag, callback) {
  // Callback signature: (err, dataBag + folder ID)

  const auth = dataBag.jwt;
  const folderName = dataBag.targetFolderName;
  const targetUser = dataBag.targetUser;
  // log('creating folder', folderName);

  const folderMetadata = {
    'name': folderName,
    'mimeType': 'application/vnd.google-apps.folder'
  };
  const drive = google.drive({version: 'v3', auth});
  drive.files.create({
    resource: folderMetadata,
    fields: 'id, webViewLink'
  }, function (err, file) {
    if (err) return callback(err);
    log('Created folder', '"' + folderName + '"', 'for', targetUser);
    dataBag.targetFolderId = file.data.id;                    // Pass along ID of newly created folder
    dataBag.targetFolderWebViewLink = file.data.webViewLink;  // Pass along link to new folder
    return callback(null, dataBag);
  });
}

function asyncListSourceFolderChildren(dataBag, callback) {
  // callback signature: (err, dataBag + list of contents of source file)
  const auth = dataBag.jwt;

  // We want document types that are children of the source file & haven't been deleted.
  const Q = `"${SOURCE_FOLDER_ID}" in parents and trashed = false and mimeType = "application/vnd.google-apps.document"`;
  getFileList(auth, Q, (err, res) => {
    if (err) return callback(err);
    // dataBag.sourceFolderChildren = res.data.files;
    dataBag.sourceFolderChildren = sortListByName(res.data.files);
    return callback(null, dataBag);
  });
}

function copySourceFolderChildren(dataBag, callback) {
  // callback signature: (err, dataBag + list of copied docs)
  const auth = dataBag.jwt;
  const targetFolderId = dataBag.targetFolderId;
  const sourceDocs = dataBag.sourceFolderChildren;
  const targetUser = dataBag.targetUser;

  // Google API doesn't like it if we try running these in parallel
  async.eachSeries(
    sourceDocs, // collection to iterate over
    function(sourceDoc, cb) {  // iteratee
      log('copy', '"' + sourceDoc.name + '"', 'for', targetUser);

      // Copy files into target folder
      const resource = {
        name: sourceDoc.name,     // Otherwise, Google prefixes name with "Copy of "
        parents: [targetFolderId]
      }

      const drive = google.drive({version: 'v3', auth});
      drive.files.copy({
        fileId: sourceDoc.id,
        resource: resource,
        fields: 'id, webViewLink'
      }, function (err, fileCopy) {
        // log('Copy err:', err);
        // log('Copy result: ', fileCopy);
        if (err) cb(err);
        // Add copy info to the databag
        sourceDoc.copyId = fileCopy.data.id;
        sourceDoc.CopyWebViewLink = fileCopy.data.webViewLink;
        cb(null);
      });


    },
    function(err) { // final callback
      if (err) return callback(err);
      return callback(null, dataBag);
    }
  );
}

function asyncCopyDoc(dataBag, callback) {
  // callback signature: (err, <dataBag + data about new document>)
  const auth                = dataBag.jwt;
  const targetUser          = dataBag.targetUser;
  const sourceDocumentId    = dataBag.sourceDocumentId;
  const targetFolderId      = dataBag.targetFolderId;
  const targetDocumentName  = dataBag.targetDocumentName;

  // Copy document into target folder
  const resource = {
    name: targetDocumentName,     // Otherwise, Google prefixes name with "Copy of "
    parents: [targetFolderId]
  }
  
  const drive = google.drive({version: 'v3', auth});
  drive.files.copy({
    fileId: sourceDocumentId,
    resource: resource,
    fields: 'id, name, webViewLink'
  }, function (err, fileCopy) {
    if (err) return callback(err);

    log('Copied "' + fileCopy.data.name + '" for', targetUser);

    // Add copy info to the databag
    dataBag.docCopy = fileCopy.data
    return callback(null, dataBag);
  });
}


/******************** Async Helper Functions ********************/

function getFileList(auth, query, callback) {
  // callback signature: (err, result)

  const requestParams = {
    pageSize: 100
    // fields: "incompleteSearch, files(kind, name, id, webViewLink)",
    // q: `name = "${folderName}" and trashed = false and "${recipient}" in owners`
  };

  // Use optional query expression
  if (query) {
    requestParams.q = query;
  }

  // // Use optional fields expression
  // if (fields) {
  //   requestParams.fields = fields;
  // }

  const drive = google.drive({version: 'v3', auth});
  drive.files.list(requestParams, (err, res) => {
    if (err) return callback(err);
    return callback(err, res);
  });
}

function sortListByName(list) {
  // Sort array of objects by their name field.
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort

  // temporary array holds objects with position and sort-value
  var mapped = list.map(function(el, i) {
    return { index: i, value: el.name.toLowerCase() };
  });

  // sorting the mapped array containing the reduced values
  mapped.sort(function(a, b) {
    if (a.value > b.value) {
      return 1;
    }
    if (a.value < b.value) {
      return -1;
    }
    return 0;
  });

  // container for the resulting order
  var result = mapped.map(function(el){
    return list[el.index];
  });
  return result;
}

/******************** Helper Functions ********************/

function log() {
  // Create array of arguments to console.log, adding our timestamp to the front
  let applyArguments = [(new Date()).toLocaleString('en-US') + ':'];
  for (let i = 0; i < arguments.length; ++i) {
    applyArguments.push(arguments[i]);
  }
  console.log.apply(null, applyArguments);
}


/******************** Module Exports ********************/

// function makeCopy(targetUser) {
//   // Initiate a folder copy for the target user.

//   // authorize
//   // make folder copy name
//   // make target folder
//   // iterate through source folder contents
//     // Copy source document to child of target folder
//   // Return name of target folder created, list of documents copied

//   const dataBag = { // Data context for async callls
//     targetUser: targetUser
//   };

//   async.waterfall([
//     async.apply(authorize, dataBag),
//     makeUniqueFolderName,
//     asyncListSourceFolderChildren,
//     createTargetFolder,
//     copySourceFolderChildren
//   ],
//     function(err, result) {
//       if (err) {
//         log('Google Drive folder copy err:', err);
//       }
//       // log('data bag', result);
//     }
//   );
//   return dataBag; // Client can use dataBag to track progress of the copy?
// }

function makeTargetFolder(targetUser, callback) {
  // callback signature: (err, <data bag object>)

  // authorize
  // make folder copy name
  // make target folder

  const dataBag = { // Data context for async callls
    targetUser: targetUser
  };

  async.waterfall([
    async.apply(authorize, dataBag),
    makeUniqueFolderName,
    createTargetFolder,
  ],
    callback
  );
}

// function makeFolderCopyName(targetUser) {
//   const dataBag = {}; // Data context for async callls
//   async.waterfall([
//     async.apply(authorize, dataBag),
//     makeUniqueFolderName,
//     createTargetFolder
//   ],
//     function(err, result) {
//       log('waterfall err', err);
//       log('target folder name', result.targetFolderName);
//     }
//   );
// }

function listSourceFolderChildren(targetUser, callback) {
  // Callback signature: (err, <array of Google docs in source folder>)
  const dataBag = { // Data context for async callls
    targetUser: targetUser
  };

  async.waterfall([
    async.apply(authorize, dataBag),
    asyncListSourceFolderChildren,
  ],
  callback
  );
}

function copyDoc(targetUser, sourceDocumentId, targetFolderId, targetDocumentName, callback) {
  // Initiate a folder copy for the target user.

  // Authorize
  // Copy source document to child of target folder
  // Return data about new document copy

  const dataBag = { // Data context for async callls
    targetUser: targetUser,
    sourceDocumentId: sourceDocumentId,
    targetFolderId: targetFolderId,
    targetDocumentName: targetDocumentName
  };

  async.waterfall([
    async.apply(authorize, dataBag),
    asyncCopyDoc
  ],
  callback
  );
}

module.exports.makeTargetFolder = makeTargetFolder;
module.exports.listSourceFolderChildren = listSourceFolderChildren;
module.exports.copyDoc = copyDoc;