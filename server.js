const Hapi = require('hapi');
const server = new Hapi.Server();

server.connection({
    port: 3000
});

const routes = require('./server/routes.js');
routes.setupRoutes(server);

// Start the server
server.start(function(err)
{
    if (err) {
        throw err;
    }
    console.log('Server running at:', server.info.uri);
});