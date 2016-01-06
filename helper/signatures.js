var jsonld = require('jsonld');
var jsigs = require('jsonld-signatures')();
var Promise = require('bluebird');

/**
 * Wrapper type for the public key and the key owner's uri.
 * @param {String} uri
 * @param {String} pem
 * @constructor
 */
exports.PublicKey = function(uri, pem) {
    this.key = {
        "@context":jsigs.SECURITY_CONTEXT_URL,
        // FIXME: Find out what the id exactly means and how to properly get/construct it...
        "id": uri + "keys/1",
        "type": "CryptographicKey",
        publicKeyPem: pem
    };
    this.owner = {
        '@context': jsigs.SECURITY_CONTEXT_URL,
        id: uri,
        publicKey: this.key
    };
};

/**
 * Wrapper type for the private key and the key owner's uri.
 * @param {String} uri
 * @param {String} pem
 * @constructor
 */
exports.PrivateKey = function(uri, pem)
{
    this.uri = uri;
    this.pem = pem;
};

/**
 * Signs a document with the supplied key.
 * @param {object} doc
 * @param {PrivateKey} privateKey
 * @returns {Promise}
 */
exports.sign = function(privateKey, doc)
{
    return new Promise(function(accept, reject)
    {
        jsigs.sign(doc, {
            algorithm: 'GraphSignature2012',
            privateKeyPem: privateKey.pem,
            creator: privateKey.uri
        }, function(err, signedDocument) {
            if (err)
                reject(err);
            else
                accept(signedDocument);
        });
    });
};

/**
 * Verifies the signature of a document and returns a Promise that evaluates
 * either to 'true' or 'false' depending on the result of the validation.
 * @param {object} signedDoc
 * @param {PublicKey} publicKey
 * @returns {Promise}
 */
exports.verify = function(publicKey, signedDoc)
{
    return new Promise(function(accept, reject) {
        jsigs.verify(signedDoc, {
            publicKey: publicKey.key,
            publicKeyOwner: publicKey.owner
        }, function (err, verified) {
            if (err) reject(err);
            else accept(verified);
        });
    });
};