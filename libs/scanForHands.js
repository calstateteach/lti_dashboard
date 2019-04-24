/* Function that scans CritiqueIt data for hand raised events.
Processes notififications to faculty members.
07.25.2018 tps Created.
07.27.2018 tps Use mustache template to generate text message body.
07.30.2018 tps Include entire assigment object as data parameter to mustache templates.
08.22.2018 tps Redo for fall 2018.
09.06.2018 tps Don't let errors encountered for 1 course stop processing of other courses.
09.12.2018 tps Bug fix. Script not finding students needing notifactions.
*/

const async = require('async');
const fs = require('fs');
const mustache = require('mustache');

const canvasCache = require('./canvasCache');
const appConfig   = require('./appConfig');
// const dbConnection = require('../libs_db/mongoDbSetup');
const twilioHelper = require('./twilioHelper');
const DashUser = require('../libs_db/dashUserModel');
const DashMessage = require('../libs_db/dashMessageModel');

/******************** Constants ********************/

// Folder for storing last snapshot CritiqueIt data as JSON files.
const CRITIQUEIT_CACHE_DIR = 'critiqueit_cache/';


/******************** Main Function ********************/

function scanForRaisedHands(callback) {
  // Callback signature: (err)


  const critiqueItApi = require('../libs/critiqueItApi');
  const terms = appConfig.getTerms();  

  // Derive a distinct collection of iSupervision course IDs
  // let iSupeIds = new Set(terms.map( e => e.iSupe_course_id));
  const iSupeIds = canvasCache.getISupeCourses().map( e => e.id);


  /**
   * Async iteratee function executed for each iSupervision course.
   */
  function courseIteratee(courseId, callback) {

    /******************** Async Waterfall Steps for Hand Raised Changes ********************/

    // Load previous snapshot of CritiqueIt assignment data for the course.
    function loadSnapshot(callback) {
      // console.log('Read previously downloaded CritiqueIt data for course', courseId);

      const filePath = CRITIQUEIT_CACHE_DIR + 'courses_' + courseId + '_crit_assignments.json';
      
      var dataBag = { // Collection of data to pass through all the async steps
        prevData: null,
        courseId: courseId,
        filePath: filePath
      };

      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
          // It's OK if we can't read the snapshot file, since it might
          // not have been created yet if this is our first time through.
          return callback(null, dataBag);
        } else {
          try {
            dataBag.prevData = JSON.parse(data);
            return callback(null, dataBag);
          } catch(parseErr) {
            // Can't recover from this
            return callback('Error parsing jSON in ' + filePath + ': ' + parseErr);
          }
        }
      }); // end readFile callback
    }

    // Retrieve current CritiqueIt assignment data from CritiqueIt API.
    // Send notifications to faculty members if necessary.
    function getCritiqueItAssignments(dataBag, callback) {

      critiqueItApi.getCourseAssignments(dataBag.courseId, (err, json) => {
        if (err) {  // There's nothing we can do if CritiqueIt API call fails.
          return callback(err);
        } else {
          // console.log(`Records retrieved from CritiqueIt for course ${dataBag.courseId}: ${json.length}`);

          // Pass CritiqueIt data to next step.
          dataBag.newJson = json;
          return callback(null, dataBag);

        } // end if API call was OK.
      }); // end API callback
    } // end function

    
    // Generate notifications for assignments whose hand raised status has changed.
    function findNewRaisedHands(dataBag, callback) {
      // Populate with Canvas IDs of assignments that have new hand raised status.
      let handRaisedAssignmentIds = [];

      // We need previous data in order to see if a hand was raised.
      if (dataBag.prevData) {
        const handsRaised = dataBag.newJson.filter( e => e.handRaised);
        // console.log(`Hands raised for course ${dataBag.courseId}: ${handsRaised.length}`);

        // See if the hand was raised since last snapshot
        for (let assignment of handsRaised) {
          const previousAssignmentData = dataBag.prevData.find( e => e.canvasAssignmentId === assignment.canvasAssignmentId);
          if (previousAssignmentData && !previousAssignmentData.handRaised) {
            // console.log("***** hand raised for assignment", assignment.canvasAssignmentId);
            handRaisedAssignmentIds.push(parseInt(assignment.canvasAssignmentId, 10));
          } else if (!previousAssignmentData) {
            // console.log("***** hand raised for new assignment", assignment.canvasAssignmentId);
            handRaisedAssignmentIds.push(parseInt(assignment.canvasAssignmentId, 10));
          }
        } // end loop through hands raised
      } // end if there is a previous data set

      // Pass newly parsed data to the next step
      dataBag.handRaisedAssignmentIds = handRaisedAssignmentIds;
      return process.nextTick(callback, null, dataBag);
    }


    function processNewRaisedHands(dataBag, callback) {
      const notifyTargets = lookupAssignmentPeople(dataBag.courseId, dataBag.handRaisedAssignmentIds);
      // for (let target of notifyTargets) {
      //   console.log(
      //     target.facultyName,
      //     target.facultyId,
      //     target.studentName,
      //     target.studentId,
      //     target.assignmentId);

      //     // async steps:
      //     // Lookup faculty phone number
      //     // Send SMS to faculty phone number
      //     // Record SMS sent         
      // }

      // Log notification targets
      for (let target of notifyTargets) {
        console.log('Hand raised in course', dataBag.courseId, 'assignment', target.assignmentId, 'for faculty',target.facultyId, 'by student', target.studentId);
      }

      // async.eachSeries(notifyTargets, notifyIteratee, (err) => {
      async.each(notifyTargets, notifyIteratee, (err) => {  // Order doesn't matter?
        // console.log('notify iteratee err', err);        
        if (err) return callback(err);

        // console.log('done processing hands raised for course', dataBag.courseId);
        return callback(null, dataBag);
      });
    }


    // Save current CritiqueIt data as new snapshot
    function saveSnapshot(dataBag, callback) {
      // Save json to file, so we can see how the state changed later.
      // console.log('write file', dataBag.filePath);
      fs.writeFile(dataBag.filePath, JSON.stringify(dataBag.newJson, null, 2), 'utf8', (err) => {
        if (err) return callback(err);
        return callback(null, dataBag);
      });
    }


    /******************** Execute the Main Waterfall ********************/

    async.waterfall([
      loadSnapshot,
      getCritiqueItAssignments,
      findNewRaisedHands,
      processNewRaisedHands,
      saveSnapshot
    ], (err, result) => {
      // Log errors but don't let that stop processing of next course.
      if (err) {
        console.log('Scan for hands error processing course ' + courseId + ': ' + err);
        console.log('Scan for hands skipping course ' + courseId);
      }
      return callback(null);
    });

  } // end iteratee function


  /******************** Process Each Course ********************/
  
  async.each(iSupeIds, courseIteratee, callback);

} // end function scanForRaisedHands


