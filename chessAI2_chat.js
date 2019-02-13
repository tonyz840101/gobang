var name_pool = ['Aaron', 'Alexander', 'Bard', 'Billy', 'Carl', 'Colin', 'Daniel', 'David', 'Edgar', 'Elliot', 'Ford', 'Frank', 'Gabe',
	'Geoffrey', 'Harry', 'Harvey', 'Isaac', 'Ivan', 'Jacob', 'John', 'Kevin', 'Kyle', 'Lance', 'Louis', 'Martin', 'Michael',
	'Neil', 'Norton', 'Oscar', 'Owen', 'Parker', 'Pete', 'Quentin', 'Quinn', 'Richard', 'Robin', 'Scott', 'Stanley', 'Thomas',
	'Troy', 'Ulysses', 'Uriah', 'Vladimir', 'Victor', 'Wade', 'Will', 'Xavier', 'Yale', 'York', 'Zachary', 'Zebulon', 'Heisenberg'];
var name = ' ';
var random_name = name_pool[Math.floor(Math.random() * 52)];
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
var Slast = false;
var winner_ind = -1;
var clolr_blue = '#4267b2';//'#1e90ff';
var clolr_red = '#e3403a';
var chatZone = false;
var asking = false;
var gamecount = 0;

var score = [];
var score1 = [];
var score2 = [];
var score3 = [];
/*var score1 = [];
var score2 = [];*/
var autoAI, autoAI_F = false;

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
		case 32:
			AImain();
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
	Slast = false;
	chatZone = false;
	asking = false;
	gamecount = 0;
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
	socket.emit('print', 'AIv2_online');
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
	if(autoAI_F) 
		socket.emit('findGame');
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
	Slast = false;
	state = gameState.surrender;
	winner_ind = index;
	draw();
});

socket.on('Winner', function(index) {
	$('#surrender').hide();
	$('#findGame').show();
	moving = false;
	last = false;
	Slast = false;
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
		if(autoAI_F){
			socket.emit('restart');
			$('#gameMessageZone').hide();
			hideGameMessageBtn();
		}
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
	if(data.color == side) Slast = {'x': x_tmp, 'y': y_tmp};
	draw();
	gamecount ++;
});

socket.on('message', function(msg) {
	$('#lobbyMessage').html(msg);
});

socket.on('alert', function(msg) {
	if(autoAI_F) return;
	alert(msg);
});

