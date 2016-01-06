const level = require('level');
const forkdb = require('forkdb');
const forkdbHelper = require('./../database/db.js');
const uuid = require('node-uuid');
const config = require('./../config.json');
const _ = require('lodash');
const fetch = require('node-fetch');
const Promise = require('bluebird');

/**
 * Verifies the origin of a signature
 * @param {object} signature The signature
 * @returns {Promise} a promise that will either return 'true' or 'false'
 */
exports.IdentityRepository.prototype.verifyOrigin = function(signature) {
    return new Promise(function(accept, reject) {
        /*
         "https://w3id.org/security#signature": {
            "@type": "https://w3id.org/security#GraphSignature2012",
            "http://purl.org/dc/terms/created": {
                "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
                "@value": "2016-01-05T21:57:00Z"
              },
              "http://purl.org/dc/terms/creator": {
                "@id": "http://localhost:3000/486237bb-626e-474c-8f46-8b47e9198274/cb455d27-a5ca-4523-ab8a-558b1c8081b8"
              },
              "https://w3id.org/security#signatureValue": "PkNLvz8m3Y18jJfnEcAJHD3yqhaTPs7w/pzv34NHQAZb4XTnOanH2a6fDPVdpXSWmwOf3HiHm6xZKyFdUDroI+2eIgSOVoRdXtQQBT8k8RMC11HgAQ3BsGfUktzw8Wzx5g59KqCu1ZggRkD4nv9c2ok22BaUJCsDJ8JhsEIaej55EgcMqfz0oivGHZh0CTmjR+f40+w6MHyoGQzY0moNb8C+8EMj36eiD/lE70YVjztfTRwXUObkXVUOzgyB3lSTH8GoOs/2SB4aeV8w0ie4Kqy0DpFnLA97CVJ7+RSpi5NDLhxsBxDLGfCk6rOiTUwQ4OSY+YhHNs8Eqgghisd4ug=="
          }
         */

        var actualSignature = signature['https://w3id.org/security#signature'];
        var creator = actualSignature['http://purl.org/dc/terms/creator'];
        var keyId =  creator['@id'];

        fetch(keyId)
            .then(function(res) {
                return res.json();
            }).then(function(key) {
                /*
                 {
                     "@context": "https://w3id.org/plp/v1",
                     "http://localhost:3000/486237bb-626e-474c-8f46-8b47e9198274/cb455d27-a5ca-4523-ab8a-558b1c8081b8#id": [
                         {
                             "id": "http://localhost:3000/486237bb-626e-474c-8f46-8b47e9198274/cb455d27-a5ca-4523-ab8a-558b1c8081b8#id",
                             "type": "sec:Key",
                             "sec:owner": "http://localhost:3000/486237bb-626e-474c-8f46-8b47e9198274#id",
                             "sec:publicKeyPem": "-----BEGIN PUBLIC KEY----- \nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEArjGZZB8a7tXccAVPzSwM \ncE5xjBwDv5Auq8mzNdG0ks6p1RBN0XBWu2Y4RNLbG8v6v8GOMXltVexUAm+cp2rm \n2pFcl3uo2Ya8gsGXZVaQ3VITn6ywKahChQqkWz49R4R++hKTBnF85m81gybWg5gp \nyOkoIR3QIUeV9P36zA+X9kDvXlPtORW8NH3HHoJt25WezZFPDkwatnq68+08LnxE \nCFUI2DckdV29RNJgud9k22qfmWDtd2FWWnS/3zp7EDpNHQcegvtjrZkkIzu+f8+n \nENRFTDjcd/9BucC7TS2/iu/3fqsDMMXLuSEbteJF57/NwLladauBl4nUtUIbypIm \nzwIDAQAB \n-----END PUBLIC KEY-----"
                         }
                     ]
                 }
                 */

                // FIXME To #id or not to id
                var actualKey = key[keyId];
                var actualKeyId = keyId;
                if (typeof actualKey === "undefined") {
                    actualKey = key[keyId + "#id"];
                    actualKeyId = keyId + "#id";
                }

                if (typeof actualKey === "undefined"){
                    reject("Couldn't find a key with id " + keyId + " on the server.");
                    return;
                }

                var actualOwnerId = actualKey["sec:owner"];

                fetch(actualOwnerId)
                    .then(function(res) {
                        return res.json();
                    }).then(function(profile) {
                        /*
                         {
                             "@context": "https://w3id.org/plp/v1",
                             "http://localhost:3000/486237bb-626e-474c-8f46-8b47e9198274#id": [
                                 {
                                     "id": "http://localhost:3000/486237bb-626e-474c-8f46-8b47e9198274#id",
                                     "type": [
                                         "Person",
                                         "foaf:Person",
                                         "schema:Person"
                                     ],
                                    "name": "Max Mustermann"
                                 },
                                 {
                                     "id": "http://localhost:3000/486237bb-626e-474c-8f46-8b47e9198274/56d338a9-42ec-441d-820b-ba7f2af180ef",
                                     "type": [
                                        "Container"
                                     ],
                                     "rel": [
                                        "sec:publicKey"
                                     ],
                                     "resource": "http://localhost:3000/486237bb-626e-474c-8f46-8b47e9198274#id"
                                 }
                             ],
                             "http://localhost:3000/486237bb-626e-474c-8f46-8b47e9198274/56d338a9-42ec-441d-820b-ba7f2af180ef": [
                                 {
                                     "id": "http://localhost:3000/486237bb-626e-474c-8f46-8b47e9198274/56d338a9-42ec-441d-820b-ba7f2af180ef",
                                     "type": [
                                        "Container"
                                     ],
                                     "rel": [
                                        "sec:publicKey"
                                     ],
                                     "resource": "http://localhost:3000/486237bb-626e-474c-8f46-8b47e9198274#id",
                                     "contains": [
                                        "http://localhost:3000/486237bb-626e-474c-8f46-8b47e9198274/cb455d27-a5ca-4523-ab8a-558b1c8081b8#id",
                                     ]
                                 }
                             ]
                         }
                         */

                        var actualContainer = getKeyContainerFromProfile(profile, actualOwnerId, reject);

                        // FIXME To #id or not to id
                        var isValid = _.includes(actualContainer.contains, keyId) || _.includes(actualContainer.contains, keyId + "#id");
                        if (isValid)
                            accept(true);
                        else
                            accept(false);
                    })
                    .catch(reject);
            })
            .catch(reject);
    });
};