/* Module containing functions display the mustache templates.
07.27.2018 tps Created.
*/

const fs = require('fs');
const appConfig = require('../../libs/appConfig');

const VIEW = 'dev/mustacheTemplates';

function get(req, res) {
  // Display current config file contents
  const configItem = appConfig.getMustacheTemplatesConfigItem();
  fs.readFile(configItem.filePath, 'utf8', (err, data) => {
    if (err) return res.render('dev/err', { err: err });

    const params = {
      fileData: data,
      configItem: configItem
    }
    return res.render(VIEW, params);
  });
}

function post(req, res) {
  appConfig.loadMustacheTemplates( (err) => {
    if (err) return res.render('dev/err', { err: err });
    
    return get(req, res);
  });
}

exports.get = get;
exports.post = post;
