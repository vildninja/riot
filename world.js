

var width = window.innerWidth;
var height = window.innerHeight - 100;

// Our Javascript will go here.
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 45, width / height, 0.1, 1000 );

camera.position.z = 10;

var renderer = new THREE.WebGLRenderer();
renderer.setSize( width, height );
document.body.appendChild( renderer.domElement );

var geometry = new THREE.BoxGeometry( 0.1, 0.1, 0.1 );
var material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
var cube = new THREE.Mesh( geometry, material );
scene.add( cube );


var manager = new THREE.LoadingManager();


manager.onProgress = function ( item, loaded, total ) {

	console.log( item, loaded, total );

};

var filesLoaded = false;
manager.onLoad = function ( ) {

	console.log( 'Loading complete!');

	filesLoaded = true;
};

LoadAll(manager);


var geometry = {};
var entities = {};

var onProgress = function ( xhr ) {
};

var onError = function ( xhr ) {
	console.log("Error loading " + xhr);
};

function LoadSingle(file)
{
	var loader = new THREE.OBJLoader( manager );
			loader.load( file, function ( object ) {

				object.traverse( function ( child ) {
					if ( child instanceof THREE.Mesh ) {
						geometry[file] = child.geometry;
					}
				} );

			}, onProgress, onError );
}

function LoadAll(manager)
{
	LoadSingle("house.obj");
	LoadSingle("person.obj");
	LoadSingle("wall.obj");
}


function Entity(id, type, position)
{
	if (entities[id] != undefined)
		return;

	this.id = id;
	this.type = type;

	switch (type)
	{
		case "peop":
			this.color = 0xaaaa33;
			this.geometry = geometry["person.obj"];
			break;
		case "cop":
			this.color = 0x3333cc;
			this.geometry = geometry["person.obj"];
			break;
		case "wall":
			this.color = 0x555555;
			this.geometry = geometry["wall.obj"];
			break;
		case "house":
			this.color = 0x555555;
			this.geometry = geometry["house.obj"];
			break;
		case "box":
			this.color = 0x555555;
			this.geometry = new THREE.BoxGeometry( 1, 1, 1 );
			break;
	}

	var material = new THREE.MeshNormalMaterial( { color: this.color } );
	this.node = new THREE.Mesh( this.geometry, material );

	this.node.position.x = position.x;
	this.node.position.y = position.y;
	if (position.z === undefined)
		this.node.position.z = 0;
	else
		this.node.position.z = position.z;

	this.startTick = 0;
	this.endTick = 0;
	this.startPos = position;
	this.endPos = position;

	entities[id] = this;

	scene.add(this.node);

	this.Goto = Goto;
}

function KillEntity(id)
{
	if (entities[id] === undefined)
		return;

	var e = entities[id];
	scene.remove(e.node);
	delete e.node;
	delete entities[id];
}

function Goto(position)
{
	this.endPos = position;
}


function TickEvent(id, position, end)
{
	this.id = id;
	this.pos = position;
	this.end = end;

	console.log(JSON.stringify(this));
}


var frames = {};

var tick = 0;

var tickLength = 0.25;
var frameStartTime = 0;
var lastPing = 0;

function PushTickEvent(frame, evt)
{
	if (frame <= tick)
		frame = tick + 1;

	if (frames[frame] === undefined)
		frames[frame] = [evt];
	else
		frames[frame].push(evt);
}

function StartGame(firstTick)
{
	tick = firstTick;

	var d = new Date();
	frameStartTime = d.getTime() / 1000.0;
}

function Tick()
{
	frameStartTime += tickLength;

	for (var i in entities)
	{
		var e = entities[i];
		if (e.endTick == tick)
		{
			e.startPos = e.endPos;
			e.startTick = e.endTick;
		}
	}

	if (lastPing < tick - 10)
	{
		SendMessage("ping", 0);
		lastPing = tick;
	}

	if (frames[tick] === undefined)
		return;

	for (var i in frames[tick])
	{
		var evt = frames[tick][i];
		var e = entities[evt.id];

		if (e.endTick > tick)
		{
			var dif = e.endTick - e.startTick;

			if (dif > 0)
			{
				var cur = 0.0 + tick - e.startTick;
				var t = cur / dif;
				e.startPos.x = e.startPos.x * (1 - t) + e.endPos.x * t;
				e.startPos.y = e.startPos.y * (1 - t) + e.endPos.y * t;
			}
			else
			{
				e.startPos = e.endPos;
			}
		}

		e.endPos = evt.pos;
		e.startTick = tick;
		e.endTick = evt.end;
	}

	delete frames[tick];
}

function Update()
{
	var d = new Date();
	var t = d.getTime() / 1000.0;
	t = (t - frameStartTime) / tickLength;
	if (t < 0)
	{
		t = 0;
	}

	if (t > 1)
	{
		Tick(++tick);
		t = 0;
	}

	for (var i in entities)
	{
		var e = entities[i];

		var dif = e.endTick - e.startTick;
		var nt = 0;

		if (dif > 0)
		{
			var cur = 0.0 + tick - e.startTick;
			nt = cur / dif + t / dif;
		}

		e.node.position.x = e.startPos.x * (1 - nt) + e.endPos.x * nt;
		e.node.position.y = e.startPos.y * (1 - nt) + e.endPos.y * nt;
	}
}

//Connection


var socket = new WebSocket("ws://localhost:8080");

function SendMessage(type, body)
{
	var message = {};
	switch (type)
	{
		case "ping":
			message.t = "p";
			break;
		case "goto":
			message.t = "g";
			message.x = Math.round(body.x * 10);
			message.y = Math.round(body.y * 10);
			break;
	}

	socket.send(JSON.stringify(message));
}

function ReceiveMessage(message)
{

	switch (message.t)
	{
		case "start":
			// start the game
			StartGame(message.frame);
			break;
		case "n":
			// new entity
			var pos = {x: message.x / 10.0, y: message.y / 10.0};
			new Entity(message.id, message.type, pos);
			break;
		case "k":
			// kill entity
			KillEntity(message.e);
			break;
		case "g":
			//goto
			var pos = {x: message.x / 10.0, y: message.y / 10.0};
			PushTickEvent(message.f, new TickEvent(message.e, pos, message.end));
			break;
	}
}



// Show a connected message when the WebSocket is opened.
socket.onopen = function(event) {
	console.log('Connected to: ' + event.currentTarget.url);
};
// Handle any errors that occur.
socket.onerror = function(error) {
	console.log('WebSocket Error: ' + error);
};

// Handle messages sent by the server.
socket.onmessage = function(event) {
	console.log(event.data);
	var message = JSON.parse(event.data);

	for (var i in message)
		ReceiveMessage(message[i]);


};

var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();

function OnClick(event)
{

	mouse.x = ( event.clientX / width ) * 2 - 1;
	mouse.y = - ( event.clientY / height ) * 2 + 1;

	raycaster.setFromCamera( mouse, camera );
	var intersects = raycaster.intersectObjects( scene.children );
	for ( var i = 0; i < intersects.length; i++ ) {
		//intersects[i].object.material = new THREE.MeshBasicMaterial({color: 0xff0000});
		console.log(intersects[i].point);

		SendMessage("goto", intersects[i].point);
	}

}

window.addEventListener( 'mousedown', OnClick, false );