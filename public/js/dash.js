// Client-side script implementing dashboard behavior
// 04.24.2018 tps Created.
// 04.25.2018 tps Added crude callback system for indicating when data done loading.
// 05.21.2018 tps Revise for reorganization of Canvas courses for Summer 2018 term.
// 05.28.2018 tps Revise for survey module 11's layout.
// 06.20.2018 tps Use adapted module data to include quizzes that are assignments.
// 08.14.2018 tps Redo for fall 2018.
// 12.19.2018 tps Add behavior for teacher candidate page, which is flagged by
//                True value for window.CST.tcUser.
// 01.30.2019 tps Replace rubric average with status box image.
// 02.27.2019 tps Identify module's grading assignment by name rather than position.
// 03.22.2019 tps Fix status color for case of graded assignment being reset to no grade.

// Wait for DOM to load before trying to read dashboard framework data
document.addEventListener("DOMContentLoaded", initGlobals);

function initGlobals() {
  // Retrieve terms data from hidden page element & make it globally available to scripts
  window.CST = {};
  window.CST.terms = JSON.parse(document.getElementById('userTerms').innerText);
  window.CST.facultyUser = JSON.parse(document.getElementById('facultyUser').innerText);
  window.CST.appLocation = document.getElementById('appLocation').innerText;
  window.CST.canvasBaseUrl = document.getElementById('canvasBaseUrl').innerText;
  window.CST.tcUser = !!document.getElementById('tcUser');

  // It's OK for the user to try loading the page data now
  loadSubmissions();
}


// AJAX loading of submissions for each student
function loadSubmissions() {

  // Do something when all the AJAX calls are done?
  var ajaxCalls = 0;
  function ajaxDone() {
    ++ajaxCalls;
  }

  for (term of window.CST.terms) {
    for (student of term.students) {
      getCeHours(term.code, student.id, ajaxDone);
      getSubmissionsByStudent(term.code, term.course_section_id, student.id, ajaxDone);
      getSurveySubmmissionsByStudent(term.code, student.id, ajaxDone);
    }
  }
}

