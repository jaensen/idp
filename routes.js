const handlers = require('./handlers.js');

/**
 * Sets up the routes.
 * @param {Hapi.Server} server
 */
exports.setupRoutes = function(server)
{
    server.route({
        method: 'GET',
        path: '/auth/github',
        config: {
            auth: 'github', //<-- use our twitter strategy and let bell take over
            handler: handlers.githubAuth
        }
    });

    server.route({
        method: 'GET',
        path: '/auth/success',
        config: {
            auth: "session",
            handler: function(request, reply) {
                reply("Servus!");
            }
        }
    });

    server.route({
        method: 'GET',
        path: '/createProfile',
        config: {
            handler: handlers.createProfile
        }
    });

    server.route({
        method: 'GET',
        path: '/addKey',
        config: {
            handler: handlers.addKey
        }
    });

    server.route({
        method: 'GET',
        path: '/verifyOrigin',
        config: {
            handler: handlers.verify
        }
    });

    // Profile request
    server.route({
        method: 'GET',
        path: '/{uri*}',
        config: {
            handler: handlers.getProfileOrKey
        }
    });
};