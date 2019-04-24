/* Express Router for version 0 of public rest API.
This API provides unsecured access to Canvas assignment data for cross-domain AJAX clients.
06.06.2018 tps Created.
06.11.2018 tps Add endpoint for retrieving assignment description HTML.
06.20.2018 tps Use adapted module items data for navigation,
               to include quizzes that are assignments in the navigation.
08.22.2018 tps Use dashboard module for fall 2018.
08.24.2018 tps Fix next/prev assignment lookup for fall 2018.
*/

const express     = require('express');
const router      = express.Router();
const appConfig   = require('../../libs/appConfig');
const canvasCache = require('../../libs/canvasCache');


/******************** Endpoint Handlers *********************/

/* Handle restful query for an assignment's prev/next assignment.
Returns JSON like:
{
  prev: 1408,
  next: 1410
}

If error, returns:
{ err: "error message goes here" }
*/
function assignmentNavigationHandler(req, res) {
  let courseId = parseInt(req.params['courseId'], 10);
  let assignmentId = parseInt(req.params['assignmentId'], 10);

  // Allow cross origin request so Canvas Web page to call this with AJAX.
  res.set('Access-Control-Allow-Origin', '*');
  // res.set('Access-Control-Allow-Origin', 'https://ourdomain.instructure.com');

  // If no data found for the parameters, that's an error.
  function noDataErr() {
    const err = `No data found for course ${courseId}, assignment ${assignmentId}`;
    return res.json({ err: err});
  }

  // // Use the same set of assignments as the faculty dashboard
  // const terms = appConfig.getTerms();
  // const courseConfig = terms.find( e => e.course_id === courseId);
  // if (!courseConfig) return noDataErr();

  // const modules = canvasCache.getCourseModules(courseId);
  // const modules = canvasCache.getAdaptedCourseModules(courseId)
  const modules = canvasCache.getDashboardModules(courseId); 
  if (!modules) return noDataErr();

  var assignmentIds = [];   // Accumulate ordered list of assignments as used by the dashboard
  for (let module of modules) {
  // for (let moduleIndex of courseConfig.module_indices) {
    // const assignments = modules[moduleIndex].items.filter( e => e.type === 'Assignment');
    // assignmentIds = assignmentIds.concat(assignments.map( e => e.content_id));
    const assignments = module.items.filter( e => e.type === 'Gradeable');
    assignmentIds = assignmentIds.concat(assignments.map( e => e.assignment_id));
  }

  const assignmentIndex = assignmentIds.findIndex( e => e === assignmentId);
  if (assignmentIndex < 0) {
    return noDataErr();
  } else {
    // Calculate prev & next assignments in the list. Navigation is circular.
    const prevId 
      = (assignmentIndex === 0) ? assignmentIds[assignmentIds.length - 1] : assignmentIds[assignmentIndex - 1];
    const nextId
      = (assignmentIndex === (assignmentIds.length - 1)) ? assignmentIds[0] : assignmentIds[assignmentIndex + 1];
  
    const nav = {
      prev: prevId,
      next: nextId
    }
    return res.json(nav);
  }
}


/* Handle restful query for an assignment's description.
Returns text string containing the assignment's description string out of Canvas
or an error message.
*/
function assignmentDescriptionHandler(req, res) {
  let courseId = parseInt(req.params['courseId'], 10);
  let assignmentId = parseInt(req.params['assignmentId'], 10);

  // Allow cross origin request so Canvas Web page to call this with AJAX.
  res.set('Access-Control-Allow-Origin', '*');
  // res.set('Access-Control-Allow-Origin', 'https://ourdomain.instructure.com');

  // If no data found for the parameters, that's an error.
  function noDataErr() {
    const err = `No data found for course ${courseId}, assignment ${assignmentId}`;
    return res.send(err);
  }

  const assignments = canvasCache.getCourseAssignments(courseId);
  const assignment = assignments.find( e => e.id === assignmentId);
  if (!assignment) return noDataErr();

  return res.send(assignment.description);
}


/******************** Router Middleware *********************/


/******************** Endpoint URLs *********************/
router.get('/courses/:courseId/assignments/:assignmentId/nav', assignmentNavigationHandler);
router.get('/courses/:courseId/assignments/:assignmentId/desc', assignmentDescriptionHandler);

exports.router = router;
