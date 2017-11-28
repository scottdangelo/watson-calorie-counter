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
  return new Promise(function(resolve, reject){
    visual_recognition.listClassifiers({},
      function(err, response) {
        if(err)
          reject(err);
        else
          class_id = JSON.parse(JSON.stringify(result)).classifiers[0]["classifier_id"]; 
          console.log("class_id: " + class_id);
          if (~class_id.indexOf('dogs')){
          custom_classifier = class_id
          console.log("custom_classifier: " + custom_classifier);
          }
          resolve(JSON.parse(JSON.stringify(response)));
      })
  })
}
  
function CreateClassifierPromise(){
  return new Promise(function(resolve, reject){
    if (custom_classifier != null){
      resolve;
    }
    else
    var params = {
      name: 'vehicle-damage-analyzer',
  BrokenWindshield_positive_examples: fs.createReadStream('./data/BrokenWindshield.zip'),
    FlatTire_positive_examples: fs.createReadStream('./data/FlatTire.zip'),
    MotorcycleAccident_positive_examples: fs.createReadStream('./data/MotorcycleAccident.zip'),
    Vandalism_positive_examples: fs.createReadStream('./data/Vandalism.zip'),
  negative_examples: fs.createReadStream('./data/Negatives.zip')
};

  visual_recognition.createClassifier(params,
    function(err, response) {
      if (err)
        console.log(err);
      else
        console.log(JSON.stringify(response, null, 2));
    })
  })
};

function init_class(){
  listClassifiersPromise()
  .then(CreateClassifierPromise);
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
  
init_class();
console.log("before: custom_class: " + custom_classifier);
//init_classifier()
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
