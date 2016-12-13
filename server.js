// Server and client functionality
var http = require('http');

// File system functionality
var fs = require('fs');

// File system path functionality
var path = require('path');

// Ability to derive Mime type based on a filename extension
var mime = require('mime');

// Cache object where the content of cache files are stored
var cache = {};

// Function to send Error 404 Not Found message
function send404(response) {
	response.writeHead(404, {
		'Content-Type' : 'text/plain'
	});
	response.write('Error 404: resource not found.');
	response.end();
}

// Function to serve the requested file data
function sendFile(response, filePath, fileContents) {
	response.writeHead(200, {
		"content-type" : mime.lookup(path.basename(filePath))
	});
	response.end(fileContents);
}

// Function to serve data in case data is cached
function serveStatic(response, cache, absPath) {
	if (cache[absPath]) { // Check if file is cached in memory
		sendFile(response, absPath, cache[absPath]); // Serves the file from
		// memory
	} else {
		fs.exists(absPath, function(exists) { // Check if file exists
			if (exists) {
				fs.readFile(absPath, function(err, data) { // Read file from
					// disk
					if (err) {
						send404(response);
					} else {
						cache[absPath] = data;
						sendFile(response, absPath, data); // Serve file read
						// from disk
					}

				});
			} else {
				send404(response); // Send HTTP 404 response
			}
		});
	}
}

var server = http.createServer(function(request, response) {
	var filePath = false;
	if (request.url == '/') {
		filePath = 'public/index.html'; // HTML file by default
	} else {
		filePath = 'public' + request.url; // Translate URL path to relative
											// path
	}
	var absPath = './' + filePath;
	serveStatic(response, cache, absPath); // Serve static file
});

server.listen(3000, function() {
	console.log("Server listening on port 3000.");
});

var chatServer = require('./lib/chat_server');
chatServer.listen(server);
