/* Handler for rendering assignment destination URLs configuration.
07.06.2018 tps Created.
*/

const fs = require('fs');
const appConfig = require('../../libs/appConfig');

const VIEW = 'dev/assDestConfig';

function get(req, res) {
  const termsConfig = appConfig.getAssUrlCoursesItem();

  // Display current config file contents
  fs.readFile(termsConfig.filePath, 'utf8', (err, data) => {
    if (err) return res.render('dev/err', { err: err });

    const params = {
      fileData: data,
      configItem: termsConfig
    }
    return res.render(VIEW, params);
  });
}


function post(req, res) {
  appConfig.loadAssUrlCourses( (err) => {
    if (err) return res.render('dev/err', { err: err });
    return get(req, res);
  });
}

//******************** Exports ********************//

exports.get = get;
exports.post = post;
