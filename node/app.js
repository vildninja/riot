
const entities = {};
let nextId = 5;

const level = require('./level.json');

for (let i in level.entities)
{
	let e = level.entities[i];

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
	let s = {};
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
	for (let i = 0; i < spawn.length; i++) {
		if (spawn[i].id == id)
		{
			spawn.splice(i, 1);
			break;
		}
	}
}

for (let i in entities)
{
	AddToSpawn(entities[i]);
}

let tick = 0;
const tickDelay = 2;

const users = {};
const messages = new Array();
const commands = new Array();

function RemoveEntity(id)
{
	if (entities[id] === undefined)
		return;
	RemoveFromSpawn(id);
	delete entities[id];
	commands.push({t:"k", e:id});
}

function KickUser(user)
{
	if (users[user.id] === undefined)
		return;

	RemoveEntity(user.id);
	user.ws.close();
	delete users[user.id];
}

function AddEntity(msg)
{
	let e = {};
	e.type = msg.type;
	e.x = msg.x;
	e.y = msg.y;

	console.log("Add " + msg.type + " at x" + msg.x + " y" + msg.y);

	e.startTick = 0;
	e.endTick = 0;
	e.startPos = {x:e.x, y:e.y};
	e.endPos = {x:e.x, y:e.y};

	e.id = nextId++;
	entities[e.id] = e;

	let s = AddToSpawn(e);
	commands.push(s);
}

function ExportMap()
{
	let out = new Array();
	for (let id in entities)
	{
		let e = entities[id];

		switch (e.type)
		{
			case "house":
			case "wall":
			case "tall":
			case "wall2":
			case "box":
			case "tree":
			case "grass":
			case "bush":
				out.push({type:e.type, x:e.x, y:e.y});
				break;
		}
	}

	let fs = require('fs');
	fs.writeFile("./live.json", JSON.stringify({entities:out}, null, 2), function(err) {
	    if(err) {
	        return console.log(err);
	    }

	    console.log("The file was saved!");
	}); 
}

const WebSocket = require('ws');
// const wss = new WebSocket.Server({ port: 8080 });

const https = require('https');
const fs = require('fs');

// ssl_certificate /etc/letsencrypt/live/www.pew.dk/fullchain.pem;
// ssl_certificate_key /etc/letsencrypt/live/www.pew.dk/privkey.pem;

const server = https.createServer({
	cert: fs.readFileSync('/etc/letsencrypt/live/www.pew.dk/fullchain.pem'),
	key: fs.readFileSync('/etc/letsencrypt/live/www.pew.dk/privkey.pem')
}).listen(8080);

const wss = new WebSocket.Server({ server });

const LZString = require('./lz-string.min.js');

function Zend(ws, msg)
{
	ws.send(LZString.compressToUint8Array(msg));
}

wss.on('connection', function connection(ws)
{
	let id = nextId++;

	let user = {};
	user.id = id;
	user.ws = ws;
	user.tick = tick;

	users[id] = user;

	let e = {};
	e.id = id;
	e.type = "peop";
	e.x = Math.random() * 8 - 4;
	e.y = Math.random() * 8 - 4;

	e.startTick = tick;
	e.endTick = tick;
	e.startPos = {x:e.x, y:e.y};
	e.endPos = {x:e.x, y:e.y};

	entities[id] = e;
	let s = AddToSpawn(e);
	commands.push(s);


	console.log('Connection');
	ws.on('message', function incoming(message)
	{
		let msg = {};
		msg.id = id;
		msg.data = JSON.parse(LZString.decompressFromUint8Array(message));
		messages.push(msg);
	});

	ws.on('close', function close()
	{
		console.log('User %d left', id);
		KickUser(user);
	});

	for (let i = 0; i < spawn.length; i++)
	{
		spawn[i].x = Math.round(entities[spawn[i].id].x * 10);
		spawn[i].y = Math.round(entities[spawn[i].id].y * 10);
	}

	Zend(ws, JSON.stringify(spawn));
	Zend(ws, '[{"t":"start", "frame":' + (tick - tickDelay) + ', "you":' + id + '}]')

});

console.log("Server started!");

const tictTime = 250;
const kickTimer = 20;

let firstTickTime = Date.now();
let nextTick = firstTickTime;

let frames = {};

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

	let frame = new Array();

	for (let i = 0; i < messages.length; i++)
	{
		let msg = messages[i]
		console.log('received from(%d): %s', msg.id, msg.data.t);

		switch (msg.data.t)
		{
			case "g":
				// goto
				let evt = {};
				evt.t = "g";
				evt.e = msg.id;
				evt.x = msg.data.x;
				evt.y = msg.data.y;
				evt.f = tick;

				let curx;
				let cury;

				let e = entities[msg.id];
				if (e === undefined)
					break;

				if (e.endTick > tick)
				{
					let dif = e.endTick - e.startTick;

					if (dif > 0)
					{
						let cur = 0.0 + tick - e.startTick;
						let t = cur / dif;
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

				let dx = curx - msg.data.x / 10;
				let dy = cury - msg.data.y / 10;

				evt.end = tick + Math.max(1, Math.round(Math.sqrt(dx * dx + dy * dy)));

				frame.push(evt);
				//PushEvent(tick + tickDelay, evt);

				commands.push(evt);
				break;
			case "p":
				// ping
				if (users[msg.id] != undefined)
					users[msg.id].tick = tick;
				break;
			case "n":
				AddEntity({type: msg.data.type, x: msg.data.x / 10, y: msg.data.y / 10});
				break;
			case "k":
				if (users[msg.data.e] === undefined)
					RemoveEntity(msg.data.e);
				break;
			case "save":
				ExportMap();
				break;
		}
	}

	messages.length = 0;

//	let frame;
//	if (frames[tick] != undefined)
//	{
//		frame = frames[tick];

		for (let i = 0; i < frame.length; i++)
		{
			let evt = frame[i];
			let e = entities[evt.e];

			if (e === undefined)
				continue;

			GotoEvent(e, evt.x / 10.0, evt.y / 10.0, evt.end);
			
		}

//		delete frames[tick];
//	}



	// move
	for (let id in users)
	{
		let user = users[id];

		if (user.tick < tick - kickTimer)
		{
			console.log('Kick user ' + id);

			//gtfo
			KickUser(user);
			continue;
		}

		let e = entities[user.id];
		if (e === undefined)
			continue;

		if (e.endTick >= tick)
		{
			let dif = e.endTick - e.startTick;

			if (dif > 0)
			{
				let cur = 0.0 + tick - e.startTick;
				let t = cur / dif;
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
	for (let id in users)
	{
		let user = users[id];



	}

	let send = JSON.stringify(commands)
	commands.length = 0;

	// transmit
	for (let id in users)
	{
		if (users[id] === undefined || users[id].ws.isAlive == false)
			continue;
		try
		{
			Zend(users[id].ws, send);
		}
		catch (err)
		{
			console.log(err);
		}
	}


	//console.log(entities);


	let delay = nextTick - Date.now();
	if (delay < 1)
		delay = 1;
	setTimeout(Tick, delay);
}

Tick();
