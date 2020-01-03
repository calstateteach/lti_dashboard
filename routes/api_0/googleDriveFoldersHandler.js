/* Route handler for Google Drive API.
12.06.2019 tps Created.
12.10.2019 tps Added handlers for copying MyRICA folder.
*/

const folderCopy = require('../../libs_google/googleFolderCopy');

function postMod7TargetFolder(req, res) {
  // Make target folder on behalf of the session user.
  // Use test user if we can't find a session user.
  const targetUser = getTargetUser(req);
  folderCopy.makeTargetFolder(targetUser, (err, data) => {
    if (err) {
      return res.json({err:err});
    }
    // Return target folder data of interest to client
    const json = {
      targetFolderName:         data.targetFolderName,
      targetFolderId:           data.targetFolderId,
      targetFolderWebViewLink:  data.targetFolderWebViewLink
    };
    return res.json(json);
  });
}

function getMod7SourceDocs(req, res) {
  // Return list of docs in the source folder
  const targetUser = getTargetUser(req);
  folderCopy.listSourceFolderChildren(targetUser, (err, data) => {
    if (err) {
      return res.json({err:err});
    }
    // Client just cares about the list of docs in the source folder
    return res.json(data.sourceFolderChildren);
  });
}

function postMod7DocCopy(req, res) {
  // Copy doc into a folder.

  const targetUser          = getTargetUser(req);
  const sourceDocumentId    = req.body.sourceDocumentId;
  const targetDocumentName  = req.body.targetDocumentName;
  const targetFolderId      = req.body.targetFolderId;

  folderCopy.copyDoc(targetUser, sourceDocumentId, targetFolderId, targetDocumentName, (err, data) => {
    if (err) {
      return res.json({err:err});
    }
    // Client just cares about the newly copied doc
    return res.json(data.docCopy);
  });

}

/******************** Helper Functions *********************/

function getTargetUser(req) {
  // Do file operations in this user's Google Drive account
  return req.session.custom_canvas_user_login_id || process.env.GOOGLE_TEST_ACCOUNT;
}

/******************** Exports *********************/
module.exports.postMod7TargetFolder = postMod7TargetFolder;
module.exports.getMod7SourceDocs = getMod7SourceDocs;
module.exports.postMod7DocCopy = postMod7DocCopy;