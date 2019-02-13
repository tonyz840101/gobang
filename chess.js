var name_pool = ['Aaron', 'Alexander', 'Bard', 'Billy', 'Carl', 'Colin', 'Daniel', 'David', 'Edgar', 'Elliot', 'Ford', 'Frank', 'Gabe',
	'Geoffrey', 'Harry', 'Harvey', 'Isaac', 'Ivan', 'Jacob', 'John', 'Kevin', 'Kyle', 'Lance', 'Louis', 'Martin', 'Michael',
	'Neil', 'Norton', 'Oscar', 'Owen', 'Parker', 'Pete', 'Quentin', 'Quinn', 'Richard', 'Robin', 'Scott', 'Stanley', 'Thomas',
	'Troy', 'Ulysses', 'Uriah', 'Vladimir', 'Victor', 'Wade', 'Will', 'Xavier', 'Yale', 'York', 'Zachary', 'Zebulon', 'Heisenberg'];
var name = ' ';
var random_name = name_pool[Math.floor(Math.random() * 52)];;
var canvas = document.getElementById("table");
var ctx = canvas.getContext("2d");
var edge = 0;//640;//
var unit = 0;//40;
var board;
var moving = false;
var side = '';
var gameState = {//state
	'init': 0,
	'gaming': 1,
	'surrender': 2,
	'result': 3,
	'leave': 5
}
var state = gameState.init;
var socket = io.connect();
var player_id = -1;
var player_names = [];
var player_sit = [];
var player_sit_index = -1;
var last = false;
var winner_ind = -1;
var clolr_blue = '#4267b2';//'#1e90ff';
var clolr_red = '#e3403a';
var chatZone = false;
var asking = false;

if (window.addEventListener) {
	window.addEventListener("keyup", keyup);	
} else if (window.attachEvent) {
	document.attachEvent("onkeyup", keyup);
} else {
	window.onkeyup = keyup;
}

function keyup(e){
	e = e || window.event;
	switch(e.keyCode){
		case 13: //enter
			if($('#cover').css("display") == 'block'){
				name = $('#idEnter').val();
				if(name == "" || name == null || name == 'null') name = random_name;
				socket.emit("addUser", name);
				$("#cover").fadeOut();
				$('#userName').text(name);
			}
			else if(chatZone){
				chatEnter(true);
			}
			break;
		default:
			break;
	}
}

function gameinit(){
	$('#lobbyMessage').html('Welcome!');
	$('#findGame').show();
	$('#surrender').hide();
	$('#chatZone').hide().css('width', '0px');
	$('#gameMessageZone').hide();
	hideGameMessageBtn();
	board = new Array(15);
	var tmp = [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1];
	for(var i = 0; i < 15; i ++) board[i] = tmp.slice();
	moving = false;
	last = false;
	chatZone = false;
	asking = false;
	state = gameState.init;
	player_sit_index = -1;
	winner_ind = -1;
	side = '';
	player_names = [];
	player_sit = [];
	resizeCanvas();
	draw();
}

function resizeCanvas() {
	var w_width = $(window).width(), w_height = $(window).height();
	edge = Math.min(((chatZone)? w_width-480 : w_width-230), w_height-20);
	unit = Math.floor(edge/16);
	edge = unit * 16;
	if(w_height > 300) $('.messageZone').css("margin-top", w_height*0.35+"px");
	else $('.messageZone').css("margin-top", "0px");
	if(w_width > 600)
		$('#table').attr("width", edge).attr("height", edge);
	else
		$('#table').attr("width", 0).attr("height", 0);
}

function hideGameMessageBtn(){
	$('#gameMessageBtn1').hide();
	$('#gameMessageBtn2').hide();
	$('#gameMessageBtn3').hide();
}

resizeCanvas();

$(window).resize(function(){
	resizeCanvas();
	draw();
});

socket.on('player_id', function(data) {//init connection
	$("#cover").show();
	gameinit();
	resizeCanvas();
	player_id = data.player_id;
	draw();
	if(name == " ") $('#idEnter').val(random_name);
	else $('#idEnter').val(name);
});

