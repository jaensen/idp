const config = require('./../config.json');
const repo = require('../database/repository.js');

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