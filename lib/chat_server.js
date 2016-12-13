var socketio = require('socket.io');
var io;
var guestNumber = 1;
var nickNames = {};
var namesUsed = [];
var currentRoom = {};

/*
 * The first helper function you need to add is assignGuestName, which handles
 * the naming of new users. When a user first connects to the chat server, the
 * user is placed in a chat room named Lobby, and assignGuestName is called to
 * assign them a name to distinguish them from other users. Each guest name is
 * essentially the word Guest followed by a number that incre- ments each time a
 * new user connects. The guest name is stored in the nickNames vari- able for
 * reference, associated with the internal socket ID. The guest name is also
 * added to namesUsed, a variable in which names that are being used are stored.
 * Add the code in the following listing to lib/chat_server.js to implement this
 * functionality.
 */

function assignGuestName(socket, guestNumber, nickNames, namesUsed) {
	var name = 'Guest' + guestNumber; // Generate new guest name
	nickNames[socket.id] = name; // Associate guest name with client
	// connection id
	socket.emit('nameResult', { // let user know their guest name
		success : true,
		name : name
	});
	namesUsed.push(name); // Note that guest name is now used
	return guestNumber + 1; // Increment counter used to generate guest names
}

/*
 * The second helper function you’ll need to add to chat_server.js is joinRoom.
 * This function, shown in listing 2.9, handles logic related to a user joining
 * a chat room. Having a user join a Socket.IO room is simple, requiring only a
 * call to the join method of a socket object. The application then communicates
 * related details to the user and other users in the same room. The application
 * lets the user know what other users are in the room and lets these other
 * users know that the user is now present.
 */

function joinRoom(socket, room) {
	socket.join(room); // Make user join room
	currentRoom[socket.id] = room; // Note that user is now in this room
	socket.emit('joinResult', { // Let user know they’re now in new room
		room : room
	});
	socket.broadcast.to(room).emit('message', { // Let other users in room know
		// that user has joined
		text : nickNames[socket.id] + ' has joined ' + room + '.'
	});
	var usersInRoom = io.sockets.clients(room); // Determine what other users
	// are in same room as user
	if (usersInRoom.length > 1) { // If other users exist, summarize who they
		// are
		var usersInRoomSummary = 'Users currently in ' + room + ': ';
		for ( var index in usersInRoom) {
			var userSocketId = usersInRoom[index].id;
			if (userSocketId != socket.id) {
				if (index > 0) {
					usersInRoomSummary += ', ';
				}
				usersInRoomSummary += nickNames[userSocketId];
			}
		}
		usersInRoomSummary += '.';
		socket.emit('message', { // Send summary of other users in the room
			// to the user
			text : usersInRoomSummary
		});
	}
}

/*
 * Add the code in the following listing to lib/chat_server.js to define a
 * function that handles requests by users to change their names. From the
 * application’s perspective, the users aren’t allowed to change their names to
 * anything beginning with Guest or to use a name that’s already in use.
 */

function handleNameChangeAttempts(socket, nickNames, namesUsed) {
	socket.on('nameAttempt', function(name) { // Add listener for nameAttempt
		// events
		if (name.indexOf('Guest') == 0) { // Don’t allow nicknames to begin
			// with Guest
			socket.emit('nameResult', {
				success : false,
				message : 'Names cannot begin with "Guest".'
			});
		} else {
			if (namesUsed.indexOf(name) == -1) { // If name isn't already
				// registered, register it
				var previousName = nickNames[socket.id];
				var previousNameIndex = namesUsed.indexOf(previousName);
				namesUsed.push(name);
				nickNames[socket.id] = name;
				delete namesUsed[previousNameIndex]; // Remove previous name
				socket.emit('nameResult', {
					success : true,
					name : name
				});
				socket.broadcast.to(currentRoom[socket.id]).emit('message', {
					text : previousName + ' is now known as ' + name + '.'
				});
			} else {
				socket.emit('nameResult', { // Send error to client if name is
					// already registered
					success : false,
					message : 'That name is already in use.'
				});
			}
		}
	});
}

/*
 * Now that user nicknames are taken care of, you need to add a function that
 * defines how a chat message sent from a user is handled. Figure 2.11 shows the
 * basic process: the user emits an event indicating the room where the message
 * is to be sent and the message text. The server then relays the message to all
 * other users in the same room. Add the following code to lib/chat_server.js.
 * Socket.IO’s broadcast function is used to relay the message:
 */

function handleMessageBroadcasting(socket) {
	socket.on('message', function(message) {
		socket.broadcast.to(message.room).emit('message', {
			text : nickNames[socket.id] + ': ' + message.text
		});
	});
}

/*
 * Next, you need to add functionality that allows a user to join an existing
 * room or, if it doesn’t yet exist, to create it. Figure 2.12 shows the
 * interaction between the user and the server. Add the following code to
 * lib/chat_server.js to enable room changing. Note the use of Socket.IO’s leave
 * method:
 */

function handleRoomJoining(socket) {
	socket.on('join', function(room) {
		socket.leave(currentRoom[socket.id]);
		joinRoom(socket, room.newRoom);
	});
}

/*
 * Finally, you need to add the following logic to lib/chat_server.js to remove
 * a user’s nickname from nickNames and namesUsed when the user leaves the chat
 * application:
 */

function handleClientDisconnection(socket) {
	socket.on('disconnect', function() {
		var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
		delete namesUsed[nameIndex];
		delete nickNames[socket.id];
	});
}

exports.listen = function(server) {
	io = socketio.listen(server); // Starts Socket.IO server of the HTTP
	// server
	io.set('log level', 1);
	io.sockets.on('connection',
			function(socket) { // Define how each user connection will be
				// handled
				guestNumber = assignGuestName(socket, guestNumber, nickNames,
						namesUsed); // Assign user a guest name when they
				// connect
				joinRoom(socket, 'Lobby'); // Place user in Lobby room

				// Handle all user iterations
				handleMessageBroadcasting(socket, nickNames);
				handleNameChangeAttempts(socket, nickNames, namesUsed);
				handleRoomJoining(socket);
				socket.on('rooms', function() { // Provide user with the list of
					// occupied rooms
					socket.emit('rooms', io.sockets.manager.rooms);
				});
				handleClientDisconnection(socket, nickNames, namesUsed); // Client
				// disconnection
			});
}