/******************** Data Processing Functions ********************/

/**
 * For a list of assignments in a particular course, derive the faculty member
 * & student associated with each assignment. In the current course organization:
 * - Each student has their own section.
 * - Each section has its own collection of assignment overrides.
 * 
 * Return collection of objects containing people involved with each new hand raised:
 * {
 *  assignmentId: <integer>
 *  assignmentUrl: <string>
 *  facultyName: <string>
 *  facultyId: <integer>
 *  studentName: <string>
 *  studentId: <integer>
 * }
 */

function lookupAssignmentPeople(courseId, notificationIds) {
  let assignmentCollection = [];

  // Don't bother with this rigamarole if there are no notifications to process
  if (notificationIds.length <= 0) return assignmentCollection;

  // Build a list of the course's assignments that are overrides for a section.
  let courseAssignments = canvasCache.getCourseAssignments(courseId);
  courseAssignments = courseAssignments.filter( e => e.overrides );
  const reduceToOverrides = (accumulator, currentVal) => accumulator.concat(currentVal.overrides);
  const accumulatedOverrides = courseAssignments.reduce(reduceToOverrides, []);

  // We're only interested in overrides for a section
  const sectionOverrides = accumulatedOverrides.filter( e => e.course_section_id );
  // console.log('lookupAssignmentPeople sectionOverrides', sectionOverrides);
  
  // Go through each faculty member's sections
  const enrollments = canvasCache.getCourseEnrollments(courseId);
  const facultyEnrollments = enrollments.filter( e => e.type === "TeacherEnrollment");
  for (let facultyEnrollment of facultyEnrollments) {

    // Locate the student in this section
    const sectionId = facultyEnrollment.course_section_id;
    // console.log('lookupAssignmentPeople', courseId, sectionId);
    const studentEnrollment = enrollments.find(
      e => (e.course_section_id === sectionId) && (e.type === "StudentEnrollment"));
    if (studentEnrollment) {
      studentId = studentEnrollment.user_id;
      // console.log('lookupAssignmentPeople found section student', studentId);

      // Go through assignments needing notification & see if any match the student's assignments
      // const studentAssignments = canvasCache.getUserAssignments(studentId, courseId);
      notificationIds.forEach( e => {
        // const targetAssignment = studentAssignments.find( f => f.id === e);
        const targetOverride = sectionOverrides.find(
          f => (f.course_section_id === sectionId) && (f.assignment_id === e));
        // console.log('lookupAssignmentPeople', targetAssignment);
        if (targetOverride) {
          const targetAssignment = courseAssignments.find( g => g.id === e );

          assignmentCollection.push( {
            assignmentId: e,
            assignment: targetAssignment,
            assignmentUrl: targetAssignment.html_url,
            facultyName: facultyEnrollment.user.name,
            facultyId: facultyEnrollment.user.id,
            studentName: studentEnrollment.user.name,
            studentId: studentEnrollment.user.id
          });
        } // end if we found assignment in student's section
      }); // end loop through student's assignments
    } // end if we located a section's student
  } // end loop through all faculty members' sections

  return assignmentCollection;
} // end function