function getSubmissionsByStudent(termCode, sectionId, studentId, done) {
   
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

        // TODO: handle data error in response.
        // alert(`AJAX call returned.\nSection ID ${sectionId}\nStudent ID ${studentId}\nSubmissions count: ${submissions.length}`);

        // Count submissions for each module
        const term = window.CST.terms.find( e => e.code === termCode);
        for (let moduleIndex = 0; moduleIndex < term.modules.length; ++moduleIndex) {
          let module = term.modules[moduleIndex];

        //   // Accumulate summary counts for submissions to the module.
        //   var moduleAssignmentItems = module.items.filter( e => e.type === 'Gradeable');

        //   // Skip modules with no assignments.
        //   if (moduleAssignmentItems.length < 1) continue;

        //   let unsubmittedItems = 0;
        //   let gradedItems = 0;

        //   for (assignment of module.items) {
        //     const submission = submissions.find(e => e.assignment_id === assignment.assignment_id);
        //     if (submission) {
        //       const workflowState = submission.workflow_state;
        //       if (workflowState === 'unsubmitted') ++unsubmittedItems;
        //       if (workflowState === 'graded') ++gradedItems;

        //       //? Individual submission status
        //       // if (submission.workflow_state === 'unsubmitted') console.log('white');
        //       // if ((submission.workflow_state === 'submitted') && (!submission.grade)) console.log('yellow');
        //       // if ((submission.workflow_state === 'graded') && ['complete', 'excused'].includes(submission.grade)) console.log('green');
        //       // if ((submission.workflow_state === 'graded') && (submission.grade === 'incomplete')) console.log('red');
        //       // console.log(submission.workflow_state, submission.grade, submission.submitted_at);
        //         // if workflow_state is unsubmitted, grade & submitted_at are null
        //         // Calculate age of submission
        //       if (submission.submitted_at) {
        //         var ageInMs = (new Date()).getTime() - Date.parse(submission.submitted_at);
        //         // console.log('hours', ageInMs / 1000 / 60 / 60);
        //       }              

        //     } // end submission object found
        //   } // end loop through module's assignments.

        //   // Build text for module submissions summary
        //   const submittedItems = module.items_count - unsubmittedItems;
        //   const linkText = gradedItems + '/' + submittedItems + ' reviewed'                       

          // Build URL to submission detail page.
          let linkUrl = `./${window.CST.facultyUser.id}/course/${term.course_id}/section/${sectionId}/dashmodule/${moduleIndex}/student/${studentId}`

          // 12.19.2018 URL is different for faculty vs teacher candidates
          if (window.CST.tcUser) {
            linkUrl = `./mod/course/${term.course_id}/section/${sectionId}/dashmodule/${moduleIndex}`
          }

          // // Populate the DOM
          // const tdId = `sec_${sectionId}_stu_${studentId}_mod_${moduleIndex}`;
          // const td = document.getElementById(tdId);
          // td.innerHTML = `<A HREF="${linkUrl}">${linkText}</A>`;

          // Draw grid representing all assignments.
          const modStatusContainer = document.createElement('div');
          modStatusContainer.className = "mod-status-container";

          const assGridContainer = document.createElement('div');
          assGridContainer.className = "ass-grid-container";
          modStatusContainer.appendChild(assGridContainer);

          const assAnchor = document.createElement('a');
          assAnchor.href = linkUrl;
          // assAnchor.text = "grid goes here";
          assGridContainer.appendChild(assAnchor);

          const GRID_WIDTH = 8; // Number of items in each row of the grid
          let hasRecentSubmission = false;  // Set true if one of the module submissions was submitted within 48hrs.
          let moduleGrade = null;   // Populate with grade of last submission in the module.
          let moduleRubric = null;  // Populate with rubric of last submission in the module.
                                    // null indicates no rubrics for the assignment.
                                    // 0 indicates partial rubric assessment.
                                    // 1 indicates completed rubric assessment.
          let rowDiv = null;        // Add images representing assignment status to this DIV node.

          // We're only interested in showing boxes for gradeable assignments
          const assignments = module.items.filter( e => e.type === 'Gradeable');
          for (let i = 0; i < assignments.length; ++i) {
          // for (let i in assignments) {

            // // Skip modules with no assignments.
            // const moduleAssignmentItems = module.items.filter( e => e.type === 'Gradeable');
            // if (moduleAssignmentItems.length < 1) continue;

            // Open a DIV if we're starting a new row in the grid
            if ((i % GRID_WIDTH) === 0) {
              rowDiv = document.createElement('div');
              rowDiv.className = 'ass-status-row';
              assAnchor.appendChild(rowDiv);
            }

            // Add DIV for image representing assignment status
            const imageContainer = document.createElement('div');
            imageContainer.className = 'ass-status-col';
            rowDiv.appendChild(imageContainer);

            // Figure out which icon to display for the assignment
            const assignment = assignments[i];
            const submission = submissions.find(e => e.assignment_id === assignment.assignment_id);
            let boxColor = 'white';
            if (submission) {

              // console.log(submission.workflow_state, submission.grade, submission.submitted_at);
              
              if (submission.workflow_state === 'unsubmitted') boxColor = 'white';
              if ((submission.workflow_state === 'submitted') && (!submission.grade)) boxColor = 'yellow';
              // if ((submission.workflow_state === 'graded') && ['complete', 'excused'].includes(submission.grade)) boxColor = 'green';
              if ((submission.workflow_state === 'graded') && (submission.grade !== 'incomplete')) boxColor = 'green';
              if ((submission.workflow_state === 'graded') && (submission.grade === 'incomplete')) boxColor = 'red';
              if ((submission.workflow_state === 'graded') && (submission.grade === null) && !submission.excused) boxColor = 'yellow';
              if (submission.submitted_at 
                && submission.graded_at 
                && (Date.parse(submission.submitted_at) > Date.parse(submission.graded_at))
              ) boxColor = 'yellow';

              // console.log(boxColor);
              // Only show asterisk for submission within the last 48 hours.
              if (submission.submitted_at) {
                const ageInHrs = ((new Date()).getTime() - Date.parse(submission.submitted_at)) / 1000 / 60 / 60;
                // console.log('hours ago submitted', ageInHrs);
                if (ageInHrs <= 48) {
                  hasRecentSubmission = true;
                }
              }

              // 02.27.2019 tps Identify module's grade assignment by its having "Self-Assessment" in the title
              if (assignment.title.match(/self.assessment/i)) {

              // Save grade of last submission in the module.
              // if (i >= (module.items.length - 1)) {
                moduleGrade = submission.grade;
                // console.log('grabbed last grade', moduleGrade);

                // 01.30.2010 tps Check if all the rubric assessments have been filled out.
                if (assignment.has_rubric) {
                  if (submission.rubric_assessment) { // Faculty assessed at least 1 rubric
                    moduleRubric = 1;
                    for (const rubric_key in submission.rubric_assessment) {
                      if (!('points' in submission.rubric_assessment[rubric_key])) {
                        moduleRubric = 0; // Faculty skipped at least 1 rubric
                        break;
                      }
                    }
                  } else {  // Faculty did not assess any rubrics
                    moduleRubric = 0;
                  }
                }
 
                // // See if there is are rubric points we can display
                // if (submission.rubric_assessment) {
                //   const obj = submission.rubric_assessment;
                //   if (Object.keys(obj)[0]) {
                //     moduleRubric = obj[Object.keys(obj)[0]].points;
                //   }

                //   // 01.02.2019 tps Display rubric points average
                //   let points_total = 0;
                //   for (const rubric_key in obj) {
                //     points_total += obj[rubric_key].points;
                //   }
                //   moduleRubric = (points_total / Object.keys(obj).length).toFixed(1);
                // }
              } // end if handling last submission in the module

            } // end if submission object found

            // Add image for assignment status.
            const assignmentImage = document.createElement('img');
            assignmentImage.className = 'ass-status-img';
            // assignmentImage.src = window.CST.appLocation + 'mod-icons/box-yellow.png';
            assignmentImage.src = window.CST.appLocation + 'mod-icons/box-' + boxColor + '.png';
            imageContainer.appendChild(assignmentImage);
            
          } // end loop through module submissions.

          // Add DIV for side notes
          const sideDiv = document.createElement('div');
          sideDiv.className = 'mod-status-side';
          modStatusContainer.appendChild(sideDiv);

          // Add DIV for asterisk
          const asteriskDiv = document.createElement('div');
          asteriskDiv.className = 'new-submission-container';
          sideDiv.appendChild(asteriskDiv);

          const asteriskImage = document.createElement('img');
          asteriskImage.className = 'new-submission-img';
          asteriskImage.src = window.CST.appLocation + 'mod-icons/box-asterisk.png';
          asteriskDiv.appendChild(asteriskImage);
          if (!hasRecentSubmission) {
            asteriskImage.style.visibility = "hidden";
          }

          // Add DIV for letter grade & rubric assessment, which come from last submission in the module.
          const gradeDiv = document.createElement('div');
          gradeDiv.className = 'mod-grade-container';
          
          const gradeSpan = document.createElement('span');
          gradeSpan.style.marginRight = '6px';
          gradeSpan.textContent = moduleGrade;
          gradeDiv.appendChild(gradeSpan);

          // Rubric assessment represented by white box, turning green when all rubric assessments done.
          if (moduleRubric !== null) {
            const rubricImage = document.createElement('img');
            rubricImage.className = 'rubric-status-img';
            rubricImage.src = window.CST.appLocation + 'mod-icons/box-' + (moduleRubric === 1 ? 'green' : 'white') + '.png';
            gradeDiv.appendChild(rubricImage);
            // gradeDiv.textContent = (moduleGrade ? moduleGrade : '') + (moduleRubric ? ('/' + moduleRubric) : '');
            // gradeDiv.textContent = moduleGrade;
            sideDiv.appendChild(gradeDiv);
          }

          // Populate the DOM
          const tdId = `sec_${sectionId}_stu_${studentId}_mod_${moduleIndex}`;
          const td = document.getElementById(tdId);
          if (td) {
            // Delete the cell's placeholder text before adding the grid.
            td.removeChild(td.childNodes[0]);
            td.appendChild(modStatusContainer);
          }
          
        } // end loop through dashboard modules.

        // Each term has a grade module with exactly 1 assignment
        // The grade module is assumed to be the last module in the course
        const gradeModule = term.grade_module;
        const gradeAssignmentId = gradeModule.items[0].content_id;
        const gradeSubmission = submissions.find(e => e.assignment_id === gradeAssignmentId);
        const term_grade = gradeSubmission.grade;
        // const term_score = gradeSubmission.score;
        // const grade_label = term_grade ? `${term_grade} (${term_score})` : 'Not graded';
        const grade_label = term_grade || 'Not graded';
        const speed_grader_url = `${window.CST.canvasBaseUrl}courses/${term.course_id}/gradebook/speed_grader?assignment_id=${gradeAssignmentId}#%7B%22student_id%22%3A%22${studentId}%22%7D`;
            
        // Populate the DOM
        const gradeModuleDivId = `sec_${sectionId}_stu_${studentId}_mod_${gradeModule.id}`;
        const gradeDiv = document.getElementById(gradeModuleDivId);
        gradeDiv.innerHTML = `<A HREF="${speed_grader_url}" TARGET="_BLANK">${grade_label}</A>`;

        // 12.20.2018 tps Teacher candidates don't get a link to the SpeedGrader
        if (window.CST.tcUser) {
          gradeDiv.innerHTML = grade_label;          
        }
        
      } else {
        logErrorInPage('There was a problem with the request getSubmissionsByStudent.\nRequest status:' + httpRequest.status);
        // alert('There was a problem with the request getSubmissionsByStudent.\nRequest status:' + httpRequest.status);
      }
      done();
    } // end request ready
  } // end request handler
} // end function

