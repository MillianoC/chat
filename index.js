// Activate dependencies to init 'express'
var express = require('express');

// Activate dependencies to init 'app'
var app = express();

// Activate dependencies to init 'http' server, with 'app' as a handler
var http = require('http').Server(app);

// Activate dependencies to init a web 'socket' on the 'http' server
var io = require('socket.io')(http);

// Hold the number of current users
var numUsers = 0;

// Set a route handler
app.use(express.static(__dirname + '/public'));


// Setup a fxn to handle a connection
io.on('connection', function(socket) {
	var addedUser = false;


	// LEO.CE 'new message', notice this is the first function to optimize return
	//	on the primary function AKA sending messages
	socket.on('new message', function(data) {

		// Brodcast new message
		socket.broadcast.emit('new message', {
			userName: socket.userName,
			message: data
		});
	});


	// LEO.CE 'add user'
	socket.on('add user', function(userName) {

		if (addedUser) return;

		// Store userName in socket session
		socket.userName = userName;

		// Increase user count
		numUsers++;
		addUser = true;

		// Update JSON user count
		socket.emit('login', {
			numUsers: numUsers
		});

		// Brodcast new user JSON to all users
		socket.broadcast.emit('user joined', {
			userName: socket.userName,
			numUsers: numUsers
		});
	});


	// LEO.CE 'typing'
	socket.on('typing', function() {

		// Brocast to users that a user is typing
		socket.broadcast.emit('typing', {
			userName: socket.userName
		});
	});


	// LEO.CE 'stopped typing'
	socket.on('typing', function() {

		// Brocast to users that a user is typing
		socket.broadcast.emit('stop typing', {
			userName: socket.userName
		});
	});


	// Handle users disconnecting from server
	socket.on('disconnect', function() {
		
		if (addedUser) {
			
			// Reduce user count
			numUsers--;

			// Update other users about a user leaving
			socket.broadcast.emit('user left', {
				userName: socket.userName,
				numUsers: numUsers
			});
		}
	});
});


// Activate a port for the server to listen for requests
http.listen(3000, function() {

	// Print notice to console to confirm fxn
	console.log("Listening on port 3000");
});