function chatEnter(cut){
	if(!chatZone) return;
	var chatMsg = $('#chatInput').val();
	if(cut) chatMsg = chatMsg.slice(0, -1);
	$('#chatInput').val('');
	if(chatMsg == "" || chatMsg == null) return;
	var msgCheck = chatMsg.split('');
	for(var i = 0; i < msgCheck.length; i ++){
		console.log(i +": "+msgCheck[i]);
		if(msgCheck[i] != ' ') break;
		else {
			if(i == msgCheck.length - 1){
				console.log('out');
				return;
			}
		}
	}
	socket.emit("chatMessage", {'name': name, 'msg': chatMsg,'player_id': player_id});
}

function chatSys(sys){
	if(!chatZone) return;
	$('#chatContent').append($('<li>').addClass('chatSys').text(sys));
}

$('#chatEnter').click(function(){ chatEnter(false); });

$('#idSubmit').click(function(){
	name = $('#idEnter').val();
	if(name == "" || name == null || name == 'null') name = random_name;
	socket.emit("addUser", name);
	$("#cover").fadeOut();
	$('#userName').text(name);
});

$('#gameMessageBtn1').click(function(){
	asking = true; socket.emit('newGameReq');
});

$('#gameMessageBtn2').click(function(){
	socket.emit('restart');
	$('#gameMessageZone').hide();
	hideGameMessageBtn();
});

$('#gameMessageBtn3').click(function(){
	socket.emit('leaveRoom'); 
	$('#gameMessageZone').hide();
	hideGameMessageBtn();
});

socket.on('userlist', function(data) {
	$('#names').text('');
	for(var i = 0; i < data.userlist.length; i ++)
		$('#names').append($('<li>').text(data.userlist[i]));
});

socket.on('chatContent', function(data) {
	if(!chatZone) return;
	var liPre = $('<li>');
	if(data.player_id == player_id) liPre.addClass('self');
	else liPre.addClass('enemy');
	$('#chatContent').append(liPre.addClass('chatName').text(data.name).fadeIn());
	liPre = $('<li>');
	if(data.player_id == player_id) liPre.addClass('self');
	else liPre.addClass('enemy');
	$('#chatContent').append(liPre.addClass('chatMsg').text(data.msg).fadeIn()).scrollTop($('#chatContent')[0].scrollHeight);
});

socket.on('LeaveRoom', function() {
	console.log('LeaveRoom');
	gameinit();
	socket.emit('Init');
});

socket.on('NewGame', function() {
	gameinit();
	$('#chatZone').show().css('width', '250px');
	chatZone = true;
	resizeCanvas();
	draw();
});

socket.on('Surrender', function(index) {
	$('#surrender').hide();
	$('#findGame').show();
	moving = false;
	last = false;
	state = gameState.surrender;
	winner_ind = index;
	draw();
});

socket.on('Winner', function(index) {
	$('#surrender').hide();
	$('#findGame').show();
	moving = false;
	last = false;
	state = gameState.result;
	winner_ind = index;
	draw();
});

socket.on('newGameReq', function() {
	if(asking){
		$('#gameMessage').css('color', clolr_blue).text('Waiting for reply...');
		hideGameMessageBtn();
		$('#gameMessageBtn3').text('Cancel').show();
	}
	else{
		hideGameMessageBtn();
		$('#gameMessageBtn2').text('Yes').show();
		$('#gameMessageBtn3').text('No').show();
		$('#gameMessage').css('color', clolr_blue).text('Opponent request a new game');
		$('#gameMessageZone').fadeIn();
	}
});


socket.on('move', function(data) {
	var x_tmp = data.x, y_tmp = data.y;
	if(data.color != side){
		x_tmp = 14 - x_tmp;
		y_tmp = 14 - y_tmp;
	}
	switch(data.color){
		case 'white':
			board[y_tmp][x_tmp] = 0;
			break;
		case 'black':
			board[y_tmp][x_tmp] = 1;
			break;
		default:
			break;
	}
	last = {'x': x_tmp, 'y': y_tmp};
	draw();
});

