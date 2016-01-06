const Hapi = require('hapi');
const  handlers = require('./handlers.js');
const keygen = require('./keygen.js');

// generate RSA keypair
//console.log(JSON.stringify(keygen.createKeyPair()));

// Create a server with a host and port
const server = new Hapi.Server();

server.connection({
    port: 3000
});

const auth = require('./auth.js');
auth.setupAuth(server);

const routes = require('./routes.js');
routes.setupRoutes(server);

// Start the server
server.start(function(err)
{
    if (err) {
        throw err;
    }
    console.log('Server running at:', server.info.uri);
});