/* Pre-building the merge dictionary for a template, as a module
05.20.2019 tps Created.
05.21.2019 tps Use field list provided by MS.
05.28.2019 tps Added merge tags. Moved CritiqueIt strings to separate files.
*/

const DATE_LOCALE = 'en-US';  // JavaScript locale string

function getValue(obj, propPath, defaultValue = "No data") {
  // propPath expected to look like "feedback.academicVocabulary.description"
  
  const fields = propPath.split('.');
  let workObj = obj;
  for (let i = 0; i < fields.length; ++i) {
    const field = fields[i];
    if (workObj.hasOwnProperty(field)) {
      workObj = workObj[field];

      // If array, use the 1st element in the array
      if (Array.isArray(workObj)) {
        if (workObj.length < 1) { // There are no elements to use as a value
          workObj = defaultValue;
          break;
        }
        workObj = workObj[0];
      }
    } else {  // There's no value for the field in the property path
      workObj = defaultValue;
      break;
    }
  }
  return workObj;
}

// Labels for stages' states, taken from CritiqueIt site's main.js
const STAGE_STATES = require('./critiqueItStageStates');
// const STAGE_STATES = {
//    0: 'Uninitialized',
//   10: 'Candidate complete',
//   11: 'Candidate draft',
//   20: 'Supervisor final',
//   21: 'Supervisor needs attention',
//   99: 'No data',  // Custom label
// };

// Labels for subjects, taken from CritiqueIt site's main.js
const SUBJECTS = require('./critiqueItSubjects');

// Labels for feedback proficiency? Taken from CritiqueIt main.js
const RUBRIC_TITLES = require('./critiqueItRubricTitles');
// const RUBRIC_TITLES = [
//   "Exploring",
//   "Applying",
//   "Proficient",
//   "Exemplary"
// ];

const DIMENSIONS = require('./critiqueItDimensions');


/******************** Special Field Parsing *********************/

function parseAsProficiency(o, propPath) {
  const proficiencyIndex = getValue(o, propPath, 0);
  return (proficiencyIndex > 0) ? RUBRIC_TITLES[proficiencyIndex - 1] : 'No data';
} 

function parseAsSubjectProficiency(o, propPath) {
  const subjectIndex = getValue(o, 'subject', 0);
  const subjectProficiencyIndex = getValue(o, propPath, 0);
  if ((subjectIndex > 0 ) && (subjectProficiencyIndex > 0)) {
    return SUBJECTS[subjectIndex - 1].rubrics[subjectProficiencyIndex - 1];
  } else {
    return 'No data';
  }
}

function parseSubject(o) {
  const subjectIndex = getValue(o, 'subject', 0);
  return (subjectIndex > 0) ? SUBJECTS[subjectIndex - 1].title : 'No data';
}

function toLocaleString(utcDateString) {
  // Expects date string like "2019-05-21T01:53:50.317Z"
  return (new Date(utcDateString)).toLocaleDateString(DATE_LOCALE);
}

