/* Express Router for version 0 of rest API.
03.29.2018 tps Created to prototype AJAX call for student's submissions.
04.24.2018 tps Refined endpoint parmaeters.
05.28.2018 tps Try speeding up postAssignmentHandler by querying for assignments by user.
06.12.2018 tps Add endpoint for CAM user search.
07.03.2018 tps Add endpoint for CritiqueIt assignment retrieval.
07.09.2018 tps Add endpoint for dashboard user data retrieval.
07.26.2018 tps Add endpoint to save and test user's SMS phone number.
09.21.2018 tps Add endpoint to update Canvas assignment.
11.05.2018 tps Add endpoint for CritiqueIt assignment retrieval by course.
05.16.2019 tps Add endpoint for Google Doc creation.
*/

const express         = require('express');
const router          = express.Router();
const canvasApi       = require('../../libs/canvasApiTiny');
const canvasQuery     = require('../../libs/canvasQuery');
const canvasCache     = require('../../libs/canvasCache');
const camApi          = require('../../libs/camApi');
const appConfig       = require('../../libs/appConfig');
const critiqueItApi   = require('../../libs/critiqueItApi');
const dashUserHandler = require('./dashUserHandler');

// JSON will be sent to endpoint for observations page.
const bodyParser = require('body-parser');
const jsonParser = bodyParser.json()

/******************** Endpoint Handlers *********************/

/* Handle restful query for submissions for single student.
Returns JSON from live Canvas API call.
*/
function studentSubmissionsHandler(req, res) {
  let sectionId = parseInt(req.params['sectionId'], 10);
  let studentId = parseInt(req.params['studentId'], 10);
  canvasQuery.getStudentSubmissions(sectionId, studentId, (err, json) => {
    if (err) return res.send(err);   // TODO: Better error feedback
    return res.json(json);
  });
}

/**
 * Handle query for a student's CE hours totals.
 * Returns JSON from live CAM API call.
 */
function ceHoursHandler(req, res) {
  const emailAddress = req.params['emailAddress'];

  // Build CAM API query for 1 student.
  const camQuery = req.app.locals.CAM_CE_HOURS_URL.replace('${userEmail}', emailAddress);

  camApi.collectApiResults([camQuery], (err, data) => {
    if (err) return res.json({error: err});   // TODO: Better error feedback

    // Results come back as an array of ararys, but we're
    // only interested in the 1st item the 1st sub-array,
    // which looks like:
    // [ { last_name: 'John',
    // first_name: 'Doe',
    // email: 'abcdefg@ourdomain.org',
    // total_hours: '29',
    // verified_hours: '18' } ]

    // I suppose we could come back with no data
    return res.json((data.length > 0) ? data[0] : []);
  });
}

/**
 * Handle query for quiz submission event.
 * Returns JSON from CAM API call for a quiz submission
 */
function quizEventsHandler(req, res) {
  // Gather the parameters we need
  const courseId = parseInt(req.params['courseId'], 10);
  const quizId = parseInt(req.params['quizId'], 10);
  const submissionId = parseInt(req.params['submissionId'], 10);

  canvasQuery.getQuizSubmissionEvents(courseId, quizId, submissionId, (err, eventsJson) => {
    if (err) return res.json({ err:err });
    return res.json(eventsJson);
  }); // End callback for events query
}


/**
 * Handle query for quiz submission event.
 * Returns JSON from CAM API call for a quiz submission
 */
function quizSubmissionsHandler(req, res) {
  // Gather the parameters we need
  const courseId = parseInt(req.params['courseId'], 10);
  const quizId = parseInt(req.params['quizId'], 10);
  const studentId = parseInt(req.params['studentId'], 10);
  
  canvasQuery.getQuizSubmissionsForStudent(courseId, quizId, studentId, (err, json) => {
    if (err) return res.json({ err:err });
   return res.json(json);
  }); // End callback for submission query
}


