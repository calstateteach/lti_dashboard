// Client-side script implementing module detail behavior
// 05.23.2018 tps Created.
// 06.20.2018 tps Use adapted module data to include quizzes that are assignments.
// 08.15.2018 tps Redo for fall 2018 course organization.
// 08.20.2018 tps Mark recent submissions with an asterisk.
// 10.05.2018 tps Submission text matches color coding in summary page.
// 11.01.2018 tps Add "Annotation" link to iSupervision version of assignment "Activity 4.05"
// 01.01.2019 tps Fix asterisk display.
// 09.13.2019 tps For Fall 2019, remove "Annotion" link for Activity 4.05 assignment.

// Wait for DOM to load before trying to read dashboard framework data
document.addEventListener("DOMContentLoaded", initGlobals);

function initGlobals() {
  // Retrieve terms data from hidden page element & make it globally available to scripts
  window.CST = {};
  window.CST.terms = JSON.parse(document.getElementById('userTerms').innerText);
  window.CST.dashboardModule = JSON.parse(document.getElementById('dashboardModule').innerText);
  window.CST.appLocation = document.getElementById('appLocation').innerText;
  window.CST.canvasBaseUrl = document.getElementById('canvasBaseUrl').innerText;
  window.CST.activity405Url = document.getElementById('activity405Url').innerText;
  
  // 12.20.2018 tps Flag set true if links should go to submission detail instead of SpeedGrader.
  window.CST.submissionDetailLink = !!document.getElementById('submissionDetailLink');

  // It's OK for the user to try loading the page data now
  loadSubmissions();

}

// AJAX loading of submissions for each student
function loadSubmissions() {

  function ajaxDone() {
    // There's just one ajax call when the page loads  
  }

  // alert('Found ' + window.terms.length + ' terms for this faculty member.');
  for (term of window.CST.terms) {
    for (student of term.students) {
      getSubmissionsByStudent(term.course_id, term.course_section_id, student.id, ajaxDone);
    }
  }
}

