/* Module encapsulating caching of Canvas data.
05.16.2018 tps Split out data-specific code to canvasCacheWork.js.
06.06.2018 tps Even if there's no cached data, return a storage object
  to the client so that client doesn't have to test for null values.
  Would clients want to be able to tell that no data was cached, though?
*/

const fs          = require('fs');

const CACHE_DIR = 'canvas_cache/';

var storage = {}; // Module object store for prefetched query results.


//******************** Query Helper Functions ********************//

function loadQuery(queryKey, queryFunction, callback) {
  // callback signature: (err, json)

  queryFunction((err, json) => {
    if (err) return callback(err);

    // Save results in local store.
    storage[queryKey] = { 
      timestamp: new Date(),
      json: json
    } 

    // Save json to file, so that cache survives app restarts
    const filePath = CACHE_DIR + queryKey + '.json';
    fs.writeFile(filePath, JSON.stringify(json, null, 2), 'utf8', (err) => {
      if (err) return callback(err);
      return callback(null, json);
    }); // end writeFile callback
  });
}


function loadCacheFile(queryKey, callback) {

  // callback signature: (err, json)

  // // Try module storage first
  // if (storage[queryKey]) return process.nextTick(callback, null, storage[queryKey].json);

  // Try disk storage
  const filePath = CACHE_DIR + queryKey + '.json';
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) return callback(err);

    // Populate the local storage from the file. 
    let json = {}; 
    try {
      json = JSON.parse(data);
    } catch(parseErr) {
      return callback(parseErr);
    }

    // Retrieve a timestamp for the file data
    fs.stat(filePath, (fileStatErr, stat) => {
      if (err) return callback(fileStatErr);

      // Save file json to local storage
      storage[queryKey] = { 
        timestamp: stat.mtime,
        json: json
      };
      return callback(null, json);
    });
  }); // end readFile callback
}

/**
 * Delete disk cache files.
 * Writes errors to console but doesn't return them. 
 * Callback signature: ()
 * @param {function} callback 
 */
function deleteDiskCache(callback) {

  fs.readdir(CACHE_DIR, (err, files) => {
    if (err) {
      console.log('deleteDiskCache readdir err:', err);
      return callback();
    }

    // We only care about json files
    files = files.filter( s => s.endsWith('.json'));

    // If there are no files to delete, we can return now
    if (files.length <= 0) {
      return callback();
    }

    var iterationCount = 0; // Tells us when to stop iterations
    for (var filename of files) {
      fs.unlink(CACHE_DIR + filename, (err) => {
        if (err) console.log('unlink err', err);

        if (++iterationCount >= files.length) {
          return callback();
        }
      });
    }
  });
};

function loadDiskCache(callback) {
  // callback signature: (err)
  console.log('Loading disk cache');

  fs.readdir(CACHE_DIR, (err, files) => {
    if (err) {
      console.log('loadDiskCache readdir err:', err);
      return callback();
    }

    // Clear out the current storage before filling it again.
    const queryKeys = Object.getOwnPropertyNames(storage);
    for (let key of queryKeys) {
      storage[key] = null;
    }

    // We only care about json files
    // File names look like "courses_199_enrollments.json"
    files = files.filter( s => s.endsWith('.json'));

    // There might not be any files to load
    if (files.length <= 0) {
      return callback();
    }

    var iterationCount = 0; // Tells us when to stop iterations
    for (var filename of files) {

      // Use file's base name without extension as the file data's cache key
      const queryKey = filename.split('.')[0];

      // Since we've just seen that the file exists, we should
      // be able to load its data without a query.
      loadCacheFile(queryKey, (err, json) => {

        if (err) return callback(err);

        // See if we're done with all the files yet.
        if (++iterationCount >= files.length) {
          return callback();
        }      
      });
    }
  });
}

/**
 * Get the timestamp of the oldest file in the cache.
 * Use to figure out if it's time to refresh the cache.
 */
function getOldestTimestamp(callback) {
  // callback signature: (err, Date)

  fs.readdir(CACHE_DIR, (err, files) => {
    if (err) return callback(err);

    // We only care about json files
    // File names look like "courses_199_enrollments.json"
    files = files.filter( s => s.endsWith('.json'));

    // There might not be any files to load. Not sure what the oldest date is in this case.
    var oldest = new Date();
    if (files.length <= 0) return callback(null, oldest);

    var iterationCount = 0; // Tells us when to stop iterations
    var doneCount = files.length;
    for (var filename of files) {

      // Retrieve a timestamp for the file data
      fs.stat(CACHE_DIR + filename, (fileStatErr, stat) => {
        if (err) return callback(fileStatErr);

        // See if this is the oldest timestamp yet
        if (oldest > stat.mtime) oldest = stat.mtime;

        // See if we're done checking all the files
        if (++iterationCount >= doneCount) return callback(null, oldest);
      }); // end callback for file stats
    } // end loop through files
  }); // end callback for file list
}


//******************** Exported Functions ********************//
exports.deleteDiskCache = deleteDiskCache;
exports.loadDiskCache = loadDiskCache;
exports.loadQuery = loadQuery;
exports.get = function(queryKey) { return storage[queryKey] || { timestamp: new Date(), json: [], notInCache: true }; }
exports.getOldestTimestamp = getOldestTimestamp;
