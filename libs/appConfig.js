/* Module that encapsulates loading & storing static configuration files.
Expose config file contents & timestamp for Web site admins.
05.08.2018 tps Created.
05.15.2018 tps Can we store the configuration data in this module instead of app locals?
06.11.2018 tps Add configuration item for CST admins.
07.06.2018 tps Add configuration file for generating assignment redirect URLs utility.
07.27.2018 tps Add YAML configuration file for mustache templates.
10.08.2019 tps Fix async series call.
12.17.2019 tps Use new configuration files for restored access students.

TODO: Refactor to use dashSemesters.js instead of this for term configurations.
*/

const async = require('async');
const fs = require('fs');
const csvUtils = require('./csvUtils');
const yaml = require('js-yaml');
const dashSemesters = require('./dashSemesters');


//******************** Module Config Object Store ********************//
var termsConfig = {};
var addsConfig = {};
var assDesc = {};
var cstAdminsConfig = {};
var assUrlCourses = {};
var mustacheTemplates = {};


//******************** Constants ********************//
// File paths are relative to root folder.
// const TERMS_CONFIG_FILE       = 'config/terms_config.json';
const ADDS_CONFIG_FILE        = 'config/add_config.csv'
const GOOGLE_ASS_DESC_FILE    = 'config/assignment_description.html';
const CST_ADMINS_CONFIG_FILE  = 'config/cst_admins.csv';
const ASS_URL_COURSES_FILE    = 'config/assignment_url_courses.json';
const MUSTACHE_TEMPLATES_FILE = 'config/mustache.yaml';

//******************** Load all config items ********************//

function loadAll(callback) {
  // Callback signature: (err)
  console.log("Loading config files");

  async.series([
    // loadTermsConfig,
    loadAddsConfig,
    loadGoogleAssDesc,
    loadCstAdmins,
    loadAssUrlCourses,
    loadMustacheTemplates
  ], callback);
}

//******************** Load individual config items ********************//

// function loadTermsConfig(callback) {
//   // Callback signature: (err)
//   fs.readFile(TERMS_CONFIG_FILE, 'utf8', (err, data) => {
//     if (err) return callback(err);
//     try {
//       const json = JSON.parse(data);
//       termsConfig = new ConfigItem(TERMS_CONFIG_FILE, json);
//       return callback();
//     } catch(parseErr) {
//       return callback(parseErr);
//     }
//   }); // end readFile callback
// }

function loadAddsConfig(callback) {
  // Callback signature: (err)
  csvUtils.parseFile(ADDS_CONFIG_FILE, (err, json) => {
    if (err) return callback(err);
    addsConfig = new ConfigItem(ADDS_CONFIG_FILE, json);
    return callback();
  });
}

function loadGoogleAssDesc(callback) {
  // Read the description text for a new Google assignment from a text file into module store.
  // callback signature: (err)
  fs.readFile(GOOGLE_ASS_DESC_FILE, 'utf8', (err, data) => {
    if (err) return callback(err);
    assDesc = new ConfigItem(GOOGLE_ASS_DESC_FILE, data);
    return callback();
  }); // end readFile callback
}

function loadCstAdmins(callback) {
  // Read in CSV file containing list of CST admins.
  csvUtils.parseFile(CST_ADMINS_CONFIG_FILE, (err, json) => {
    if (err) return callback(err);
    cstAdminsConfig = new ConfigItem(CST_ADMINS_CONFIG_FILE, json);
    return callback();
  });
}

function loadAssUrlCourses(callback) {
  // Callback signature: (err)
  fs.readFile(ASS_URL_COURSES_FILE, 'utf8', (err, data) => {
    if (err) return callback(err);
    try {
      const json = JSON.parse(data);
      assUrlCourses = new ConfigItem(ASS_URL_COURSES_FILE, json);
      return callback();
    } catch(parseErr) {
      return callback(parseErr);
    }
  }); // end readFile callback
}

function loadMustacheTemplates(callback) {
  // Callback signature: (err)
  fs.readFile(MUSTACHE_TEMPLATES_FILE, 'utf8', (err, data) => {
    if (err) return callback(err);
    try {
      const doc = yaml.safeLoad(data);
      mustacheTemplates = new ConfigItem(MUSTACHE_TEMPLATES_FILE, doc);
      return callback();
    } catch(parseErr) {
      console.log('inside loadMoustacheTemplates', parseErr);
      return callback(parseErr);
    }
  }); // end readFile callback
}

function getTermsConfigItem() {
  // 12.17.2019 tps Return a flattened version of the term configurations,
  //                including terms with restored access.
  let allConfigs = [];
  for (let semester of dashSemesters.getAll()) {
    allConfigs.push(semester.terms_config);
  }
  return new ConfigItem('', allConfigs);
}

function getTerms() {
  return getTermsConfigItem().value;
}

//******************** Helper Functions ********************//

//******************** ConfigItem Class ********************//

class ConfigItem {
  constructor(filePath, value) {
    this.filePath = filePath;
    this.value = value;
    this.timestamp = new Date();
  }
}


//******************** Exports ********************//
exports.loadAll = loadAll;

// exports.loadTerms = loadTermsConfig;
exports.loadAdds = loadAddsConfig;
exports.loadGoogleAssDesc = loadGoogleAssDesc;
exports.loadCstAdmins = loadCstAdmins;
exports.loadAssUrlCourses = loadAssUrlCourses;
exports.loadMustacheTemplates = loadMustacheTemplates;

// exports.getTerms              = function () { return termsConfig.value; };
exports.getTerms              = getTerms;
exports.getAdds               = function () { return addsConfig.value; };
exports.getGoogleAssDesc      = function () { return assDesc.value; };
exports.getCstAdmins          = function () { return cstAdminsConfig.value; };
exports.getAssUrlCourses      = function () { return assUrlCourses.value; };
exports.getMustacheTemplates  = function () { return mustacheTemplates.value };

// exports.getTermsConfigItem              = function () { return termsConfig; };
exports.getTermsConfigItem              = getTermsConfigItem;
exports.getAddsConfigItem               = function () { return addsConfig; };
exports.getGoogleAssDescConfigItem      = function () { return assDesc; };
exports.getCstAdminsConfigItem          = function () { return cstAdminsConfig; };
exports.getAssUrlCoursesItem            = function () { return assUrlCourses; };
exports.getMustacheTemplatesConfigItem  = function () { return mustacheTemplates; };
