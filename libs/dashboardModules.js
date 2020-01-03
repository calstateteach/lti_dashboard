/* Module that builds a version of the course modules JSON that is convenient
for the dashboard & assignment navigation API to use.
Problem is that the Canvas modules API doesn't give us enough detail to determine
if a quiz is an assignment type or survey type. We would like to treat assigment quizzes
as assignments.
Also, as of fall 2018, a dashboard module may consist of multiple Canvas modules.

Assumes that modules & quizzes data have already been retrieved & cached.

06.19.2018 tps Created.
09.24.2019 tps For restored access courses, add function to build with a supplied term configuration.
*/

const canvasCache = require('./canvasCache');
const appConfig   = require('./appConfig');

function build(courseId, callback) {
  // Callback signature: (err, json)

  return buildWithTermConfig(courseId, appConfig.getTerms(), callback);
  
  // var json = [];  // Populate with adapted version of modules data
  // const termConfig = appConfig.getTerms().find( e => e.course_id === courseId);
  // const dashboardModules = termConfig.dashboard_modules;
  // const canvasModules = canvasCache.getCourseModules(courseId);
  // const assignments = canvasCache.getCourseAssignments(courseId);
  // // const quizzes = canvasCache.getCourseQuizzes(courseId);

  // for (let dashboardModule of dashboardModules) {
  //   // Populate a new dashboard-level module
  //   const newModule = {
  //     "name":       dashboardModule.name,
  //     "has_survey": false,    // We'll populate later
  //     "items_count": 0,       // We'll populate later
  //     "items":      []
  //   };

  //   // Loop through the Canvas modules making up the dashboard module.
  //   for (let i = 0; i < dashboardModule.module_indices.length; ++i) {

  //     // Gather the dashboard module's assignments.
  //     const canvasModuleIndex = dashboardModule.module_indices[i];
  //     const canvasModule = canvasModules[canvasModuleIndex];

  //     for (let item of canvasModule.items) {

  //       if (item.type === "Assignment") {
  //         // Add an assignment item
  //         const newItem = {
  //           "id":           item.id,
  //           "title":        item.title,
  //           "position":     item.position,
  //           "indent":       item.indent,
  //           "type":         "Gradeable",
  //           "assignment_id":item.content_id,
  //           "quiz_id":      null,
  //           "module_id":    item.module_id,
  //           "html_url":     item.html_url,
  //           "page_url":     item.page_url,
  //           "url":          item.url,
  //           "published":    item.published
  //         };

  //         // I'd like to include if the assignment contains a rubric,
  //         // in which case the dashboard will display rubric assessment data.
  //         // We have to lookup the assignment record to find this out.
  //         const assignment = assignments.find( e => e.id === item.content_id);
  //         newItem['has_rubric'] = assignment && ('rubric' in assignment);

  //         newModule.items.push(newItem);
  //         ++newModule.items_count; 

  //       } else if (item.type ==='Quiz') {
  //         // There are different types of quizzes.
  //         // Assignment quizzes should be treated like assignments.
  //         // Survey quizzes should be treated like surveys.

  //         const quiz = canvasCache.getCourseQuizzes(courseId).find( e => e.id === item.content_id);

  //         if (quiz && (quiz.quiz_type === 'assignment')) { 
  //           const newItem = {
  //             "id":           item.id,
  //             "title":        item.title,
  //             "position":     item.position,
  //             "indent":       item.indent,
  //             "type":         'Gradeable',
  //             "assignment_id":quiz.assignment_id,
  //             "quiz_id":      null,
  //             "module_id":    item.module_id,
  //             "html_url":     item.html_url,
  //             "url":          item.url,
  //             "published":    item.published
  //           };

  //           newModule.items.push(newItem);
  //           ++newModule.items_count; 
  //         }

  //         if (quiz && (quiz.quiz_type === 'survey')) { 
  //           const newItem = {
  //             "id":           item.id,
  //             "title":        item.title,
  //             "position":     item.position,
  //             "indent":       item.indent,
  //             "type":         'Survey',
  //             "assignment_id":null,
  //             "quiz_id":      quiz.id,
  //             "module_id":    item.module_id,
  //             "html_url":     item.html_url,
  //             "url":          item.url,
  //             "published":    item.published
  //           };

  //           newModule.has_survey = true;
  //           newModule.items.push(newItem);
  //           ++newModule.items_count; 
  //         }

  //       } // We don't care about any other types of items.
  //     } // End loop through Canvas module's assignments
  //   } // End loop through dashboard module's Canvas modules.
  
  //   json.push(newModule);
  // } // End loop through course's dashboard modules.

  // return callback(null, json);
}

