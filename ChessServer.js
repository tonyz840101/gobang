var http = require("http");
var url = require('url');
var fs = require('fs');
var io = require('socket.io');

var server = http.createServer(function(request, response) {
	var path = url.parse(request.url).pathname;

	switch (path) {
		case '/':
			fs.readFile(__dirname + '/index.html', function(error, data) {
				if (error){
					response.writeHead(404);
					response.write("404 Not found");
				}
				else {
					response.writeHead(200, {"Content-Type": "text/html"});
					response.write(data, "utf8");
				}
				response.end();
			});
			break;
		case '/style.css':
			fs.readFile(__dirname + '/style.css', function(error, data) {
				if (error){
					response.writeHead(404);
					response.write("404 Not found");
				}
				else {
					response.writeHead(200, {"Content-Type": "text/css"});
					response.write(data, "utf8");
				}
				response.end();
			});
			break;
		default:
			fs.readFile(__dirname + path, function(error, data) {
				if (error){
					response.writeHead(404);
					response.write("404 Not found");
				}
				else {
					response.writeHead(200);
					response.write(data, "utf8");
				}
				response.end();
			});
			break;
	}
});

server.listen(8080);

var player = [];
var room = [];
var player_count = 0;
var room_ctr = 1;
var gameState = {//state
	'init': 0,
	'gaming': 1,
	'surrender': 2,
	'result': 3,
	'leave': 5
}

var serv_io = io.listen(server);

var room_obj = function (roomID) {
	this.roomID = roomID;
	this.player_count = 0;
	this.state = gameState.init;
	this.moving = -1;
	this.move_count = 0;
	this.player_names = [];
	this.player_sit = [];
	
	this.board = new Array(15);
	for(var i = 0; i < 15; i ++) this.board[i] = [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1];
};

function findPlayer(id){//socket_ID
	for(ctr_2 = 0; ctr_2 < player.length; ctr_2 ++)
		if(player[ctr_2].s_id == id) return ctr_2;
	return -1;
}

function findPlayer2(id){//player_id
	for(ctr_2 = 0; ctr_2 < player.length; ctr_2 ++)
		if(player[ctr_2].player_id == id) return ctr_2;
	return -1;
}

function findRoom(id){
	for(ctr_2 = 0; ctr_2 < room.length; ctr_2 ++)
		if(room[ctr_2].roomID == id) return ctr_2;
	return -1;
}

function Newroom(){
	var new_rid = room.length;
	room[new_rid] = new room_obj(room_ctr.toString());
	//console.log('new: '+room[new_rid].roomID);
	room_ctr ++;
	return room[new_rid].roomID;
}

function Emptyroom(){
	for(var i = 0; i < room.length; i ++){
		if(room[i].player_count < 2) return room[i].roomID;
	}
	return -1;
}

function leaveRoom(socket, rid, player_id){
	var ID = room[rid].roomID;
	room[rid].player_count --;
	//if(room[rid].state > gameState.init && room[rid].state != gameState.result){
	if(room[rid].state == gameState.gaming || room[rid].state == gameState.surrender || room[rid].state == gameState.result){
		room[rid].state = gameState.leave;
		serv_io.to(room[rid].roomID).emit('LeaveRoom');
		socket.broadcast.to(room[rid].roomID).emit('alert', 'Opponent has left!');
		//serv_io.to(room[rid].roomID).emit('LeaveRoom', 1);
	}
	else {
		room[rid].player_sit.splice(room[rid].player_sit.indexOf(player_id), 1);
		room[rid].player_names.splice(room[rid].player_names.indexOf(player_id), 1);
		//room[rid].player_count --;
		if(!room[rid].player_count){
			//console.log('delete room ' + room[rid].roomID);
			room.splice(rid, 1);
		}
	}
	socket.leave(ID);
}

function brocasting(roomID) {
	if(roomID != -1){
		var rid = findRoom(roomID);//room[rid].
		serv_io.to(roomID).emit('message', "Start in room "+roomID)
		.to(roomID).emit('GameData', {
			'state': room[rid].state,
			'roomID': roomID,
			'moving': room[rid].moving,
			'player_sit': room[rid].player_sit,
			'player_names': room[rid].player_names
		});		
	}
}