socket.on('GameData', function(data) {
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

/*function drawIllegal(){
	
}*/

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
	ctx.beginPath();
	if(Slast){
		ctx.fillStyle = clolr_blue;
		ctx.arc(unit * (Slast.x + 1), unit * (Slast.y + 1), w/6, 0, 2*Math.PI);
		ctx.fill();
		ctx.closePath();
	}
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
	if(moving && !autoAI_F && !(pos.x < 0 || pos.y < 0 || pos.x > edge || pos.y > edge)){
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
				if(autoAI_F){
					asking = true; socket.emit('newGameReq');
				}
				//chatSys(player_names[(player_sit_index + 1 == 1)? 1 : 0]+' surrendered');
			}
			else {
				$('#gameMessage').css('color', clolr_red).text('You\'ve surrendered');
				//chatSys(player_names[player_sit_index]+' surrendered');
			}
			$('#gameMessageZone').fadeIn();
			break;
		case gameState.result:
			$('#gameMessageBtn1').text('Start a new game').show();
			$('#gameMessageBtn3').text('Leave the room').show();
			if(winner_ind == player_sit_index) {
				$('#gameMessage').css('color', clolr_blue).text('You win!');
				if(autoAI_F){
					asking = true; socket.emit('newGameReq');
				}
				//chatSys('This game is won by '+player_names[player_sit_index]);
			}
			else if(winner_ind == 3){
				$('#gameMessage').css('color', clolr_red).text('Tie');
				if(autoAI_F){
					asking = true; socket.emit('newGameReq');
				}
				//chatSys('This game is a tie');
			}
			else{
				$('#gameMessage').css('color', clolr_red).text('You lose!');
				if(autoAI_F){
					asking = true; socket.emit('newGameReq');
				}
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

function win_check(y, x, checkSide){
	var target = (checkSide == 'black')? 1 : 0;
	var result = 0;
	
	//dir +-X
	for(var i = 1; i < 6; i ++){
		if(x + i < 15){
			if(board[y][x + i] == target) result ++;
			else break;
		}
		else break;
	}
	for(var i = 1; i < 6; i ++){
		if(x - i >= 0){
			if(board[y][x - i] == target) result ++;
			else break;
		}
		else break;
	}
	//console.log((result_1 + result_2));
	if(result == 4) return true;
	result = 0;
	//dir +-Y
	for(var i = 1; i < 6; i ++){
		if(y + i < 15){
			if(board[y + i][x] == target) result ++;
			else break;
		}
		else break;
	}
	for(var i = 1; i < 6; i ++){
		if(y - i >= 0){
			if(board[y - i][x] == target) result ++;
			else break;
		}
		else break;
	}
	//console.log((result_1 + result_2));
	if(result == 4) return true;
	result = 0;
	//dir +Y+X
	for(var i = 1; i < 6; i ++){
		if(x + i < 15 && y + i < 15){
			if(board[y + i][x + i] == target) result ++;
			else break;
		}
		else break;
	}
	for(var i = 1; i < 6; i ++){
		if(x - i >= 0 && y - i >= 0){
			if(board[y - i][x - i] == target) result ++;
			else break;
		}
		else break;
	}
	//console.log((result_1 + result_2));
	if(result == 4) return true;
	result = 0;
	//dir +Y-X
	for(var i = 1; i < 6; i ++){
		if(x - i >= 0 && y + i < 15){
			if(board[y + i][x - i] == target) result ++;
			else break;
		}
		else break;
	}
	for(var i = 1; i < 6; i ++){
		if(x + i < 15 && y - i >= 0){
			if(board[y - i][x + i] == target) result ++;
			else break;
		}
		else break;
	}
	//console.log((result_1 + result_2));
	if(result == 4) return true;
	else return false;
}

//string method v=-1 s=0 o=1
var Two1=[// 7
	'vssvv','vvssv','vsvsv'
];
var Three1 = [//活三 9
	'vsssvv','vvsssv',
	'vssvsv','vsvssv'
];
var Three2 = [//弱活三 7
	'vsssv'
];
var Three3 = [//死三 9
	'osssvv','vvssso','vssvso','ossvsv','vsvsso','osvssv','svsvs'
];
var Four1 = [//活四 9
	'vssssv'
];
var Four2 = [//死四 9
	'ossssv', 'vsssso','sssvs', 'ssvss', 'svsss',
	'ssssv', 'vssss', 'svssssv', 'vssssvs'
];
var chessPool = [Four1, Four2, Three1, Three2, Three3, Two1]
/*
活四
死四
活三
弱活三
死三
活二
*/
function compare(input){
	var cmp, cType;
	var skip = false;
	var result = [0, 0, 0, 0, 0, 0, 0];
	for(var i = 0; i < 4; i ++){//從各個方向
		skip = false;
		for(var k = 0; k < 6 && !skip; k ++){//從高到低
			cmp = chessPool[k];
			cType = chessPool[k].length;
			if(gamecount < 3 && k == 5) cType --;
			for(var j = 0; j < cType && !skip; j ++){//找符合
				var Ctmp = input[i].indexOf(cmp[j]);
				if(Ctmp != -1){
					if(k == 6)console.log('add');
					result[k] ++;
					skip = true;
				}
			}
			skip = false;
		}
	}
	return result;
}

function arrayIdOfCoori(arrayIn, JsonIn){
	for(var i = 0; i < arrayIn.length; i ++){
		if(arrayIn[i].x == JsonIn.x && arrayIn[i].y == JsonIn.y) return i;
	}
	return -1;
}

function determine(selfList, SetSide){
	//board[y][x];
	//console.log(selfList[selfList.length-1]);
	var x = selfList[selfList.length-1].x, y = selfList[selfList.length-1].y;
	var tmp1 = 0, tmp2 = 0;
	if(board[y][x] != -1) return false;
	
	var half_zone = 5, zone = 11;
	tmp1 = x - half_zone, tmp2 = y - half_zone;
	var input = ['','','',''];
	for(var i = 0; i < zone; i ++){//dir +Y+X
		if(tmp1 + i >= 0 && tmp1 + i < 15 && tmp2 + i >= 0 && tmp2 + i < 15){
			var pre = arrayIdOfCoori(selfList, {'x': tmp1 + i,'y': tmp2 + i});
			if(i == half_zone) input[0] += 's';
			else if(pre != -1){ 
				if((selfList.length - pre) % 2) input[0] += 's';
				else input[0] += 'o';
			}
			else if(board[tmp2 + i][tmp1 + i] == 1 && SetSide == 'black') input[0] += 's';
			else if(board[tmp2 + i][tmp1 + i] == 0 && SetSide == 'white') input[0] += 's';
			else if(board[tmp2 + i][tmp1 + i] == -1) input[0] += 'v';
			else input[0] += 'o';
		}
	}
	tmp2 = y + half_zone;
	for(var i = 0; i < zone; i ++){//dir +Y-X
		if(tmp1 + i >= 0 && tmp1 + i < 15 && tmp2 - i >= 0 && tmp2 - i < 15){
			var pre = arrayIdOfCoori(selfList, {'x': tmp1 + i,'y': tmp2 - i});
			if(i == half_zone) input[1] += 's';
			else if(pre != -1){ 
				if((selfList.length - pre) % 2) input[1] += 's';
				else input[1] += 'o';
			}
			else if(board[tmp2 - i][tmp1 + i] == 1 && SetSide == 'black') input[1] += 's';
			else if(board[tmp2 - i][tmp1 + i] == 0 && SetSide == 'white') input[1] += 's';
			else if(board[tmp2 - i][tmp1 + i] == -1) input[1] += 'v';
			else input[1] += 'o';
		}
	}
	for(var i = 0; i < zone; i ++){
		if(tmp1 + i >= 0 && tmp1 + i < 15){
			var pre = arrayIdOfCoori(selfList, {'x': tmp1 + i,'y': y});
			if(i == half_zone) input[2] += 's';
			else if(pre != -1){ 
				if((selfList.length - pre) % 2) input[2] += 's';
				else input[2] += 'o';
			}
			else if(board[y][tmp1 + i] == 1 && SetSide == 'black') input[2] += 's';
			else if(board[y][tmp1 + i] == 0 && SetSide == 'white') input[2] += 's';
			else if(board[y][tmp1 + i] == -1) input[2] += 'v';
			else input[2] += 'o';
		}
	}
	tmp2 = y - half_zone;
	for(var i = 0; i < zone; i ++){
		if(tmp2 + i >= 0 && tmp2 + i < 15){
			var pre = arrayIdOfCoori(selfList, {'x': x,'y': tmp2 + i});
			if(i == half_zone) input[3] += 's';
			else if(pre != -1){ 
				if((selfList.length - pre) % 2) input[3] += 's';
				else input[3] += 'o';
			}
			else if(board[tmp2 + i][x] == 1 && SetSide == 'black') input[3] += 's';
			else if(board[tmp2 + i][x] == 0 && SetSide == 'white') input[3] += 's';
			else if(board[tmp2 + i][x] == -1) input[3] += 'v';
			else input[3] += 'o';
		}
	}
	tmp1 = compare(input);
	if(win_check(y, x, SetSide)) tmp1[6] = 1;
	else tmp1[6] = 0;
	return parseChess(tmp1);
}
/*
case:
c0	Win			XXX
c1	活4
c2	雙死四
c3	死四 活三
c4	雙活三		XXX
c5	死四 || 活三 + 弱活三 || 死三*1 up
c6	死四 || 活三 + 弱活三 || 死三*1
c7	死四 || 活三 + 活二
c8	死四 || 活三
c9	雙活二
c10	弱活三 || 死三*1 up
c11	活二
c12	死三*1
c13	弱活三*1
c14	廢
*/
function parseChess(chess){//可形成...
	if(!chess) return 14;
	if(chess[6] > 0) return 0;
	if(chess[0] > 0) return 1;//活四
	
	if(chess[1] > 1) return 2;//雙死四

	if(chess[1] > 0 && chess[2] > 0) return 3;//死四 活三
	if(chess[2] > 1 && chess[1] == 0) return 4;//雙活三
	var tmp2 = chess[4] + chess[3];
	if(chess[1] + chess[2] > 0){//有死四 || 活三
		if(tmp2 > 1) return 5;
		if(tmp2 == 1) return 6;
		if(chess[5] > 0) return 7;
		return 8;
	}
	if(chess[5] > 1) return 9;
	if(tmp2 > 1) return 10;
	if(chess[5] > 0) return 11;
	if(chess[4] > 0) return 12;
	if(chess[3] > 0) return 13;
	return 14;
}

function findBest(inputBoard){
	var result = new Array(225);
	for(var i = 0; i < 15; i ++){
		for(var j = 0; j < 15; j ++){
			if(inputBoard[i][j] === false) result[i*15+j] = 10000;
			else result[i*15+j] = inputBoard[i][j];
		}
	}
	var best = Math.min(...result);
	if(isNaN(best)) console.log('findBest:	WRONG');
	return best;
}
function findMax(inputBoard){
	var result = [];
	for(var i = 0; i < 15; i ++){
		for(var j = 0; j < 15; j ++){
			/*if(inputBoard[i][j] === false || board[i][j] != -1) result[i*15+j] = Number.NEGATIVE_INFINITY;
			else result[i*15+j] = inputBoard[i][j];*/
			if(!isNaN(inputBoard[i][j]) && board[i][j] == -1) result[result.length] = inputBoard[i][j];
		}
	}
	var best = Math.max(...result);
	if(isNaN(best)) console.log('findMax:	WRONG');
	return best;
}

function scoreChess(input){
	//var table = [190, 170, 150, 90, 30, 24, 22, 20, 15, 10, 10,2 ,2 ,2 ,0 ];
	var table = [190, 170, 150, 90, 30, 24, 22, 20, 15, 10, 10,2 ,2 ,2 ,0 ];
	return table[input];
}

function AI(SetSide){
	//console.log('Start');
	score = new Array(15);
	score1 = new Array(15);
	score2 = new Array(15);
	score3 = new Array(15);
	for(var i = 0; i < 15; i ++){
		score[i] = new Array(15);
		score1[i] = new Array(15);
		score2[i] = new Array(15);
		score3[i] = new Array(15);
	}
	for(var i = 0; i < 15; i ++)
		for(var j = 0; j < 15; j ++){
			score[i][j] = 0;
			score1[i][j] = false;
			score2[i][j] = false;
			score3[i][j] = false;
		}
	////Self Winning? OR
	////Opponent Winning?
	for(var i = 0; i < 15; i ++)
		for(var j = 0; j < 15; j ++){
			if(board[i][j] == -1){
				if(win_check(i, j, SetSide)){
					return {'x': j, 'y': i};
				}
			}
		}
	for(var i = 0; i < 15; i ++)
		for(var j = 0; j < 15; j ++){
			if(board[i][j] == -1){
				if(win_check(i, j, ((SetSide=='black')? 'white' : 'black'))){
					return {'x': j, 'y': i};
				}
			}
		}
	//determine
	for(var i = 0; i < 15; i ++)
		for(var j = 0; j < 15; j ++){
			if(board[i][j] == -1){
				score1[i][j] = determine([{'x': j ,'y': i}], SetSide);//我下這個位置的效益
				score2[i][j] = determine([{'x': j ,'y': i}], ((SetSide=='black')? 'white' : 'black'));//我下這個位置的效益可阻擋對手的效益
				//我下這個位置後，對手下一手的最大效益
				var deeper = new Array(15);
				for(var k = 0; k < 15; k ++){
					deeper[k] = new Array(15);
					for(var l = 0; l < 15; l ++){
						deeper[k][l] = false;
						if(board[k][l] == -1 && k != i && l != j){//下一手可落子區
							deeper[k][l] = determine([{'x': j , 'y': i}, {'x': l , 'y': k}], ((SetSide=='black')? 'white' : 'black'));
						}
					}
				}
				score3[i][j] = findBest(deeper);
			}
		}
	var best = [findBest(score1), findBest(score2), findBest(score3)]//Self
	//best3.score = parseChess(best3.best);
	/*
case:	score
//////////////////96
c0		100		Win
//////////////////48
c1		60		活4
c2		50		雙死四
c3		40		死四 活三
//////////////////24
c4		30		雙活三
//////////////////12
c5		24		死四 || 活三 + 弱活三 || 死三*1 up
c6		22		死四 || 活三 + 弱活三 || 死三*1
c7		20		死四 || 活三 + 活二
c8		15		死四 || 活三
//////////////////6
c9		10		雙活二
c10		10		弱活三 || 死三*1 up
//////////////////3
c11		2		活二
c12		2		死三*1
c13		2		弱活三*1
c14		0		廢
	*/
	var W = [0, 0, 0];
	for(var i = 0; i < 3; i ++){
		if(best[i] == 0) W[i] = 24;
		else if(best[i] < 4) W[i] = 20;
		else if(best[i] == 4) W[i] = 16;
		else if(best[i] < 9) W[i] = 12;
		else if(best[i] < 11) W[i] = 8;
		else W[i] = 4;
	}
	if(best[0] <= best[1]){
		if(best[0] < 4){
			W[1] -= 3;
			/*if(SetSide == 'black') W[1] -= 3;
			else W[0] -= 1;*/
		}
	}
	if(best[0] <= best[2]){
		if(best[0] < 4){
			W[2] = 0;
			/*if(SetSide == 'black') W[1] -= 3;
			else W[0] -= 1;*/
		}
	}
	
	if(best[0] < 9 || best[1] < 9){
		if(best[2] > 8) W[2] = 0;
		else if(best[2] > 4) W[2] = 2;
	}
	console.log(W);
	for(var i = 0; i < 15; i ++){
		for(var j = 0; j < 15; j ++){
			if(board[i][j] == -1)
				score[i][j] = scoreChess(score1[i][j]) * W[0] + scoreChess(score2[i][j]) * W[1] - scoreChess(score3[i][j]) * W[2];
		}
	}
	var standard = findMax(score);
	console.log(standard);
	var result = [];
	for(var i = 0; i < 15; i ++){
		for(var j = 0; j < 15; j ++){
			if(board[i][j] == -1 && score[i][j] == standard){
				result[result.length] = {'x': j, 'y': i};
			}
		}
	}
	return result[Math.floor(Math.random() * result.length)];
}

function AImain(){
	if(!moving || state != gameState.gaming) return;
	if(!last){
		socket.emit('move', {'x': 7, 'y': 7, 'color': side});
		moving = false;
		draw();
		return;
	}
	var temp = AI(side);
		if(temp){ 
			socket.emit('move', {'x': temp.x, 'y': temp.y, 'color': side});
			moving = false;
			draw();
		}
		else {
			chatSys('You can do it beter');
		}
}


$('#mid').append($('<button>').text('autoAI').click(function(){ 
	if(!autoAI_F){
		autoAI_F = true;
		autoAI = setInterval(function(){ if(moving) AImain(); }, 50);
	}
}));
$('#mid').append($('<button>').text('StopAI').click(function(){ 
	if(autoAI_F){
		autoAI_F = false;
		clearInterval(autoAI);
	}
}));