// 09.24.2019 tps Build using supplied term configuration.
function buildWithTermConfig(courseId, termsConfig, callback) {
  // Callback signature: (err, json)
  
  var json = [];  // Populate with adapted version of modules data
  const termConfig = termsConfig.find( e => e.course_id === courseId);
  const dashboardModules = termConfig.dashboard_modules;
  const canvasModules = canvasCache.getCourseModules(courseId);
  const assignments = canvasCache.getCourseAssignments(courseId);
  // const quizzes = canvasCache.getCourseQuizzes(courseId);

  for (let dashboardModule of dashboardModules) {
    // Populate a new dashboard-level module
    const newModule = {
      "name":       dashboardModule.name,
      "has_survey": false,    // We'll populate later
      "items_count": 0,       // We'll populate later
      "items":      []
    };

    // Loop through the Canvas modules making up the dashboard module.
    for (let i = 0; i < dashboardModule.module_indices.length; ++i) {

      // Gather the dashboard module's assignments.
      const canvasModuleIndex = dashboardModule.module_indices[i];
      const canvasModule = canvasModules[canvasModuleIndex];

      for (let item of canvasModule.items) {

        if (item.type === "Assignment") {
          // Add an assignment item
          const newItem = {
            "id":           item.id,
            "title":        item.title,
            "position":     item.position,
            "indent":       item.indent,
            "type":         "Gradeable",
            "assignment_id":item.content_id,
            "quiz_id":      null,
            "module_id":    item.module_id,
            "html_url":     item.html_url,
            "page_url":     item.page_url,
            "url":          item.url,
            "published":    item.published
          };

          // I'd like to include if the assignment contains a rubric,
          // in which case the dashboard will display rubric assessment data.
          // We have to lookup the assignment record to find this out.
          const assignment = assignments.find( e => e.id === item.content_id);
          newItem['has_rubric'] = assignment && ('rubric' in assignment);

          newModule.items.push(newItem);
          ++newModule.items_count; 

        } else if (item.type ==='Quiz') {
          // There are different types of quizzes.
          // Assignment quizzes should be treated like assignments.
          // Survey quizzes should be treated like surveys.

          const quiz = canvasCache.getCourseQuizzes(courseId).find( e => e.id === item.content_id);

          if (quiz && (quiz.quiz_type === 'assignment')) { 
            const newItem = {
              "id":           item.id,
              "title":        item.title,
              "position":     item.position,
              "indent":       item.indent,
              "type":         'Gradeable',
              "assignment_id":quiz.assignment_id,
              "quiz_id":      null,
              "module_id":    item.module_id,
              "html_url":     item.html_url,
              "url":          item.url,
              "published":    item.published
            };

            newModule.items.push(newItem);
            ++newModule.items_count; 
          }

          if (quiz && (quiz.quiz_type === 'survey')) { 
            const newItem = {
              "id":           item.id,
              "title":        item.title,
              "position":     item.position,
              "indent":       item.indent,
              "type":         'Survey',
              "assignment_id":null,
              "quiz_id":      quiz.id,
              "module_id":    item.module_id,
              "html_url":     item.html_url,
              "url":          item.url,
              "published":    item.published
            };

            newModule.has_survey = true;
            newModule.items.push(newItem);
            ++newModule.items_count; 
          }

        } // We don't care about any other types of items.
      } // End loop through Canvas module's assignments
    } // End loop through dashboard module's Canvas modules.
  
    json.push(newModule);
  } // End loop through course's dashboard modules.

  return callback(null, json);
}

/******************** Module Exports *********************/
module.exports.build = build;
module.exports.buildWithTermConfig = buildWithTermConfig;