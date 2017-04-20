
(function() {
  "use strict";

  const databot = require("./lib/init-datasets");
  const input = require("nqm-databot-utils").input;
  input.pipe(databot);
}());
