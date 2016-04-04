// Use global function to wrap this package as a controller
$(function() {

	// Set some const time intervals
	var FADE_TIME = 150;
	var TYPING_TIMER_LENGTH = 400;

	// Set a const array of colors to color code user names
	var COLORS = [
		'#ff0000', '#00ff00', '#0000ff',
		'#ff0080', '#80ff00', '#0080ff',
		'#ff8000', '#00ff80', '#8000ff'
	];


	// Init basic global vars (model)
	var $window = $(window);
	var $userNameInput = $('.userNameInput');
	var $messages = $('.messages');
	var $inputMessage = $('.inputMessage');


	// Init pages (view)
	var $loginPage = $('.login.page');
	var $chatPage = $('.chat.page');


	// Init local vars (controller vars)
	var userName;
	var connected = false;
	var typing = false;
	var lastTypingTime;


	// Set initial focus on the user name input field 
	var $currentInput = $userNameInput.focus();


	// Globalize socket.io
	var socket = io();


	// Update users of a new user
	function addParticipantsMessage (data) {

		// Hold a blank string to optimize latency
		var message = '';

		// Generate message for number of users in the group
		if (data.numUsers === 1) {
			message += "There is 1 participant";
		} else {
			message += "There are " + data.numUsers + " participants";
		}

		// Announce number of users to the group
		log(message);
	}


	// Set a client userName
	function setUserName () {

		// Init user name from input and run thru js cleaning and basic security
		userName = cleanInput($userNameInput.val().trim());

		// If the user name entry is valid a js secure
		if (userName) {

			// Switch view
			$loginPage.fadeOut();
			$chatPage.show();
			$loginPage.off('click');
			$currentInput = $inputMessage.focus();

			// Send user name to server
			socket.emit('add user', userName);
		}
	}


	// Send a chat message
	function sendMessage () {

		// Assign user input to message value
		var message = $inputMessage.val();

		// Prevent user from sending markup
		message = cleanInput(message);


		// if there is a valid message and connedction
		if (message && connected) {

			// Generate a message to send to serer
			$inputMessage.val('');
			addChatMessage ({
				userName: userName,
				message: message
			});

			// Send new message to server
			socket.emit('new message', message);
		}
	}


	// Log a message as an element
	function log (message, options) {

		// Generate a list element for the new message
		var $el = $('<li>').addClass('log').text(message);
		addMessageElement($el,options);
	}


	// Add message to the visual chat list
	function addChatMessage (data, options) {

		// Do not fade in new message if 'user is typing' message is showing
		var $typingMessages = getTypingMessages (data);
		options = options || {};

		// Remove 'is typing' message ?????
		if ($typingMessages.length !== 0) {

			options.fade = false;
			$typingMessages.remove();
		}

		// Generate user name info HTML
		var $userNameDiv = $('<span class="userName"/>')
			.text(data.userName);
			// TODO: .css('color', getUserNameColor.data.color);

		// Generate chat message info HTML
		var $messageBodyDiv = $('<span class="messageBody"/>')
			.text(data.message);

		// Show user as typing ?????
		var typingClass = data.typing ? 'typing' : '';

		// Generate chat message list item element HTML
		var $messageDiv = $('<li class="message"/>')
			.data('userName', data.userName)
			.addClass(typingClass)
			.append($userNameDiv, $messageBodyDiv);

		// Add the element to the view
		addMessageElement($messageDiv, options);
	}


	// Add visual chat 'user is typing' message
	function addChatTyping (data) {

		data.typing = true;
		data.message = 'is typing';
		addChatMessage(data);
	}


	// Remove visual chat 'user is typing' message
	function removeChatTyping (data) {

		getTypingMessages(data).fadeOut(function () {
			$(this).remove();
		});
	}


	// Add message element and scroll to bottom
	function addMessageElement (el, options) {
		var $el = $(el);

		// Setup default fade in options
		if (!options) {
			options = {};
		}

		// Set fade true unless specified
		if (typeof options.fade === 'undefined') {
			options.fade = true;
		}

		// Set prepend false unless specified
		if (typeof options.prepend === 'undefined') {
			options.prepend = false;
		}

		// Apply fade options
		if (options.fade) {
			$el.hide().fadeIn(FADE_TIME);
		}

		// Apply prepend options
		if (options.prepend) {
			$messages.prepend($el);
		} else {
			$messages.append($el);
		}

		// Scroll to bottom of chat
		$messages[0].scrollTop = $messages[0].scrollHeight;
	}


	// Prevent user from sending markup
	function cleanInput (input) {
		return $('<div/>').text(input).text();
	}


	// Update the typing event
	function updateTyping () {

		if (connected) {
			
			// If you are not already, tell the server user is typing
			if (!typing) {
				typing = true;
				socket.emit ('typing');
			}

			// Hold a time stamp for last time typing was checked
			lastTypingTime = (new Date()).getTime();

			// 
			setTimeout (function () {

				// Get current time
				var typingTimer = (new Date()).getTime();

				// Compare time stamp to current time
				var timeDiff = typingTimer - lastTypingTime;
				if (timeDiff >= TYPING_TIMER_LENGTH && typing) {

					// Assume tying ends to reinit test for typing
					socket.emit ('stop typing');
					typing = false;
				}
			}, TYPING_TIMER_LENGTH);
		}
	}


	// Get 'user is typing' message
	function getTypingMessages (data) {
		return $('.typing.message').filter (function (i) {
			return $(this).data('userName') === data.userName;
		});
	}


	// Get user name color, using a hash function
	function getUserNameColor (userName) {
		var hash, i, index;

		// Make a hash function that is user name dependant and consistant
		hash = 7;
		for (i=0; i<userName.length; i++) {
			hash = userName.charCodeAt(i) + (hash << 5) - hash;
		}

		// Calculate color based on hash
		index = Math.abs(hash % COLORS.length);
		return COLORS[index];
	}


	// Handle keyboard events
	$window.keydown(function (event) {

		// Auto-focus using [TAB]/[ALT]+[TAB]
		if (!( event.ctrlKey || event.metaKey || event.altKey )) {
			$currentInput.focus();
		}

		// Handle [ENTER]
		if (event.which === 13) {

			// Handle users, entering messages
			if (userName) {
				sendMessage();
				socket.emit('stop typing');
				typing = false;
			}

			// Handle non-users, entering a user name
			else {
				setUserName();
			}
		}
	});


	// Handle 'click' events on loginPage
	$loginPage.click(function() {
		$currentInput.focus();
	});


	// Handle 'click' events on chatPage->input message box
	$inputMessage.click(function () {
		$inputMessage.focus();
	});


	// Local.CE 'input', let server know user is typing
	$inputMessage.on('input', function () {
		updateTyping();
	});


	// LEO.SE 'login'
	socket.on('login', function (data) {
		var message;

		// Let the model know you are connected
		connected = true;

		// Create and display a welcome message to the new user
		message = "Welcome to the chat!"
		log (message, {
			prepend: true
		});

		// Add messages to the screen
		addParticipantsMessage(data);
	});


	// LEO.SE 'new message', add the new message to chat box
	socket.on('new message', function (data) {
		addChatMessage(data);
	});


	// LEO.SE 'user joined', announce user and add their data to chat
	socket.on('user joined', function (data) {
console.log("yo1");
		log(data.userName + ' has joined the chat');
console.log("yo2");
		addParticipantsMessage(data);
console.log("yo3");
	});


	// LEO.SE 'user left'
	socket.on('user left', function (data) {

		// Announce user left to other users
		log(data.userName + ' has left the chat');
		addParticipantsMessage(data);

		// Clean up after old user, they leave 'typing' turned on
		removeChatTyping(data);
	});


	// LEO.SE 'typing', display that a user is typing
	socket.on('typing', function (data) {
		addChatTyping(data);
	});


	// LEO.SE 'stop typing', remove notice that a user is typing
	socket.on('stop typing', function (data) {
		removeChatTyping(data);
	});

});