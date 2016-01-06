const sign = require('./signatures.js');
const identities = require('./identities.js');
const config = require('./config.json');

var repository = new identities.IdentityRepository();


exports.getProfileOrKey = function(request, reply) {
    const parts = request.params.uri.split('/');

    if (parts.length == 1) {
        exports.getProfile(request, reply);
    } else if (parts.length == 2) {
        exports.getKey(request, reply);
    } else {
        reply("Sucker! Wrong url.");
    }
};

exports.getProfile = function(request, reply) {
    repository.findProfile(config.baseUri + request.params.uri).then(function(document) {
        reply(JSON.stringify(document));
    });
};

exports.getKey = function(request, reply) {
    const parts = request.params.uri.split('/');

    var profileUri = parts[0];
    var keyId = parts[1];

    repository.findKey(config.baseUri + profileUri, keyId).then(function(key) {
        reply(JSON.stringify(key));
    });
};

exports.githubAuth = function (request, reply) {
    if (!request.auth.isAuthenticated) {
        return reply(Boom.unauthorized('Authentication failed: ' + request.auth.error.message));
    }

    request.auth.session.set(request.auth.credentials);

    var creds = request.auth.credentials;

    console.log(JSON.stringify(creds));

    return reply.redirect('/');
};

exports.createProfile = function(request, reply) {

    var pub =   "-----BEGIN PUBLIC KEY----- \n" +
                "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEArjGZZB8a7tXccAVPzSwM \n" +
                "cE5xjBwDv5Auq8mzNdG0ks6p1RBN0XBWu2Y4RNLbG8v6v8GOMXltVexUAm+cp2rm \n" +
                "2pFcl3uo2Ya8gsGXZVaQ3VITn6ywKahChQqkWz49R4R++hKTBnF85m81gybWg5gp \n" +
                "yOkoIR3QIUeV9P36zA+X9kDvXlPtORW8NH3HHoJt25WezZFPDkwatnq68+08LnxE \n" +
                "CFUI2DckdV29RNJgud9k22qfmWDtd2FWWnS/3zp7EDpNHQcegvtjrZkkIzu+f8+n \n" +
                "ENRFTDjcd/9BucC7TS2/iu/3fqsDMMXLuSEbteJF57/NwLladauBl4nUtUIbypIm \n" +
                "zwIDAQAB \n" +
                "-----END PUBLIC KEY-----";

    var profile = new identities.Profile(config.baseUri, "Max Mustermann", pub);
    repository.create(profile);

    console.log("Created new profile: " + profile.identityUriWithHash);
};

exports.addKey = function(request, reply) {
    var pub =   "-----BEGIN PUBLIC KEY----- \n" +
        "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEArjGZZB8a7tXccAVPzSwM \n" +
        "cE5xjBwDv5Auq8mzNdG0ks6p1RBN0XBWu2Y4RNLbG8v6v8GOMXltVexUAm+cp2rm \n" +
        "2pFcl3uo2Ya8gsGXZVaQ3VITn6ywKahChQqkWz49R4R++hKTBnF85m81gybWg5gp \n" +
        "yOkoIR3QIUeV9P36zA+X9kDvXlPtORW8NH3HHoJt25WezZFPDkwatnq68+08LnxE \n" +
        "CFUI2DckdV29RNJgud9k22qfmWDtd2FWWnS/3zp7EDpNHQcegvtjrZkkIzu+f8+n \n" +
        "ENRFTDjcd/9BucC7TS2/iu/3fqsDMMXLuSEbteJF57/NwLladauBl4nUtUIbypIm \n" +
        "zwIDAQAB \n" +
        "-----END PUBLIC KEY-----";

    repository.addKey("http://localhost:3000/486237bb-626e-474c-8f46-8b47e9198274", pub).then(function(result) {
       console.log(JSON.stringify(result));
    });
};

exports.verify = function(request, reply) {
    var o = {
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
    }

    repository.verifyOrigin(o);
};