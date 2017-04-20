module.exports = (function() {
  "use strict";

  const Promise = require("bluebird");
  const shortid = require("shortid");

  function databot(input, output, context) {
    "use strict";

    context.tdxApi.getRawFileAsync("rJe6Q6BIRl")
      .then((response) => {
        console.log(response);
      })
      .catch((err) => {
        console.log(err);
      });
  }

  return databot;
}());
