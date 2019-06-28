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

  initPhoneForm();
  getDashUser(populatePage);  // Chain to loading submission data
}

function populatePage() {
  // Make sure the list of hidden assignments contains only valid assignment IDs.
  let validAssignmentIds = [];
  const hiddenObs = window.CST.dashUser.hiddenObs;
  for (term of window.CST.terms) {
    for (student of term.students) {
      for (assignment of student.assignment_overrides){

        if (hiddenObs.includes(assignment.id)) {
          validAssignmentIds.push(assignment.id);
        }

      }
    }
  }
  window.CST.dashUser.hiddenObs = validAssignmentIds;

  // Retrieve CritiqueIt data by course, to speed up page.
  let iSupeIds = window.CST.terms.map( e => e.iSupe_course_id);
  iSupeIds = iSupeIds.filter( (value, index, self) => self.indexOf(value) === index);
  for (iSupeId of iSupeIds) {
    populateISupeCourse(iSupeId, function() {});
  }
  
  for (term of window.CST.terms) {
    // Fill in final status grade column.
    populateFinalStatus(term);
  }
}


/****************** DOM Manipulation Functions *******************/

function getDivChild(parentNode) {
  return getNthChildWithTag(parentNode, 0, 'DIV');
}


function getNthChildWithTag(parentNode, n, tagName) {
  let i = 0;
  for (e of parentNode.childNodes) {
    if ((e.nodeType === Node.ELEMENT_NODE) && (e.tagName.toUpperCase() === tagName.toUpperCase())) {
      if (i === n) return e;
      ++i
    }
  }
  return null;  // We didn't find anything matching
}


/** 
 * Load user data for dashboard, retrieved via AJAX, into global storage.
 * Populates global variable "window.CST.dashUser".
 * Might be null, if no data stored for the user yet. In this case,
 * store a dummy object with no data.
 */
function getDashUser(done) {
  // done signature: ()
  var httpRequest = new XMLHttpRequest();
  if (!httpRequest) {
    alert('Giving up :( Cannot create an XMLHTTP instance');
    done();
    return false;
  }

  httpRequest.onreadystatechange = getDashUserHandler;
  httpRequest.open('GET', window.CST.appLocation + 'api/v0/dashuser/' + window.CST.facultyUser.id, true);
  httpRequest.send();

  function getDashUserHandler() {
    if (httpRequest.readyState === XMLHttpRequest.DONE) {
      if (httpRequest.status === 200) {
 
        // Store to global data
        const userData = JSON.parse(httpRequest.responseText);
        window.CST.dashUser = userData || { hiddenObs: [] };

        // Populate phone number form, if we have the data
        if (userData && userData.mobile) {
          var txtPhone = document.getElementById('txtPhone');
          var mobile = userData.mobile;
          txtPhone.value = mobile.substring(0, 3) + '-' + mobile.substring(3, 6) + '-' + mobile.substring(6);

          // Give user a way to delete the number
          var btnDelete = document.getElementById('btnDeletePhone');
          btnDelete.disabled = false;

        }

      } else {
        // alert('There was a problem with the request getISupeSubmissionsByStudent.\nRequest status:' + httpRequest.status);
        logErrorInPage('There was a problem with the request getISupeSubmissionsByStudent.\nRequest status:' + httpRequest.status);
      }
      done();
    } // end request ready
  } // end request handler
} // end function

/**
 * Update dashboard user data via AJAX.
 */
function updateDashUser(updateObj, done) {
  // done signature: ()
  var httpRequest = new XMLHttpRequest();
  if (!httpRequest) {
    alert('Giving up :( Cannot create an XMLHTTP instance');
    done();
    return false;
  }

  httpRequest.onreadystatechange = updateDashUserHandler;
  httpRequest.open('PUT', window.CST.appLocation + 'api/v0/dashuser/' + window.CST.facultyUser.id, true);
  httpRequest.setRequestHeader("Content-type", "application/json");
  httpRequest.send(JSON.stringify(updateObj));

  function updateDashUserHandler() {
    if (httpRequest.readyState === XMLHttpRequest.DONE) {
      if (httpRequest.status === 200) {
 
        // Store response to global data
        const userData = JSON.parse(httpRequest.responseText);
        window.CST.dashUser = userData || { hiddenObs: [] };
      } else {
        // alert('There was a problem with the request getISupeSubmissionsByStudent.\nRequest status:' + httpRequest.status);
        logErrorInPage('There was a problem with the request getISupeSubmissionsByStudent.\nRequest status:' + httpRequest.status);
      }
      done();
    } // end request ready
  } // end request handler
} // end function


/**
 * Create container DIV for observations data.
 * HTML looks like:

  <DIV CLASS="assignment-container">
    <DIV CLASS="eye-container">
      <IMG SRC="icon-set-04/eye-seen-48.png" CLASS="eye-icon" />
    </DIV>
    <DIV CLASS="status-container">
      <DIV CLASS="assignment-name-container">
        <A HREF="https://customdomain.instructure.com/courses/209/gradebook/speed_grader?assignment_id=3727#%7B%22student_id%22%3A%221241%22%7D" TARGET="_BLANK" CLASS="obs-name">Daniel Observation 1 Daniel Observation 1 Daniel Observation 1 Daniel Observation 1</A>
      </DIV>
      <DIV ID="sec_1556_stu_1241_ass_3727" CLASS="status-icons-container">
        <IMG SRC="icon-set-04/lesson_frame_0.png" CLASS="status-icon" />
        <IMG SRC="icon-set-04/initial_video_0.png" CLASS="status-icon" />
        <IMG SRC="icon-set-04/reflection_0.png" CLASS="status-icon" />
        <IMG SRC="icon-set-04/application_video_0.png" CLASS="status-icon" />
        <IMG SRC="icon-set-04/hand_not_raised.png" CLASS="status-icon" />
      </DIV>
    </DIV>
  </DIV>
  
 */

 /**
  * Toggle visibility of an assignment in the UI.
  */