function getSubmissionsByStudent(courseId, sectionId, studentId, done) {
  // alert(`section ID: ${sectionId}\nstudent ID: ${studentId}`);
   
  var httpRequest = new XMLHttpRequest();
  if (!httpRequest) {
    alert('Giving up :( Cannot create an XMLHTTP instance');
    done();
    return false;
  }

  httpRequest.onreadystatechange = studentsBySubmissionHandler;
  httpRequest.open('GET', window.CST.appLocation + 'api/v0/sections/' + sectionId + '/students/' + studentId + '/submissions', true);
  httpRequest.send();

  function studentsBySubmissionHandler() {
    if (httpRequest.readyState === XMLHttpRequest.DONE) {
      if (httpRequest.status === 200) {
        //- alert(httpRequest.responseText);
        var submissions = JSON.parse(httpRequest.responseText);
        // console.log(JSON.stringify(submissions, null, 2));        

        // TODO: handle data error in response.
        // alert(`AJAX call returned.\nSection ID ${sectionId}\nStudent ID ${studentId}\nSubmissions count: ${submissions.length}`);

        // // We need to lookup an assignment's title later, so build
        // // a collection containing all the assignment objects.
        // const courseItems = [];
        // const courseModules = window.CST.courseModules[courseId];
        // for (let courseModule of courseModules) {
        //   for (let moduleItem of courseModule.items) {
        //     courseItems.push(moduleItem);
        //   }
        // };
        // const courseAssignments = courseItems.filter( e => e.type === 'Assignment');
        // const courseAssignments = courseItems.filter( e => e.type === 'Gradeable');
        const courseAssignments = window.CST.dashboardModule.items.filter( e => e.type === 'Gradeable');

        for (submission of submissions) {

          // Look for a TD in the page to display the submission
          const tdId = `sec_${sectionId}_ass_${submission.assignment_id}_stu_${studentId}`;
          const td = document.getElementById(tdId);
          if (td) {
            td.textContent = '';  // Clear table cell for new submission contents.

            // Translate workflow state to CST-terminology
            // var workflow_state = submission.workflow_state;
            // workflow_state = (workflow_state === 'graded') ? 'reviewed' : workflow_state;

            // 10.05.2018 tps Make text label match color-coding in summary page
            let submissionText = submission.workflow_state
            if (submissionText === 'graded') submissionText = 'reviewed'; // CST terminology
            if ((submission.workflow_state === 'graded') && (submission.grade === 'incomplete')) submissionText = 'incomplete';
            if (submission.submitted_at 
              && submission.graded_at 
              && (Date.parse(submission.submitted_at) > Date.parse(submission.graded_at))
            ) submissionText = 'resubmitted';

            // Create link to SpeedGrader for the submission
            var link = `${window.CST.canvasBaseUrl}courses/${courseId}/gradebook/speed_grader?assignment_id=${submission.assignment_id}#%7B%22student_id%22%3A%22${studentId}%22%7D`;
          
            // 12.20.2018 tps Link to submission detail for teacher candidate users.
            if (window.CST.submissionDetailLink) {
              link = `${window.CST.canvasBaseUrl}courses/${courseId}/assignments/${submission.assignment_id}/submissions/${submission.user_id}`;
            }

            //- 05.11.2018 tps Special handling: If a Term 1 or Term 1B assignment is called "Activity 4.05",
            //- send user to special assignment URL instead of to the speed grader.
            // const submissionAssignment = courseAssignments.find( e => e.content_id === submission.assignment_id);
            // const submissionAssignment = courseAssignments.find( e => e.assignment_id === submission.assignment_id);
            // if ([ 197, 199 ].includes(courseId) && (submissionAssignment.title === "Activity 4.05")) {
            //   link = `${window.CST.canvasBaseUrl}courses/206/assignments/3984`;
            // }

            // // 08.22.2018 tps For fall 2018, special handling for Activity 4.05 assignment.
            // // If the assignment is called "Activity 4.05", instead of creating link to the submission,
            // // use a link to an assignment called "Activity 4.05" in the iSupervision course.
            // // The link, if any, has been pre-fetched into the the page.
            // const submissionAssignment = courseAssignments.find( e => e.assignment_id === submission.assignment_id); 
            // if (submissionAssignment.title === "Activity 4.05") {
            //   // Add Activity 4.05 link to iSupervision version of the assignment
            //   const annotationAnchor = document.createElement('A');
            //   annotationAnchor.href = window.CST.activity405Url;
            //   annotationAnchor.target = '_BLANK';

            //   const annotationLabel = document.createElement('DIV');
            //   annotationLabel.textContent = 'Annotation';
            //   annotationLabel.className = 'speedgrader_label'
            //   annotationLabel.style.marginBottom = '12px';
            //   annotationAnchor.appendChild(annotationLabel);
            
            //   td.appendChild(annotationAnchor);

            //   // Build Activity 4.05 link to SpeedGrader for Term 1 version of assignment
            //   // link = `${window.CST.canvasBaseUrl}courses/${window.CST.activity405iSupe.course_id}/gradebook/speed_grader?assignment_id=${window.CST.activity405iSupe.assignment_id}#%7B%22student_id%22%3A%22${studentId}%22%7D`;
            // }

            // 09.13.2019 tps For Fall 2019, drop special "Annotation" link for Activity 4.05 assignment.

            const anchor = document.createElement('A');
            anchor.href = link;
            anchor.target = '_BLANK';

            // 12.20.2018 tps Link to SpeedGrader for faculty users only.
            let div1 = null;
            if (!window.CST.submissionDetailLink) {
              div1 = document.createElement('DIV');
              div1.textContent = 'SpeedGrader';
              div1.className = 'speedgrader_label'
              anchor.appendChild(div1);
            }

            const div2 = document.createElement('DIV');
            // div2.textContent = workflow_state;
            div2.textContent = submissionText;
            anchor.appendChild(div2);

            // Show asterisk for submissions within the last 48 hours.
            if (submission.submitted_at) {
              const ageInHrs = ((new Date()).getTime() - Date.parse(submission.submitted_at)) / 1000 / 60 / 60;
              if (ageInHrs <= 48) {
                const asteriskImg = document.createElement('img');
                asteriskImg.className = 'recent_submission_img';
                asteriskImg.src = window.CST.appLocation + 'mod-icons/box-asterisk.png';

                // 01.02.2019 tps Attach asterisk to the 1st DIV available in the box,
                // either next to SpeedGrader label for faculty or next to submission
                // status for teacher candidates.
                (div1 || div2).appendChild(asteriskImg);
                // td.appendChild(asteriskImg);
              }
            }

            // td.textContent = '';
            td.appendChild(anchor);
            
          } // end if found TD to put submission into
        } // end loop through submissions
      } else {
        logErrorInPage('There was a problem requesting submission data from Canvas.\nRequest status:' + httpRequest.status);
      }
      done();
    } // end request ready
  } // end request handler
} // end function


function logErrorInPage(errText) {
  const errDiv = document.getElementById('divStatus');
  if (errDiv) {
    errDiv.innerText =+ "<BR/>" + errText;
  }
}