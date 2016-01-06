const config = require('./../config.json');
const repo = require('../database/repository.js');
const uuid = require('node-uuid');

exports.get = function(request, reply) {

    if (typeof request.params.uri === "undefined"){
        reply("Bad request");
        return;
    }

    var uri = config.baseUri + request.params.uri;

    repo.get(uri).then(function(data) {
        reply(JSON.stringify(data));
    })
    .catch(function(err) {
        reply(JSON.stringify(err));
    });
};


exports.addToContainer = function(request, reply) {

    if (typeof request.params.uri === "undefined"){
        reply("Bad request");
        return;
    }

    var containerUri = config.baseUri + request.params.uri;
    repo.addToContainer(containerUri, request.payload);
};

exports.createProfile = function(request, reply) {
    var profileId = config.baseUri + uuid.v4();
    var keyContainerId = profileId + '/' + uuid.v4();
    var keyId = profileId + '/' + uuid.v4();

    repo.addKey(keyId, profileId, "public key")
        .then(function(key) {
            repo.addContainer(keyContainerId, 'Container', 'sec:publicKey', profileId, [keyId]).then(function(container) {

                console.log(JSON.stringify(container));

                repo.addProfile(profileId, keyContainerId, "owner name").then(function(profile) {
                    reply(JSON.stringify(profile));
                });
            });
        });
};