socket.on('message', function(msg) {
	$('#lobbyMessage').html(msg);
});

socket.on('alert', function(msg) {
	alert(msg);
});

socket.on('GameData', function(data) {
	console.log('get');
	state = data.state;
	if(data.state){
		$('#surrender').show();
		$('#findGame').hide();
		player_sit_index = data.player_sit.indexOf(player_id);
		switch(player_sit_index){
			case 0:
				side = 'black';
				break;
			case 1:
				side = 'white';
				break;
			default:
				break;
		}
		if(state >= gameState.gaming){
			if(!chatZone){
				$('#chatZone').show().animate({width:"250px"}, 500,'linear');
				chatZone = true;
				$('#chatContent').text('');
				resizeCanvas();
				draw();
			}
		}
		else{
			if(chatZone){
				$('#chatZone').animate({width:"0px"}, 500,'linear').hide();
				chatZone = false;
				$('#chatContent').text('');
				resizeCanvas();
				draw();
			}
		}
	}
	moving = (data.moving == player_sit_index);
	player_sit = data.player_sit.slice();
	player_names = data.player_names.slice();
	draw();
});

$('#findGame').click(function(){
	socket.emit('findGame');
});

$('#surrender').click(function(){
	if(state == gameState.surrender || state == gameState.result) return;
	else socket.emit('surrender', true);
});

function getMousePos(canvas, e){
	var rect = canvas.getBoundingClientRect();
	return {
		x: e.clientX - rect.left,
		y: e.clientY - rect.top,
	}
};
var pos = {x: 0, y: 0};

function drawOneChess(x, y, w, color){
	if(w > 10) w = Math.floor(w * 8 / 10);
	ctx.beginPath();
	switch(color){
		case 'white':
			ctx.fillStyle = "#ffffff";
			ctx.arc(x, y, w/2, 0, 2*Math.PI);
			ctx.fill();
			break;
		case 'black':
			ctx.fillStyle = "#000000";
			ctx.arc(x, y, w/2, 0, 2*Math.PI);
			ctx.fill();
			break;
		default:
			break;
	}
	ctx.closePath();
	return;
}

function drawChess(){
	for(var i = 0; i < 15; i ++){
		for(var j = 0; j < 15; j ++){
			switch(board[i][j]){
				case 0:
					drawOneChess(unit * (j + 1), unit * (i + 1), unit, 'white');
					break;
				case 1:
					drawOneChess(unit * (j + 1), unit * (i + 1), unit, 'black');
					break;
				default:
					break;
			}
		}
	}
}

function drawLast(w){
	if(w > 10) w = Math.floor(w * 8 / 10);
	ctx.beginPath();
	ctx.fillStyle = clolr_red;
	ctx.arc(unit * (last.x + 1), unit * (last.y + 1), w/6, 0, 2*Math.PI);
	ctx.fill();
	ctx.closePath();
	return;
}