function hideAssignment(courseId, assignmentId) {
  // alert(courseId + ' : ' + assignmentId);

  // Add selected observation to list of hidden assignments.

  let hiddenObs = window.CST.dashUser.hiddenObs.slice();
  hiddenObs.push(assignmentId);

  // Make sure we end up with a distinct collection of IDs.
  const unique = (value, index, self) => {
    return self.indexOf(value) === index;
  }
  hiddenObs = hiddenObs.filter(unique);

  let updateObs = {
    hiddenObs: hiddenObs
  };
  updateDashUser(updateObs, () => {
    // location.reload();  // Replace with removing cell from table.

    // Find index for table cell containing the assignment being hidden
    const targetContainerId = `crs_${courseId}_ass_${assignmentId}_container`;
    const termTable = document.getElementById('term_' + courseId);
    for (let i = 1; i < termTable.rows.length; ++i) {
      const lastDataColIndex = termTable.rows[i].cells.length - 2;
      for (let j = 0; j <= lastDataColIndex; ++j) {
        let container = getDivChild(termTable.rows[i].cells[j]);
        if (container && (container.id === targetContainerId)) {
          // alert('found at ' + i + ', ' + j);

          // To help let user know what's happening, pause while
          // the assignment fades out before repopulating the table.
          container.className = 'hide-transition';
          setTimeout(function() {

            termTable.rows[i].deleteCell(j);

            // Compensate for deletion by adding an empty cell at the end
            termTable.rows[i].insertCell(lastDataColIndex -1);

            // There might be an extra blank column at the end now.

            // List of assignment that are hidden in UI has changed
            hiddenObs = window.CST.dashUser.hiddenObs;

            // Use a deep copy of the terms collection because we're going 
            // to mess with the assignment lists.
            const termsUi = JSON.parse(document.getElementById('userTerms').innerText);
            // const termUi = termsUi.find( e => e.course_id === courseId);
            const term = termsUi.find( e => e.course_id === courseId);
            for (let student of term.students) {
              student.assignment_overrides = student.assignment_overrides.filter( e => (!hiddenObs.includes(e.id)) );
            }

            // Figure out how many data columns we need now.
            const assignmentCounts = term.students.map( e => e.assignment_overrides.length);
            const maxCols = assignmentCounts.reduce(function(a, b) {
              return Math.max(a, b);
            }, 0);

            // Remove extra blank column, if any.
            // const dataColumnCount = termTable.rows[1].cells.length - 1;
            const dataColumnCount = termTable.rows[1].cells.length - 2;
            if (maxCols < dataColumnCount) {
              for (let k = 1; k < termTable.rows.length; ++k) {
                termTable.rows[k].deleteCell(dataColumnCount - 1); // Remove penultimate column
              }
            }

            // Make header still spans the assignments
            termTable.rows[0].cells[0].colSpan = maxCols + 1;

            hideButtonFromTeacherCandidate(termTable);  // 12.21.2018 tps

          }, 500);
          
          break;
        } // end if found cell containing assignment to hide
      } // end loop through columns
    } // end loop through rows
  }); // end callback function
}

/**
 * 12.21.2018 tps Behavior for teacher candidate user: Hide cell containing iSupervision button.
 * Parameters:
 *  termTable - HTML table displaying teacher candidate's observations for a specific term.
 */
function hideButtonFromTeacherCandidate(termTable) {
  if (window.CST.tcUser) {
    const tCells = termTable.rows[1].cells;
    const colCount = tCells.length
    tCells[colCount - 2].textContent = '';
    if (colCount > 2) {
      // There's at least 1 observation to display, so we don't need the column containing the button
      tCells[colCount - 2].style.display = 'none';
      termTable.rows[0].cells[0].colSpan = colCount - 2;
    } else {
      // There's no observations to display, but we need a column placeholder
      tCells[colCount - 2].style.display = 'table-cell';
      termTable.rows[0].cells[0].colSpan = 1;
    }
  }
}


function createObsDiv(courseId, assignment, isEyeToggle) {
  /*
   isEyeToggle - true if we're in "Show all" view. Eye is a checkbox for assignment visibility.
                 false if we're in collapsed view. Eye is clicked to hide assignment immediately.
  */ 

  const containerDiv = document.createElement('div');
  containerDiv.className = 'assignment-container';
  containerDiv.id = `crs_${courseId}_ass_${assignment.id}_container`;

  const toolContainer = document.createElement('div');
  toolContainer.className = 'obs-tools-container';
  containerDiv.appendChild(toolContainer);
  
  const eyeContainer = document.createElement('div');
  eyeContainer.className = 'obs-eye-container';
  toolContainer.appendChild(eyeContainer);

  if (isEyeToggle) {  // Render eye in show all view.
    const eyeChk = document.createElement('input');
    const eyeChkId = 'eye_' + assignment.id;
    eyeChk.id = eyeChkId;
    eyeChk.type = 'checkbox';
    eyeChk.onclick = function() { setHiddenState(assignment.id, this.checked); };    
    eyeChk.className = 'obs-eye-checkbox';
  
    // Look up the visibility state of the assignment.
    const isHidden = window.CST.dashUser.hiddenObs.includes(assignment.id);
    eyeChk.checked = isHidden;
  
    eyeContainer.appendChild(eyeChk);
  
    const eyeChkLbl = document.createElement('label');
    eyeChkLbl.htmlFor = eyeChkId;
    eyeChkLbl.className = 'obs-eye-label';
    eyeContainer.appendChild(eyeChkLbl);
  
  } else {            // Render eye in collapsed view.
    const eyeImage = new Image();
    eyeImage.className = 'obs-eye-icon';
    eyeImage.src = window.CST.appLocation + 'obs-icons/eye-seen-48.png';
    eyeImage.alt = 'Open eye icon';
    eyeImage.onclick = function() { hideAssignment(courseId, assignment.id); };

    eyeContainer.appendChild(eyeImage);  
  }

  const editContainer = document.createElement('div');
  editContainer.className = 'obs-edit-container';
  toolContainer.appendChild(editContainer);

  // 12.20.2018 tps Don't let teacher candidates edit assignments
  if (!window.CST.tcUser) {
    const editImage = new Image();
    editImage.className = 'obs-edit-icon';
    editImage.src = window.CST.appLocation + 'obs-icons/edit-icon.png';
    editImage.alt = 'Edit icon';
    // editImage.onclick = function() { alert('course ID ' + courseId + ' assignment course id ' + assignment.course_id + ' assignment id ' + assignment.id + ' assignment name ' + assignment.name)};
    editImage.onclick = function() { return showEditForm(assignment.course_id, assignment.id, assignment.name);};
    toolContainer.appendChild(editImage);
  }

  const statusContainer = document.createElement('div');
  statusContainer.className = 'obs-status-container';
  containerDiv.appendChild(statusContainer);

  const assNameContainer = document.createElement('div');
  assNameContainer.className = 'obs-assignment-name-container';
  statusContainer.appendChild(assNameContainer);

  const assNameAnchor = document.createElement('a');
  assNameAnchor.href = assignment.html_url;
  assNameAnchor.target = '_BLANK';
  assNameAnchor.textContent = assignment.name;
  // assNameAnchor.textContent = assignment.id + ':' + assignment.name;
  assNameContainer.appendChild(assNameAnchor);

  const statusIconsContainer = document.createElement('div');
  statusIconsContainer.className = 'obs-status-icons-container';
  statusIconsContainer.textContent = '----';
  statusIconsContainer.id = `crs_${courseId}_ass_${assignment.id}`;
  statusContainer.appendChild(statusIconsContainer);

  // 05.15.2019 tps Add DIV for merge button
  const buttonContainer = document.createElement('div');

  const btn1 = document.createElement('input');
  btn1.id = `crs_${courseId}_ass_${assignment.id}_merge_btn`; // So we can disable it if no merge data.
  btn1.type = 'button';
  btn1.value = 'Share Lesson Frame';
  btn1.onclick = function() { return showCreateGDocForm(assignment.course_id, assignment, assignment.name);};
  buttonContainer.appendChild(btn1);

  containerDiv.appendChild(buttonContainer);
  return containerDiv;
}


