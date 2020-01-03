/* Module that encapsulates loading & storing static configuration files for multiple semesters.
The file dash_terms.json lists all the semesters & their individual configuration files.
The configuration is stored as an array of objects, each representing one semester. 
Sample semester object:

{
  year: 2019,
  season: "spring" | "summer" | "fall"
  use_for: "current_term" | "restored_access"
  terms_config : Array of term configuration objects for one semester
}


09.30.2019 tps Created from appConfig.js.
10.21.2019 tps Add function to return current term only.
12.17.2019 tps Fixed callback bug.
12.17.2019 tps Add timestamp when last loaded.
01.02.2019 tps Fix bug in data set returned by getRestoredAccess.
*/

const async = require('async');
const fs = require('fs');


//******************** Module Config Object Store ********************//
var allTerms = [];
var timestamp = null;

//******************** Constants ********************//
// File paths are relative to  config/ folder in application root.
const CONFIG_DIR = "config/"
const DASH_TERMS_CONFIG_FILE = CONFIG_DIR + 'dash_terms.json';

//******************** Load all config items ********************//

function loadAll(callback) {
  // Callback signature: (err, json)
  console.log('Loading term configuration files');

  timestamp = new Date();

  fs.readFile(DASH_TERMS_CONFIG_FILE, 'utf8', (err, data) => {
    if (err) return callback(err);
    allTerms = JSON.parse(data);

    // Read each term configuration file specified in top-level file
    async.eachOfSeries(allTerms, 
      (value, index, cb) => {

        fs.readFile(CONFIG_DIR + value.config_file, 'utf8', (err, data) => {
          if (err) return cb(err);
          try {
            // Include term configuration for the semester
            allTerms[index].terms_config = JSON.parse(data);

            // Include convenience field
            allTerms[index].isCurrentSemester = value.use_for === 'current_term';
            return cb();
          } catch(parseErr) {
            return cb(parseErr);
          }
        });

      }, 
      (err) => {
        return callback(err, allTerms);
      }
    );
  }); // end readFile callback

}
 

//******************** Exports ********************//
exports.load = loadAll;
exports.getAll = function() { return allTerms; };
// exports.getRestoredAccess = function() { return allTerms.filter( e => e.isupe_assignment_style === 'overrides'); };
exports.getRestoredAccess = function() { return allTerms.filter( e => e.use_for === 'restored_access'); };
exports.getCurrentTerms = function() { 
  const currentSemester = allTerms.find( e => e.isCurrentSemester);
  return currentSemester ? currentSemester.terms_config: []; 
};
exports.getTimestamp = function() { return timestamp; };