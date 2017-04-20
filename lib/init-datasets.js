module.exports = (function() {
  "use strict";

  const Promise = require("bluebird");
  const fs = require("fs");
  const path = require("path");
  const request = require("request");
  const databotUtils = require("nqm-databot-utils");
  const shortid = require("shortid");
  const util = require("util");
  const _ = require("lodash");
  const yazl = require("yazl");

  function databot(input, output, context) {
    "use strict";

    if (!input.sourceFile) {
      output.error("invalid args - sourceFile missing");
    }

    if (!input.targetResource) {
      output.debug("no target resource => creating a new resource");
      if (!input.targetType) {
        input.targetType = "json";
        output.debug("no target type => defaulting to 'json'");
      }
      if (!input.targetFolder) {
        input.targetFolder = "__scratch__";
        output.debug("no target folder => defaulting to scratch folder");
      }
    }

    if (!input.targetName && !input.targetResource) {
      input.targetName = `upload-${shortid.generate()}`;
      output.debug("warning - no target name given, auto-created with %s", input.targetName);
    }

    if (typeof input.compress === "undefined") {
      output.debug("no input for 'compress' => defaulting to true");
      input.compress = true;
    }

    if (!input.compress) {
      output.debug("WARNING - **NO COMPRESSION**");
    }

    let zipfile;
    let zipTemporaryFile;

    const createTargetDataset = function() {
      // If no target resource was given on input, create the target dataset now.
      if (input.targetResource) {
        output.debug("using existing resource %s", input.targetResource);
        return Promise.resolve(input.targetResource);
      } else {
        // Create a target dataset.
        output.debug(
          "about to create target dataset %s of type %s in folder %s",
          input.targetName,
          input.targetType,
          input.targetFolder
        );
        return context.tdxApi.createDatasetAsync(
          {
            parentId: input.targetFolder,
            name: input.targetName,
            basedOnSchema: input.targetType || "json",
          })
          .then(function(createResult) {
            output.debug("created dataset, id is %s", createResult.response.id);
            return createResult.response.id;
          })
          .catch(function(err) {
            output.abort("failed to create dataset: %s", err.message);
          });
      }
    };

    const createZip = function() {
      return new Promise(function(resolve, reject) {
        if (input.compress) {
          output.debug("compression - adding %s to archive", input.sourceFile);
          zipfile = new yazl.ZipFile();
          zipfile.addFile(input.sourceFile, path.basename(input.sourceFile));

          zipTemporaryFile = `${input.sourceFile}.${shortid.generate()}.zip`;
          output.debug("writing archive to %s", zipTemporaryFile);
          const sourceFileStream = fs.createWriteStream(zipTemporaryFile);
          sourceFileStream.on("error", reject);

          zipfile.outputStream.pipe(sourceFileStream)
            .on("close", () => {
              resolve(zipTemporaryFile);
            })
            .on("error", reject);

          zipfile.end();
        } else {
          resolve(input.sourceFile);
        }
      });
    };

    const tryUpload = function(datasetId, sourceFilePath, retryCount) {
      retryCount = retryCount || 0;
      output.debug("upload attempt #%d", retryCount);

      return new Promise((resolve, reject) => {
        const sourceFileStream = fs.createReadStream(sourceFilePath);

        // Build request options - use the auth token given to us by the databot host.
        const options = {};
        options.url = util.format(
          "%s/commandSync/resource/%s/%s",
          context.commandHost,
          datasetId,
          input.compress ? "compressedUpload" : "upload"
        );
        options.headers = {
          "Authorization": `Bearer ${context.authToken}`,
        };

        const baseName = path.basename(input.sourceFile) + (input.compress ? ".zip" : "");
        options.headers["Content-Disposition"] = `attachment; filename=\"${baseName}\"`;
        options.headers["Content-Length"] = databotUtils.file.fileSize(sourceFilePath);

        let haveError = "";

        const req = request.post(options);

        // Receive response data, checking for errors and progress updates.
        req.on("data", function(data) {
          data = data.toString();
          if (data.indexOf("error:") >= 0) {
            // There is an error in the response. This can happen if the request finishes
            // before an error occurs on the server, in which case it's too late to kill the request
            // at the server and fire the "error" event below.
            output.error(data);
            haveError = `${haveError}${data} | `;
          } else {
            // No error => assume it's progress updates, which will be new-line delimited.
            const progress = data.toString().split("\n");
            _.forEach(progress, (p) => {
              if (p && p.length) {
                output.progress(parseInt(p));
              }
            });
          }
        });

        // Request has completed and response has ended.
        req.on("end", function() {
          if (haveError) {
            // An error was received in the response stream.
            output.error("error in response - upload failed");
            reject(new Error(haveError));
          } else {
            resolve();
          }
        });

        // Request failed.
        req.on("error", function(err) {
          output.error("error during upload: %s", err.message);
          reject(err);
        });

        // Pipe the source file to the request.
        sourceFileStream.pipe(req).on("error", reject);
      });
    };

    createTargetDataset()
      .then(function(datasetId) {
        try {
          // Check source file exists - attempt to open input stream.
          const sourceFileStream = fs.createReadStream(input.sourceFile);
          sourceFileStream.close();
        } catch (err) {
          output.abort(
            "can't open source file: %s.\nn.b. this databot needs to run local to the file system \
            containing the sourceFile. [%s]",
            input.sourceFile,
            err.message
          );
        }

        return [datasetId, createZip()];
      })
      .spread(function(datasetId, sourceFilePath) {
        const tidyUp = () => {
          if (input.compress) {
            // Delete the zip archive we created.
            output.debug("removing intermediate file %s", sourceFilePath);
            fs.unlink(sourceFilePath, function(err) {
              if (err) {
                output.debug("WARNING - failed to remove intermediate file %s", sourceFilePath);
              }
            });
          }
        };

        return tryUpload(datasetId, sourceFilePath, 1)
          .catch((err) => {
            output.error("upload 1 failed [%s]", err.message);
            return tryUpload(datasetId, sourceFilePath, 2);
          })
          .catch((err) => {
            output.error("upload 2 failed [%s]", err.message);
            return tryUpload(datasetId, sourceFilePath, 3);
          })
          .catch((err) => {
            tidyUp();
            output.error("upload 3 failed [%s]", err.message);
            output.abort("giving up after 3 attempts");
          })
          .then(() => {
            // All done.
            tidyUp();
            output.result({uploadedResourceId: datasetId});
            output.debug("upload complete");
          });
      });
  }

  return databot;
}());
