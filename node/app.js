
const entities = {};
var nextId = 5;

const level = require('./level.json');

for (var i in level.entities)
{
	var e = level.entities[i];

	e.startTick = 0;
	e.endTick = 0;
	e.startPos = {x:e.x, y:e.y};
	e.endPos = {x:e.x, y:e.y};

	e.id = nextId++;
	entities[e.id] = e;
}

const spawn = new Array();

function AddToSpawn(entity)
{
	var s = {};
	s.t = "n";
	s.id = entity.id;
	s.type = entity.type;
	s.x = Math.round(entity.x * 10);
	s.y = Math.round(entity.y * 10);
	spawn.push(s);
	return s;
}

function RemoveFromSpawn(id)
{
	for (var i = 0; i < spawn.length; i++) {
		if (spawn[i].id == id)
		{
			spawn.splice(i, 1);
			break;
		}
	}
}

for (var i in entities)
{
	AddToSpawn(entities[i]);
}

var tick = 0;

const users = {};
const messages = new Array();
const commands = new Array();

function KickUser(user)
{
	user.ws.close();
	RemoveFromSpawn(user.id);
	delete entities[user.id];
	delete users[user.id];
	commands.push({t:"k", e:user.id});
}

const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', function connection(ws)
{
	var id = nextId++;

	var user = {};
	user.id = id;
	user.ws = ws;
	user.tick = tick;

	users[id] = user;

	var e = {};
	e.id = id;
	e.type = "peop";
	e.x = 2;
	e.y = 2;

	e.startTick = tick;
	e.endTick = tick;
	e.startPos = {x:e.x, y:e.y};
	e.endPos = {x:e.x, y:e.y};

	entities[id] = e;
	var s = AddToSpawn(e);
	commands.push(s);


	console.log('Connection');
	ws.on('message', function incoming(message)
	{
		var msg = {};
		msg.id = id;
		msg.data = JSON.parse(message);
		messages.push(msg);
	});

	ws.on('close', function close()
	{
		console.log('User %d left', id);
		KickUser(user);
	});

	for (var i = 0; i < spawn.length; i++) {
		spawn[i].x = Math.round(entities[spawn[i].id].x * 10);
		spawn[i].y = Math.round(entities[spawn[i].id].y * 10);
	}

	ws.send(JSON.stringify(spawn));
	ws.send('[{"t":"start", "frame":' + tick + '}]')
});

console.log("Server started!");

const tictTime = 250;
const kickTimer = 20;
const tickDelay = 4;

var firstTickTime = Date.now();
var nextTick = firstTickTime;

var frames = {};

function PushEvent(frame, msg)
{
	if (frames[frame] === undefined)
		frames[frame] = [msg];
	else
		frames[frame].push(msg);
}

function GotoEvent(e, x, y, end)
{
	if (e === undefined)
		return;

	e.startPos.x = e.x;
	e.startPos.y = e.y;
	e.endPos.x = x;
	e.endPos.y = y;
	e.startTick = tick;
	e.endTick = end;
}

function Tick()
{
	tick++;
	console.log("Tick " + tick)
	nextTick += tictTime;

	for (var i = 0; i < messages.length; i++)
	{
		var msg = messages[i]
		console.log('received from(%d): %s', msg.id, msg.data.t);

		switch (msg.data.t)
		{
			case "g":
				// goto
				var evt = {};
				evt.t = "g";
				evt.e = msg.id;
				evt.x = msg.data.x;
				evt.y = msg.data.y;
				evt.f = tick + tickDelay;

				var curx;
				var cury;

				var e = entities[msg.id];
				if (e === undefined)
					break;

				if (e.endTick > tick)
				{
					var dif = e.endTick - e.startTick;

					if (dif > 0)
					{
						var cur = 0.0 + (tick + tickDelay) - e.startTick;
						var t = cur / dif;
						if (t > 1)
							t = 1;
						curx = e.startPos.x * (1 - t) + e.endPos.x * t;
						cury = e.startPos.y * (1 - t) + e.endPos.y * t;
					}
					else
					{
						curx = e.endPos.x;
						cury = e.endPos.y;
					}
				}
				else
				{
					curx = e.endPos.x;
					cury = e.endPos.y;
				}

				var dx = curx - msg.data.x / 10;
				var dy = cury - msg.data.y / 10;

				evt.end = tick + tickDelay + 
					Math.max(1, Math.round(Math.sqrt(dx * dx + dy * dy)));

				PushEvent(tick + tickDelay, evt);

				commands.push(evt);
				break;
			case "p":
				// ping
				if (users[msg.id] != undefined)
					users[msg.id].tick = tick;
				break;
		}
	}

	messages.length = 0;

	var frame;
	if (frames[tick] != undefined)
	{
		frame = frames[tick];

		for (var i = 0; i < frame.length; i++)
		{
			var evt = frame[i];
			var e = entities[evt.e];

			if (e === undefined)
				continue;

			GotoEvent(e, evt.x / 10.0, evt.y / 10.0, evt.end);
			
		}

		delete frames[tick];
	}



	// move
	for (var id in users)
	{
		var user = users[id];

		if (user.tick < tick - kickTimer)
		{
			console.log('Kick user ' + id);

			//gtfo
			KickUser(user);
			continue;
		}

		var e = entities[user.id];

		if (e.endTick >= tick)
		{
			var dif = e.endTick - e.startTick;

			if (dif > 0)
			{
				var cur = 0.0 + tick - e.startTick;
				var t = cur / dif;
				e.x = e.startPos.x * (1 - t) + e.endPos.x * t;
				e.y = e.startPos.y * (1 - t) + e.endPos.y * t;
			}
			else
			{
				e.startPos = e.endPos;
			}
		}
	}

	// evaluate
	for (var id in users)
	{
		var user = users[id];



	}

	var send = JSON.stringify(commands)
	commands.length = 0;

	// transmit
	for (var id in users)
	{
		if (users[id] === undefined || users[id].ws.isAlive === false)
			continue;
		users[id].ws.send(send);
	}


	var delay = nextTick - Date.now();
	if (delay < 1)
		delay = 1;
	setTimeout(Tick, delay);
}

Tick();
