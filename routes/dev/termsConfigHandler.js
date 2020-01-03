/* Module containing functions that render terms configuration page.
01.01.2018 tps Created.
01.08.2018 tps Reload CAM data.
05.11.2018 tps Remodel to display and reload term configuation file.
12.17.2019 tps Redo for restored access configuration.
*/

const fs = require('fs');
// const appConfig = require('../../libs/appConfig');
const dashSemesters = require('../../libs/dashSemesters');

const VIEW = 'dev/termsConfig';

function get(req, res) {
  const params = {
    filePath: 'config/dash_terms.json',
    timestamp: dashSemesters.getTimestamp(),
    allConfigs: dashSemesters.getAll(),
  };
  return res.render(VIEW, params);
  
  // const termsConfig = appConfig.getTermsConfigItem();
  
  // // Display current config file contents
  // fs.readFile(termsConfig.filePath, 'utf8', (err, data) => {
  //   if (err) return res.render('dev/err', { err: err });

  //   const params = {
  //     fileData: data,
  //     configItem: termsConfig
  //   }
  //   return res.render(VIEW, params);
  // });
}


function post(req, res) {
  dashSemesters.load( (err) => { 
  // appConfig.loadTerms( (err) => {
    if (err) return res.render('dev/err', { err: err });
    return get(req, res);
  });
}


//******************** Helper Async Functions ********************//


//******************** Exports ********************//

exports.get = get;
exports.post = post;
