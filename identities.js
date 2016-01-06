const level = require('level');
const forkdb = require('forkdb');
const forkdbHelper = require('./db.js');
const uuid = require('node-uuid');
const config = require('./config.json');
const _ = require('lodash');
const fetch = require('node-fetch');
const Promise = require('bluebird');
const forge = require('node-forge');

/**
 * Creates a new Profile object.
 * @param {String} host
 * @param {String} name
 * @param {String} publicKey
 * @constructor
 */
exports.Profile = function (host, name, publicKey) {

    if (host === "undefined")
        throw "No host specified";
    if (name === "undefined")
        throw "No name specified";
    if (publicKey === "undefined")
        throw "No publicKey specified";

    var identityUUID = uuid.v4();
    this.host = host;
    this.identityUri = this.host + identityUUID;
    this.identityUriWithHash = this.identityUri + "#id";
    var keyContainerUri = this.host + identityUUID + "/" + uuid.v4();
    var keyEntryUri = this.host + identityUUID + "/"  + uuid.v4() + "#id";

    this.identity = [
        {
            "id": this.identityUriWithHash,
            "type": [
                "Person",
                "foaf:Person",
                "schema:Person"
            ],
            "name": name
        },
        {
            "id": keyContainerUri,
            "type": [
                "Container"
            ],
            "rel": [
                "sec:publicKey"
            ],
            "resource": this.identityUriWithHash
        }
    ];

    this.keyContainer = [
        {
            "id": keyContainerUri,
            "type": [
                "Container"
            ],
            "rel": [
                "sec:publicKey"
            ],
            "resource": this.identityUriWithHash,
            "contains": [
                keyEntryUri
            ]
        }
    ];

    this.keyEntry = [
        {
            "id": keyEntryUri,
            "type": "sec:Key",
            "sec:owner":this.identityUriWithHash,
            "sec:publicKeyPem": publicKey
        }
    ];

    this.profile = { "@context": "https://w3id.org/plp/v1" };
    this.profile[this.identityUriWithHash] = this.identity;
    this.profile[keyContainerUri] = this.keyContainer;
    this.profile[keyEntryUri] = this.keyEntry;
};

exports.IdentityRepository = function() {
    this.dbHandle = forkdb(level(config.db.level), {dir: config.db.fork});
};

/**
 * Creates a new identity from a Profile object.
 * @param {Profile} identity The identity
 * @returns {Promise} A promise with the document's hash
 */
exports.IdentityRepository.prototype.create = function(identity) {
    return forkdbHelper.put(this.dbHandle, identity.profile, identity.identityUri);
};

/**
 * Queries a profile by its uri..
 * @param uri The uri
 * @returns {object} The profile
 */
exports.IdentityRepository.prototype.findProfile = function(uri) {
    return forkdbHelper.get(this.dbHandle, uri);
};

/**
 * Queries a key in a profile.
 * @param {string] profileUri
 * @param {string] keyId
 * @returns {Promise}
 */
exports.IdentityRepository.prototype.findKey = function(profileUri, keyId) {
    var self = this;
    return new Promise(function(accept,reject) {
        self.findProfile(profileUri).then(function(document) {
            var key = document[profileUri + "/" + keyId];

            // FIXME To #id or not to id
            if (typeof key === "undefined")
                key = document[profileUri + "/" + keyId + "#id"];

            if (typeof key === "undefined") {
                reject("The key with the id " + profileUri + "/" + keyId + " could not be found");
                return;
            }

            var result = {
                "@context":"https://w3id.org/plp/v1"
            };
            result[key[0].id] = key[0];

            accept(result);
        });
    });
};

function isPublicKeyContainer(o) {
    return _.includes(o.type,"Container") && _.includes(o.rel,"sec:publicKey");
};

function getId(o) {
    var id = o.id;
    if (typeof id === "undefined")
        id = o["@id"];

    return id;
};

function getKeyContainerFromProfile(profile, uri, reject) {

    var d = profile[uri + "#id"];
    if (typeof d === "undefined")
        d = profile[uri];

    var containterLink = _.find(d, isPublicKeyContainer);

    if (typeof containterLink === "undefined")
        reject("A stored profile has no public key container. (" + uri + ")");

    var containerId = getId(containterLink);
    var actualContainer = _.find(profile[containerId], isPublicKeyContainer);

    if (typeof actualContainer === "undefined")
        reject("Public key container not found. (" + containerId + ")");

    return actualContainer;
}

/**
 * Adds a new key to a profile
 * @param uri {string} The uri
 * @param key {string} The key
 * @returns {Promise} Evaluates to an object with 'keyId' and 'hash' properties
 */
exports.IdentityRepository.prototype.addKey = function(uri, key) {
    var self = this;
    return new Promise(function(accept, reject) {
        var newKeyEntry = {
                "id": uri + "/" + uuid.v4(),
                "type": "sec:Key",
            // FIXME To #id or not to id
                "sec:owner":uri + "#id",
                "sec:publicKeyPem": key
        };

        self.findProfile(uri).then(function(document) {

            var actualContainer = getKeyContainerFromProfile(document, uri, reject);

            if (typeof actualContainer.contains === "undefined") {
                actualContainer.contains = [
                ];
            }

            // add the new key entry's id
            actualContainer.contains.push(newKeyEntry.id);

            // add the nw key entry
            document[newKeyEntry.id] = [
                newKeyEntry
            ];

            // Update the document
            forkdbHelper.put(self.dbHandle, document, uri).then(function(hash) {
                accept({
                    "keyId": newKeyEntry.id,
                    "hash": hash
                });
            })
            .catch(reject);
        });
    });
};

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