function populateAssignmentStatusDiv(courseId, assignment) {

  const divId = `crs_${courseId}_ass_${assignment.id}`;
  const div = document.getElementById(divId);
  if (div) {
    div.innerText = ''; // Get rid of placeholder text

    // Display stage status as DIV with icons inside
    const critiqueItAssignment = assignment.critiqueit_data;
    if (critiqueItAssignment.stages) {
      addStageIcons(div, critiqueItAssignment);
    } else {
      // Display default state images if we didn't get any assignment data.
      // This could occur if there was an API error.
      addDefaultStageIcons(div);
      // addHandRaised(div, false, true);
    }
    addHandRaised(div, critiqueItAssignment.handRaised, critiqueItAssignment.isObservationOpen);
  }

  // Disable the Google Doc merge button if there's no assignment data to merge.
  const btnId = divId + '_merge_btn';
  const btn = document.getElementById(btnId);
  if (btn) {
    btn.disabled = isEmpty(assignment.critiqueit_data.data);
  }
}


function getCritiqueItStatus(courseId, assignment, done) {
  const assignmentId = assignment.id;

  var httpRequest = new XMLHttpRequest();
  if (!httpRequest) {
    alert('Giving up :( Cannot create an XMLHTTP instance');
    done();
    return false;
  }

  httpRequest.onreadystatechange = getCritiqueItStatusHandler;
  httpRequest.open('GET', window.CST.appLocation + 'api/v0/critiqueit/assignments/' + assignmentId, true);
  httpRequest.send();

  function getCritiqueItStatusHandler() {
    if (httpRequest.readyState === XMLHttpRequest.DONE) {
      if (httpRequest.status === 200) {
        // alert(httpRequest.responseText);
        var critiqueItAssignment = JSON.parse(httpRequest.responseText);

        // Cache the retrieved CritiqueIt data with its corresponding assignment object
        // so it's there the next time we need to display assignment data.
        // It's possible that no CritiqueIt record exists for this assignment yet,
        // in which case supply default values.
        assignment.critiqueit_data = createCritiqueItCacheObject(critiqueItAssignment);

        // Populate the DOM with retrieved CritiqueIt data.
        populateAssignmentStatusDiv(courseId, assignment);

      } else {
        // alert('There was a problem with the request getISupeSubmissionsByStudent.\nRequest status:' + httpRequest.status);
        logErrorInPage('There was a problem with the request getISupeSubmissionsByStudent.\nRequest status:' + httpRequest.status);
      }
      done();
    } // end request ready
  } // end request handler
} // end function

/** 
 * Utility function to populate an object for local storage containing relevant
 * fields from a CritiqueIt assignment object.
 */
function createCritiqueItCacheObject(critiqueItAssignment) {
  return {
    stages: (critiqueItAssignment.stages || null),
    handRaised: (critiqueItAssignment.handRaised === undefined ? false : critiqueItAssignment.handRaised),
    isObservationOpen: (critiqueItAssignment.isObservationOpen === undefined ? true : critiqueItAssignment.isObservationOpen),
    data: critiqueItAssignment  // 05.29.2019 tps Google Doc merge requires the whole assignment object.
  };
}


/** Populate page when it first loads by
 * querying faculty member's iSupervision course for all assignments
 * instead of each assignment record individually.
*/
function populateISupeCourse(iSupeCourseId, done) {

  var httpRequest = new XMLHttpRequest();
  if (!httpRequest) {
    alert('Giving up :( Cannot create an XMLHTTP instance');
    done();
    return false;
  }

  httpRequest.onreadystatechange = getCritiqueItStatusHandler;
  httpRequest.open('GET', window.CST.appLocation + 'api/v0/critiqueit/courses/' + iSupeCourseId + '/assignments', true);
  httpRequest.send();

  function getCritiqueItStatusHandler() {
    if (httpRequest.readyState === XMLHttpRequest.DONE) {
      if (httpRequest.status === 200) {
        // alert(httpRequest.responseText);
        let critiqueItAssignments = JSON.parse(httpRequest.responseText);

        // CritiqueItAssignments might be:
        // - a JSON object with API error message, probably because there is no CritiqueIt data for the course.
        // - an array of CritiqueIt assignment data
        if (!Array.isArray(critiqueItAssignments)) {
          critiqueItAssignments = []; // We don't have CritiqueIt data to display.
        }

        // Add available CritiqueIt data to iSupervision assignment objects for the terms.
        const iSupeTerms = window.CST.terms.filter( e => e.iSupe_course_id === iSupeCourseId);
        for (let iSupeTerm of iSupeTerms) {
          // console.log('Populate course', iSupeTerm.course_id, 'iSupervision course', iSupeCourseId);

          for (let student of iSupeTerm.students) {
            for (let assignment of student.assignment_overrides) {
              const assignmentId = assignment.id;

              // See if we have CritiqueIt data for this assignment
              const critiqueItAss = critiqueItAssignments.find( e => e.canvasAssignmentId == assignmentId) || {};
              
              // Cache the retrieved CritiqueIt data with its corresponding assignment object
              // so it's there the next time we need to display assignment data.
              // It's possible that no CritiqueIt record exists for this assignment yet,
              // in which case supply default values.
              assignment.critiqueit_data = createCritiqueItCacheObject(critiqueItAss);
              // assignment.critiqueit_data = {
              //   stages: (critiqueItAss.stages || null),
              //   handRaised: (critiqueItAss.handRaised === undefined ? false : critiqueItAss.handRaised),
              //   isObservationOpen: (critiqueItAss.isObservationOpen === undefined ? true : critiqueItAss.isObservationOpen),
              //   data: critiqueItAss   // Google doc merge requires the entire assignment object.
              // };            
            } // end loop through assignments
          } // end loop through students

          showCollapsed(iSupeTerm.course_id); // Display data in collapsed state by default

        } // end loop through terms
      } else {
        logErrorInPage('There was a problem with the request getISupeSubmissionsByStudent.\nRequest status:' + httpRequest.status);
      }
      done();
    } // end request ready
  } // end request handler
} // end function


function addDefaultStageIcons(parentElement) {

  function appendDefaultStageIcons(baseImgFileName) {
    // Display default images if no stage data is available.
    const img = document.createElement('img');

    // Build image src like: "http://localhost:4321/obs-icons/lesson_frame_20.png"
    const src = window.CST.appLocation 
      + 'obs-icons/' 
      + baseImgFileName + '_0.png';
    img.src = src;
    img.className = 'obs-status-icon';
    parentElement.appendChild(img);
  }

  appendDefaultStageIcons('lesson_frame');
  appendDefaultStageIcons('initial_video');
  appendDefaultStageIcons('reflection'); 
  appendDefaultStageIcons('application_video');
}