/**
 * Handle query CAM user lookup by email address.
 * Returns JSON from CAM API call.
 */
function camUserSearchHandler(req, res) {
  // Gather the parameters we need
  const email = req.params['emailAddress'];
  
  const camUrl = req.app.locals.CAM_USER_SEARCH_URL.replace('${userEmail}', email);
  camApi.collectApiResults([camUrl], (err, results) => {
    if (err) return res.json({ err: err});
    return res.json(results);
  });
}


/**
 * Add an assignment to Canvas. Returns JSON from CAM API call.
 * Handles either Google or CritiqueIt assignments.
 * 
 * 05.28.2018 tps Try using cache with assignments queried by use.
 * We only need a userId to know cached data to query when done
 * 08.24.2018 tps Add more output to diagnose occasional Canvas API errors.
 */
function postAssignmentHandler(req, res) {
  // Gather POST parameters
  const userId         = parseInt(req.body['userId'], 10);
  const courseId       = parseInt(req.body['courseId'], 10);
  const sectionId      = parseInt(req.body['sectionId'], 10);
  const assignmentName = req.body['assignmentName'];
  const addType        = req.body['addType'];

  console.log('POST assignment params:', userId, courseId, sectionId, assignmentName, addType);

  // Create Canvas POST query specific to assignment type we're adding.

  let params;
  if (addType === 'CritiqueIt') {   // CritiqueIt assignment parameters
    params = {
      assignment: {
        name: assignmentName,
        grading_type: 'pass_fail',
        submission_types: ['external_tool'],
        published: true,
        only_visible_to_overrides: true,
        assignment_overrides: [{ course_section_id: sectionId }],
        external_tool_tag_attributes: {
          url: process.env.CST_CRITIQUEIT_LTI_URL,
          new_tab: true
        } // end external_tool_tag_attributes
      } // end assignment
    };  // end postParams      

  } else {   // Google assignment parameters
    // Google assignments need to be pre-populated with an assignment description
    const assignmentDescription = appConfig.getGoogleAssDesc;

    params = {
      assignment: {
        name: assignmentName,
        grading_type: 'pass_fail',
        submission_types: ['online_url'],
        published: true,
        description: assignmentDescription,
        assignment_overrides: [{ course_section_id: sectionId }],
        only_visible_to_overrides: true,
      }
    };
  }

  return canvasApi.post(`courses/${courseId}/assignments`, params, (err, newAssignmentJson) => {
    // 08.23.2018 tps Sometimes the assignment list doesn't contain the newly added assignment?
    // console.log('------------canvas post');
    // console.log(JSON.stringify(newAssignmentJson, null, 2));
    if (err) return res.json({err: err});
    // If add went OK, make sure the new add shows up in the cached list of assignments
    // 05.28.2018 tps We should be able to get away with just refreshing student's iSupervision assignments
    // 08.27.2018 tps Since fall 2018 has so many students, try refreshing the iSupervision courses's assignments instead.
    // canvasCache.loadUserAssignments(userId, courseId, (err, assignmentsJson) => {
    canvasCache.loadCourseAssignments(courseId, (err, assignmentsJson) => {
      // console.log('------------canvas get assignments');
      // console.log(JSON.stringify(assignmentsJson, null, 2));

      if (err) return res.json({err: err});

      // Make sure the query for assignments include the one we just added
      // console.log('POST assignment sees new assignment:', !!assignmentsJson.find( e => e.id === newAssignmentJson.id));
      
      // return res.json(newAssignmentJson);
      return res.json(assignmentsJson);
    });
    // canvasCache.loadCourseAssignments(courseId, (err, assignmentsJson) => {
    //   if (err) return res.json({err: err});
    //   return res.json(newAssignmentJson);
    // });
  });
}


/**
 * Update a Canvas assignment. Returns JSON from Canvas API call.
 * 
 * 09.21.2018 tps First version just updates the assignment's name.
 */
