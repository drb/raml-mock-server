/**
 * raml-mock-server
 * 
 * @type {[type]}
 */
var program             = require('commander'),
    path                = require('path'),
    pkg                 = require( path.join(__dirname, 'package.json') );
    raml                = require('raml-parser'),
    fs                  = require('fs'),
    stripJsonComments   = require('strip-json-comments'),
    express             = require('express'),
    randomWorld         = require('random-world'),
    _                   = require('underscore'),
    cors                = require('cors'),
    // no caching of the data (default is to serve random payloads every time)
    cacheLib            = require(path.resolve(path.join(__dirname, 'lib/cache'))),
    cache               = false,
    cacheId             = false,
    // set up the app
    app                 = express(),
    // port should be set on the CLI but will default to 3000
    port                = 3000,
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
    .option('-c, --cacheid <cache id>', 'Identifier to use for caching purposes - off by default (data will be random on each request)')
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

if (typeof program.cacheid !== 'undefined') {
    cacheId = program.cacheid;
    cache = cacheLib(cacheId);
    console.log('Using cache with id %s', cacheId);
}

// set port
port = program.port;

// need to set CORs up
cors({
    credentials: true,
    origin: true
});

function makeEndpoints (data) {

    var resources = data.resources,
        traits = data.traits;

    function setupResources (resourceCollection, prefix) {

        resourceCollection.forEach(function (resource) {

            var hasTraits = resources.is,
                route = prefix + resource.relativeUri,
                httpVerb = '';

            if (resource.methods) {

                resource.methods.forEach(function(method) {

                    route       = route.replace(/\{/, ':').replace('\}', '');
                    httpVerb    = method.method.toLowerCase();

                    try {
                        app[httpVerb](route, function (req, res) {

                            console.log('[%s]', httpVerb.toUpperCase(), route, 'cache key?', cacheId);

                            var requestParams = req.query,
                                headers = {
                                    'X-RAML-Mocker': "Eh up!",
                                    'X-RAML-Cache': cacheId
                                },
                                mock = {
                                    MockingData: false,
                                    Status: "Please add application/mock to the RAML responses array for this method."
                                };

                            // attempt to get the mocking data
                            if (method.responses[responses.statuses.OK].body[responses.contentTypes.mock]) {

                                //
                                if (cacheId && cache.has(route)) {
                                    console.log("looking in cache for", route);
                                    mock = cache.get(route);
                                    console.log("found it!");
                                } else {
                                    mock = method
                                        .responses[responses.statuses.OK]
                                        .body[responses.contentTypes.mock]
                                        .example;

                                    mock = randomWorld.fromMock(mock);

                                    if (cacheId) {
                                        try {
                                            cache.set(route, mock);    
                                        } catch (e) {
                                            console.error('Error caching data %s', e);
                                        }
                                    }
                                }

                            // default to the json response - this is probably not very useful
                            } else if (method.responses[responses.statuses.OK].body[responses.contentTypes.json]) {
                                mock = stripJsonComments(
                                    method.responses[responses.statuses.OK].body[responses.contentTypes.json]
                                );
                            }

                            // attempt to get the appropriate headers from the RAML
                            if (method.responses[responses.statuses.OK].headers) {

                                var pages = 1, 
                                    page = 1,
                                    limit = 10, 
                                    total;

                                // merge the headers from the RAML spec with the defaults
                                headers = _.defaults(
                                    headers,
                                    method.responses[responses.statuses.OK].headers
                                );

                                // because they're raml objects, we need to assign a real value to the header instead
                                // of a native object
                                _.each(headers, function(header, val) {

                                    if (requestParams.page) {
                                        page = requestParams.page;
                                    }

                                    if (requestParams.limit) {
                                        limit = requestParams.limit;
                                    }

                                    if (limit && page) {
                                        pages = mock.length / limit;
                                    }

                                    // try adding the example, if set
                                    if (_.isObject(header)) {
                                        headers[val] = val.example || 0;
                                    }

                                    switch (val.toLowerCase()) {
                                        case 'x-pagination-total-pages':
                                            headers[val] = pages;
                                            break;
                                        case 'x-pagination-current-page':
                                            headers[val] = page;
                                            break;
                                        case 'x-pagination-per-page':
                                            headers[val] = limit;
                                            break;
                                        case 'x-pagination-total-entries':
                                            headers[val] = mock.length;
                                            break;
                                    }
                                });
                            }

                            // limit the response data
                            if (_.has(requestParams, 'limit') && _.isArray(mock)) {

                                var p = page - 1,
                                    limit = limit;
                                    start = (p * limit),
                                    end = (+start + +limit);

                                console.log("slicing data... page: %s limit: %s = slice(%s, %s)", page, limit, start, end);
                                mock = mock.slice(start, end);
                            }

                            // set headers for the response
                            res.set(headers);
                            res.writeHead(200, {
                                'Content-Type': 'application/json'
                            });
                            res.end(JSON.stringify(mock));
                        });
                    } catch (e) {
                        console.error(e);
                    }
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
    app.disable('x-powered-by');
    app.use(cors());
    var host = server.address().address;
    var port = server.address().port;
    console.log('RAML mocker listening at http://%s:%s', host, port);
});