function addStageIcons(parentElement, critiqueItAssignment) {
  // function addStageIcons(parentElement, stages, isObservationOpen) {

  // Display stage status as DIV with icons inside.
  // Use finalized version of icon if isObservationOpen is false.
  // const containerDiv = document.createElement('div');
  // containerDiv.className = 'obs-status-icons-container';

  const stages = critiqueItAssignment.stages;
  const isObservationOpen = critiqueItAssignment.isObservationOpen;

  function appendStageImage(stageName, baseImgFileName) {
    const img = document.createElement('img');

    // Build image src like: "http://localhost:4321/obs-icons/lesson_frame_20.png"
    const src = window.CST.appLocation 
      + 'obs-icons/' 
      + baseImgFileName + '_'
      + (stages[stageName] ? stages[stageName].state : 0)
      + (isObservationOpen ? '' : '_final')
      + '.png';
    img.src = src;
    img.className = 'obs-status-icon';
    parentElement.appendChild(img);
  }

  // Append the status images for stages of interest.
  appendStageImage('lessonFrame', 'lesson_frame');
  appendStageImage('initialVideo', 'initial_video');
  appendStageImage('reflection', 'reflection'); 
  appendStageImage('applicationVideo', 'application_video');
}


function addHandRaised(parentElement, isHandRaised, isObservationOpen) {
  return; // 05.28.2019 tps Remove icon for faculty demo
  const handRaisedImg = document.createElement('img');
  const handRaisedSrc = window.CST.appLocation 
    + 'obs-icons/hand_' 
    + (isHandRaised ? '' : 'not_')
    + 'raised' 
    + (isObservationOpen ? '' : '_final')
    + '.png';
  handRaisedImg.src = handRaisedSrc;
  handRaisedImg.className = 'obs-status-icon';
  parentElement.appendChild(handRaisedImg);
}


function logErrorInPage(errText) {
  const errDiv = document.getElementById('divStatus');
  if (errDiv) {
    errDiv.innerText =+ "<BR/>" + errText;
  }
}


/******************** Show All Checkbox Functions ********************/

function toggleShowAll(courseId, isChecked) {
  // alert(courseId + ' ' + isChecked);
  if (isChecked) {
    showAll(courseId);
  } else {
    showCollapsed(courseId);
  }
}

/**
 * Redraw data table with all assignments.
 */
function showAll(courseId) {
  // Figure out how many columns we'll need.
  const term = window.CST.terms.find( e => e.course_id === courseId);
  const assignmentCounts = term.students.map( e => e.assignment_overrides.length);
  const maxCols = assignmentCounts.reduce(function(a, b) {
    return Math.max(a, b);
  }, 0);

  // Add extra columns if needed.
  const termTable = document.getElementById('term_' + courseId);
  // const dataColumnCount = termTable.rows[1].cells.length - 1;
  const dataColumnCount = termTable.rows[1].cells.length - 2;
  if (maxCols > dataColumnCount) {
    termTable.rows[0].cells[0].colSpan = maxCols + 1;
    for (let i = 0; i < (maxCols - dataColumnCount); ++i) {
      for (let j = 1; j < termTable.rows.length; ++j) {
        termTable.rows[j].insertCell(0);
      }
    }
  }

  // Fill body of table with data cells
  for (let i = 1; i < termTable.rows.length; ++i) {
  
    // Observation assignments to display in this row
    let assignments = term.students[i - 1].assignment_overrides;
    
    for (let j = 0; j < maxCols; ++j) {
      // const newCell = termTable.rows[i].insertCell(j);

      // Clear any existing data in the cell
      const cell = termTable.rows[i].cells[j];
      let container = getDivChild(cell);
      if (container) {
            cell.removeChild(container);
      }

      // Check if this is a cell which should contain assignment data
      if (j < assignments.length) {
        const visibleAssignment = assignments[j];

        cell.appendChild(createObsDiv(term.course_id, visibleAssignment, true));
        // cell.appendChild(createObsDivShowAll(term.course_id, visibleAssignment));

          // Now that the cell is in place, see if we already have the
          // data to populate it.
          if (visibleAssignment.critiqueit_data) {
            populateAssignmentStatusDiv(term.course_id, visibleAssignment);
          } else {
            // Otherwise, populate it with an AJAX call
            getCritiqueItStatus(term.course_id, visibleAssignment, function() {} );
          }

      } // end populating cell containing assignment data
    } // end loop through columns
  } // end loop through rows 

  hideButtonFromTeacherCandidate(termTable);  // 12.21.2018 tps
}

function showCollapsed(courseId) {
  // Figure out how many columns we'll need.
  const hiddenObs = window.CST.dashUser.hiddenObs;
  const term = window.CST.terms.find( e => e.course_id === courseId);
  let assignmentCounts = [];  // Accumlate counts of visible assignments for each student.
  for( let student of term.students) {
    assignmentCounts.push(student.assignment_overrides.filter( e => !(hiddenObs.includes(e.id))).length);
  }
  const maxCols = assignmentCounts.reduce(function(a, b) {
    return Math.max(a, b);
  }, 0);

  // Remove extra columns if needed.
  const termTable = document.getElementById('term_' + courseId);
  // const dataColumnCount = termTable.rows[1].cells.length - 1;
  const dataColumnCount = termTable.rows[1].cells.length - 2;
  if (maxCols < dataColumnCount) {
    termTable.rows[0].cells[0].colSpan = maxCols + 1;
    for (let i = 0; i < (dataColumnCount - maxCols); ++i) {
      for (let j = 1; j < termTable.rows.length; ++j) {
        termTable.rows[j].deleteCell(0);
      }
    }
  } else if (maxCols > dataColumnCount) {
    // Add extra columns if neeeded
    termTable.rows[0].cells[0].colSpan = maxCols + 1;
    for (let i = 0; i < (maxCols - dataColumnCount); ++i) {
      for (let j = 1; j < termTable.rows.length; ++j) {
        termTable.rows[j].insertCell(0);
      }
    }
  }

  // Fill body of table with data cells
  for (let i = 1; i < termTable.rows.length; ++i) {
  
    // Observation assignments to display in this row
    const allAssignments = term.students[i - 1].assignment_overrides;
    const visibleAssignments = allAssignments.filter( e => !(hiddenObs.includes(e.id)));
    
    for (let j = 0; j < maxCols; ++j) {

      // Clear any existing data in the cell
      const cell = termTable.rows[i].cells[j];
      let container = getDivChild(cell);
      if (container) {
            cell.removeChild(container);
      }

      // Check if this is a cell which should contain assignment data
      if (j < visibleAssignments.length) {
        const visibleAssignment = visibleAssignments[j];
        cell.appendChild(createObsDiv(term.course_id, visibleAssignment, false));
        // cell.appendChild(createObsDiv(term.course_id, visibleAssignment));

          // Now that the cell is in place, see if we already have the
          // data to populate it.
          if (visibleAssignment.critiqueit_data) {
            populateAssignmentStatusDiv(term.course_id, visibleAssignment);
          } else {
            // Otherwise, populate it with an AJAX call
            getCritiqueItStatus(term.course_id, visibleAssignment, function() {} );
          }
      } // end if populating cell with assignment data
    } // end loop through columns
  } // end loop through rows 

  hideButtonFromTeacherCandidate(termTable);  // 12.21.2018 tps
}