function putAssignmentHandler(req, res) {
  // Gather POST parameters
  const courseId       = parseInt(req.params['courseId'], 10);
  const assignmentId      = parseInt(req.params['assignmentId'], 10);
  const assignmentName = req.body['assignmentName'];

  console.log('PUT assignment params:', courseId, assignmentId, assignmentName);

  // Create Canvas PUT request that updates assignment name
  const params = {
    assignment: {
      name: assignmentName
    }
  };

  return canvasApi.put(`courses/${courseId}/assignments/${assignmentId}`, params, (putErr, newAssignmentJson) => {
    if (putErr) return res.json({err: putErr});
    
    // Make sure the cached list of assignments reflects the assignment update.
    canvasCache.loadCourseAssignments(courseId, (loadErr, assignmentsJson) => {
      if (loadErr) return res.json({err: loadErr});     
      // return res.json(newAssignmentJson);
      return res.json(assignmentsJson);
    }); // end function reload course assignment
  }); // end function update assignment
}


/* Handle restful query for CritiqueIt assignment using a Canvas assignment ID.
Returns JSON from live CritiqueIt API call.
05.39.2019 tps If we get an error, there's nothing we can do, so just return an empty assignment.
*/
function critiqueItAssignmentsHandler(req, res) {
  const assignmentId = parseInt(req.params['assignmentId'], 10);
  critiqueItApi.getAssignmentByCanvasId(assignmentId, (err, json) => {
    // if (err) return res.json({err: err.message});
    if (err) return res.json({});
    return res.json(json);
  });
}


/* Handle restful query for CritiqueIt assignment by course ID.
Returns JSON from live CritiqueIt API call.
*/
function critiqueItCourseAssignmentsHandler(req, res) {
  const courseId = parseInt(req.params['courseId'], 10);
  critiqueItApi.getCourseAssignments(courseId, (err, json) => {
    if (err) return res.json({err: err.message});
    return res.json(json);
  });
}


/******************** Router Middleware *********************/

/**
 * Secure API access by making sure the requester already has
 * an authenticated session.
 */

function secureApi(req, res, next) {
  if (['dev', 'lti'].includes(req.session.userAuthMethod)) {
    next();
  } else {
    res.send('');
  }
}

/******************** Endpoint URLs *********************/
router.use(secureApi);
router.get('/sections/:sectionId/students/:studentId/submissions', studentSubmissionsHandler);
router.get('/cehours/:emailAddress', ceHoursHandler);
router.get('/courses/:courseId/quizzes/:quizId/submissions/:submissionId/events', quizEventsHandler);
router.get('/courses/:courseId/quizzes/:quizId/students/:studentId/submissions', quizSubmissionsHandler);
router.get('/lookup/email/:emailAddress', camUserSearchHandler);
router.get('/critiqueit/assignments/:assignmentId', critiqueItAssignmentsHandler);
router.get('/critiqueit/courses/:courseId/assignments', critiqueItCourseAssignmentsHandler);

router.post('/courses/:courseId/assignments', postAssignmentHandler);
router.put ('/courses/:courseId/assignments/:assignmentId', putAssignmentHandler);

router.get(   '/dashuser/:canvasUserId', dashUserHandler.get);
router.put(   '/dashuser/:canvasUserId', jsonParser, dashUserHandler.put);
router.delete('/dashuser/:canvasUserId', dashUserHandler.del);

const notificationsHandler = require('./notificationHandler');
router.post('/notifications', jsonParser, notificationsHandler.post);
router.get ('/notifications/:sid', notificationsHandler.get);

const smsSaveAndTestHandler = require('./smsSaveAndTestHandler');
router.post('/dashUser/:canvasUserId/smsSaveAndTest', jsonParser, smsSaveAndTestHandler);

const googleDriveHandler = require('./googleDriveHandler');
router.post('/google/drive/doc', googleDriveHandler.post);

exports.router = router;
