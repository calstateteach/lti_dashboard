/* Client-side JavaScript for My Rica folder copy utility page
12.06.2019 tps Created.
*/

// Wait for DOM to load before trying to read dashboard framework data
document.addEventListener("DOMContentLoaded", initPage);

var baseUrl;        // Populate with the base URL of the Web app.
var targetFolderId; // Populate with Google document ID of the target folder 

function initPage() {
  // alert('initPage');

  // Guess the base URL of the Web app, in case we're running behind a reverse proxy.
  let segments = window.location.href.split('/');
  segments = segments.slice(0, segments.length - 2);   // This page is 2 levels down from app root
  baseUrl = segments.join('/') + '/';
}

// function startCopy() {
//   const method = 'POST';
//   const endpoint = baseUrl + 'api/v0/google/drive/Mod7FileCopy';
//   xhrCall(method, null, endpoint, copySuccessHandler, copyFailHandler);

//   const btn = document.getElementById("button");
//   if (btn) {
//     btn.disabled = true;
//   }
// }

// function copySuccessHandler(res) {
//   const feedbackDiv = document.getElementById('feedback');
//   feedbackDiv.innerText = res;
//   trackProgress();
// }

// function copyFailHandler(res) {
//   const feedbackDiv = document.getElementById('feedback');
//   feedbackDiv.innerText = res;
// }


// function trackProgress() {
//   const method = 'GET';
//   const endpoint = baseUrl + 'api/v0/google/drive/Mod7FileCopy';
//   xhrCall(method, null, endpoint, progressHandler, progressHandler);
// }

// function progressHandler(res) {
//   console.log(res);
// }

/******************** Folder Copy Step: Create Target Folder ********************/

function createTarget() {
  const method = 'POST';
  const endpoint = baseUrl + 'api/v0/google/drive/Mod7TargetFolder';
  xhrCall(method, null, endpoint, createTargetHandlerOk, handlerFail);

  const btn = document.getElementById("button");
  if (btn) {
    btn.disabled = true;
  }

  appendFeedback('<SPAN STYLE="font-weight:bold">Progress:</SPAN>')
  appendFeedback('Initiating folder copy');
  setSpinnerDisplay(true);
}

function createTargetHandlerOk(res) {
  if (res.err) {
    appendError(res.err);
  }
  targetFolderId = res.targetFolderId;  // The copy operation later on will need this
  appendJson(res);
  appendFeedback('Copying files to Google Drive folder: <A HREF="' + res.targetFolderWebViewLink + '" target="_blank">' + res.targetFolderName + '</A>');
  listFolderChildren();
}

/******************** Folder Copy Step: List Files to Copy ********************/

function listFolderChildren() {
  const method = 'GET';
  const endpoint = baseUrl + 'api/v0/google/drive/Mod7SourceDocs';
  xhrCall(method, null, endpoint, listFolderChildrenOk, handlerFail);
  appendFeedback('Retrieving list of files to copy');
}

function listFolderChildrenOk(res) {
  if (res.err) {
    appendError(res.err);
  }
  appendJson(res);
  copyFolderChildren(res);
}


/******************** Folder Copy Step: Copy docs ********************/

function copyFolderChildren(docList) {

  var nextIndex = 0;  // Index of the next item to be processed
  const listLength = docList.length;

  // Display progress message
  function showProgress() {
    appendFeedback(`Copying file ${nextIndex + 1} of ${listLength}: <SPAN STYLE="font-style:italic;">${docList[nextIndex].name}</SPAN>`);  
  }

  // Call this after each document copy
  function postCopyCallback(err, newDoc) {
    if (err) return;  // Nothing else we can do if there's an error
  
    appendJson(newDoc);

    nextIndex++;

    // See if we've done copying all the source docs
    if(nextIndex === listLength) {
      appendFeedback(`Done copying ${listLength} of ${listLength} files`);
      setSpinnerDisplay(false);
      return;
    }
    else {
      // otherwise, call the iterator on the next item
      showProgress()
      copyDoc(docList[nextIndex], postCopyCallback);
    }
  }

  // instead of starting all the iterations, we only start the 1st one
  showProgress()
  copyDoc(docList[0], postCopyCallback);
}

function copyDoc(sourceDoc, callback) {
  // Callback signature: (err, <New doc object>)

  function copyDocHandlerOk(res) {
    return callback(null, res);
  }

  function copyDocHandlerFail(err) {
    handlerFail(err);
    return callback(err);
  }

  const method = 'POST';
  const data = 'sourceDocumentId=' + encodeURIComponent(sourceDoc.id)
             + '&targetDocumentName=' + encodeURIComponent(sourceDoc.name)
             + '&targetFolderId=' + encodeURIComponent(targetFolderId);
  const endpoint = baseUrl + 'api/v0/google/drive/Mod7DocCopy';
  xhrCall(method, data, endpoint, copyDocHandlerOk, copyDocHandlerFail);
}



/******************** Helper Functions ********************/

function xhrCall(method, data, endpoint, successHandler, failHandler) {
  var httpRequest = new XMLHttpRequest();
  if (!httpRequest) {
    return failHandler('Giving up :( Cannot create an XMLHTTP instance');
  }

  httpRequest.onreadystatechange = handler;
  httpRequest.open(method, endpoint, true);
  if (method.toUpperCase() === 'POST') {
    httpRequest.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
  }
  httpRequest.send(data);

  function handler() {
    if (httpRequest.readyState === XMLHttpRequest.DONE) {
      if (httpRequest.status === 200) {
        return successHandler(JSON.parse(httpRequest.response));
      } else {
        return failHandler(httpRequest.status);
      }
    }
  } // end handler function 
}

function handlerFail(res) {
  appendError('HTTP Status ' + res);
}

function appendError(err) {
  appendFeedback('An error occurred: ' + err);
  appendFeedback('You may need to copy the files manually.');
  setSpinnerDisplay(false);
}

function appendFeedback(s) {
  const feedbackDiv = document.getElementById('feedback');
  feedbackDiv.style.display = 'block';    // Starts off hidden
  const div = document.createElement('DIV');
  div.innerHTML = s;
  feedbackDiv.appendChild(div);
}

function appendJson(json) {
  // appendFeedback('<PRE>' + JSON.stringify(json, null, 2) + '</PRE>');
}

function setSpinnerDisplay(isDisplayed) {
  const spinnerDiv = document.getElementById('spinner');
  spinnerDiv.style.display = isDisplayed ? 'block' : 'none';
}