function setHiddenState(assignmentId, isHidden) {

  // Modify list of hidden assignments.
  let hiddenObs = window.CST.dashUser.hiddenObs.slice();
  if (isHidden) { 
    hiddenObs.push(assignmentId);

    // Make sure we end up with a distinct collection of IDs.
    const unique = (value, index, self) => {
      return self.indexOf(value) === index;
    }
    hiddenObs = hiddenObs.filter(unique);
  } else {
    hiddenObs = hiddenObs.filter( e => e != assignmentId);
  }

  let updateObs = {
    hiddenObs: hiddenObs
  };
  
  updateDashUser(updateObs, () => {
    return; // no-op
  }); // end callback from AJAX call to update dash user data.
}


/******************** Functions to populate final status column ********************/

function populateFinalStatus(term) {
  // Find the iSupervision course's final status assignment
  const finalStatusAss = term.assignment_final_status;

  // Don't bother with any of this if we can't find the iSupervision course's final status assignment
  if (!finalStatusAss) return;

  const assignmentId = finalStatusAss.id;
  for(let student of term.students) {
    const courseId = term.course_id;  // Student's term course
    const iSupeSectionId = student.iSupe_course_section_id; // Student's iSupervision section 
    const iSupeCourseId = student.iSupe_course_id;  // Student's iSupervision course
    const studentId = student.id;
    // console.log('look for course ID', courseId, 'iSupeCourseId', iSupeCourseId, 'section', iSupeSectionId, 'student', studentId, 'assignment', assignmentId);
    getSubmissionsByStudent(courseId, iSupeCourseId, iSupeSectionId, studentId, assignmentId, function() {});
  }
}


function getSubmissionsByStudent(courseId, iSupeCourseId, sectionId, studentId, assignmentId, done) {
   
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

        // We're interested in just one assignment's grade
        const submission = submissions.find( e => e.assignment_id === assignmentId);
        if (submission) {

          // Look for a place to display the submission.
          // The term course is specified to handle cases where the same test candidate
          // is enrolled in multiple term courses.
          const tdId = `crs_${courseId}_sec_${sectionId}_stu_${studentId}_final`;
          const td = document.getElementById(tdId);
          if (td) {
            // Translate workflow state to CST-terminology
            const grade = submission.grade || 'No final status';

            // 12.20.2018 tps No link to SpeedGrader if user is a teacher candidate
            if (window.CST.tcUser) {
              td.textContent = grade;
            } else {
              // Create link back to Canvas app
              var link = `${window.CST.canvasBaseUrl}courses/${iSupeCourseId}/gradebook/speed_grader?assignment_id=${assignmentId}#%7B%22student_id%22%3A%22${studentId}%22%7D`;
            
              // Add grade as link to SpeedGrader
              const anchor = document.createElement('A');
              anchor.textContent = grade;
              anchor.href = link;
              anchor.target = '_BLANK';

              td.textContent = '';
              td.appendChild(anchor);
            } // end if adding SpeedGrader link

          } // end if we found a place to display grade
        } // end if there is submission data to display

      } else {
        logErrorInPage('There was a problem requesting submission data from Canvas.\nRequest status:' + httpRequest.status);
      }
      done();
    } // end request ready
  } // end request handler
} // end function


/******************** Add Assignment Functions ********************/

function showAddForm(courseId, addType, studentId) {
  // alert(`Post assignment goes here.\ncourseId: ${courseId}\naddType: ${addType}\nstudentId: ${studentId}`);

  // Modal add form behavior:
  // When the user clicks anywhere outside of the modal form, close it
  var modal = document.getElementById('addAssDiv');
  window.onclick = function(event) {

    if (event.target == modal) {
      modal.style.display = "none";

      // Clear any error messages
      document.getElementById('errMsg').style.display = "none";
    }
  }
 
  /* Populate data structure with default names for new iSupervision assignments,
  to make it easier for the Web page to suggest names for new assignments.

  Build a unique name for a new iSupervision assignment for each student.
  The name adds a numbered suffix to the specified user's email login ID.
  e.g. If user login is "abcdef@ourdomain.org", then assignment names
  look like "abcdef-1", "abcdef-2" etc.
  */
 
  // Make it easy to lookup existing assignment names
  const term = window.CST.terms.find( e => e.course_id === courseId);
  const student = term.students.find( e => e.id === studentId);
  const assignmentNames = student.assignment_overrides.map( e => { return e.name; });
 
  var loginName = student.login_id.split('@')[0];
  var defaultName = '';
  var n = 1;
  do {
    defaultName = loginName + '-' + n++;
  } while (assignmentNames.includes(defaultName));
  
  // Populate the add form with values we'll need to know when it's time to submit the add
  document.getElementById('assignmentName').value = defaultName;
  // document.getElementById('courseId').value = term.iSupe_course_id;   // Add to iSupervision course
  document.getElementById('courseId').value = student.iSupe_course_id;   // Add to iSupervision course
  document.getElementById('sectionId').value = student.iSupe_course_section_id;  // Add to student's section
  document.getElementById('addType').value = addType;
  document.getElementById('studentId').value = studentId;

  // Use more specific label in add form
  const addTypeTxt = (addType === 'CritiqueIt') ? 'iSupervision' : 'Google Observation';
  const lblAdd = document.getElementById('lblAdd');
  lblAdd.textContent = 'Add ' + addTypeTxt + ' assignment with name:';

  // Display modal form
  document.getElementById('addAssDiv').style.display = 'block';
  document.getElementById('assignmentName').focus();
}