function win_check(board, x, y, roomID){
	var target = board[y][x];
	var result = 0;
	
	//dir +-X
	for(var i = 1; i < 6; i ++){
		if(x + i < 15){
			if(board[y][x + i] == target){
				result ++;
			}
			else break;
		}
		else break;
	}
	for(var i = 1; i < 6; i ++){
		if(x - i >= 0){
			if(board[y][x - i] == target){
				result ++;
			}
			else break;
		}
		else break;
	}
	//console.log((result_1 + result_2));
	if(result == 4){
		return (target == 1)? 0 : 1;
	}
	result = 0;
	//dir +-Y
	for(var i = 1; i < 6; i ++){
		if(y + i < 15){
			if(board[y + i][x] == target){
				result ++;
			}
			else break;
		}
		else break;
	}
	for(var i = 1; i < 6; i ++){
		if(y - i >= 0){
			if(board[y - i][x] == target){
				result ++;
			}
			else break;
		}
		else break;
	}
	//console.log((result_1 + result_2));
	if(result == 4){
		return (target == 1)? 0 : 1;
	}
	result = 0;
	//dir +Y+X
	for(var i = 1; i < 6; i ++){
		if(x + i < 15 && y + i < 15){
			if(board[y + i][x + i] == target){
				result ++;
			}
			else break;
		}
		else break;
	}
	for(var i = 1; i < 6; i ++){
		if(x - i >= 0 && y - i >= 0){
			if(board[y - i][x - i] == target){
				result ++;
			}
			else break;
		}
		else break;
	}
	//console.log((result_1 + result_2));
	if(result == 4){
		return (target == 1)? 0 : 1;
	}
	result = 0;
	//dir +Y-X
	for(var i = 1; i < 6; i ++){
		if(x - i >= 0 && y + i < 15){
			if(board[y + i][x - i] == target){
				result ++;
			}
			else break;
		}
		else break;
	}
	for(var i = 1; i < 6; i ++){
		if(x + i < 15 && y - i >= 0){
			if(board[y - i][x + i] == target){
				result ++;
			}
			else break;
		}
		else break;
	}
	//console.log((result_1 + result_2));
	if(result == 4){
		return (target == 1)? 0 : 1;
	}
	else return false;
}

