/* Handler for developer page that lists restored access students retrieved from CAM.
10.11.2019 tps Created.
*/

const canvasCache   = require('../../libs/canvasCache');
const dashSemesters = require('../../libs/dashSemesters');

const {promisify} = require('util');  // A reason to upgrade to node 12
const camApi = require('../../libs/camApi');
const getCamDataPromise = promisify(camApi.collectApiResults);

const RESTORED_ACCESS_CAM_API = process.env.CAM_RESTORED_ACCESS;

module.exports = async function get(req, res) {

  // Build structure containing restored access students retrieved from CAM,
  // grouped by semester.
  let data = dashSemesters.getRestoredAccess().map( e => {
     return { 'year': e.year, 'season': e.season }; 
  });

  // Build CAM queries for all the restored access semesters.
  let camQueries = [];
  for (let i = 0; i < data.length; ++i) {
      
    // Build semester-specific CAM API query
    const semester = data[i];
    let camUrl = RESTORED_ACCESS_CAM_API.replace('${term}', semester.season);
    camUrl = camUrl.replace('${year}', semester.year);
    camQueries.push(camUrl);
  }

  // Query for restored access students from CAM
  const timestamp = (new Date()).toLocaleString('en-US');
  const camData = await getCamDataPromise(camQueries);

  // Collate results for page template
  const courses = canvasCache.getCourses();
  for (let i = 0; i < data.length; ++i) {
    data[i].students = camData[i];

    // Include course name
    for (let student of data[i].students) {
      const courseId = parseInt(student.course_id, 10);
      const course = courses.find( e => e.id === courseId);
      student.course_name = course ? course.name : '';
    }
  }

  return res.render('dev/restoredAccessStudents', { data: data, timestamp: timestamp });
}
