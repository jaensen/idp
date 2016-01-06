const level = require('level');
const forkdb = require('forkdb');
const Promise = require('bluebird');

const forkdbHelper = require('./db.js');
const config = require('../config.json');

dbHandle = forkdb(level(config.db.level), {dir: config.db.fork});

exports.put = function (id, document) {
    return forkdbHelper.put(dbHandle, document, id);
};

exports.get = function (id) {
    return forkdbHelper.get(dbHandle, id);
};

/**
 * Adds a new container.
 * @param resourceId
 * @param type
 * @param rel
 * @param resource
 * @param member
 * @returns {Promise} A promise which will contain the new container.
 */
exports.addContainer = function (resourceId, type, rel, resource, member) {
    return new Promise(function (accept, reject) {
        var container = {
            '@context': 'https://w3id.org/plp/v1',
            '@graph': [
                {
                    'id': resourceId,
                    'type': ['Container'],
                    'rel': rel,
                    'resource': resource,
                    'member': member
                }
            ]
        };

        exports.put(resourceId, container)
            .then(function (hash) {
                accept(container);
            })
            .catch(reject);
    });
}

/**
 * Adds a resource to the db and returns its new id.
 * @param resource
 * @returns {Promise}
 */
exports.addResource = function(resource) {
    return new Promise(function(accept,reject) {

        var id = config.baseUri + uuid.v4();
        var graph = memberResource['@graph'];
        graph.id = id;

        exports.put(id, memberResource).then(function() {
            accept(id);
        }).catch(reject);
    });
}

/**
 * Adds an entity to a container.
 * @param containerResourceId the container id
 * @param memberResource the document to add
 * @returns {Promise} A promise that will contain the new resource id.
 */
exports.addToContainer = function (containerResourceId, memberResource) {
    return new Promise(function(accept,reject) {
        exports.addResource(memberResource).then(function(id) {
            exports.addMemberToContainer(containerResourceId, id).then(function() {
                accept(id);
            }).catch(reject);
        }).catch(reject);
    });
}

/**
 * Adds an existing entity to an existing container.
 * @param containerResourceId
 * @param memberResourceId
 * @returns {Promise} A promise that will contain the updated container.
 */
exports.addMemberToContainer = function (containerResourceId, memberResourceId) {
    return new Promise(function (accept, reject) {

        exports.get(containerResourceId).then(function (containerResource) {

            containerResource['member'].push(memberResourceId);

            exports.put(containerResourceId, containerResource)
                .then(function (_) {
                    accept(containerResource);
                })
                .catch(reject);
        })
        .catch(reject);
    });
}

/**
 * Adds a new profile
 * @param resourceId
 * @param keyContainerId
 * @param profileOwnerName
 * @returns {Promise} A promise that contains the profile.
 */
exports.addProfile = function (resourceId, keyContainerId, profileOwnerName) {
    return new Promise(function (accept, reject) {
        var profile = {
            '@context': 'https://w3id.org/plp/v1',
            '@graph': [
                {
                    'id': resourceId + '#id',
                    'type': ['Person', 'foaf:Person', 'schema:person'],
                    'name': profileOwnerName
                },
                {
                    'id': keyContainerId,
                    'type': ['Container'],
                    'rel': ['sec:publicKey'],
                    'resource': resourceId + '#id'
                }
            ]
        };

        exports.put(resourceId, profile)
            .then(function (hash) {
                accept(profile);
            })
            .catch(reject);
    });
}

/**
 * Links an existing container to an existing profile.
 * @param profileResourceId
 * @param containerId
 * @returns {Promise} A promise that contains the updated profile.
 */
exports.addContainerToProfile = function (profileResourceId, containerId) {
    return new Promise(function (accept, reject) {

        exports.get(profileResourceId).then(function (profileResource) {

            exports.get(containerId).then(function (containerResource) {

                var type = containerResource['@graph'].type;
                var rel = containerResource['@graph'].rel;
                var resource = containerResource['@graph'].resource;

                profileResource['@graph'].push(
                    {
                        'id': containerId,
                        'type': type,
                        'rel': rel,
                        'resource': resource
                    });

                exports.put(profileResourceId, profileResource).then(function(hash) {
                    accept(profileResource);
                })
                .catch(reject);
            })
            .catch(reject);
        })
        .catch(reject);
    });
}

/**
 * Adds a new key.
 * @param resourceId
 * @param ownerResourceId
 * @param publicKey
 * @returns {Promise} A promise that will contain the new key.
 */
exports.addKey = function (resourceId, ownerResourceId, publicKey) {
    return new Promise(function (accept, reject) {
        var key = {
            '@context': 'https://w3id.org/plp/v1',
            '@graph': [
                {
                    'id': resourceId,
                    'type': ['sec:Key'],
                    'sec:owner': ownerResourceId,
                    'sec:publicKeyPem': publicKey
                }
            ]
        };
        exports.put(resourceId, key)
            .then(function (hash) {
                accept(key);
            })
            .catch(reject);
    });
}