function drawBoard(){
	//var alphabet = 'ABCDEFGHIJKLMNO';
	ctx.font = Math.floor(unit * 3 / 4) + "px Microsoft JhengHei";
	ctx.fillStyle = "#000000";
	ctx.strokeStyle = '#000000';
	ctx.lineWidth = 1;
	ctx.beginPath();
	var y = unit - Math.floor(unit / 4);
	for(var i = 0; i < 15; i ++){
		if(i < 6)str = (15 - i).toString();
		else str = ' ' + (15 - i).toString();
		//ctx.fillText(str, 2, (unit * (i + 1) + Math.floor(unit * 3 / 4) / 2));
		ctx.moveTo(unit, unit * (i + 1)); ctx.lineTo(unit * 15, unit * (i + 1));
		ctx.stroke();
	}
	for(var i = 0; i < 15; i ++){
		//ctx.fillText(alphabet[i], (unit * (i + 1) - Math.floor(unit * 3 / 4) / 3), (unit * 15 + Math.floor(unit * 3 / 4)));
		ctx.moveTo(unit * (i + 1), unit); ctx.lineTo(unit * (i + 1), unit * 15);
		ctx.stroke();
	}
	ctx.closePath();
	var r = Math.floor(unit / 10);
	if(r < 3) r = 3;
	ctx.beginPath();
		ctx.arc(unit * 4, unit * 4, r, 0, 2*Math.PI);
		ctx.fill();
	ctx.closePath();
	ctx.beginPath();
		ctx.arc(unit * 12, unit * 4, r, 0, 2*Math.PI);
		ctx.fill();
	ctx.closePath();
	ctx.beginPath();
		ctx.arc(unit * 4, unit * 12, r, 0, 2*Math.PI);
		ctx.fill();
	ctx.closePath();
	ctx.beginPath();
		ctx.arc(unit * 12, unit * 12, r, 0, 2*Math.PI);
		ctx.fill();
	ctx.closePath();
	ctx.beginPath();
		ctx.arc(unit * 8, unit * 8, r, 0, 2*Math.PI);
		ctx.fill();
	ctx.closePath();
	if(player_names.length){
		switch(side){
		case 'white':
			drawOneChess(unit * 3 / 2, unit / 2, unit, 'black');
			break;
		case 'black':
			drawOneChess(unit * 3 / 2, unit / 2, unit, 'white');
			break;
		default:
			break;
		}
		ctx.fillText(player_names[(player_sit_index + 1) % 2], unit * 2, y);
	}
	if(moving){
		ctx.fillStyle = clolr_blue;
		ctx.fillText('Your turn!', unit * 8, y);
	}
}

function draw(){
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	drawBoard();
	if(state >= gameState.gaming){
		drawChess();
		if(last !== false){
			drawLast(unit);
		}
	}
	if(moving){
		//if(side == 'black') drawIllegal();
		drawOneChess(pos.x, pos.y, unit, side);
	}
	////////text,try to replace with CSS & HTML
	switch(state){
		case gameState.surrender:
			$('#gameMessageBtn1').text('Start a new game').show();
			$('#gameMessageBtn3').text('Leave the room').show();
			if(winner_ind == player_sit_index) {
				$('#gameMessage').css('color', clolr_blue).text('Opponent has surrendered');
				//chatSys(player_names[(player_sit_index + 1 == 1)? 1 : 0]+' surrendered');
			}
			else {
				$('#gameMessage').css('color', clolr_red).text('You\'ve surrendered');
				//chatSys(player_names[player_sit_index]+' surrendered');
			}
			$('#gameMessageZone').fadeIn();
			break;
		case gameState.result:
			$('#gameMessageBtn1').text('Start a new game').click(function(){ asking = true; socket.emit('newGameReq'); }).show();
			$('#gameMessageBtn3').text('Leave the room').click(function(){
				socket.emit('leaveRoom'); 
				$('#gameMessageZone').hide();
				hideGameMessageBtn();}).show();
			if(winner_ind == player_sit_index) {
				$('#gameMessage').css('color', clolr_blue).text('You win!');
				//chatSys('This game is won by '+player_names[player_sit_index]);
			}
			else if(winner_ind == 3){
				$('#gameMessage').css('color', clolr_red).text('Tie');
				//chatSys('This game is a tie');
			}
			else{
				$('#gameMessage').css('color', clolr_red).text('You lose!');
				//chatSys('This game is won by '+player_names[(player_sit_index + 1 == 1)? 1 : 0]);
			}
			$('#gameMessageZone').fadeIn();
			break;
	}
}

canvas.addEventListener('click', function(e) {
	if(!moving || state > gameState.gaming) return;
	var	x_ind = Math.floor((pos.x - unit / 2) / unit),
		y_ind = Math.floor((pos.y - unit / 2) / unit);
	if(board[y_ind][x_ind] == -1){
		socket.emit('move', {'x': x_ind, 'y': y_ind, 'color': side});
		moving = false;
		draw();
	}
});

canvas.addEventListener('mousemove', function(e) {
	pos = getMousePos(canvas, e);
});

setInterval(function() {
	if(moving) draw();
}, 8);