function getCeHours(termCode, studentId, done) {

  // Look up student's email
  const term = window.CST.terms.find( e => e.code === termCode);
  const studentObj = term.students.find ( e => e.id === studentId);
  const studentEmail = studentObj.login_id;
   
  var httpRequest = new XMLHttpRequest();
  if (!httpRequest) {
    alert('Giving up :( Cannot create an XMLHTTP instance');
    done();
    return false;
  }

  httpRequest.onreadystatechange = ceHoursHandler;
  httpRequest.open('GET', window.CST.appLocation + 'api/v0/cehours/' + studentEmail, true);
  httpRequest.send();

  function ceHoursHandler() {
    if (httpRequest.readyState === XMLHttpRequest.DONE) {
      if (httpRequest.status === 200) {

        // Response expected to be an array with 1 element.
        const ceHours = JSON.parse(httpRequest.responseText);
        
        var tdHtml = "No data";
        if (ceHours.length > 0) {
          const verifiedHours = ceHours[0].verified_hours;
          const totalHours = ceHours[0].total_hours;
          tdHtml = `${verifiedHours} verified<BR/>${totalHours} total`;
        }

        // Populate the DOM
        const tdId = `term_${termCode}_stu_${studentId}`;
        const td = document.getElementById(tdId);
        td.innerHTML = tdHtml;
      } else {
        // alert('There was a problem with the request getCeHours.\nRequest status:' + httpRequest.status);
        logErrorInPage('There was a problem with the request getCeHours.\nRequest status:' + httpRequest.status);
      }
      done();
    } // end request ready
  } // end request handler
} // end function


