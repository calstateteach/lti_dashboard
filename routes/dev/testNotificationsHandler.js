/* Module containing functions that render page for testing dashboard DB.
07.09.2018 tps Created.
*/

function get(req, res) {
  return res.render('dev/testNotifications');
}


//******************** Exports ********************//

module.exports = get;
