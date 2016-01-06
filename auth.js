/**
 * Sets up the auth modules.
 * @param {Hapi.Server} server
 */
exports.setupAuth = function(server)
{
    // Register bell and hapi-auth-cookie with the server
    server.register([require('hapi-auth-cookie'), require('bell')], function (err) {

        //Setup the session strategy
        server.auth.strategy('session', 'cookie', {
            password: 'secret_cookie_encryption_password', //Use something more secure in production
            redirectTo: '/auth/github', //If there is no session, redirect here
            isSecure: false //Should be set to true (which is the default) in production
        });

        //Setup the social Twitter login strategy
        server.auth.strategy('github', 'bell', {
            provider: 'github',
            password: 'secret_cookie_encryption_password', //Use something more secure in production
            clientId: '93c9e8e9a79665b2a20e',
            clientSecret: '1bd311e39eb8a42c046b59b9d2c4025f6ead727d',
            isSecure: false //Should be set to true (which is the default) in production
        });
    });
};