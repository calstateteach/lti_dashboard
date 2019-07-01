/* Router for faculty dashboard path.
05.23.2018 tps Refactored for AJAX version.
07.01.2018 tps Add route for observations page.
08.15.2018 tps Change route for module detail page.
12.19.2018 tps Add routes for teacher candidate pages.
04.06.2019 tps Add route for CST-Admin dashboard page.
*/

const express = require('express');
const router = express.Router();

// ******************** Routing Functions ********************//

router.use(require('./secureDashMiddleware'));
router.get('/faculty/:userId', require('./dashHandler'));
router.get('/faculty/:userId/course/:courseId/section/:sectionId/dashmodule/:moduleId/student/:studentId', require('./moduleSubmissionsHandler'));
router.get('/faculty/:userId/obs', require('./obsHandler'));

// Routes for teacher candidate pages
router.get('/tc/:userId/mod', require('./tcModulesHandler'));
router.get('/tc/:userId/mod/course/:courseId/section/:sectionId/dashmodule/:moduleId', require('./tcModuleSubmissionsHandler'));
router.get('/tc/:userId/obs', require('./tcObsHandler'));

// Route for CST-Admin page
router.get('/cstAdmin', require('./cstAdminDashHandler'));

exports.router = router;