function submitAdd() {  

  // Gather the parameters we'll need to add the assignment
  const assignmentName = document.getElementById('assignmentName').value;
  const courseId = parseInt(document.getElementById('courseId').value, 10);
  const sectionId = parseInt(document.getElementById('sectionId').value, 10);
  const addType = document.getElementById('addType').value;
  const userId = document.getElementById('studentId').value;

  // Validate the assignment name
  const errMsg = document.getElementById('errMsg')
  errMsg.style.display = "none";
  if (assignmentName.trim() === 'Activity 4.05') {
    errMsg.style.display = "inline";
    errMsg.innerText = '"Activity 4.05" is a reserved assignment name. Please try a different name.';
    return false;
  }


  const postString = 'userId=' + userId
    + '&courseId=' + courseId
    + '&sectionId=' + sectionId
    + '&assignmentName=' + encodeURIComponent(assignmentName)
    + '&addType=' + encodeURIComponent(addType);

  // alert(assignmentName + ', ' + courseId + ', ' + sectionId + ', ' + addType);
  // alert(postString);

  // Disable form so user can't add multiple assignments with the same name
  document.getElementById('btnSubmit').disabled = true;
  document.getElementById('btnCancel').disabled = true;

  // User submits assignment add.
  // document.getElementById('waitMsg').style.visibility = "visible";
  document.getElementById('waitMsg').style.display = "inline";


  var httpRequest = new XMLHttpRequest();
  if (!httpRequest) {
    alert('Giving up :( Cannot create an XMLHTTP instance');
    done();
    return false;
  }

  httpRequest.onreadystatechange = addAssignmentHandler;
  httpRequest.open('POST', window.CST.appLocation + 'api/v0/courses/' + courseId + '/assignments', true);
  httpRequest.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
  httpRequest.send(postString);


  function addAssignmentHandler() {
    if ((httpRequest.readyState === XMLHttpRequest.DONE) && (httpRequest.status === 200)) {
      // var assignment = JSON.parse(httpRequest.responseText);
      // // alert('Added assignment ' + assignment.id);
      // location.reload();

      // Re-render the contents for the HTML table containing the new assignment.
      var assignments = JSON.parse(httpRequest.responseText);

      // Reset the add form
      document.getElementById('btnSubmit').disabled = false;
      document.getElementById('btnCancel').disabled = false;
      document.getElementById('addAssDiv').style.display='none';
      document.getElementById('waitMsg').style.display='none';
      document.getElementById('errMsg').style.display = "none";   // Clear error messages

      // Find the cached course & section with the new assignment.
      // Display is by term course, so find iSupervision course's corresponding term course.
      let termCourseId = null;
      for (let term of window.CST.terms) {
        for (let student of term.students) {
          if ((student.iSupe_course_id === courseId) && (student.iSupe_course_section_id === sectionId)) {
            termCourseId = term.course_id;

            // Extract section assignment data that need to be refreshed in the page cache.
            // We're only interested in overrides for the student's section
            let assOverrides = assignments.filter( e => e.overrides && e.overrides.find( f => f.course_section_id === sectionId) );
        
            // This particular Canvas query includes more assignments than we really want,
            // so try this to see only assignment overrides:
            assOverrides = assOverrides.filter( e => e.only_visible_to_overrides);

            // We're only interested in the CritiqueAssignments
            assOverrides = assOverrides.filter( e => e.submission_types.includes("external_tool"));

            // Replace page's cached data with new assignments
            student.assignment_overrides = assOverrides;

            // Repopulate the table containing assignment that got renamed
            const chk = document.getElementById('chkShowAll_' + termCourseId);
            chk.checked ? showAll(termCourseId) : showCollapsed(termCourseId);

            break;  // We're done processing the assignment update
          } // end if target data found in cache
        } // end loop through students
        if (termCourseId) break;  // We're done processing the assignment add
      } // end loop through terms

    } // end request ready
  } // end request handler
}


function cancelAdd() {
  document.getElementById('addAssDiv').style.display='none';
  document.getElementById('errMsg').style.display = "none";   // Clear error messages
}


/******************** Edit Assignment Functions ********************/

function showEditForm(iSupeCourseId, assignmentId, assignmentName) {

  // Modal add form behavior:
  // When the user clicks anywhere outside of the modal form, close it
  var modal = document.getElementById('editAssDiv');
  window.onclick = function(event) {

    if (event.target == modal) {
      modal.style.display = "none";

      // Clear any error messages
      document.getElementById('editErrMsg').style.display = "none";
    }
  }

  // Populate data form with assignment name user wants to edit
  // and other values we'll need to submit the change.
  document.getElementById('editCurrentAssignmentName').textContent = assignmentName;
  document.getElementById('editNewAssignmentName').value = assignmentName;
  document.getElementById('editCourseId').value = iSupeCourseId;
  document.getElementById('editAssignmentId').value = assignmentId;
 
  // Display modal form
  document.getElementById('editAssDiv').style.display = 'block';
  document.getElementById('editNewAssignmentName').focus();
}


function submitEdit() {  

  // Gather the parameters we'll need to edit the assignment
  const assignmentName = document.getElementById('editNewAssignmentName').value;
  const courseId = parseInt(document.getElementById('editCourseId').value, 10);
  const assignmentId = parseInt(document.getElementById('editAssignmentId').value, 10);

  // Validate the assignment name
  const errMsg = document.getElementById('editErrMsg')
  errMsg.style.display = "none";
  if (assignmentName.trim() === '') return false;   // If user didn't enter anything, do nothing.

  const postString = 'assignmentName=' + encodeURIComponent(assignmentName);

  // Disable form so user can't add multiple assignments with the same name
  document.getElementById('btnEditSubmit').disabled = true;
  document.getElementById('btnEditCancel').disabled = true;

  // User submits assignment add.
  document.getElementById('editWaitMsg').style.display = "inline";

  var httpRequest = new XMLHttpRequest();
  if (!httpRequest) {
    alert('Giving up :( Cannot create an XMLHTTP instance');
    done();
    return false;
  }

  httpRequest.onreadystatechange = editAssignmentHandler;
  httpRequest.open('PUT', window.CST.appLocation + 'api/v0/courses/' + courseId + '/assignments/' + assignmentId, true);
  httpRequest.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
  httpRequest.send(postString);

  function editAssignmentHandler() {
    if ((httpRequest.readyState === XMLHttpRequest.DONE) && (httpRequest.status === 200)) {
      // Re-render the contents for the table containing the assignment that was edited.
      // var assignment = JSON.parse(httpRequest.responseText);
      // location.reload();
      var updatedAssignments = JSON.parse(httpRequest.responseText);

      // Reset the edit form
      document.getElementById('btnEditSubmit').disabled = false;
      document.getElementById('btnEditCancel').disabled = false;
      document.getElementById('editWaitMsg').style.display = "none";
      document.getElementById('editAssDiv').style.display='none';
      document.getElementById('editErrMsg').style.display = "none";   // Clear error messages

      // Find the assignment that was edited
      const updatedAss = updatedAssignments.find( e => e.id === assignmentId);
      if (updatedAss) {

        // Figure out the corresponding term course to update.
        let termCourseId = null;
        for (let term of window.CST.terms) {
          for (let student of term.students) {
            const assIndex = student.assignment_overrides.findIndex( e => e.id === assignmentId);
            if (assIndex >= 0) {
              termCourseId = term.course_id;

              // Update the page's cache of assignment data
              student.assignment_overrides[assIndex] = updatedAss;

              // Repopulate the table containing assignment that got renamed
              const chk = document.getElementById('chkShowAll_' + termCourseId);
              chk.checked ? showAll(termCourseId) : showCollapsed(termCourseId);

              break;  // We're done processing the assignment update
            }
          }
          if (termCourseId) break;  // We're done processing the assignment update
        }

      } // end repopulating table layout with updated assignments.
    
    } // end request ready
  } // end request handler
}


