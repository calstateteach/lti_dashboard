/* Route handler for Google Drive API.
05.16.2019 tps Created.
*/

const googleDrive = require('../../libs_google/googleMerge');

function post(req, res) {
  // console.log('in googleDriveHandler');
  // console.log(req.body.docName);
  // console.log(req.body.targetEmail);
  // console.log(req.body.data);

  // Use a test user account during development
  const googleAccount = process.env['GOOGLE_TEST_ACCOUNT'] || req.body.targetEmail;

  googleDrive.mergeDoc(
    googleAccount,
    req.body.candidateName,
    process.env['GOOGLE_TEMPLATE_DOC_ID'],
    process.env['GOOGLE_DRIVE_MERGE_FOLDER'],
    req.body.docName,
    JSON.parse(req.body.data),
    ( err, result) => {
      // if (err) return res.json({ 'err': err});
      if (err) return res.json(err);
      return res.json(result);
      // return res.json({ 'err': err, 'result': result });
    });
  }


/******************** Exports *********************/
module.exports.post = post;
