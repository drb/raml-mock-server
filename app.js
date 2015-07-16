var program             = require('commander'),
    path                = require('path'),
    pkg                 = require( path.join(__dirname, 'package.json') );
    raml                = require('raml-js-parser'),
    fs                  = require('fs'),
    data                = fs.readFileSync('raml/services.raml', 'utf8'),
    stripJsonComments   = require('strip-json-comments'),
    express             = require('express'),
    randomWorld         = require('random-world'),
    _                   = require('underscore'),
    app                 = express(),
    port                = 0,
    responses           = {
        contentTypes: {
            json: 'application/json',
            mock: 'application/mock'
        },
        statuses: {
            OK:         "200",
            NotFound:   "204",
            BadRequest: "400",
            NoContent:  "204",
            Conflict:   "409"
        }
    };


/**
 * Listen for commandline options
 *
 * If everything provided, start the service
 */
program
    .version(pkg.version)
    .description('Starts a standalone server for mocking data on endpoints defined by RAML files.')
    .option('-p, --port <port>', 'Port on which to listen to (defaults to 3000)', parseInt)
    .option('-s, --source <source>', 'Path to the source RAML file')
    .parse(process.argv);

if (typeof program.port === 'undefined') {
   console.error('No port provided.');
   program.outputHelp();
   process.exit(1);
}

if (typeof program.source === 'undefined') {
   console.error('No source map provided.');
   program.outputHelp();
   process.exit(1);
}

port = program.port || 3000;


function makeEndpoints (data) {

    var resources = data.resources,
        traits = data.traits;

    function setupResources (resourceCollection, prefix) {

        resourceCollection.forEach(function (resource) {

            var hasTraits = resources.is,
                route = prefix + resource.relativeUri;

            if (resource.methods) {

                resource.methods.forEach(function(method) {

                    route = route.replace(/\{/, ':').replace('\}', '');

                    app[method.method](route, function (req, res) {

                        console.log('[%s]', method.method.toUpperCase(), route, req.url);

                        var headers = {
                                'X-Saddo': 123
                            },
                            mock = {
                                MockingData: false,
                                Status: "Please add application/mock to the RAML responses array for this method."
                            };

                        // attempt to get the mocking data
                        if (method.responses[responses.statuses.OK].body[responses.contentTypes.mock]) {
                            mock = method
                                    .responses[responses.statuses.OK]
                                    .body[responses.contentTypes.mock]
                                    .example;

                            mock = randomWorld.fromMock(mock);

                        // default to the json response - this is probably not very useful
                        } else if (method.responses[responses.statuses.OK].body[responses.contentTypes.json]) {

                            mock = stripJsonComments(method.responses[responses.statuses.OK].body[responses.contentTypes.json]);
                        }

                        // res.setHeaders(headers);
                        res.json(mock);
                    });
                });
            }

            if (resource.resources) {
                setupResources(resource.resources, prefix + resource.relativeUri);
            }
        });
    }

    setupResources(resources, '');
}

raml.loadFile(program.source).then(function(data) {
    makeEndpoints(data);
}, function(error) {
    console.log('Error parsing RAML file:', error);
}); 


var server = app.listen(port, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('RAML mocker listening at http://%s:%s', host, port);
});