serv_io.sockets.on('connection', function(socket) {
	//console.log('Connection');
	var player_id = ++player_count;
	var roomID = -1;
	socket.emit('player_id', {'player_id': player_id});
	
	socket.on('addUser',function(msg){
		if (typeof socket.username != 'undefined') return;
		socket.username = msg;
		console.log("new user: "+msg+" logged with ID: " + socket['id']);
		player[player.length] = {'s_id': socket['id'], 'player_id': player_id, 'p_name': msg};
		//update userlist
		var userlist = [];
		for(var ctr_1 = 0; ctr_1 < player.length; ctr_1 ++)
			userlist[userlist.length] = player[ctr_1].p_name;
		serv_io.emit('userlist', {'userlist': userlist});
	});
	
	socket.on('findGame',function(){
		if(roomID != -1) return;
		console.log("Finding for " + socket.username + ' ' + socket['id']);
		socket.emit('message', "Finding...");
		var pid = findPlayer(socket['id']);
		if(room.length){
			roomID = Emptyroom();
			if(roomID == -1) roomID = Newroom();
			//console.log(roomID);
		}
		else {
			roomID = Newroom();
		}
		
		socket.join(roomID);
		var rid = findRoom(roomID);//room[rid].
		room[rid].player_sit[room[rid].player_sit.length] = player_id;
		room[rid].player_names[room[rid].player_names.length] = socket.username;
		room[rid].player_count ++;
		if(room[rid].player_count == 2){
			console.log('A game start in room ' + roomID);
			room[rid].moving = 0;
			room[rid].state = gameState.gaming;
			if(Math.floor(2 * Math.random())){
				var a = room[rid].player_names[0], b = room[rid].player_names[1];
				room[rid].player_names[1] = a;
				room[rid].player_names[0] = b;
				a = room[rid].player_sit[0], b = room[rid].player_sit[1];
				room[rid].player_sit[1] = a;
				room[rid].player_sit[0] = b;
			}
			/*console.log('game start:');*/
			//console.log(room[rid]);
			/*console.log(room[rid].player_sit);*/
			brocasting(roomID);
		}
	});
	
	socket.on('surrender',function(){
		if(roomID == -1) return;
		var rid = findRoom(roomID);
		var winner_index = room[rid].player_sit.indexOf(player_id);
		winner_index = (winner_index == 1)? 0 : 1;
		room[rid].state = gameState.surrender;
		serv_io.to(roomID).emit('Surrender', winner_index);
	});
	
	socket.on('chatMessage',function(msg){
		serv_io.to(roomID).emit('chatContent', msg);
	});
	
	socket.on('newGameReq',function(){
		serv_io.to(roomID).emit('newGameReq');
	});
	
	socket.on('restart',function(){
		if(roomID == -1) return;
		var rid = findRoom(roomID);
		if(room[rid].state == gameState.gaming) return;
		var a = {player_names: '', player_sit: -1}, b = {player_names: '', player_sit: -1};
		a.player_names = room[rid].player_names[0], b.player_names = room[rid].player_names[1];
		a.player_sit = room[rid].player_sit[0], b.player_sit = room[rid].player_sit[1];
		room[rid] = new room_obj(roomID);
		room[rid].player_names[1] = a.player_names;
		room[rid].player_names[0] = b.player_names;
		room[rid].player_sit[1] = a.player_sit;
		room[rid].player_sit[0] = b.player_sit;
		room[rid].player_count = 2;
		room[rid].moving = 0;
		room[rid].state = gameState.gaming;
			/*console.log('restart:');
			console.log(room[rid].player_names);
			console.log(room[rid].player_sit);*/
		serv_io.to(roomID).emit('NewGame');
		brocasting(roomID);
	});
	
	socket.on('print',function(data){
		console.log(data);
	});
	
	socket.on('move',function(data){
		if(roomID == -1) return;
		var rid = findRoom(roomID);
		if(room[rid].player_sit.indexOf(player_id) && data.color == 'black') return;//protection
		else if(!room[rid].player_sit.indexOf(player_id) && data.color == 'white') return;//protection
		//console.log(data);
		if(room[rid].state != gameState.gaming) return;//protection
		//console.log(data.color + ' move: ' + data.x + ', ' + data.y);
		serv_io.to(roomID).emit('move', data);
		room[rid].moving = (room[rid].moving == 1)? 0 : 1;
		brocasting(roomID);
		room[rid].move_count ++;
		var x_tmp = data.x, y_tmp = data.y;
		if(data.color == 'white'){
			x_tmp = 14 - x_tmp;
			y_tmp = 14 - y_tmp;
		}
		if(room[rid].board[y_tmp][x_tmp] != -1) return;//protection
		switch(data.color){
			case 'white':
				room[rid].board[y_tmp][x_tmp] = 0;
				break;
			case 'black':
				room[rid].board[y_tmp][x_tmp] = 1;
				break;
			default:
				break;
		}
		var result = win_check(room[rid].board, x_tmp, y_tmp, roomID);
		//console.log('win_check '+result);
		if(result !== false){
			serv_io.to(roomID).emit('Winner', result);
			room[rid].state = gameState.result;
		}
		else if(room[rid].move_count == 225){
			serv_io.to(roomID).emit('Winner', 3);
			room[rid].state = gameState.result;
		}
	});
	
	socket.on('Init',function(){
		//console.log(socket.username+' Init');
		if(roomID == -1) return;
		var rid = findRoom(roomID);
		leaveRoom(socket, rid, player_id);
		roomID = -1;
	});
	
	socket.on('leaveRoom',function(){
		console.log(socket.username+' leaveRoom...');
		if(roomID == -1) return;
		var rid = findRoom(roomID);
		leaveRoom(socket, rid, player_id);
		roomID = -1;
		console.log('done');
	});
	
	socket.on('disconnect',function(){
		var tmp = findPlayer(socket['id']);
		if(tmp != -1) player.splice(tmp,1);
		if(roomID != -1){
			var rid = findRoom(roomID);
			leaveRoom(socket, rid, player_id);
		}
		
		var userlist = [];
		for(var ctr_1 = 0; ctr_1 < player.length; ctr_1 ++)
			userlist[userlist.length] = player[ctr_1].p_name;
		serv_io.emit('userlist', {'userlist': userlist});
		console.log(socket.username+" left.");
	});
});