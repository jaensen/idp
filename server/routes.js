const handlers = require('./handlers.js');

/**
 * Sets up the routes.
 * @param {Hapi.Server} server
 */
exports.setupRoutes = function(server)
{
    // Profile request
    server.route({
        method: 'GET',
        path: '/{uri*}',
        config: {
            handler: handlers.get
        }
    });
};