/* Route handler for LTI launch request.
08.25.2017 tps Created.
08.31.2017 tps Fixed validation bug caused by reading wrong launch URL from .env.
11.30.2017 tps Select page for user based on their role.
12.29.2017 tps Send faculty user to wait page instead of directly to dashboard. 
02.18.2018 tps Add redirect for a faculty admin user.
05.17.2018 tps Redirect based on validating user in CAM.
05.18.2018 tps Add routing to show post parameters, for debugging.
05.18.2018 tps Add routing logic for students.
05.24.2018 tps Import LTI launch logic for students from old version.
06.11.2018 tps Implement logic for CST Admin user.
07.05.2018 tps Add redirect to observations page.
07.13.2018 tps Add redirect to observations page faculty list.
08.24.2018 tps Fix destination error message.
12.17.2018 tps Refactor lookup of Web user's role, in preparation for adding student dashboard page.
12.13.2019 tps Add destination for My RICA Folder Copy page.
*/

// const async = require('async');
const camApi        = require('../../libs/camApi');
var isValidRequest  = require('../../libs/oauthHelper').validateLtiRequest;
// const canvasCache   = require('../../libs/canvasCache');
const appConfig     = require('../../libs/appConfig');
const util          = require('util');

function launchLti(req, res) {
  // Landing page for an LTI launch request.

  // Get rid of any existing session data for this client.
  req.session.regenerate( (err) => {
    if (err) {
      return res.render('dev/err', { 'err': err } );
    }

    // Not sure what we'll need, so just grab everything in the
    // signed POST request.
    Object.assign(req.session, req.body);

    // Flag the method used to authorize the session user.
    req.session.userAuthMethod = 'lti';
    req.session.fdb_roles = [];

    // Save some stuff to a session for the client if we can validate the request.
    // if (isValidRequest('POST', process.env.CST_CRITIQUEIT_LTI_URL, req.body)) {
    if (isValidRequest('POST', process.env.CST_LTI_LAUNCH_URL, req.body)) {

      // Extract stuff we're interested in from the POST.
      const refererQueryParams = extractQueryParams(req.headers['referer']);
      const refererDestination = refererQueryParams['destination'];
      const refererRoute       = refererQueryParams['route'];
      const emailLogin         = req.body['custom_canvas_user_login_id'];
      const canvasUserId       = parseInt(req.body['custom_canvas_user_id'], 10);

      // Handle routing of secret route parameter
      if (refererRoute) {
        return routeParamHandler(req, res, refererRoute);
      }

      // // Handle routing of destination parameter
      // if (refererDestination) {
      //   return routeDestinationHandler(req, res, refererDestination);
      // }


      if (!emailLogin) return res.render('dev/err', { err: "No email login found in LTI post."});

      // Destination may be the My RICA Folder copy page
      if (refererDestination && (refererDestination === 'mod7filecopy')) {
        return res.redirect('tools/Mod7FileCopy.html');
      }

      // The only valid non-null referrer destination is "observations"
      if (refererDestination && (refererDestination != 'observations')) {
        return res.render('dev/err', { err: `Unable to redirect to unknown destination ${refererDestination}.`});
      }

      // Routing is based on referrer destination & user's dashboard role
      getWebUserRoles(req, emailLogin, (err, webRoles) => {
        if (err) return res.render('dev/err', { err: err}); // Something went wrong with CAM call

        // If we don't come up with any roles for the user, there's nothing we can do
        if (webRoles.length <= 0) {
          return res.render('dev/err', { err: "No CAM role found for " + emailLogin });
        }

        // Save user's roles to their session.
        req.session.fdb_roles = webRoles;

        // Send CST Admins to faculty list pages
        if (webRoles.includes('CST-Admin')) {
          if (refererDestination === 'observations') {
            return res.redirect('dash/cstAdmin?destination=observations');
          } else {
            return res.redirect('dash/cstAdmin?destination=modules');
          }

        // Send faculty to their dashboard pages
        } else if (webRoles.includes('Faculty')) {
          if (refererDestination === 'observations') {
            return res.redirect(`dash/faculty/${req.body.custom_canvas_user_id}/obs`);
          } else {
            return res.redirect(`dash/faculty/${req.body.custom_canvas_user_id}`);
          }

        // Send students to their dashboard pages
        } else if (webRoles.includes('Student') || webRoles.includes('TestStudent')) {
          if (refererDestination === 'observations') {
            return res.redirect(`dash/tc/${canvasUserId}/obs`);
          } else {
            return res.redirect(`dash/tc/${canvasUserId}/mod`);
          }
        
        } else { // Don't know what to do otherwise
          const badRoles = webRoles.join();
          return res.render('dev/err', { err: `No redirect found for user ${emailLogin} with these roles: ${badRoles}` });
        }

      }); // end callback for looking up user roles


      // // 06.11.2018 tps See if user is a CST-Admin
      // const cstAdminUser = appConfig.getCstAdmins().find( e => e.email === emailLogin);
      // if (cstAdminUser) {
      //   req.session.fdb_roles.push('CST-Admin');
      //   // return res.redirect('dev/facultyList');
      // }

      // /********** Start trying to figure out where to redirect request. **********/

      // // 07.13.2018 tps Refactor logic for request redirect.
      // // Send admin user to faculty list for observations pages.
      // if (cstAdminUser && (refererDestination === 'observations')) {
      //   return res.redirect('dev/obsFacultyList');
      
      // // Send faculty user to their observations page
      // } else if (refererDestination === 'observations') {
      //   return res.redirect(`dash/faculty/${req.body.custom_canvas_user_id}/obs`);
      
      // // Trap case of unknown referer destination
      // } else if (refererDestination) {
      //   return res.render('dev/err', { err: `Unable to redirect to unknown destination ${refererDestination}.`});

      // // Send admin user to the faculty list page
      // } else if (cstAdminUser) {
      //   return res.redirect('dev/facultyList');
      // }

      // // We need to differentiate between faculty and student users now.

      // // 05.17.2018 tps Use CAM data to determine user's role.
      // const camUrl = req.app.locals.CAM_USER_SEARCH_URL.replace('${userEmail}', emailLogin);
      // camApi.collectApiResults([camUrl], (err, results) => {

      //   // Error out if we can't look up the user in CAM.
      //   if (err) return res.render('dev/err', { err: err});
      //   if (results.length <= 0) {
      //     return tryTestStudent(req, res, emailLogin);
      //     // return res.render('dev/err', { err: "No user data found for " + emailLogin + " in CAM."});
      //   }

      //   // Redirect user based on their role. Results are in an array of arrays.
      //   const camUser = results[0][0];
      //   const userType = camUser.user_type;
      //   if (userType ==='Faculty') {
      //     // Send user to their faculty dashboard page.
      //     return res.redirect(`dash/faculty/${req.body.custom_canvas_user_id}`);
      //   } else if (userType === 'Student') {
      //     return redirectStudent(req, res, camUser.course);
      //   } else {
      //     return res.render('dev/err', { err: "No redirect found for the CAM user type of " + userType});
      //   }
      // });
    } else {
      return res.redirect('badRequest');
    }
  });
}

