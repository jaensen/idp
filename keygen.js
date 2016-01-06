const forge = require('node-forge');

exports.createKeyPair = function () {
    var keypair = forge.pki.rsa.generateKeyPair({bits: 2048, e: 0x10001});
    var privatePem = forge.pki.privateKeyToPem(keypair.privateKey);
    var publicPem = forge.pki.publicKeyToPem(keypair.publicKey);

    return {
        "privatePem": privatePem,
        "publicPem": publicPem
    };
};