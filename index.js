/*
 *
 * Primary File for the API
 *
 */

// Dependencies
var http = require('http');
var https = require('https');
var fs = require('fs');
var url = require('url');
var StringDecoder = require('string_decoder').StringDecoder;
var envConfig = require('./config.js');

// The HTTP Server should respond to all request with a Obj
var httpServer = http.createServer(function(req,res){
	unifiedServer(req,res);
});

// Start the HTTP Server listener and make it listen on a port from config file
httpServer.listen(envConfig.httpPort,function(){
	console.log('The Server is listening on Port '+ envConfig.httpPort +' in ' + envConfig.envName + ' environment');
});


//specify tls cert location for HTTPs Server
var httpsServerOptions = {
	'key' : fs.readFileSync(envConfig.privKey),
	'cert' : fs.readFileSync(envConfig.pubcert)
};
// The HTTPs Server should respond to all request with a Obj
var httpsServer = https.createServer(httpsServerOptions,function(req,res){
	unifiedServer(req,res);
});

// Start the HTTPs Server listener and make it listen on a port from config file
httpsServer.listen(envConfig.httpsPort,function(){
	console.log('The Server is listening on Port '+ envConfig.httpsPort +' in ' + envConfig.envName + ' environment');
});

var unifiedServer = function(req,res){
	//Get The URL and parse it - require url node library
	var parsedURL = url.parse(req.url, true);
	
	// Get the path 
	var reqPath = parsedURL.pathname;

	// Get the HTTP Method
	var reqHTTPMethod = req.method.toLowerCase();

	// trim the path from slashes on either side
	var trimmedPath = reqPath.replace(/^\/+|\/+$/g,'');

	// Get QueryParams
	var reqQueryParamsObj = parsedURL.query;

	// Get Request Headers
	var reqHTTPHeadersObj = req.headers;

	// Read the payload by adding each stream to a bufferString, if any.. require StringDecoder
	var decoder = new StringDecoder('utf-8');
	var reqPayloadBuffer = ''
	req.on('data',function(data){
		// as request payload get streamed in, append to a reqPayloadBuffer
		reqPayloadBuffer += decoder.write(data);
	});

	// this will be invoked at the end of req payload streams
	req.on('end',function(){
		// request payload streaming is ended
		reqPayloadBuffer += decoder.end();

		// Check the router for matching path for handler. if none found, use the notFound handler
		var chosenHandler = typeof(router[trimmedPath]) != 'undefined' ? router[trimmedPath] : handlers.notFound;

		// construct data to send to Handler
		var reqData = {
			'trimmedPath' : trimmedPath,
			'reqQueryParamsObj' : reqQueryParamsObj,
			'reqHTTPHeadersObj' : reqHTTPHeadersObj,
			'reqHTTPMethod' : reqHTTPMethod,
			'reqpayload' : reqPayloadBuffer
		}

		//Route the Request to the chosen Handler
		chosenHandler(reqData,function(statusCode, resPayloadObj){

			// Use statusCode returned by Handler or set default as 500
			statusCode = typeof(statusCode) == 'number' ? statusCode : 500;

			// Use resPayload returned by Handler or set default
			resPayloadObj = typeof(resPayloadObj) == 'object' ? resPayloadObj : {"Response":{"msg" : "Internal Server Error"}};

			// Conver the resPayload to a String
			var resPayloadStr = JSON.stringify(resPayloadObj);


			// set Response content type
			res.setHeader('Content-Type','application/json');

			//set Response HTTP Status Code
			res.writeHead(statusCode);

			// set Final Response
			res.end(resPayloadStr);

			//log
			console.log('Req Payload received: ', reqPayloadBuffer);
			console.log('Res Payload sent: '+ resPayloadStr);
			console.log('###Ends');
		});

	});

	console.log('$$$ this should be logged before payload');
};


//Define all Handlers
var handlers = {};

//Hello World Handler
handlers.helloworld = function(reqData,callback){
	callback(200,{"Response":{"msg" : "Hello World!"}});
};

//Healthcheck Handler
handlers.healthcheck = function(reqData,callback){
	callback(200,{"Response":{"msg" : "This is a healthcheck stub response"}});
};

//foo/bar Handler
handlers.foobar = function(reqData,callback){
	callback(200,{"Response":{"msg" : "Success foobar"}});
};

//Not Found Handler
handlers.notFound = function(reqData, callback){
	callback(404,{"Response":{"msg" : "Requested Resource Not Found"}});	
};

var router = {
	"helloworld" : handlers.helloworld,
	"healthcheck" : handlers.healthcheck,
	"foo/bar" : handlers.foobar
};
