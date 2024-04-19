import * as THREE from "three"
import { VRButton } from "three/addons/webxr/VRButton.js"
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';
import {OBJLoader} from 'three/addons/loaders/OBJLoader.js'

let controls, hand1, hand2, controller1, controller2, controllerGrip1, controllerGrip2, controllerGrip3, controllerGrip4, rayCaster, group, controllerModelFactory, handModelFactory, handModel1, handModel2, hands, validRayCaster
const intersected = [];
let objLoader
let board
let boardset = false
let bishop, king, knight, pawn, queen, rook
const names = ["bishop", "king", "knight", "pawn", "queen", "rook"]
const pieces = [];
let scene, camera, renderer, session,  light, cubeMesh
const distance_between_pieces = 0.02
let headset_position

function init()
{
	//initialisation de la scène et des éléments principaux
	scene = new THREE.Scene();
	camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
	//moteur de rendu
	renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.shadowMap.enabled = true;
	renderer.xr.enabled = true;
    renderer.xr.addEventListener( 'sessionstart', start )
	document.body.appendChild(renderer.domElement);
	const sessionInit = { requiredFeatures: [ 'hand-tracking' ] }
	document.body.appendChild( VRButton.createButton( renderer , sessionInit) );
    window.addEventListener('resize', onWindowResize);

    // getting the headset's position
    // headset_position = getHeadPosition()
    // console.log(headset_position)

	//orbit controls
	controls = new OrbitControls( camera, renderer.domElement );
	controls.target.set( 0, 2, 0 );
	controls.update();

    validRayCaster = new THREE.Raycaster();
	
	group = new THREE.Group();
	scene.add( group );
	group.name = "group"

	//éclairage
	light = new THREE.DirectionalLight(0xffffff, 1);
	light.position.set(0, 1, 0);
	scene.add(light);

	//création d'un cube grâce à three js
	// const cubeGeometry = new THREE.BoxGeometry(0.05, 0.05, 0.05);
	// const cubeMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
	// cubeMesh = new THREE.Mesh(cubeGeometry, cubeMaterial);
	// //repositionnement du cube
	// cubeMesh.position.set(0, 1.5, -0.5);
	// //ajout du cube au groupe (qui est déjà dans la scène)
	// group.add(cubeMesh)

    objLoader = new OBJLoader()

    const textureLoader = new THREE.TextureLoader()
    // board
    const board_size = distance_between_pieces *8
    const board_geometry = new THREE.PlaneGeometry(5, 5)
    const board_material = textureLoader.load("resources2/board/board-diffuse-map.jpeg", texture =>
    {
        texture.side = THREE.DoubleSide
        const tempmaterial = new THREE.MeshBasicMaterial( {color: 0xffff00, side: THREE.DoubleSide} )
        // board = new THREE.Mesh(board_geometry, tempmaterial)
        board = new THREE.Mesh(board_geometry, new THREE.MeshBasicMaterial({map: texture}))
        group.add(board)
        board.position.x = 1
        board.position.y = 1
        board.position.z = 1
        board.rotateX(Math.PI /2)
        console.log(board)
    })

    // loading pieces
    names.forEach( name =>
    {
        objLoader.load("resources2/pieces/" +name +"/" +name +".obj", (obj) => {
            obj.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    const normalMap = textureLoader.load("resources2/pieces/" +name +"/" +name +"-normal-map.jpg");
                    child.material.normalMap = normalMap;
                    const diffuseMap = textureLoader.load("resources2/pieces/" +name +"/" +name +"-diffuse-map.jpg");
                    child.material.map = diffuseMap;
                }
            })
            obj = obj.children[0]
            obj.scale.x = obj.scale.x /100
            obj.scale.y = obj.scale.y /100
            obj.scale.z = obj.scale.z /100

            pieces.push( obj.clone() )
            group.add(pieces[pieces.length -1])
            

            // calculer coordonnées pieces
        })
    })

	const controllerModelFactory = new XRControllerModelFactory();
    const handModelFactory = new XRHandModelFactory();

    // controllers
	controller1 = renderer.xr.getController( 0 );
	scene.add( controller1 );
	controller2 = renderer.xr.getController( 1 );
	scene.add( controller2 );
	// controller events
    controller1.addEventListener('selectstart', onSelectStart);
	controller1.addEventListener('selectend', onSelectEnd);
	controller2.addEventListener('selectstart', onSelectStart);
	controller2.addEventListener('selectend', onSelectEnd);
    // controller grips
    controllerGrip1 = renderer.xr.getControllerGrip(0);
    scene.add(controllerGrip1)
    controllerGrip2 = renderer.xr.getControllerGrip(1);
    scene.add(controllerGrip2)
    // controllergrip models
    let controllerModel1 = controllerModelFactory.createControllerModel(controllerGrip1)
    let controllerModel2 = controllerModelFactory.createControllerModel(controllerGrip2)
    controllerGrip1.add(controllerModel1)
    controllerGrip2.add(controllerModel2)

    // hands
    hand1 = renderer.xr.getHand( 0 );
	scene.add( hand1 );
    hand2 = renderer.xr.getHand( 1 );
	scene.add( hand2 );
    // hand models
    handModel1 = handModelFactory.createHandModel( hand1, 'mesh' );
    handModel2 = handModelFactory.createHandModel( hand2, 'mesh' );
    hand1.add(handModel1)
    hand2.add(handModel2)
    // hand events
	hand1.addEventListener('pinchstart', onPinchStart)
	hand1.addEventListener('pinchend', onPinchEnd)
	hand2.addEventListener('pinchstart', onPinchStart)
	hand2.addEventListener('pinchend', onPinchEnd)

    // line for controllers (better but the lines do not disappear when using hands so we add the line to the controller grips)
    const geometry = new THREE.BufferGeometry().setFromPoints( [ new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, 0, -1 ) ] );
    const line = new THREE.Line( geometry );
    line.name = 'line';
	line.scale.z = 5;
    controller1.add( line.clone() );
	controller2.add( line.clone() );
}

