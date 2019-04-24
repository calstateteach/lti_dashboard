/* Setup MongoDb connection.
Expected to be run just once at the beginning of project execution.
07.09.2018 tps Created
04.23.2019 tps Upgrade Mongoose from v4.13.5 to v5.3.3
*/

// const CONNECTION_STRING = "mongodb://localhost/fdb";
const CONNECTION_STRING = process.env.DASH_DB;

var mongoose = require('mongoose');

mongoose.Promise = global.Promise;
  // To get rid of DeprecationWarning warning.

  mongoose.connect(CONNECTION_STRING, { useNewUrlParser: true, useFindAndModify: false });
  // Set useNewUrlParser & useFindAndModify to supress deprecation warning.
  // mongoose.connect(CONNECTION_STRING, { useMongoClient: true });
  // Use Mongo client to circumvent deprecation warning.

// We're ready to start using the DB
db = mongoose.connection;

// Log database events to the console for debugging purposes
db.on('open', function () {  
  console.log("Mongoose open event");
});

db.on('close', function () {  
  console.log("Mongoose close event"); 
});
db.on('connected', function () {  
  console.log("Mongoose connected event");
}); 

db.on('disconnected', function () {  
  console.log("Mongoose disconnected event"); 
});

//Bind connection to error event (to get notification of connection errors)
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

// If the Node process is interrupted, close the Mongoose connection
process.on('SIGINT', function() {
  console.log('Mongoose received SIGINT');
  db.close();
});


/******************** Exports ********************/

// Give clients a way to end the connection.
exports.close = function() { return db.close(); }