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

var score = [];
var score1 = [];
var score2 = [];
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
	for(var i = 1; i < 5; i ++){
		if(x + i < 15){
			if(board[y][x + i] == target) result ++;
			else break;
		}
		else break;
	}
	for(var i = 1; i < 5; i ++){
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
	for(var i = 1; i < 5; i ++){
		if(y + i < 15){
			if(board[y + i][x] == target) result ++;
			else break;
		}
		else break;
	}
	for(var i = 1; i < 5; i ++){
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
	for(var i = 1; i < 5; i ++){
		if(x + i < 15 && y + i < 15){
			if(board[y + i][x + i] == target) result ++;
			else break;
		}
		else break;
	}
	for(var i = 1; i < 5; i ++){
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
	for(var i = 1; i < 5; i ++){
		if(x - i >= 0 && y + i < 15){
			if(board[y + i][x - i] == target) result ++;
			else break;
		}
		else break;
	}
	for(var i = 1; i < 5; i ++){
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
var one1=[// 5
	'vsvv','vvsv'
];
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
	'osssvv','vvssso','vssvso','ossvsv','vsvsso','osvssv'
];
var Four1 = [//活四 9
	'vssssv'
];
var Four2 = [//死四 9
	'ossssv', 'vsssso','sssvs', 'ssvss', 'svsss'
];

function compare(SetSide, input, cCase){
	var num = 0;
	var cmp, cType, cMsg = SetSide + ' ';
	switch(cCase){
		case 0:
			cmp = Four1;
			cType = Four1.length;
			cMsg += '活四';
			break;
		case 1:
			cmp = Four2;
			cType = Four2.length;
			cMsg += '死四';
			break;
		case 2:
			cmp = Three1;
			cType = Three1.length;
			cMsg += '活三';
			break;
		case 3:
			cmp = Three2;
			cType = Three2.length;
			cMsg += '弱活三';
			break;
		case 4:
			cmp = Three3;
			cType = Three3.length;
			cMsg += '死三';
			break;
		case 5:
			cmp = Two1;
			cType = Two1.length;
			cMsg += '活二';
			break;
		case 6:
			cmp = one1;
			cType = one1.length;
			cMsg += '單一';
			break;
		default:
			break;
	}
	var skip = false;
	for(var i = 0; i < 4; i ++){
		skip = false;
		for(var j = 0; j < cType && !skip; j ++){
			var Ctmp = input[i].indexOf(cmp[j]);
			if(Ctmp != -1){
				num ++;
				skip = true;
				//console.log('match');
				//j = 0;
			}
		}
	}
	cMsg += ' match: ' + num;
	switch(cCase){
		case 0:
			if(num > 0)console.log(cMsg);
			break;
		case 1:
			if(num > 0)console.log(cMsg);
			break;
		case 2:
			if(num > 0)console.log(cMsg);
			break;
		case 3:
			if(num > 0)console.log(cMsg);
			break;
		case 4:
			if(num > 0)console.log(cMsg);
			break;
		case 5:
			if(num > 0)console.log(cMsg);
			break;
		case 6:
			if(num > 0)console.log(cMsg);
			break;
	}
	return num;
}
var point1 = 3000,//win
	point6 = 320,//D4
	point2 = 300,//S3
	point3 = 200,//W3
	point4 = 60,//D3
	point5 = 10;//2
	
function determine(y, x, SetSide){
	//board[y][x];
	
	var tmp1 = 0, tmp2 = 0;
	for(var i = 0; i < 3; i ++){//check isolated
		for(var j = 0; j < 3; j ++){
			if(x - 1 + j >= 0 && x - 1 + j < 15 && y - 1 + i >= 0 && y - 1 + i < 15){
				tmp1 ++;
				if(board[y - 1 + i][x - 1 + j] == -1) tmp2 ++;
				if(tmp1 != tmp2) break;
			}
		}
		if(tmp1 != tmp2) break;
	}
	if(tmp1 == tmp2){ 
		//console.log('end early'); 
		return 0;
	}
	var half_zone = 5, zone = 11;
	tmp1 = x - half_zone, tmp2 = y - half_zone;
	var input = ['','','',''];
	for(var i = 0; i < zone; i ++){//dir +Y+X
		if(tmp1 + i >= 0 && tmp1 + i < 15 && tmp2 + i >= 0 && tmp2 + i < 15){
			if(i == half_zone) input[0] += 's';
			else if(board[tmp2 + i][tmp1 + i] == -1) input[0] += 'v';
			else if(board[tmp2 + i][tmp1 + i] == 1 && SetSide == 'black') input[0] += 's';
			else if(board[tmp2 + i][tmp1 + i] == 0 && SetSide == 'white') input[0] += 's';
			else input[0] += 'o';
		}
	}
	tmp2 = y + half_zone;
	for(var i = 0; i < zone; i ++){//dir +Y-X
		if(tmp1 + i >= 0 && tmp1 + i < 15 && tmp2 - i >= 0 && tmp2 - i < 15){
			if(i == half_zone) input[1] += 's';
			else if(board[tmp2 - i][tmp1 + i] == -1) input[1] += 'v';
			else if(board[tmp2 - i][tmp1 + i] == 1 && SetSide == 'black') input[1] += 's';
			else if(board[tmp2 - i][tmp1 + i] == 0 && SetSide == 'white') input[1] += 's';
			else input[1] += 'o';
		}
	}
	for(var i = 0; i < zone; i ++){
		if(tmp1 + i >= 0 && tmp1 + i < 15){
			if(i == half_zone) input[2] += 's';
			else if(board[y][tmp1 + i] == -1) input[2] += 'v';
			else if(board[y][tmp1 + i] == 1 && SetSide == 'black') input[2] += 's';
			else if(board[y][tmp1 + i] == 0 && SetSide == 'white') input[2] += 's';
			else input[2] += 'o';
		}
	}
	tmp2 = y - half_zone;
	for(var i = 0; i < zone; i ++){
		if(tmp2 + i >= 0 && tmp2 + i < 15){
			if(i == half_zone) input[3] += 's';
			else if(board[tmp2 + i][x] == -1) input[3] += 'v';
			else if(board[tmp2 + i][x] == 1 && SetSide == 'black') input[3] += 's';
			else if(board[tmp2 + i][x] == 0 && SetSide == 'white') input[3] += 's';
			else input[3] += 'o';
		}
	}
	/*console.log(x+'	'+y);
	console.log(input[0]);
	console.log(input[1]);
	console.log(input[2]);
	console.log(input[3]);*/
	/*
死3活3， 70分
死4， 60分
活3， 50分
?活2， 40分
死3， 30分
活2， 20分
	*/
	/*
	point1 = 3000,//win
	point6 = 320,//D4
	point2 = 300,//S3
	point3 = 200,//W3
	point4 = 60,//D3
	point5 = 10;//2
	*/
		
	
	if(compare(SetSide, input, 0) > 0) return point1+2000;//活4
	tmp1 = compare(SetSide, input, 1); tmp2 = compare(SetSide, input, 2);
	var tmp3 = compare(SetSide, input, 3), tmp4 = compare(SetSide, input, 4), tmp5 = compare(SetSide, input, 5);
	var comp = 0;
	if(tmp1 > 0 && tmp2 > 0) return point1;//死四活三
	else if(tmp1 > 1) return point1;//雙死四
	else if(tmp2 > 1) return tmp2 * point2 + 2000;//雙活三 300+ 2000
	else if(tmp2 > 0 && tmp4 > 0) return tmp2 * point2 + tmp4 * point4;//死三活三
	else if(tmp3 > 0 && tmp4 > 0) return tmp3 * point3 + tmp4 * point4;//死三弱活三
	else if(tmp1 > 0) return point6;//死四
	else if(tmp2 > 0){//活三
		if(tmp5 > 0) comp = ((tmp5 * point5 + tmp2 * point2) > comp)? (tmp5 * point5 + tmp2 * point2) : comp;
		else  comp = ((tmp2 * point2) > comp)? (tmp2 * point2) : comp;
	}
	else if(tmp3 > 0){//弱活三
		if(tmp5 > 0) comp = ((tmp5 * point5 + tmp3 * point3) > comp)? (tmp5 * point5 + tmp3 * point3) : comp;
		else  comp = ((tmp3 * point3) > comp)? (tmp3 * point3) : comp;
	}
	if(tmp5 > 1) comp = point2/6*5;//雙活二
	if(tmp4 > 0) comp = ((tmp4 * point4) > comp)? (tmp4 * point4) : comp;//死三
	
	if(comp != 0) return comp;
	tmp1 = compare(SetSide, input, 6);
	if(tmp1 > 0) return 1;//單一
	return 0;
}

function AI(SetSide){
	console.log('Start');
	score = new Array(15);
	score1 = new Array(15);
	score2 = new Array(15);
	for(var i = 0; i < 15; i ++){
		score[i] = new Array(15);
		score1[i] = new Array(15);
		score2[i] = new Array(15);
	}
	for(var i = 0; i < 15; i ++)
		for(var j = 0; j < 15; j ++){
			score[i][j] = 0;
			score1[i][j] = 0;
			score2[i][j] = 0;
		}

	////Self Winning?
	for(var i = 0; i < 15; i ++)
		for(var j = 0; j < 15; j ++){
			if(board[i][j] == -1){
				if(win_check(i, j, SetSide)){
					return {'x': j, 'y': i};
				}
			}
		}
	////Opponent Winning?
	for(var i = 0; i < 15; i ++)
		for(var j = 0; j < 15; j ++){
			if(board[i][j] == -1){
				if(win_check(i, j, ((SetSide=='black')? 'white' : 'black'))){
					return {'x': j, 'y': i};
				}
			}
		}
	//for(var i = 0; i < 15; i ++) console.log(score[i]);
	//determine Self
	for(var i = 0; i < 15; i ++)
		for(var j = 0; j < 15; j ++){
			if(board[i][j] == -1){
				//console.log(determine(i, j, SetSide));
				var Stemp = determine(i, j, SetSide);
				if(Stemp) console.log(SetSide+' test1	'+i+' '+j+' '+Stemp);
				score[i][j] += Stemp;
				score1[i][j] += Stemp;
			}
		}
	//for(var i = 0; i < 15; i ++) console.log(score[i]);
	//determine Opponent
	for(var i = 0; i < 15; i ++)
		for(var j = 0; j < 15; j ++){
			if(board[i][j] == -1){
				var Stemp = determine(i, j, ((SetSide=='black')? 'white' : 'black'));
				if(Stemp) console.log(((SetSide=='black')? 'white' : 'black')+' test2	'+i+' '+j+' '+Stemp);
				score[i][j] += Stemp;
				score2[i][j] += Stemp;
			}
		}
	//for(var i = 0; i < 15; i ++) console.log(score[i]);
	//Find Best
	var Smax = {'x': -1, 'y': -1, 's': 0}, Smax1 = {'x': -1, 'y': -1, 's': 0}, Smax2 = {'x': -1, 'y': -1, 's': 0};;
	for(var i = 0; i < 15; i ++)
		for(var j = 0; j < 15; j ++){
			if(board[i][j] == -1){
				if(score[i][j] > Smax.s){
					Smax.s = score[i][j];
					Smax.x = j;
					Smax.y = i;
				}
				if(score1[i][j] > Smax1.s){
					Smax1.s = score1[i][j];
					Smax1.x = j;
					Smax1.y = i;
				}
				if(score2[i][j] > Smax2.s){
					Smax2.s = score2[i][j];
					Smax2.x = j;
					Smax2.y = i;
				}
			}
		}
	var result = [], Fresult;
	if(Smax.x == -1){
		//return false;
		console.log('shit');
		for(var i = 0; i < 15; i ++)
			for(var j = 0; j < 15; j ++){
				if(board[i][j] == -1) result[result.length] = {'x': j, 'y': i};
			}
		var Atmp = result[Math.floor(Math.random() * result.length)];
		Smax.x = Atmp.x;
		Smax.y = Atmp.y;
		return Smax;
	}
	/*
	point1 = 3000,//win
	point6 = 320,//D4
	point2 = 300,//S3
	point3 = 200,//W3
	point4 = 60,//D3
	point5 = 10;//2
	*/
	if(Smax1.s >= point1){
		return Smax1;
	}
	else if(Smax2.s >= point1){
		return Smax2;
	}
	else if(Smax1.s >= 2000){
		result = [];
		for(var i = 0; i < 15; i ++)
			for(var j = 0; j < 15; j ++){
				if(score1[i][j] == Smax1.s) result[result.length] = {'x': j, 'y': i};
			}
		Fresult = result[Math.floor(Math.random() * result.length)];
		Smax1.x = Fresult.x;
		Smax1.y = Fresult.y;
		return Smax1;
	}
	else if(Smax2.s >= 2000){
		result = [];
		for(var i = 0; i < 15; i ++)
			for(var j = 0; j < 15; j ++){
				if(score2[i][j] == Smax2.s) result[result.length] = {'x': j, 'y': i};
			}
		Fresult = result[Math.floor(Math.random() * result.length)];
		Smax2.x = Fresult.x;
		Smax2.y = Fresult.y;
		return Smax2;
	}
	else if(Smax1.s >= 360){
		result = [];
		for(var i = 0; i < 15; i ++)
			for(var j = 0; j < 15; j ++){
				if(score1[i][j] == Smax1.s) result[result.length] = {'x': j, 'y': i};
			}
		Fresult = result[Math.floor(Math.random() * result.length)];
		Smax1.x = Fresult.x;
		Smax1.y = Fresult.y;
		return Smax1;
	}
	else if(Smax2.s >= 360){
		result = [];
		for(var i = 0; i < 15; i ++)
			for(var j = 0; j < 15; j ++){
				if(score2[i][j] == Smax2.s) result[result.length] = {'x': j, 'y': i};
			}
		Fresult = result[Math.floor(Math.random() * result.length)];
		Smax2.x = Fresult.x;
		Smax2.y = Fresult.y;
		return Smax2;
	}
	//if()
	for(var i = 0; i < 15; i ++)
		for(var j = 0; j < 15; j ++){
			if(score[i][j] == Smax.s) result[result.length] = {'x': j, 'y': i};
		}
	Fresult = result[Math.floor(Math.random() * result.length)];
	Smax.x = Fresult.x;
	Smax.y = Fresult.y;
	return Smax;
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
		autoAI = setInterval(function(){ if(moving)AImain(); }, 50);
	}
}));
$('#mid').append($('<button>').text('StopAI').click(function(){ 
	if(autoAI_F){
		autoAI_F = false;
		clearInterval(autoAI);
	}
}));