function cancelEdit() {
  document.getElementById('editAssDiv').style.display='none';
  document.getElementById('editErrMsg').style.display = "none";   // Clear error messages
}


/******************** Functions to save & test phone number ********************/

function initPhoneForm() {
  // Initialize phone entry form

  function setEnterEvent(txtInputId, btnId) {
    // Get the input field
    var input = document.getElementById(txtInputId);

    // Execute a function when the user releases a key on the keyboard
    input.addEventListener("keyup", function(event) {
      // Cancel the default action, if needed
      event.preventDefault();
      // Number 13 is the "Enter" key on the keyboard
      if (event.keyCode === 13) {
        // Trigger the button element with a click
        document.getElementById(btnId).click();
      }
    });
  }

  setEnterEvent("txtPhone", "btnSubmitPhone");
} // end function initPhoneForm


/**
 * Save and test phone number via AJAX.
 */
function saveAndTestNumber(dataObj, done) {
  // done signature: ()
  var httpRequest = new XMLHttpRequest();
  if (!httpRequest) {
    alert('Giving up :( Cannot create an XMLHTTP instance');
    done();
    return false;
  }

  httpRequest.onreadystatechange = saveAndTestNumberHandler;
  httpRequest.open('POST', window.CST.appLocation + 'api/v0/dashuser/' + window.CST.facultyUser.id + '/smsSaveAndTest', true);
  httpRequest.setRequestHeader("Content-type", "application/json");
  httpRequest.send(JSON.stringify(dataObj));

  function saveAndTestNumberHandler() {
    if (httpRequest.readyState === XMLHttpRequest.DONE) {
      if (httpRequest.status === 200) {
        return done(JSON.parse(httpRequest.responseText));
      } else {
        // alert('There was a problem with the request getISupeSubmissionsByStudent.\nRequest status:' + httpRequest.status);
        logErrorInPage('There was a problem with the request getISupeSubmissionsByStudent.\nRequest status:' + httpRequest.status);
      }
    } // end request ready
  } // end request handler
} // end function


function submitPhone() {
  // Very basic validation for US phone number like "123-456-7890"
  // Also matches "5551214444"
  var value = document.getElementById('txtPhone').value;

  // Squeeze out white space from phone number entry
  value = value.replace(/\s+/g, '');
  if (!value) return;
  var phoneNumberPattern = /^(\d{3})-?(\d{3})-?(\d{4})$/;
  var isValid = phoneNumberPattern.test(value);

  var feedbackNode = document.getElementById('phoneFeedback');
  feedbackNode.style.display = "inline-block";

  if (isValid) {
    feedbackNode.style.display = "inline-block";
    feedbackNode.textContent = "Sending test message...";

    var submitData = {
      mobile: value.replace(/-/g, ''),  // We just care about the numbers in the phone number
      userName: window.CST.facultyUser.name   // Include user's name in test message
    }
    saveAndTestNumber(submitData, (result) => {
      if (result.err) {
        feedbackNode.innerHTML = "Error occured when saving phone number: <I>" + result.err + "</I>";
      } else {
        feedbackNode.textContent = "A test message has been sent to saved phone number " + value;
      }
    
      // Give user a way to delete the phone number.
      var btnDelete = document.getElementById('btnDeletePhone');
      btnDelete.disabled = false;

      // TODO: Send a test message
      
    });
  } else {
    feedbackNode.innerHTML = "<I>" + value + "</I> is not a valid number. Please enter 10-digit U.S. phone number in the format ###-###-####. For example: <I>202-555-0108</I>" ;
  }
}


function deletePhone() {
  // The only way for the user to turn off SMS notifications is to remove
  // their phone number for the database.

  updateDashUser({ mobile: null }, () => {

    var txtPhone = document.getElementById('txtPhone');
    txtPhone.value = '';

    var feedbackNode = document.getElementById('phoneFeedback');
    feedbackNode.style.display = "none";
    // feedbackNode.textContent = '';

    // We don't need the delete button anymore
    var btnDelete = document.getElementById('btnDeletePhone');
    btnDelete.disabled = true;
  });
}


/******************** Create Google Doc Functions ********************/

function showCreateGDocForm(iSupeCourseId, assignment, docName) {

  // Find name of teacher candidate, to pass to merge template
  var candidateName = '';
  for(var term of window.CST.terms) {
    for (var student of term.students) {
      var foundAssignment = student.assignment_overrides.find( e => e.id === assignment.id);
      if (foundAssignment) {
        candidateName = student.name;
      }
    }
  }
  
  // Modal add form behavior:
  // 05.29.2019 tps Modal behavior experiment: Clicking [Esc] closes the form
  var modal = document.getElementById('createGDocDiv');
  document.onkeyup = function(evt) {
    if (modal.style.display === 'block') {
      var key = event.key || event.keyCode; // Cover old, old browsers
      if (key === 'Escape' || key === 'Esc' || key === 27) {
        cancelCreateGDoc();
        return true;
      }
    }
  }

  // // When the user clicks anywhere outside of the modal form, close it
  // var modal = document.getElementById('createGDocDiv');
  // window.onclick = function(event) {

  //   if (event.target == modal) {
  //     modal.style.display = "none";

  //     // Clear any error messages
  //     document.getElementById('createGDocErrMsg').style.display = "none";
  //   }
  // }

  // Populate data form with values we'll need to submit the request.
  document.getElementById('createGDocName').value = docName;
  document.getElementById('createGDocAssignmentId').value = assignment.id;
  document.getElementById('createGDocCourseId').value = iSupeCourseId;
  document.getElementById('createGDocAssJson').value = JSON.stringify(assignment.critiqueit_data.data);
  document.getElementById('createGDocCandidateName').value = candidateName;

  // Display modal form
  modal.style.display = 'block';
  document.getElementById('createGDocName').focus();
}


function cancelCreateGDoc() {
  document.getElementById('createGDocDiv').style.display='none';
  document.getElementById('createGDocErrMsg').style.display = "none";   // Clear error messages
}


