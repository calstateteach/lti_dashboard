/* Handler function to render list of CST-Admins.
04.06.2019 tps created from facultyListHandler.ps.
*/

const appConfig   = require('../../libs/appConfig');
const canvasCache = require('../../libs/canvasCache');

// ******************** Constants ********************//


function get(req, res) {

  // To create the target URLs for CST-Admin dashboard pages,
  // we'll need to look up everybody's Canvas ID.
  const cstAdminList = [];  // Populate with CST-Admin names & IDs for rendering page.
  const cstAdmins = appConfig.getCstAdmins();
  const facultyCam = canvasCache.getFacultyCam();
  for (let i = 0; i < cstAdmins.length; ++i) {
    const cstAdmin = facultyCam.find( e => e.login_id === cstAdmins[i].email);
    if (cstAdmin) {
      cstAdminList.push(cstAdmin);
    }    
  }

  var renderDictionary = {
    cstAdmins: cstAdminList,
    destination: req.query.destination  // Faculty link target, modules or observations
  };
  res.render('dev/cstAdminsList', renderDictionary );
}


// ******************** Export module as a function ********************//
module.exports = get;