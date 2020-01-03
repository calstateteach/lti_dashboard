// Client-side script implementing observations page behavior.
// 07.03.2018 tps Created from dash.js.
// 07.25.2018 tps Add form to save phone number.
// 08.21.2018 tps Redo for fall 2018 term.
// 09.11.2018 tps Add a "final status" column.
// 09.13.2018 tps Populate "final status" column.
// 09.19.2018 tps Fix display bug for hand raised when no CritiqueIt record exists for the assignment.
// 09.21.2018 tps Add form to rename assignment
// 09.30.2018 tps Preserve collapsed state of table between assignment updates.
// 10.01.2018 tps Preserve collapsed state of table between add assignments.
// 11.08.2018 tps Try to speed up initial population of page.
// 12.20.2018 tps Add behavior for displaying page for a teacher candidate.
//                True value for window.CST.tcUser indicates user is a teacher candidate.
// 05.15.2019 tps Add buttons to create Google Docs.
// 05.29.2019 tps Add handling for Google Docs merge.
// 05.03.2019 tps Disable merge button if no CritiqueIt data.
// 09.11.2019 tps Redo for Fall 2019. No CritiqueIt data. Display submission status & links to SpeedGrader.
// 09.25.2019 tps Indicate submissions which contain comments from the faculty.
// 10.06.2019 tps Include semesters containing restored access students.
// 10.06.2019 tps Handle different styles of assignment layouts for different terms.

// Wait for DOM to load before trying to read dashboard framework data
document.addEventListener("DOMContentLoaded", initGlobals);

function initGlobals() {
  // Retrieve terms data from hidden page element & make it globally available to scripts
  window.CST = {};
  // window.CST.terms = JSON.parse(document.getElementById('userTerms').innerText);
  window.CST.semesters = JSON.parse(document.getElementById('semesters').innerText);
  window.CST.facultyUser = JSON.parse(document.getElementById('facultyUser').innerText);
  window.CST.appLocation = document.getElementById('appLocation').innerText;
  window.CST.canvasBaseUrl = document.getElementById('canvasBaseUrl').innerText;
  window.CST.tcUser = !!document.getElementById('tcUser');

  for (semester of window.CST.semesters) {
    if (semester.isupe_assignment_style === 'standard') {
      for (term of semester.term_courses) {
        for (student of term.students) {

          // 09.25.2019 tps We'll need the faculty member's ID so we can check
          //                if they left a comment on the submission.
          const facultyId = window.CST.tcUser ? (term.faculty && term.faculty.user_id) : window.CST.facultyUser.id;

          getSubmissionsByStudent(term, student.iSupe_course_section_id, student.id, facultyId, ()=>{});
        }
      }
    }
  }

//  for (term of window.CST.terms) {
//    for (student of term.students) {
//      // 09.25.2019 tps We'll need the faculty member's ID so we can check later
//      // to see if they left a comment on the submission.
//      const facultyId = window.CST.tcUser ? (term.faculty && term.faculty.user_id) : window.CST.facultyUser.id;
//      getSubmissionsByStudent(term, student.iSupe_course_section_id, student.id, facultyId, ()=>{});
//    }
//  }
}


