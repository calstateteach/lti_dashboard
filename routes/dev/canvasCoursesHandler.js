/* Handler for page listing Canvas courses.
07.06.2018 tps Created.
*/

const canvasCache = require('../../libs/canvasCache');

module.exports = function get(req, res) {
  return res.render('dev/canvasCourses', { courses: canvasCache.getCourses() });
}
