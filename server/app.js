/**
* Copyright 2017 IBM Corp. All Rights Reserved.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*       http://www.apache.org/licenses/LICENSE-2.0
*
*  Unless required by applicable law or agreed to in writing, software
*  distributed under the License is distributed on an "AS IS" BASIS,
*  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
*  See the License for the specific language governing permissions and
*  limitations under the License.
*/

/*jslint node: true*/
/*jslint es6 */
"use strict";

const fs = require("fs");
const watson = require("watson-developer-cloud");
const express = require("express");
const application = express();
const formidable = require("formidable");
const vcapServices = require("vcap_services");
const credentials = vcapServices.getCredentials("watson_vision_combined");
const child_process = require("child_process");

const visual_recognition = watson.visual_recognition({
    api_key: "f2e7cae6557d6386aaa13465545062319f84fa0d",
    version: "v3",
    version_date: "2016-05-20"
});

var custom_classifier = null;

/**
* promises
*
* get classifiers. Set global
* create classifier. IF global set, return it
* test classifier. Use global, or get first and then use
* 
* create funtion to chain them all...
*/

function listClassifiersPromise(){
  var class_id;
  var classifiers;
  return new Promise(function(resolve, reject){
    visual_recognition.listClassifiers({},
      function(err, response) {
        if(err)
          reject(err);
        else{
          classifiers = JSON.parse(JSON.stringify(response)).classifiers;
          console.log("classifiers: " + classifiers[0]);
          if (classifiers[0] == null || classifiers[0] == undefined) {
            console.log("got here")
            resolve();
            return;
          }
          class_id = JSON.parse(JSON.stringify(response)).classifiers[0]["classifier_id"]; 
          console.log("class_id: " + class_id);
          if (~class_id.indexOf('dogs')){
          custom_classifier = class_id
          console.log("custom_classifier: " + custom_classifier);
          }
          resolve(JSON.parse(JSON.stringify(response)));
        } //end else
      })
  })
}
  
function CreateClassifierPromise(){
  return new Promise(function(resolve, reject){
    console.log("CreateClassifierPromise custom_classifier: " + custom_classifier);
    if (custom_classifier){
      resolve();
      console.log("Have customClassifier, resolve and return"):
      return;
    }
    else{
      var params = {
        name: 'dogs',
        Beagle_positive_examples: fs.createReadStream('./dog_data/Beagle.zip'),
        Husky_positive_examples: fs.createReadStream('./dog_data/Husky.zip'), 
        GoldenRetriever_positive_examples: fs.createReadStream('./dog_data/GoldenRetriever.zip'),
        negative_examples: fs.createReadStream('./dog_data/Cats.zip')
      };

    visual_recognition.createClassifier(params,
      function(err, response) {
        if (err){
          console.log(err);
          reject(err);
        }
        else{
          console.log(JSON.stringify(response, null, 2));
          resolve();
        }
      });
  }
});
};

function pollListClassifiersPromise(){
  var class_id;
  var classifiers;
  var i = 0;
  return new Promise(function(resolve, reject){
    while (i<10 && custom_classifer = null){
    visual_recognition.listClassifiers({},
      function(err, response) {
        if(err)
          reject(err);
        else{
          if (classifiers[0] == null || classifiers[0] == undefined) {
            console.log("model building iteration: " + i)
            child_process.execSync("sleep 5");
            i++;
            continue;
          }
          class_id = JSON.parse(JSON.stringify(response)).classifiers[0]["classifier_id"]; 
          console.log("Created class_id: " + class_id);
          if (~class_id.indexOf('dogs')){
          custom_classifier = class_id
          console.log("Created custom_classifier: " + custom_classifier);
          }
          resolve(JSON.parse(JSON.stringify(response)));
          return;
        } //end else
      })
  }//end while
  })
}

function init_class(){
  listClassifiersPromise()
  .then(CreateClassifierPromise())
  .then(pollListClassifiersPromise());
}

function init_classifier(){
  var checkExistingClassifier = listClassifiersPromise();
  var class_id;

  checkExistingClassifier.then(function(result){
    class_id = JSON.parse(JSON.stringify(result)).classifiers[0]["classifier_id"]; 
    console.log("class_id: " + class_id);
    if (~class_id.indexOf('dogs')){
     custom_classifier = class_id
     console.log("custom_classifier: " + custom_classifier);
     }
  })
  .catch(function(error){
    console.log("not found. Create one");
  });
   
};
  
console.log("before: custom_class: " + custom_classifier);
init_class();
console.log("after: custom_class: " + custom_classifier);

application.use(express.static(__dirname + "/public"));
application.post("/uploadpic", function (req, result) {
    const form = new formidable.IncomingForm();
    form.keepExtensions = true;
    form.parse(req, function (err, fields, files) {
        if (err) {
            console.log(err);
        } else {
            const filePath = JSON.parse(JSON.stringify(files));
            const params = {
                image_file: fs.createReadStream(filePath.myPhoto.path),
                classifier_ids: [custom_classifier],
                threshold: 0
            };
            visual_recognition.classify(params, function (err, res) {
                if (err) {
                    console.log(err);
                } else {
                    const labelsvr = JSON.parse(JSON.stringify(res)).images[0].classifiers[0];
                    result.send({data: labelsvr});
                }
            });
        }
    });
});
const port = process.env.PORT || process.env.VCAP_APP_PORT || 3000;
application.listen(port, function () {
    console.log("Server running on port: %d", port);
});
require("cf-deployment-tracker-client").track();
