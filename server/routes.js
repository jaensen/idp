const handlers = require('./handlers.js');

/**
 * Sets up the routes.
 * @param {Hapi.Server} server
 */
exports.setupRoutes = function(server)
{
    server.route({
        method: 'GET',
        path: '/{uri*}',
        config: {
            handler: handlers.get
        }
    });

    server.route({
        method: 'POST',
        path: '/',
        config: {
            handler: handlers.createProfile
        }
    });
/*
    server.route({
        method: 'POST',
        path: '/{uri*}',
        config: {
            handler: handlers.addToContainer
        }
    });*/
};