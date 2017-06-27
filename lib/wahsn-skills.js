  // Function to add gogole speradsheet skills matrix to the skills dataset
exports.skillsInit = function(input, output, context)  {
  "use strict"

  const Promise = require("bluebird");
  const google = require('googleapis');
  const googleAuth = require('google-auth-library');

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
  googleValues.getAsync(spreadSheetObj)
    .then((response) => {
      console.log(response);
      output.debug("Skills Import done.");
    })
    .catch((err) => {
      console.log(err);
    });
};