/**
 * Populate DOM with student's survey question answers, using AJAX.
 */
function getSurveySubmmissionsByStudent(termCode, studentId, done) {
  const term = window.CST.terms.find( e => e.code === termCode);
  // const termModules = window.CST.courseModules[term.course_id];
  // const surveyModules = termModules.filter( e => e.has_survey);
  const surveyModules = term.modules.filter( e => e.has_survey);
  for (surveyModule of surveyModules) {
    const surveyItems = surveyModule.items.filter( e => e.type === 'Survey');
    for (surveyItem of surveyItems) {
      getQuizSubmissions(term.course_id, surveyItem.quiz_id, studentId, done);
    }
  }
}

/**
 * Make AJAX call for a quiz answer.
 */
function getQuizAnswer(courseId, quizId, studentId, submissionId, done) {
   
  var httpRequest = new XMLHttpRequest();
  if (!httpRequest) {
    alert('Giving up :( Cannot create an XMLHTTP instance');
    done();
    return false;
  }

  httpRequest.onreadystatechange = quizAnswerHandler;
  httpRequest.open('GET', window.CST.appLocation + 'api/v0/courses/' + courseId + '/quizzes/' + quizId + '/submissions/' + submissionId + '/events', true);
  httpRequest.send();

  function quizAnswerHandler() {
    if (httpRequest.readyState === XMLHttpRequest.DONE) {
      if (httpRequest.status === 200) {
        
        /**
         * Helper function that populates the DOM with a quiz answer as link.
         */
        function populateQuizAnswer(link, answerText) {
          const divId = `crs_${courseId}_quz_${quizId}_stu_${studentId}`;
          const div = document.getElementById(divId);
          if (div) {
            if (link) {
              div.innerHTML = `<A HREF="${link}" TARGET="_blank">${answerText}</A>`;
            } else {
              div.innerText = answerText;
            }
          }
        }

        // Should get back a structure like:
        // [ { quiz_submission_events: 
        //   [ [Event Object],
        //     [Event Object],
        //   ] } ]

        // 08.14.2018 tps Ignore 400 errors.
        // console.log(httpRequest.responseText);
        const json = JSON.parse(httpRequest.responseText);
        if (json.err) {
          populateQuizAnswer(null, "No data");
          return;
        }
         
        // Look for the last answer they gave
        var lastAnswer = null;
        const quizEvents = JSON.parse(httpRequest.responseText)[0].quiz_submission_events;
        for (quizEvent of quizEvents) {
          if (quizEvent.event_type === "question_answered") {
            lastAnswer = quizEvent;
          }
        }

        // Lookup the text associated with the answer they gave.
        var answerText = "No data"; // User might have not have submitted any answers.
        var canvasLink = null;      // Populate with link back to Canvas survey page.
        if (lastAnswer) {
          // Extract the IDs we'll need to interpret the user's answer.
          // Sometimes IDs are strings, sometimes they are integers...
          const quiz_question_id = parseInt(lastAnswer.event_data[0].quiz_question_id, 10);
          const answer_id        = parseInt(lastAnswer.event_data[0].answer, 10);

          // The answer_id can be null
          if (answer_id) {

            // Look for the quiz description in the 'submission_created' event, which is assumed to exist
            const submission_created = quizEvents.find( e => e.event_type === "submission_created");
            
            // Find the quiz question description
            const quiz_question = submission_created.event_data.quiz_data.find( e => e.id === quiz_question_id);

            // Find the text of the student's answer
            const answer = quiz_question.answers.find( e => e.id === answer_id);
            answerText = answer.text;

            // Create link back to survey answers in Canvas app
            // Need the quiz submission ID, which is not in the events log
            canvasLink = `${window.CST.canvasBaseUrl}courses/${courseId}/quizzes/${quizId}/history?quiz_submission_id=${submissionId}`;
          } // end if answer_id is not null
        } // end if there is a quiz event

        populateQuizAnswer(canvasLink, answerText); // Populate the DOM
        // const divId = `crs_${courseId}_quz_${quizId}_stu_${studentId}`;
        // const div = document.getElementById(divId);
        // if (div) {
        //   if (canvasLink) {
        //     div.innerHTML = `<A HREF="${canvasLink}" TARGET="_blank">${answerText}</A>`;
        //   } else {
        //     div.innerText = answerText;
        //   }
        // }
      } else {
        // alert('There was a problem with the request getISupeSubmissionsByStudent.\nRequest status:' + httpRequest.status);
        logErrorInPage("There was a problem requesting the student's survey answer.\nRequest status:" + httpRequest.status);
      }
      done();
    } // end request ready
  } // end request handler
} // end function


