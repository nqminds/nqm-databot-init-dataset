  // Function to add gogole speradsheet skills matrix to the skills dataset
exports.skillsInit = function(input, output, context)  {
  "use strict"

  const Promise = require("bluebird");
  const google = require('googleapis');
  const googleAuth = require('google-auth-library');
  const _ = require("lodash");

  const NO_TYPE = "none";
  const NO_COMPETENCY = "N";
  // Total number of parameters {"conditionType, "condition", "function"}
  const NUM_PARAMETERS = 3;
  const CHUNK_SIZE = 1000;

  // Authorize a client with the loaded credentials, then call the
  // Google Sheets API.
  const credentials = context.packageParams.clientSecret;
  const clientSecret = credentials.installed.client_secret;
  const clientId = credentials.installed.client_id;
  const redirectUrl = credentials.installed.redirect_uris[0];
  const auth = new googleAuth();
  const oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

  oauth2Client.credentials = context.packageParams.tokenSecret;

  const sheets = google.sheets('v4');
  const spreadSheetObj = {
    auth: oauth2Client,
    spreadsheetId: context.packageParams.skillsMatrixSheetId,
    range: context.packageParams.skillsMatrixSheetName
  };

  const googleValues = Promise.promisifyAll(sheets.spreadsheets.values);

  // Retrieve the values from the google spreadsheet
  const skillsEntries = [];
  googleValues.getAsync(spreadSheetObj)
    .then((response) => {
      const rows = response.values;

      // Return error if no spreadsheet metadata found
      if (!rows.length) {
        const err = new Error("Spreadsheet table is empty");
        return Promise.reject(err);
      }

      let columnIdx = 0;
      const mapMetadata = {};
      const mapIndex = {};
      const currentTimestamp = Date.now();

      // Map metadata row[0] to index and vice versa
      _.forEach(rows[0], (value) => {
        mapIndex[columnIdx] = value;
        mapMetadata[value] = columnIdx++;
      })

      // Iterate over all the rows of the spreadsheet
      const rowData = _.drop(rows);

      _.forEach(rowData, (value) => {
        const workforceEntry = _.drop(value, NUM_PARAMETERS);
        columnIdx = NUM_PARAMETERS;

        // Iterate over workforce competencies
        _.forEach(workforceEntry, (entry) => {
          const type = mapIndex[columnIdx++];
          const jsonEntry = {
            serviceId: context.packageParams.serviceId,
            date: currentTimestamp,
            conditionType: value[mapMetadata["conditionType"]] ? value[mapMetadata["conditionType"]] : NO_TYPE,
            condition: value[mapMetadata["condition"]] ? value[mapMetadata["condition"]] : NO_TYPE,
            function: value[mapMetadata["function"]] ? value[mapMetadata["function"]] : NO_TYPE,
            workforceType: type,
            competent: entry ? entry : NO_COMPETENCY,
          };
          skillsEntries.push(jsonEntry);
        });
      })

      // Truncate the dataset before adding data
      return context.tdxApi.truncateDatasetAsync(input.datasetSkills);
    })
    .then((response) => {
      // Split the array into chunks
      const chunks = _.chunk(skillsEntries, CHUNK_SIZE);

      // Iterate over all chunks
      return Promise.each(chunks, (entries) => {
        // Add skills entries
        return context.tdxApi.addDatasetDataAsync(input.datasetSkills, entries);
      });
    })
    .then(() => {
      output.debug("Added skills.");
    });
};
