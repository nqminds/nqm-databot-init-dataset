module.exports = (function() {
  "use strict";

  const Promise = require("bluebird");
  const _ = require("lodash");
  const JSON_TYPE = "json";
  const DATASET_TYPE = "dataset";

  function databot(input, output, context) {
    "use strict";

    let datasetMapData = [];
    let datasetAccountsData = [];
    let datasetMapDictionary = {};

    // Retrieve the dataset map that map default resources to datasets
    context.tdxApi.getDatasetDataAsync(input.datasetMap, null, null, null)
      .then((response) => {
        datasetMapData = response.data;
        
        return context.tdxApi.getDatasetDataAsync(input.datasetAccounts, null, null, null)
      })
      .then((response) => {
        datasetAccountsData = response.data;

        // Iterate over the list of dataset maps
        return Promise.each(datasetMapData, (entry) => {
          let resourcePromise;

          switch(entry.type) {
            case JSON_TYPE: // JSON file type
              resourcePromise = context.tdxApi.getRawFileAsync(entry.resourceIn);
              break;
            case DATASET_TYPE: // Dataset type
              resourcePromise = context.tdxApi.getDatasetDataAsync(entry.resourceIn, null, null, null);
              break;
            default:
              resourcePromise = Promise.reject(new Error("Unknown resource type!"));
              break;
          }

          return resourcePromise.then((result)=>{
            datasetMapDictionary[entry.resourceIn] = result.data;
            return Promise.resolve(entry.resourceIn);
          });
        });
      })
      .then((result) => {

        // Iterate over the accounts list
        return Promise.each(datasetAccountsData, (account) => {

          // Iterate over the dataset list
          output.debug("Saving account: %s\n", account.accountName);
          return Promise.each(datasetMapData, (mapData) => {
            // Change the field value
            _.forEach(datasetMapDictionary[mapData.resourceIn], (entry) => {
              entry[mapData.field] = account.accountName;
            })
            output.debug("Saving dataset: %s", mapData.description);
            return context.tdxApi.addDatasetDataAsync(mapData.resourceOut, datasetMapDictionary[mapData.resourceIn])
              .then((response) => {
                console.log(response);
                output.debug("Added: %d entries", datasetMapDictionary[mapData.resourceIn].length);
                return Promise.resolve(response);
              })
          });
        });
      })
      .then(() => {
        output.debug("Import done.")
      })
      .catch((err) => {
        output.abort("Error: %s", err);
      });
  }

  return databot;
}());
