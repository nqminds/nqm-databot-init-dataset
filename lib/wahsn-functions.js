module.exports = (function() {
  "use strict";

  const Promise = require("bluebird");
  const _ = require("lodash");
  const JSON_TYPE = "json";
  const DATASET_TYPE = "dataset";

  // Check if tdx return the "data already exists with key"" error
  function checkTdxKeyAddError(err) {
    let keyError = false;
    const errorName = err.name || "";

    if (errorName === "TDXApiError") {
      const errMessage = JSON.parse(err.message);
      if (errMessage.from === "dataset/data/createMany") {
        const failure = JSON.parse(errMessage.failure);
        if (failure.message.indexOf("data already exists with key") >= 0)
          keyError = true;
      }
    }

    return keyError;
  }

  // Initialises all the datasets with for agive account list and sets of templates
  function datasetsInit(input, output, context) {
    let datasetMapData = [];
    let datasetAccountsData = [];
    let datasetMapDictionary = {};
    
    // Retrieve the dataset map that map default resources to datasets
    return context.tdxApi.getDatasetDataAsync(input.datasetMap, null, null, null)
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
            output.debug("Saving dataset: %s for user: %s", mapData.description, account.accountName);
            return context.tdxApi.addDatasetDataAsync(mapData.resourceOut, datasetMapDictionary[mapData.resourceIn])
              .then((response) => {
                output.debug("Added: %d entries", datasetMapDictionary[mapData.resourceIn].length);
                return Promise.resolve(response);
              })
              .catch((err) => {
                // Check if key is already added, continue
                if (checkTdxKeyAddError(err))
                  return Promise.resolve({});
                else
                  return Promise.reject(err);
              })
          });
        });
      })
      .then(() => {
        output.debug("Import done.");
      });
  }

  function databot(input, output, context) {
    switch (input.function) {
      case "datasetsInit":
        datasetsInit(input, output, context)
          .catch((err) => {                  
            output.error("Error: %s", err.message);
          });
        break;
      default:
        output.error("No function selected!");
    }
  }

  return databot;
}());