function getSubmissionsByStudent(term, sectionId, studentId, facultyId, callback) {
   
  var httpRequest = new XMLHttpRequest();
  if (!httpRequest) {
    alert('Giving up :( Cannot create an XMLHTTP instance');
    return callback();
  }

  httpRequest.onreadystatechange = studentsBySubmissionHandler;
  httpRequest.open('GET', window.CST.appLocation + 'api/v0/sections/' + sectionId + '/students/' + studentId + '/submissionswithcomments', true);
  // httpRequest.open('GET', window.CST.appLocation + 'api/v0/sections/' + sectionId + '/students/' + studentId + '/submissions', true);
  httpRequest.send();

  function studentsBySubmissionHandler() {
    if (httpRequest.readyState === XMLHttpRequest.DONE) {
      if (httpRequest.status === 200) {
        const submissions = JSON.parse(httpRequest.responseText);
        const courseId = term.course_id;
        const iSupeCourseId = term.iSupe_course_id;

        // The display of the Final Status assignment is a special case in which 
        // we display the grade instead of the status. The Final Status assignment
        // is assumed to be the last assignment in the iSupervision Course.
        let finalStatusAssId = -1;    // iSupevision course might be missing assignments
        if (term.assignments.length > 0) {
         finalStatusAssId = term.assignments[term.assignments.length - 1].id;
        }

        for (submission of submissions) {

          // Look for a TD in the page to display the submission
          const tdId = `crs_${courseId}_sec_${sectionId}_ass_${submission.assignment_id}_stu_${studentId}`;
          const td = document.getElementById(tdId);
          if (td) {
            td.textContent = '';  // Clear table cell for new submission contents.

            // Translate workflow state to CST-terminology
            let submissionText = submission.workflow_state
            if (submissionText === 'graded') submissionText = 'reviewed'; // CST terminology
            if ((submission.workflow_state === 'graded') && (submission.grade === 'incomplete')) submissionText = 'incomplete';
            if (submission.submitted_at 
              && submission.graded_at 
              && (Date.parse(submission.submitted_at) > Date.parse(submission.graded_at))
            ) submissionText = 'resubmitted';
            if (submission.assignment_id === finalStatusAssId) {
              submissionText = submission.grade || 'No final status';
            }

            if (window.CST.tcUser) {
              if (submission.assignment_id === finalStatusAssId) {
                // Create final status label for teacher candidate
                td.textContent = submissionText;
              } else {
                // Create submission link for teacher candidate
                const submissionUrl = `${window.CST.canvasBaseUrl}courses/${iSupeCourseId}/assignments/${submission.assignment_id}/submissions/${submission.user_id}`;
                addLink(
                  td,
                  submissionUrl,
                  submissionText,
                  false,
                  submission.submitted_at,
                  didUserComment(facultyId, submission));
              }
            } else {
              // Create SpeedGrader link for faculty
              const speedGraderUrl = `${window.CST.canvasBaseUrl}courses/${iSupeCourseId}/gradebook/speed_grader?assignment_id=${submission.assignment_id}#%7B%22student_id%22%3A%22${studentId}%22%7D`;
              addLink(
                td,
                speedGraderUrl,
                submissionText,
                true,
                submission.submitted_at,
                didUserComment(facultyId, submission));
            }

            // // Create link to SpeedGrader for the submission
            // var link = `${window.CST.canvasBaseUrl}courses/${iSupeCourseId}/gradebook/speed_grader?assignment_id=${submission.assignment_id}#%7B%22student_id%22%3A%22${studentId}%22%7D`;
          
            // // 12.20.2018 tps Link to submission detail for teacher candidate users.
            // if (window.CST.tcUser) {
            //   link = `${window.CST.canvasBaseUrl}courses/${iSupeCourseId}/assignments/${submission.assignment_id}/submissions/${submission.user_id}`;
            // }

            // const anchor = document.createElement('A');
            // anchor.href = link;
            // anchor.target = '_BLANK';

            // // 12.20.2018 tps Link to SpeedGrader for faculty users only.
            // let div1 = null;
            // if (!window.CST.tcUser) {
            //   div1 = document.createElement('DIV');
            //   div1.textContent = 'SpeedGrader';
            //   div1.className = 'speedgrader_label'
            //   anchor.appendChild(div1);
            // }

            // const div2 = document.createElement('DIV');
            // div2.textContent = submissionText;
            // anchor.appendChild(div2);

            // // Show asterisk for submissions within the last 48 hours.
            // if (submission.submitted_at) {
            //   const ageInHrs = ((new Date()).getTime() - Date.parse(submission.submitted_at)) / 1000 / 60 / 60;
            //   if (ageInHrs <= 48) {
            //     const asteriskImg = document.createElement('img');
            //     asteriskImg.className = 'recent_submission_img';
            //     asteriskImg.src = window.CST.appLocation + 'mod-icons/box-asterisk.png';

            //     // 01.02.2019 tps Attach asterisk to the 1st DIV available in the box,
            //     // either next to SpeedGrader label for faculty or next to submission
            //     // status for teacher candidates.
            //     (div1 || div2).appendChild(asteriskImg);
            //   }
            // }
          
            // td.appendChild(anchor);
          } // end if found table cell for submission
        } // end loop through submissions
      } else {
        logErrorInPage('There was a problem with the request getSubmissionsByStudent: ' + httpRequest.status);
      }
      callback();
    } // end request ready
  } // end request handler
} // end function getSubmissionsByStudent