function start()
{
    session = renderer.xr.getSession()
    session.oninputsourceschange = inputChange
}

function inputChange(event)
{
    // if input sources were added (should normally be true)
    if (event.added.length != 0)
    {
        // getting the profiles of the first input to know wether the user uses hand tracking or controller inputs
        let profiles = event.added[0].profiles
        const pattern = /hand/gi
        const re = new RegExp(pattern)
        hands = false
        for (let i = 0; i < profiles.length; i++)
        {
            hands = re.test(profiles[i])
            if ( hands )
            {
                break
            }
        }
        if ( hands )
        {
            rayCaster = null
            if (scene !== null)
            {
                if ( controller1 !== null)
                {
                    scene.remove(controller1)
                }
                if ( controller2 !== null)
                {
                    scene.remove(controller2)
                }
                if ( hand1 !== null)
                {
                    scene.add(hand1)
                }
                if ( hand2 !== null)
                {
                    scene.add(hand2)
                }
            }
        }
        else
        {
            rayCaster = validRayCaster
            if (scene !== null)
            {
                if ( hand1 !== null)
                {
                    scene.remove(hand1)
                }
                if ( hand2 !== null)
                {
                    scene.remove(hand2)
                }
                if ( controller1 !== null)
                {
                    scene.add(controller1)
                }
                if ( controller2 !== null)
                {
                    scene.add(controller2)
                }
            }
        }
    }
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
}

function animate()
{
	renderer.setAnimationLoop( render );
}

async function render()
{
    if (session !== null)
    {
    if (!boardset && board !== undefined)
    {
        console.log("render : ", camera)
        const temp = await getHeadPosition().then( (position) =>
        {
            console.log("render : ", position)
            updatePosition(board, position)
            boardset = true
        })
        
    }
	cleanIntersected();
    if ( hands == false )
    {
        intersectObjects( controller1 );
        intersectObjects( controller2 );
    }
	renderer.render( scene, camera );
    }
}

function onSelectStart( event ) {
	const controller = event.target;
	const intersections = getIntersections( controller );
	if ( intersections.length > 0 ) {
		const intersection = intersections[ 0 ];
		const object = intersection.object;
		controller.attach( object );
		controller.userData.selected = object;
	}
	controller.userData.targetRayMode = event.data.targetRayMode;
}

function onSelectEnd( event ) {
	const controller = event.target;
	if ( controller.userData.selected !== undefined ) {
		const object = controller.userData.selected;
		group.attach( object );
		controller.userData.selected = undefined;
	}
}

function getIntersections( controller ) {
    if ( rayCaster !== null )
    {
        controller.updateMatrixWorld();
        rayCaster.setFromXRController( controller );

        return rayCaster.intersectObjects( group.children, false );
    }
    else
    {
        return []
    }
}

function intersectObjects( controller ) {

	if ( controller.userData.targetRayMode === 'screen' ) return;

	if ( controller.userData.selected !== undefined ) return;

	const line = controller.getObjectByName( 'line' );
	const intersections = getIntersections( controller );

	if ( intersections.length > 0 ) {
		const intersection = intersections[ 0 ];
		const object = intersection.object;
		intersected.push( object );
		line.scale.z = intersection.distance;
	} else {
		line.scale.z = 5;
	}
}

function cleanIntersected() {
	while ( intersected.length ) {
		const object = intersected.pop();
	}
}


function onPinchStart ( event )
{
	const controller = event.target;
	const indexTip = controller.joints[ 'index-finger-tip' ];
	const indexTipPosition = new THREE.Vector3().copy(indexTip.position);
	for (let i = 0; i < scene.children.length; i++) {
        const temp = scene.children[i];
		if (temp instanceof THREE.Group && temp.children[0] instanceof THREE.Mesh)	// !!! adapté seulement à ce cas, à modifier pour jocly
		{
            for (let i = 0; i < temp.children.length; i++)
            {
                const mesh = temp.children[i]
                const distance = indexTipPosition.distanceTo(mesh.position)
                if (distance < 0.01)
                {
                    indexTip.attach(mesh)
                    controller.userData.selected = mesh
                    break
                }
            }
		}
	}
}

function onPinchEnd ( event )
{
	const controller = event.target;
	if ( controller.userData.selected !== undefined )
	{
		const object = controller.userData.selected;
		group.attach( object );
		controller.userData.selected = undefined;
	}
}

async function getHeadPosition()
{
    const position = new THREE.Vector3()
    const session = renderer.xr.getSession()
    if (camera !== undefined && session !== null)
    {
        position = await session.requestAnimationFrame((time, frame) =>
        {
            const referenceSpace = renderer.xr.getReferenceSpace()
            const pos = frame.getViewerPose(referenceSpace)
            position.x = pos.transform.position.x
            position.y = pos.transform.position.y
            position.z = pos.transform.position.z
            console.log("getHeadPosition : ", position.x, position.y, position.z)
            return position
        })
        return position
    }
    //return position
}

function updatePosition( mesh, vector )
{
    if (mesh instanceof THREE.Mesh && vector instanceof THREE.Vector3)
    {
        mesh.position.x = vector.x
        mesh.position.y = vector.y
        mesh.position.z = vector.z
        console.log("updatePosition : ", mesh.position.x, mesh.position.y, mesh.position.z)
    }
}

init();
animate();