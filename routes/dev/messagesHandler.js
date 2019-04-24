/* Module containing functions that render page for messages log.
07.24.2018 tps Created.
*/

const DashMessage = require('../../libs_db/dashMessageModel');


function get(req, res) {
  const filter = {};
  const sort = { sort: {timestamp: -1}};  // Sort by timestamp, descending
  DashMessage.find( filter, null, sort, (err, data) => {
    if (err) return res.render('dev/err', { err: err });

    const templateData = {
      messages: data
    };
    return res.render('dev/messagesLog', templateData);
  });
}


//******************** Exports ********************//

module.exports.get = get;