//************************* Route Handling Functions *************************

function routeParamHandler(req, res, refererRoute) {
  if (refererRoute === 'showpost') {
    params = {
      originalUrl: req.originalUrl,
      body: req.body,
      reqHeaders: req.headers,
      query: req.query
    };
      return res.render('dev/showpost', params);
    } else {
      return res.send('Unhandled referer route ' + refererRoute);
    }
}

// /**
//  * Send student user to iSupervision course assignments in Canvas
//  */
// function redirectStudent(req, res, code) {
//   // Find CAM course's corresponding iSupervision course
//   const matchingTerms = appConfig.getTerms().filter( e => e.code === code);
//   if (matchingTerms.length > 0) {
//     const courseId = matchingTerms[0].iSupe_course_id;
//     const redirectUrl = `${req.app.locals.CST_CANVAS_BASE_URL}courses/${courseId}/assignments`;
//     return res.redirect(redirectUrl);
//   } else {
//     return res.render('dev/err', { err: 'Did not find iSupervision course for term code: ' + code });
//   }
// }


// /**
//  * Try to discover if a given email login correponds to a test student in CAM.
//  * We have a test student if:
//  * - email address starts with a 'c'.
//  * - email address minus the initial 'c' resolves to a faculty user in CAM.
//  * If so, redirect them to the iSupervision Term 1 course assignments page.
//  */
// function tryTestStudent(req, res, emailLogin) {
//   if (!emailLogin.startsWith('c')) {
//     return res.render('dev/err', { err: "No user data found for " + emailLogin + " in CAM."});
//   }