/******************** Data Utility Functions *********************/

// Did the user leave a comment in a submission?
function didUserComment(userId, submission) {
  let hasCommented = false;
  const comments = submission.submission_comments;
  if (comments) {
    hasCommented = !!comments.find( e => e.author_id === userId);
  }
  return hasCommented;
}

/******************** DOM Utility Functions *********************/

// Badly designed DOM manipulation to add link to page
function addLink(parentNode, url, label, includeSpeedGraderLabel, submittedAt, includeCommentIcon) {

  const anchor = document.createElement('A');
  anchor.href = url;
  anchor.target = '_BLANK';

  let div1 = null;
  if (includeSpeedGraderLabel) {
    let div1 = document.createElement('DIV');
    div1.textContent = 'SpeedGrader';
    div1.className = 'speedgrader_label'
    anchor.appendChild(div1);
  }

  const div2 = document.createElement('DIV');
  div2.textContent = label;
  anchor.appendChild(div2);

  if (includeCommentIcon) {
    // 09.25.2019 tps Append comments icon if faculty has left a comment
    let commentsImg = document.createElement('IMG');
    commentsImg.className = 'recent_submission_img';
    commentsImg.src = window.CST.appLocation + 'obs-icons/comments-icon-24.png';
    (div1 || div2).appendChild(commentsImg);
  }

  // Show asterisk for submissions within the last 48 hours.
  if (submittedAt) {
    const ageInHrs = ((new Date()).getTime() - Date.parse(submission.submitted_at)) / 1000 / 60 / 60;
    if (ageInHrs <= 48) {
      const asteriskImg = document.createElement('img');
      asteriskImg.className = 'recent_submission_img';
      asteriskImg.src = window.CST.appLocation + 'mod-icons/box-asterisk.png';

      // 01.02.2019 tps Attach asterisk to the 1st DIV available in the box,
      // either next to SpeedGrader label for faculty or next to submission
      // status for teacher candidates.
      (div1 || div2).appendChild(asteriskImg);
    }
  }

  parentNode.appendChild(anchor);
}


// // Append submission link to DOM
// function addSpeedGraderLink(parentNode, url, label, submittedAt) {

//   const anchor = document.createElement('A');
//   anchor.href = url;
//   anchor.target = '_BLANK';

//   const div = document.createElement('DIV');
//   div.textContent = label;
//   anchor.appendChild(div2);

//   // Show asterisk for submissions within the last 48 hours.
//   if (submittedAt) {
//     const ageInHrs = ((new Date()).getTime() - Date.parse(submission.submitted_at)) / 1000 / 60 / 60;
//     if (ageInHrs <= 48) {
//       const asteriskImg = document.createElement('img');
//       asteriskImg.className = 'recent_submission_img';
//       asteriskImg.src = window.CST.appLocation + 'mod-icons/box-asterisk.png';

//       // 01.02.2019 tps Attach asterisk to the 1st DIV available in the box,
//       // either next to SpeedGrader label for faculty or next to submission
//       // status for teacher candidates.
//       (div1 || div2).appendChild(asteriskImg);
//     }
//   }

//   td.appendChild(anchor);
// }


function logErrorInPage(errText) {
  const errDiv = document.getElementById('divStatus');
  if (errDiv) {
    errDiv.innerText =+ "<BR/>" + errText;
  }
}
