/*
 * User interface script developed in JQuery
 */


function divEscapedContentElement(message) {
	return $('<div></div>').text(message);
}
function divSystemContentElement(message) {
	return $('<div></div>').html('<i>' + message + '</i>');
}

/*
 * The next function you’ll append to chat_ui.js is for processing user input;
 * it’s detailed in the following listing. If user input begins with the slash
 * (/) character, it’s treated as a chat command. If not, it’s sent to the
 * server as a chat message to be broadcast to other users, and it’s added to
 * the chat room text of the room the user’s currently in.
 */

function processUserInput(chatApp, socket) {
	var message = $('#send-message').val();
	var systemMessage;
	if (message.charAt(0) == '/') {
		systemMessage = chatApp.processCommand(message);
		if (systemMessage) {
			$('#messages').append(divSystemContentElement(systemMessage));
		}
	} else {

		chatApp.sendMessage($('#room').text(), message);
		$('#messages').append(divEscapedContentElement(message));
		$('#messages').scrollTop($('#messages').prop('scrollHeight'));
	}
	$('#send-message').val('');
}

var socket = io.connect();

$(document).ready(function() {
	var chatApp = new Chat(socket);
	socket.on('nameResult', function(result) {

		var message;
		if (result.success) {
			message = 'You are now known as ' + result.name + '.';
		} else {
			message = result.message;
		}
		$('#messages').append(divSystemContentElement(message));
	});

	socket.on('joinResult', function(result) {
		$('#room').text(result.room);
		$('#messages').append(divSystemContentElement('Room changed.'));
	});

	socket.on('message', function(message) {
		var newElement = $('<div></div>').text(message.text);
		$('#messages').append(newElement);
	});

	socket.on('rooms', function(rooms) {
		$('#room-list').empty();
		for ( var room in rooms) {
			room = room.substring(1, room.length);
			if (room != '') {

				$('#room-list').append(divEscapedContentElement(room));
			}
		}
		$('#room-list div').click(function() {
			chatApp.processCommand('/join ' + $(this).text());
			$('#send-message').focus();
		});
	});

	setInterval(function() {
		socket.emit('rooms');
	}, 1000);

	$('#send-message').focus();
	$('#send-form').submit(function() {
		processUserInput(chatApp, socket);
		return false;
	});
});