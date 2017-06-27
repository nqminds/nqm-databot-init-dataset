module.exports = (function() {
  "use strict";

  const Promise = require("bluebird");
  const _ = require("lodash");
  const shortId = require("shortid");
  const skillsInit = require("./wahsn-skills").skillsInit;
  const JSON_TYPE = "json";
  const DATASET_TYPE = "dataset";
  // Check if tdx return the "data already exists with key"
  // or "data does not exist with key" errors
  function checkTdxKeyError(err, type) {
    let keyError = false;
    const errorName = err.name || "";

    if (errorName === "TDXApiError") {
      const errMessage = JSON.parse(err.message);
      const failure = JSON.parse(errMessage.failure);
      if (errMessage.from === "dataset/data/createMany") {
        if (failure.message.indexOf("data already exists with key") >= 0)
          keyError = true;
      } else if (errMessage.from === "dataset/data/deleteMany") {
        if (failure.message.indexOf("data does not exist with key") >= 0)
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
    
    output.progress(0, "initialising");

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
        const accountSize = datasetAccountsData.length;
        let accountCount = 1;

        // Iterate over the accounts list
        return Promise.each(datasetAccountsData, (account) => {

          // Iterate over the dataset list
          output.debug("Saving account: %s\n", account.accountName);
          return Promise.each(datasetMapData, (mapData) => {
            // Change the field value
            _.forEach(datasetMapDictionary[mapData.resourceIn], (entry) => {
              entry[mapData.field] = account.accountId;
            })
            output.debug("Saving dataset: %s for user: %s", mapData.description, account.accountName);
            return context.tdxApi.addDatasetDataAsync(mapData.resourceOut, datasetMapDictionary[mapData.resourceIn])
              .then((response) => {
                output.debug("Added: %d entries", datasetMapDictionary[mapData.resourceIn].length);
                output.progress(100 * (accountCount++) / accountSize);

                return Promise.resolve(response);
              })
              .catch((err) => {
                // Check if key is already added, continue
                if (checkTdxKeyError(err)) {
                  output.debug("Entry already exists!");
                  output.progress(100 * (accountCount++) / accountSize);

                  return Promise.resolve({});
                } else
                  return Promise.reject(err);
              })
          });
        });
      })
      .then(() => {
        output.debug("Import done.");
      });
  }

  // Create the share key for the given practice
  function createPracticeAccount(practice, input, output, context) {
    output.debug("creating practice account for %s", practice.accountId);
    const secret = shortId.generate();

    // console.log("creating practice account for "+practice.accountId);
    return context.tdxApi.createShareTokenAsync(practice.accountId, context.packageParams.accountOwner, practice.accountName, secret)
    	.then(() => {
      	// Write the secret for the new share token back to the practice list dataset.
      	return context.tdxApi.updateDatasetDataAsync(
          input.datasetAccounts,
          {
            accountId: practice.accountId,
            accountSecret: secret
          }
        );
    	})
      .catch((err) => {
      	output.debug("failed to create share token for practice %s [%s]", practice.accountId, err.message);
        return Promise.resolve({});
    	});
  }

  // Creates accounts
  function createAccounts(input, output, context) {
    output.debug("retrieving practice list from %s", input.datasetAccounts);

    return context.tdxApi.getDatasetDataAsync(input.datasetAccounts)
  	  .then((response) => {
    	  const practiceList = response.data || [];
    	  output.debug("got %d practices", practiceList.length);

    	  return Promise.each(practiceList, (practice) => {
          // Create a single account
          return createPracticeAccount(practice, input, output, context);
        });
  	  });
  }

  // Change the dataset share (add or remove)
  function changeSharePractice(action, practice, shareList, output, context) {
    output.debug("Changing sharing %s.", practice.accountName);

    return Promise.each(shareList, (entry) => {
      if (action === "add") {
	      output.debug("adding %s share for %s to %s", entry.permission, practice.accountName, entry.datasetId);

        // Add share credentials depending on permission
        if (entry.permission === "r")
          return context.tdxApi.addResourceReadAccessAsync(entry.datasetId, practice.accountId);
        else if (entry.permission === "w")
          return context.tdxApi.addResourceWriteAccessAsync(entry.datasetId, practice.accountId);
        else if (entry.permission === "r/w")
          return context.tdxApi.addResourceReadAccessAsync(entry.datasetId, practice.accountId)
                  .then(context.tdxApi.addResourceWriteAccessAsync(entry.datasetId, practice.accountId));
        else
          return Promise.resolve({});
      } else if (action === "remove") {
        output.debug("removing %s share for %s to %s", entry.permission, practice.accountName, entry.datasetId);

        // Remove share credentials depending on permissions
        if (entry.permission === "r")
          return context.tdxApi.removeResourceReadAccessAsync(entry.datasetId, practice.accountId, context.packageParams.accountOwner);
        else if (entry.permission === "w")
          return context.tdxApi.removeResourceWriteAccessAsync(entry.datasetId, practice.accountId, context.packageParams.accountOwner);
        else if (entry.permission === "r/w")
          return context.tdxApi.removeResourceReadAccessAsync(entry.datasetId, practice.accountId, context.packageParams.accountOwner)
                  .then(context.tdxApi.removeResourceWriteAccessAsync(entry.datasetId, practice.accountId, context.packageParams.accountOwner));
        else
          return Promise.resolve({});
      }
    });
  }

  // Add sharing to each dataset the share list
  function changeShare(action, input, output, context) {
    let practiceList = [];
    let shareList = [];

    output.debug("retrieving practice list from %s", input.datasetAccounts);

    return context.tdxApi.getDatasetDataAsync(input.datasetAccounts)
  	  .then((response) => {
    	  practiceList = response.data || [];
    	  output.debug("got %d practices", practiceList.length);

        // Get the share list
        return context.tdxApi.getDatasetDataAsync(input.datasetShare);
      })
      .then((response) => {
        shareList = response.data || [];
        output.debug("got %d share datasets", shareList.length);

        // Add or remove credentials to each element in the share list
    	  return Promise.each(practiceList, (practice) => {
          return changeSharePractice(action, practice, shareList, output, context);
        });
  	  });
  }

  // Delete account data from a single dataset
  function deleteDatasetData(account, datasetMapData, output, context) {
    return Promise.each(datasetMapData, (mapData) => {
      output.debug("Removing account data from dataset: %s for user: %s", mapData.description, account.accountName);

      // Delete all entries with key account.accountId
      const entry = {};
      entry[mapData.field] = account.accountId;

      return context.tdxApi.deleteDatasetDataAsync(mapData.resourceOut, entry)
        .then((response) => {
          output.debug("Entries deleted!");

          return Promise.resolve(response);
        })
        .catch((err) => {
          // Check if key is already added, continue
          if (checkTdxKeyError(err)) {
            output.debug("Key does not exist!");

            return Promise.resolve({});
          } else
            return Promise.reject(err);
        })
      });
  }

  // Delete account data from all datasets
  function deleteAccountData(input, output, context) {
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
        const datasetAccountsData = response.data;
        const accountSize = datasetAccountsData.length;
        let accountCount = 1;

        // Iterate over the accounts list
        return Promise.each(datasetAccountsData, (account) => {
          // Iterate over the dataset list
          output.debug("Removing data for account: %s\n", account.accountName);
          return deleteDatasetData(account, datasetMapData, output, context);
        });
      })
      .then(() => {
        output.debug("Remove done.");
      });
  }

  // Databot commands
  function databot(input, output, context) {
    switch (input.function) {
      // For testing purposes
      case "datasetsInit":
        datasetsInit(input, output, context)
          .catch((err) => {                  
            output.error("Error: %s", err.message);
          });
        break;
      // Create the share keys
      case "createAccounts":
        createAccounts(input, output, context)
          .catch((err) => {
            output.error("Error: %s", err.message);
          });
        break;
      // Add share credentials to a dataset
      case "addShare":
        changeShare("add", input, output, context)
          .catch((err) => {
            output.error("Error: %s", err.message);
          }); 
        break;
      // Remove share credentials from a dataset
      case "removeShare":
        changeShare("remove", input, output, context)
          .catch((err) => {
            output.error("Error: %s", err.message);
          }); 
        break;
      // Careful!!!
      // Deletes the account data from a dataset
      case "deleteAccountData":
        deleteAccountData(input, output, context)
          .catch((err) => {
            output.error("Error: %s", err.message);
          });
        break;
      case "skillsInit":

        break;
      default:
        output.error("No function selected!");
    }
  }

  return databot;
}());
