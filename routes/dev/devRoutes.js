/* Express Router for development pages.
08.23.2017 tps Created.
11.27.2018 tps Add route for CE Hours DB connection page.
01.08.2017 tps Add routes for term configuration page.
01.11.2017 tps Add routes for Canvas cache page.
02.14.2018 tps coursesConfig page now obsolete.
02.27.2018 tps No longer need connection to CE hours Mongo DB.
03.01.2018 tps Used temporary handler to test module detail page.
05.28.2018 tps Remove obsolete clearCanvasDataHandler
05.28.2018 tps Add route for dev mode setting.
06.11.2018 tps Add route for CST admins configuration.
06.12.2018 tps Add route for CAM user search test page.
06.29.2018 tps Add route for assignment URL test page.
07.01.2018 tps Add route for obsevations pages.
07.06.2018 tps Add route for course list page.
07.06.2018 tps Add route for assignment destinations configuration.
07.18.2018 tps Add route for notifications test page.
07.27.2018 tps Add route for mustache templates configuration.
07.27.2018 tps Add route for scan for hands test.
12.19.2018 tps Add route for teacher candidate lists.
04.06.2019 tps Add route for CST-Admin list.
*/

const express = require('express');
const router = express.Router();
const routeHandlers = require('./devHandlers');
// const coursesConfigHandler = require('./coursesConfigHandler');
// const facultyListHandler = require('./facultyListHandler');
// const clearCanvasDataHandler = require('../../libs/clearCanvasDataHandler');
// const oauthFormHandler = require('./oauthFormHandler');
// const critHandler = require('./critHandler');
const canvasCacheHandler = require('./canvasCacheHandler');
// const getModuleDetail = require('./testModuleDetailHandler').get;
const cachePrimingHandler = require('./cachePrimingHandler');

router.use(require('./secureDevMiddleware'));

router.get('/home', routeHandlers.getHome);
// router.get('/ltiForm', oauthFormHandler.getLtiForm);
// router.post('/ltiForm', oauthFormHandler.postLtiForm);
router.get('/sessionData', routeHandlers.getSessionData);
router.get('/uuids', routeHandlers.getUuids);
router.post('/destroySession', routeHandlers.destroySession);
// router.get('/coursesConfig', coursesConfigHandler.get);
// router.post('/coursesConfig', coursesConfigHandler.put);
// router.get('/facultyList', facultyListHandler);
router.get('/facultyList', require('./facultyListHandler'));
// router.post('/clearCanvasData', clearCanvasDataHandler);
// router.get('/critiqueItStats', critHandler.getStats);
// router.get('/testCeDb', require('./ceDbHandler').getTestCeDb);

router.get('/canvasCache',  canvasCacheHandler.get);
// router.post('/canvasCache',  canvasCacheHandler.post);

router.get('/primeCanvasCache', cachePrimingHandler.get);
router.post('/primeCanvasCache', cachePrimingHandler.post);

const termsConfigHandler = require('./termsConfigHandler');
router.get ('/termsConfig', termsConfigHandler.get);
router.post('/termsConfig', termsConfigHandler.post);

const addsConfigHandler = require('./addsConfigHandler');
router.get ('/addsConfig', addsConfigHandler.get);
router.post('/addsConfig', addsConfigHandler.post);

const googleAssDescHandler = require('./googleAssDescHandler');
router.get ('/googleAssignmentConfig', googleAssDescHandler.get);
router.post('/googleAssignmentConfig', googleAssDescHandler.post);

// Temporary test page for testing refactoring of module detail page
// router.get('/refactor/faculty/:userId/section/:sectionId/module/:moduleId/student/:studentId', getModuleDetail);

const devModeHandler = require('./devModeHandler');
router.get ('/devMode', devModeHandler.get);
router.post('/devMode', devModeHandler.post);

const cstAdminsHandler = require('./cstAdminsHandler');
router.get ('/cstAdminsConfig', cstAdminsHandler.get);
router.post('/cstAdminsConfig', cstAdminsHandler.post);

router.get('/camUserSearch', require('./camUserSearchHandler'));

const assUrlHandler = require('./assignmentRedirectUrlsHandler');
router.get('/assignmentUrls', assUrlHandler.get);

router.get('/obsFacultyList', require('./obsFacultyListHandler'));
router.get('/canvasCourses', require('./canvasCoursesHandler'));

const assDestConfigHandler = require('./assDestConfigHandler');
router.get ('/assignmentDestinationsConfig', assDestConfigHandler.get);
router.post('/assignmentDestinationsConfig', assDestConfigHandler.post);

const testDashUserHandler = require('./testDashUserHandler');
router.get('/testDashUser', testDashUserHandler.get);

router.get('/testNotifications', require('./testNotificationsHandler'));

const messagesHandler = require('./messagesHandler');
router.get('/messagesLog', messagesHandler.get);

const mustacheTemplatesHandler = require('./mustacheTemplatesHandler');
router.get ('/mustacheTemplates', mustacheTemplatesHandler.get);
router.post('/mustacheTemplates', mustacheTemplatesHandler.post);

const scanForHandsHandler = require('./scanForHandsHandler');
router.get ('/scanForHands', scanForHandsHandler.get);
router.post('/scanForHands', scanForHandsHandler.post);

const tcDevPagesHandler = require('./tcDevPagesHandler');
router.get('/tcModulesLinks', tcDevPagesHandler.getModulesLinks);
router.get('/tcObservationsLinks', tcDevPagesHandler.getObservationsLinks);

router.get('/cstAdminList', require('./cstAdminListHandler'));
router.get('/cstAdminLaunch/:canvasUserId', require('./cstAdminLaunchHandler'));

exports.router = router;
