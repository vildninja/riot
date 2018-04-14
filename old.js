


			var onProgress = function ( xhr ) {
				if ( xhr.lengthComputable ) {
					var percentComplete = xhr.loaded / xhr.total * 100;
					console.log( Math.round(percentComplete, 2) + '% downloaded' );
				}
			};

			var onError = function ( xhr ) {
			};

			var loader = new THREE.OBJLoader( manager );
			loader.load( 'house.obj', function ( object ) {


				object.traverse( function ( child ) {
					if ( child instanceof THREE.Mesh ) {

						child.material = new THREE.MeshBasicMaterial( { color: 0x123456 } );

					}
				} );

				object.position.z = -500;
				house = object;
				scene.add( object );

			}, onProgress, onError );

			