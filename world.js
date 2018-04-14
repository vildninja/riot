
var geometry = {};
var entities = {};

var onProgress = function ( xhr ) {
};

var onError = function ( xhr ) {
	Console.Log("Error loading " + xhr);
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


function Entity(scene, id, type, position)
{
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
	this.node.position.z = position.z;

	this.startPos = position;
	this.gotoPos = position;

	entities[id] = this;

	scene.add(this.node);

	this.Goto = Goto;
}

function Goto(position)
{
	this.gotoPos = position;
}


function TickEvent(id, position)
{
	this.id = id;
	this.pos = position;
}


var frames = {};

var tick = 0;

var tickLength = 0.5;
var frameStartTime = 0;

function PushTickEvent(frame, evt)
{
	if (frames[frame] === undefined)
		frames[frame] = [evt];
	else
		frames[frame].push(evt);
}

function StartGame(firstTick)
{
	tick = firstTick;

	var d = new Date();
	frameStartTime = d.getTime() / 1000.0 - tickLength * firstTick;
}

function Tick()
{
	frameStartTime += tickLength;

	for (var i in entities)
	{
		var e = entities[i];
		e.startPos = e.gotoPos;
	}

	if (frames[tick] === undefined)
		return;

	for (var i in frames[tick])
	{
		var evt = frames[tick][i];
		var e = entities[evt.id];
		e.gotoPos = evt.pos;
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
		e.node.position.x = e.startPos.x * (1 - t) + e.gotoPos.x * t;
		e.node.position.y = e.startPos.y * (1 - t) + e.gotoPos.y * t;
	}
}