function submitCreateGDoc() {  

  // Clear any previous error message.
  const errMsg = document.getElementById('createGDocErrMsg')
  errMsg.style.display = "none";

  // Don't bother if user didn't specify a document name
  const docName = document.getElementById('createGDocName').value.trim();
  if (docName === '') return false;

  // Disable form so over-excited user can't keep creating the same document.
  document.getElementById('btnCreateGDocSubmit').disabled = true;
  document.getElementById('btnCreateGDocCancel').disabled = true;

  document.getElementById('createGDocWaitMsg').style.display = "inline";  // Why do this?

  // Gather the form data we'll need to create the Google Doc.
  var postString = 'docName=' + encodeURIComponent(docName)
    + '&targetEmail=' + encodeURIComponent(window.CST.facultyUser.login_id)
    + '&candidateName=' + encodeURIComponent(document.getElementById('createGDocCandidateName').value)
    + '&data=' + encodeURIComponent(document.getElementById('createGDocAssJson').value)

  var httpRequest = new XMLHttpRequest();
  if (!httpRequest) {
    alert('Giving up :( Cannot create an XMLHTTP instance');
    done();
    return false;
  }

  httpRequest.onreadystatechange = createGDocHandler;
  httpRequest.open('POST', window.CST.appLocation + 'api/v0/google/drive/doc', true);
  httpRequest.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
  httpRequest.send(postString);

  function createGDocHandler() {
    if ((httpRequest.readyState === XMLHttpRequest.DONE) && (httpRequest.status === 200)) {

      // Reset the modal form
      document.getElementById('btnCreateGDocCancel').disabled = false;
      document.getElementById('btnCreateGDocSubmit').disabled = false;
      document.getElementById('createGDocWaitMsg').style.display = "none";
      document.getElementById('createGDocDiv').style.display='none';
      document.getElementById('createGDocErrMsg').style.display = "none"; // Clear any error messages
      
      var response = JSON.parse(httpRequest.responseText);
      if (response.errDuplicateName) {
        // Handle duplicate document name
        showDupeGDoc(confirmHandler);
      } else if (response.errGoogleApi) {
        // Handle unexpected Google API error
        showErrDialog({ textContent: JSON.stringify(response.errGoogleApi, null, 2) }, function() {} );
      } else {
        // Show link to resulting document
        showCreateGDocResultForm(httpRequest.responseText);
      }
    } // end request ready
  } // end request handler
}

// Handle user choice when there is a duplicate Google Doc name.
function confirmHandler(isOk) {

  var createGDocModal = document.getElementById('createGDocDiv');
  var inputField = document.getElementById('createGDocName');

  if (isOk) {
    // User wants to try using suggested document name to avoid duplicate doc names
    
    // Grab suggested document name from the duplicate name form
    var suggestedNameNode = document.getElementById('dupeGDocNameSuggested');
    var suggestedName = suggestedNameNode.textContent;
    inputField.value = suggestedName;

    // Re-run the create document form
    closeOnEscapeKeypress(createGDocModal, cancelCreateGDoc);
    createGDocModal.style.display = 'block';
    submitCreateGDoc();
  } else {
    // User doesn't want to use suggested name.
    // Return user to the create doc form's previous state
    closeOnEscapeKeypress(createGDocModal, cancelCreateGDoc);
    createGDocModal.style.display = 'block';
    inputField.focus();
  }
} // end function


/******************** Create Google Doc Result Functions ********************/

function showCreateGDocResultForm(resultText) {

  // Modal add form behavior:
  // 05.29.2019 tps Modal behavior experiment: Clicking [Esc] closes the form
  var modal = document.getElementById('createGDocResultDiv');
  closeOnEscapeKeypress(modal, cancelCreateGDocResult);

  // Populate form with document creation result.
  // document.getElementById('createGDocResultTextArea').value = resultText;

  // Link to new document
  var result = JSON.parse(resultText);
  var anchor = document.getElementById('createGDocResultLink');
  var link = result.docLink;
  anchor.href = link;
  anchor.text = link;

  // Say stuff about the new document
  var contentDiv = document.getElementById('createGDocResultText');
  var textContent = `Created Google Doc "${result.docName}" in folder "${result.folderName}"`;
  contentDiv.textContent = textContent;

  // Display modal form
  modal.style.display = 'block';
  document.getElementById('btnCreateGDocResultCancel').focus(); // [Enter] closes modal
}


function cancelCreateGDocResult() {
  document.getElementById('createGDocResultDiv').style.display='none';
}


/******************** Google Doc Duplicate Name Functions ********************/

function showDupeGDoc(callback) {
/*
callback signature: (result)
  result is boolean true if user selects "OK"
  result is boolean false if user selects "Cancel"
*/

  var modal = document.getElementById('dupeGDocDiv');

  function hideDupeGDoc() {
    modal.style.display='none';
  }
  
  function okHandler() {
    hideDupeGDoc();
    callback(true);
  }

  function cancelHandler() {
    hideDupeGDoc();
    callback(false);
  }

  // Wire up buttons to callback
  var okButton = document.getElementById('btnDupeGDocSubmit');
  okButton.onclick = okHandler;

  var cancelButton = document.getElementById('btnDupeGDocCancel');
  cancelButton.onclick = cancelHandler;

  var crossSpan = document.getElementById('dupeGDocCross');
  crossSpan.onclick = cancelHandler;

  // Clicking [Esc] closes the form
  closeOnEscapeKeypress(modal, cancelHandler);

  // Populate feedback form

  // Grab document name that didn't work from the create Google Doc form
  var docNameInput = document.getElementById('createGDocName');
  var docName = docNameInput.value;
  var dupeNameNode = document.getElementById('dupeGDocNameExists');
  dupeNameNode.textContent = docName;
  var suggestedNameNode = document.getElementById('dupeGDocNameSuggested');
  suggestedNameNode.textContent = docName + ' ' + (new Date()).toLocaleDateString('en-US');

  // var textNode = document.getElementById('dupeGDocTextContent');
  // textNode.textContent = options.textContent;
  // // var suggestedName = dupeDocName + ' ' + (new Date()).toLocaleDateString('en-US');
  // textNode.textContent = `A document named: "${dupeDocName}" already exists. Would you like to try the name: "${suggestedName}" instead?`;

  // Display modal form
  modal.style.display = 'block';
  okButton.focus(); // [Enter] is [Yes]
}


/******************** Error Modal Dialog Functions ********************/

function showErrDialog(options, callback) {
  // callback signature: ()

  var modal = document.getElementById('errDialogDiv');

  function hideModal() {
    modal.style.display='none';
    callback();
  }
  
  // Wire up buttons to callback
  var okButton = document.getElementById('btnErrDialogSubmit');
  okButton.onclick = hideModal;

  var crossSpan = document.getElementById('errDialogCross');
  crossSpan.onclick = hideModal;

  // Clicking [Esc] closes the form
  closeOnEscapeKeypress(modal, hideModal);

  // Populate feedback form

  // Grab document name that didn't work from the create Google Doc form
  var textContentNode = document.getElementById('errDialogTextContent');
  textContentNode.textContent = options.textContent;

  // Display modal form
  modal.style.display = 'block';
  okButton.focus();
}

/******************** Utility Functions ********************/

function closeOnEscapeKeypress(modal, callback) {
  // callback signature: ()
  document.onkeyup = function(evt) {
    if (modal.style.display === 'block') {
      var key = evt.key || evt.keyCode; // Cover old, old browsers
      if (key === 'Escape' || key === 'Esc' || key === 27) {
        callback();
        return true;
      }
    }
  }
}

// Test for an empty object, e.g. {}
function isEmpty(obj) {
  for(var prop in obj) {
    if(obj.hasOwnProperty(prop)) {
      return false;
    }
  }
  return true;
}