/* Handler for dashboard user API endpoints.
07.09.2018 tps Created to prototype AJAX calls for observations page.
*/

const DashUser = require('../../libs_db/dashUserModel');


/******************** Endpoint Handlers *********************/

/* Handle restful query for submissions for dashboard user.
endpoint looks like: dashuser/{canvasUserId}
Returns JSON document for user from dashUser DB.
*/
function get(req, res) {
  let canvasUserId = parseInt(req.params['canvasUserId'], 10);
  const query = { canvasUserId: canvasUserId };
  DashUser.findOne(query, (err, doc) => {
    if (err) return res.json({err: err.message});
    return res.json(doc);
  });
}

/**
 * Handle restful PUT to update state of dash user document.
 */

function put(req, res) {
  // console.log ('put', req.body);
  let canvasUserId = parseInt(req.params['canvasUserId'], 10);
  const query = { canvasUserId: canvasUserId };
  DashUser.findOneAndUpdate(
    query,
    req.body,
    { new: true, upsert: true}, // Insert doc if it doesn't exist
    (err, doc) => {
      if (err) return res.json({err: err.message});
      return res.json(doc);
      }
  );
}

/**
 * Handle restful DELETE to remove a dash user document.
 */
function del(req, res) {
  let canvasUserId = parseInt(req.params['canvasUserId'], 10);
  const query = { canvasUserId: canvasUserId };
  DashUser.findOneAndRemove(
    query,
    (err, doc) => {
      if (err) return res.json({err: err.message});
      return res.json(doc);
      }
  );
}


/******************** Exports *********************/
exports.get = get;
exports.put = put;
exports.del = del;
