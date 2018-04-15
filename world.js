

var admin = window.location.toString().includes("784ct3t6v789ny982yt92xynt782ynxr9yt872tcn82");
var clickState = "move";
console.log(window.location.toString());

var width = window.innerWidth;
var height = window.innerHeight - 100;

// Our Javascript will go here.
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 45, width / height, 0.1, 1000 );

if (admin)
{
	camera.position.z = 20;
	camera.rotation.x = 0.5;
}
else
{
	camera.position.z = 7;
	camera.rotation.x = 45;
}

var renderer = new THREE.WebGLRenderer();
renderer.setSize( width, height );
document.body.appendChild( renderer.domElement );

var geometry = new THREE.BoxGeometry( 0.1, 0.1, 0.1 );
var material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
var cube = new THREE.Mesh( geometry, material );
scene.add( cube );

var grass = new THREE.TextureLoader().load( 'grass.jpg' );
grass.wrapS = THREE.RepeatWrapping;
grass.wrapT = THREE.RepeatWrapping;
grass.repeat.set( 647, 647 );

var shopTex = new THREE.TextureLoader().load( 'shop.jpg' );


var groundGeo = new THREE.PlaneGeometry(1000, 1000);
var groundMat = new THREE.MeshBasicMaterial( { map: grass } );
var ground = new THREE.Mesh( groundGeo, groundMat );
scene.add(ground);


var manager = new THREE.LoadingManager();


manager.onProgress = function ( item, loaded, total ) {

	console.log( item, loaded, total );

};

var isConnecting = false;
var connectionStarted = false;
var filesLoaded = false;

var myId = -1;

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

function LoadSingleTexture(file)
{

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


	var mat = {};

	switch (type)
	{
		case "peop":
			mat.color = Math.round(Math.random() * 0xffffff) & 0xffaf2f;
			this.geometry = geometry["person.obj"];
			break;
		case "cop":
			mat.color = (Math.round(Math.random() * 0xffffff) | 0x000099) & 0x4444ff;
			this.geometry = geometry["person.obj"];
			break;
		case "wall2":
			mat.color = 0x555555;
			this.geometry = geometry["wall.obj"];
			break;
		case "wall":
			mat.color = Math.round(Math.random() * 0xffffff) | 0xf0f0f0;
			mat.map = shopTex;
			this.geometry = geometry["house.obj"];
			break;
		case "box":
			mat.color = 0x555555;
			this.geometry = new THREE.BoxGeometry( 1, 1, 1 );
			break;
	}

	var material = new THREE.MeshBasicMaterial( mat );
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

	this.node.userData = this;
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

function StartGame(msg)
{
	firstTick = msg.frame;
	myId = msg.you;
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
	if (!filesLoaded)
	{
		return;
	}

	if (!isConnecting)
	{
		isConnecting = true;
		StartConnection();
	}

	if (!connectionStarted)
	{
		return;
	}

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

	if (myId > 0)
	{
		var me = entities[myId];
		var dx = me.node.position.x - camera.position.x;
		var dy = me.node.position.y - 10 - camera.position.y;

		if (Math.abs(dx) > 0.1)
			camera.position.x += dx * 0.05;
		if (Math.abs(dy) > 0.1)
			camera.position.y += dy * 0.05;
	}
}

//Connection


var socket;

function StartConnection()
{

	var hostname = window.location.hostname;
	if (hostname == "")
		hostname = "localhost";

	socket = new WebSocket("ws://" + hostname + ":8080");

	// Show a connected message when the WebSocket is opened.
	socket.onopen = function(event) {
		connectionStarted = true;
		console.log('Connected to: ' + event.currentTarget.url);
	};
	// Handle any errors that occur.
	socket.onerror = function(error) {
		isConnecting = false;
		console.log('WebSocket Error: ' + error);
	};

	// Handle messages sent by the server.
	socket.onmessage = function(event) {
		console.log(event.data);
		var message = JSON.parse(event.data);

		for (var i in message)
			ReceiveMessage(message[i]);


	};
}

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
		case "new":
			message.t = "n";
			message.type = body.type;
			message.x = Math.round(body.x) * 10;
			message.y = Math.round(body.y) * 10;
			break;
	}

	console.log(JSON.stringify(message));
	socket.send(JSON.stringify(message));
}

function ReceiveMessage(message)
{

	switch (message.t)
	{
		case "start":
			// start the game
			StartGame(message);
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




var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();

var lastClickTime = 0;

function OnClick(event)
{
	var d = new Date();
	if (lastClickTime > d.getTime() - 50)
		return;
	lastClickTime = d.getTime();

	mouse.x = ( event.clientX / width ) * 2 - 1;
	mouse.y = - ( event.clientY / height ) * 2 + 1;

	raycaster.setFromCamera( mouse, camera );
	var intersects = raycaster.intersectObjects( scene.children );

	if (intersects.length > 0)
	{
		var dest;
		for ( var i = 0; i < intersects.length; i++ ) {
			//intersects[i].object.material = new THREE.MeshBasicMaterial({color: 0xff0000});
			
			dest = intersects[i].point;
			break;
		}


		if (clickState == "move")
		{
			var me = entities[myId].node.position.clone();
			var norm = dest.clone();
			me.z = 0.2;
			norm.z = 0.2;
			norm.sub(me).setLength(1);

			raycaster.set(me, norm);
			intersects = raycaster.intersectObjects( scene.children );
			console.log(intersects.length);

			for ( var i = 0; i < intersects.length; i++ ) {
				//intersects[i].object.material = new THREE.MeshBasicMaterial({color: 0xff0000});
				
				var type = intersects[i].object.userData.type;

				var min = me.distanceTo(dest);

				switch (type)
				{
					case "wall":
						var p = intersects[i].point;
						var d = me.distanceTo(p);
						if (d < min)
						{
							min = d;

							dest = me.clone();
							dest.add(norm.clone().setLength(min - 0.3));
						}
						break;
				}
			}


			delete dest.z;
			cube.position.x = dest.x;
			cube.position.y = dest.y;
			console.log(dest);
			SendMessage("goto", dest);
		}
		else if (clickState == "house")
		{
			SendMessage("new", {type:"wall", x:dest.x, y:dest.y});
		}
	}
	else
	{
		console.log("no points found");
	}

}

var canvas = document.getElementsByTagName("canvas")[0];

canvas.addEventListener( 'mousedown', OnClick, true );
canvas.addEventListener( 'touchstart', OnClick, true );