/******************** Export Merge Dictionary *********************/
module.exports = function (o, canvasCandidateName) {
return {
  '__v': String(getValue(o, '__v')),
  '_id': String(getValue(o, '_id')),
  'academicVocabulary': String(getValue(o, 'academicVocabulary')),
  'adaptations.engage': String(getValue(o, 'adaptations.engage')),
  'adaptations.evaluate': String(getValue(o, 'adaptations.evaluate')),
  'adaptations.practice': String(getValue(o, 'adaptations.practice')),
  'address': String(getValue(o, 'address')),
  'assessment.engage': String(getValue(o, 'assessment.engage')),
  'assessment.evaluate': String(getValue(o, 'assessment.evaluate')),
  'assessment.practice': String(getValue(o, 'assessment.practice')),
  'canvasAssignmentId': String(getValue(o, 'canvasAssignmentId')),
  'canvasCourseId': String(getValue(o, 'canvasCourseId')),
  'citAssignmentId': String(getValue(o, 'citAssignmentId')),
  'classContext': String(getValue(o, 'classContext')),
  'contentStandards': String(getValue(o, 'contentStandards')),
  'created': toLocaleString(getValue(o, 'created')),
  'date': toLocaleString(getValue(o, 'date')),
  'dimension': String(getValue(o, 'dimension')),
  'feedback._id': String(getValue(o, 'feedback._id')),
  'feedback.academicVocabulary.description': String(getValue(o, 'feedback.academicVocabulary.description')),
  'feedback.academicVocabulary.visible': String(getValue(o, 'feedback.academicVocabulary.visible')),
  'feedback.contentStandards.description': String(getValue(o, 'feedback.contentStandards.description')),
  'feedback.contentStandards.visible': String(getValue(o, 'feedback.contentStandards.visible')),
  'feedback.lessonObjective.description': String(getValue(o, 'feedback.lessonObjective.description')),
  'feedback.lessonObjective.visible': String(getValue(o, 'feedback.lessonObjective.visible')),
  'feedback.lessonPlan.description': String(getValue(o, 'feedback.lessonPlan.description')),
  'feedback.lessonPlan.visible': String(getValue(o, 'feedback.lessonPlan.visible')),
  'feedback.proficiency': parseAsProficiency(o, 'feedback.proficiency'),
  'feedback.proficiencyDescription.description': String(getValue(o, 'feedback.proficiencyDescription.description')),
  'feedback.proficiencyDescription.visible': String(getValue(o, 'feedback.proficiencyDescription.visible')),
  'feedback.role': String(getValue(o, 'feedback.role')),
  'feedback.subjectProficiency': parseAsSubjectProficiency(o, 'feedback.subjectProficiency'),
  'feedback.subjectProficiencyDescription.description': String(getValue(o, 'feedback.subjectProficiencyDescription.description')),
  'feedback.subjectProficiencyDescription.visible': String(getValue(o, 'feedback.subjectProficiencyDescription.visible')),
  'feedback.tpes': DIMENSIONS.getTpe(getValue(o, 'feedback.tpes')),
  'feedback.tpe.description': String(getValue(o, 'feedback.tpe.description')),
  'feedback.tpe.visible': String(getValue(o, 'feedback.tpe.visible')),
  'feedback.user': String(getValue(o, 'feedback.user')),
  'handRaised': String(getValue(o, 'handRaised')),
  'isObservationOpen': String(getValue(o, 'isObservationOpen')),
  'lessonObjective': String(getValue(o, 'lessonObjective')),
  'objectives': String(getValue(o, 'objectives')),
  'position.longitude': String(getValue(o, 'position.longitude')),
  'position.latitude': String(getValue(o, 'position.latitude')),
  'procedures.engage': String(getValue(o, 'procedures.engage')),
  'procedures.evaluate': String(getValue(o, 'procedures.evaluate')),
  'procedures.practice': String(getValue(o, 'procedures.practice')),
  'proficiency.candidate':   parseAsProficiency(o, 'proficiency.candidate'),
  'proficiencyRationale': String(getValue(o, 'proficiencyRationale')),
  'reflectFuture': String(getValue(o, 'reflectFuture')),
  'reflectObjective': String(getValue(o, 'reflectObjective')),
  'school': String(getValue(o, 'school')),
  'stages.applicationVideo.state':    STAGE_STATES[getValue(o, 'stages.applicationVideo.state', 99)],
  'stages.contentStandards.state':    STAGE_STATES[getValue(o, 'stages.contentStandards.state', 99)],
  'stages.initialVideo.state':        STAGE_STATES[getValue(o, 'stages.initialVideo.state', 99)],
  'stages.learningDimensions.state':  STAGE_STATES[getValue(o, 'stages.learningDimensions.state', 99)],
  'stages.lessonFrame.state':         STAGE_STATES[getValue(o, 'stages.lessonFrame.state', 99)],
  'stages.logistics.state':           STAGE_STATES[getValue(o, 'stages.logistics.state', 99)],
  'stages.reflection.state':          STAGE_STATES[getValue(o, 'stages.reflection.state', 99)],
  'subject': parseSubject(o),
  'subjectProficiency.candidate': parseAsSubjectProficiency(o, 'subjectProficiency.candidate'),
  'subjectProficiencyRationale': String(getValue(o, 'subjectProficiencyRationale')),
  'technology.engage': String(getValue(o, 'technology.engage')),
  'technology.evaluate': String(getValue(o, 'technology.evaluate')),
  'technology.practice': String(getValue(o, 'technology.practice')),
  'title': String(getValue(o, 'title')),
  'tpes.candidate': String(getValue(o, 'tpes.candidate')),
  'tpes.mentor': String(getValue(o, 'tpes.mentor')),
  'tpes.supervisor': String(getValue(o, 'tpes.supervisor')),
  'updated': toLocaleString(getValue(o, 'updated')),

  //********** Non-CritiqueIt fields **********//

  'canvasCandidateName': canvasCandidateName,   // Sneak in Canvas data
  'googleDocCreated': (new Date()).toLocaleDateString(DATE_LOCALE),  // Merge date stamp
  'debug': JSON.stringify(o, null, 2)   // Expose data object

  };  // end merge dictionary object
} // end export function 