/******************** Aync Waterfall Steps for Notifications Process ********************/

/**
 * Async waterfall steps for SMS notification.
 * dataBag passed to steps is the object created by lookupAssignmentPeople()
 * & includes data for one notification.
 */

function notifyIteratee(dataBag, callback) {
  async.waterfall([
    async.constant(dataBag),  // Initialize waterfall with data for one notification
    lookupPhone,
    // async.apply(lookupPhone, dataBag),  // Idiom to pass param to 1st function in waterfall
    sendSms,
    recordSms
  ], (err, result) => {
    // console.log('notification waterfall done', err, result);
    // Log errors, but don't let errors stop notification happening for others
    if (err) {
      console.log('Scan for hands notification error:' + err);
    }
    return callback(null);
  });
}


function lookupPhone(dataBag, callback) {
  // Add a phone number to the data bag, if we can find one.

  // console.log('in lookupPhoneNum', dataBag.facultyId);  
  const query = { canvasUserId: dataBag.facultyId };
  DashUser.findOne(query, (err, doc) => {
    if (err) return callback(err);
    if (doc && doc.mobile) {
      dataBag.facultyPhone = doc.mobile;
    }
    return callback(null, dataBag);
  });
}


function sendSms(dataBag, callback) {
  // Send SMS via Twilio, if there is a mobile number in the dataBag we can use.

  // console.log('in sendSms');
  
  if(dataBag.facultyPhone) {

    const msgTo = '+1' + dataBag.facultyPhone;  // Convert to US-based E.164 format

    // Render message body using template
    const template = appConfig.getMustacheTemplates().sms_hand_raised;
    const msgBody = mustache.render(template, dataBag);
    // const msgBody = `CST dashboard alert for ${dataBag.facultyName}: ${dataBag.studentName} has a hand raised. ${dataBag.assignmentUrl}`;
    
    twilioHelper.create(msgTo, msgBody,  (err, message) => {
      if (err) return callback(err);
      dataBag.twilioMessage = message;
      return callback(null, dataBag);
    });
  } else {
    return process.nextTick(callback, null, dataBag);
  }
}


function recordSms(dataBag, callback) {
  // Create a record of the SMS, if one was sent

  // console.log('in recordSms');
  if (dataBag.twilioMessage) {
    const newObj = new DashMessage({
      canvasUserId: dataBag.facultyId,
      alert: 'HAND_RAISED',
      transport: 'TWILIO_SMS',
      timestamp: new Date(),
      twilioMessage: JSON.stringify(dataBag.twilioMessage)
    });
    newObj.save( (err) => {
      if (err) return callback(err);
      return callback(null, dataBag);
    });

  } else {
    return process.nextTick(callback, null, dataBag);
  }
}

/******************** Export module as function ********************/

module.exports = scanForRaisedHands;