
(function() {
  "use strict";

  const databot = require("./lib/wahsn-functions");
  const input = require("nqm-databot-utils").input;
  input.pipe(databot);
}());