/**
 * Make AJAX call for student's quiz submission.
 */
function getQuizSubmissions(courseId, quizId, studentId, done) {
   
  var httpRequest = new XMLHttpRequest();
  if (!httpRequest) {
    alert('Giving up :( Cannot create an XMLHTTP instance');
    done();
    return false;
  }

  httpRequest.onreadystatechange = quizSubmissionsHandler;
  httpRequest.open('GET', window.CST.appLocation + 'api/v0/courses/' + courseId + '/quizzes/' + quizId + '/students/' + studentId + '/submissions', true);
  httpRequest.send();

  function quizSubmissionsHandler() {
    if (httpRequest.readyState === XMLHttpRequest.DONE) {
      if (httpRequest.status === 200) {
        // Extract the submission ID of the student's last submissions
        var quizSubmissions = JSON.parse(httpRequest.responseText)[0].quiz_submissions;

        // If there are no quiz submission for the student, we're done
        if (quizSubmissions.length <= 0 ) {

          // Populate the DOM
          const divId = `crs_${courseId}_quz_${quizId}_stu_${studentId}`;
          const div = document.getElementById(divId);
          if (div) {
            div.innerText = "No data";
          }
          done();
        } else {
          // Now that we know the quiz submission, we need to find the submission answer.
          // Students can take quizzes multiple times, but we're only interested in the last attempt.    
          const lastAttempt = quizSubmissions[quizSubmissions.length - 1];
          const submissionId = lastAttempt.id;          
          getQuizAnswer(courseId, quizId, studentId, submissionId, done)
        }
      } else {
        logErrorInPage("There was a problem requesting the student's survey submissions.\nRequest status:" + httpRequest.status);
        done();
      }
    } // end request ready
  } // end request handler
} // end function


function logErrorInPage(errText) {
  const errDiv = document.getElementById('divStatus');
  if (errDiv) {
    errDiv.innerText =+ "<BR/>" + errText;
  }
}