//   const possibleFacultyEmail = emailLogin.substring(1);
//   const camUrl = req.app.locals.CAM_USER_SEARCH_URL.replace('${userEmail}', possibleFacultyEmail);
//   camApi.collectApiResults([camUrl], (err, results) => {

//     // Error out if we can't look up the user in CAM.
//     if (err) return res.render('dev/err', { err: err});
//     if (results.length < 1) {
//       return res.render('dev/err', { err: "Failed to identify " + emailLogin + " as a test student." });
//     }

//     // See if we found a corresponding faculty user. Results are in an array of arrays.
//     const camUser = results[0][0];
//     const userType = camUser.user_type;
//     if (userType ==='Faculty') {
//       // Send user to iSupervision Term 1 course assignments.
//       return res.redirect("https://ourdomain.instructure.com/courses/206/assignments");
//     } else {
//       return res.render('dev/err', { err: "Failed to identify " + emailLogin + " as a test student." });
//     }
//   });
// }

// /**
//  * Redirect user based on destination query parameter.
//  */
// function routeDestinationHandler(req, res, destination) {
//   if (destination === 'observations') {
//     return res.redirect(`dash/faculty/${req.body.custom_canvas_user_id}/obs`);
//   } else {
//     return res.render('dev/err', { err: `Unable to redirect to unknown destination ${destination}.`});
//   }
// }


//************************* Helper Functions *************************

/**
 * Simple-minded function to extract query parameters at the
 * end of a referer URL into properties of an object.
 * 06.19.2018 tps Handle case of url not having a query string portion.
 **/
function extractQueryParams(url) {
  var retObj = {};
  if (!url) return retObj; // I got nuthin'
  const urlSplit = url.split('?');
  if (urlSplit.length < 2) return retObj;
  // var queryString = url.split('?')[1];
  var queryString = urlSplit[1];
  var queryPairs = queryString.split('&');
  for (pair of queryPairs) {
    var param = pair.split('=');
    retObj[param[0]] = param[1];
  }
  return retObj;
}


/**
 * Determine Web user's roles based on email login. The roles are identified
 * by strings & can be:
 * 
 * "CST-Admin" - Email is in config/cst_admins.csv list.
 * CAM role - Derived by looking up login in CAM. Expected to be "Faculty" or "Student"
 * "TestStudent" - We have a test student if:
 *    - email address is not in CAM
 *    - email address starts with a 'c'.
 *    - email address minus the initial 'c' resolves to a faculty user in CAM.
 * 
 * Function Parameters:
 * req - Express request object. required for access to app locals.
 * emailLogin - (string) Login of interest.
 * Callback signature: (err, <Array of role strings>)
 */

 async function getWebUserRoles(req, emailLogin, callback) {
  let userRoles = [];  // Populate with role strings

  // Is user a CST-ADMIN?
  const cstAdminUser = appConfig.getCstAdmins().find( e => e.email === emailLogin);
  if (cstAdminUser) {
    userRoles.push('CST-Admin');
  }

  try { // Error handling for CAM API call
    // Lookup user's CAM role
    let camRole = await lookupCamRole(req, emailLogin);
    if (camRole != null) { // If user is in CAM, use their CAM role
      userRoles.push(camRole);

    } else if (emailLogin.startsWith('c')) { // Is user a test student?
      const possibleFacultyEmail = emailLogin.substring(1);
      camRole = await lookupCamRole(req, possibleFacultyEmail);
      if (camRole ==='Faculty') {
        userRoles.push('TestStudent');
      }
    } // end else if possible test student
  } catch (err) {
    return callback(err);   // CAM API threw an error
  }
  return callback(null, userRoles);
}

/**
 * Helper function to get user's CAM role.
 * req - Express request object. Required to get access to app locals.
 * emailLogin - (string) email login
 * callback signature: (err, string)
 */

const lookupCamRole = util.promisify( (req, emailLogin, callback) => {
  const camUrl = req.app.locals.CAM_USER_SEARCH_URL.replace('${userEmail}', emailLogin);
  camApi.collectApiResults([camUrl], (err, results) => {

    // Error out if we can't look up the user in CAM.
    if (err) return callback(err);

    // Return null if we can't find the user in CAM
    if (results.length <= 0) return callback(null, null);

    // Return the user's CAM role. CAM results are in an array of arrays.
    const camUser = results[0][0];
    return callback(null, camUser.user_type);
  });
});

//************************* Module Exports *************************
module.exports = launchLti;
