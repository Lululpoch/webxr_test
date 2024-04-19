import * as THREE from "three"
import { VRButton } from "three/addons/webxr/VRButton.js"
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
// import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';

let controls, controllerGrip1, controllerGrip2, rayCaster, group, controllerModelFactory, handModelFactory
const intersected = [];

let scene, camera, renderer, light, cubeMesh

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
	document.body.appendChild(renderer.domElement);
	const sessionInit = {
		// requiredFeatures: [ 'hand-tracking' ]
		requiredFeatures: []
	};
	document.body.appendChild( VRButton.createButton( renderer , sessionInit) );
    window.addEventListener('resize', onWindowResize);

	//orbit controls
	controls = new OrbitControls( camera, renderer.domElement );
	controls.target.set( 0, 2, 0 );
	controls.update();

    rayCaster = new THREE.Raycaster();
	
	group = new THREE.Group();
	scene.add( group );
	group.name = "group"

	//éclairage
	light = new THREE.DirectionalLight(0xffffff, 1);
	light.position.set(0, 1, 0);
	scene.add(light);

	//création d'un cube grâce à three js
	const cubeGeometry = new THREE.BoxGeometry(0.05, 0.05, 0.05);
	const cubeMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
	cubeMesh = new THREE.Mesh(cubeGeometry, cubeMaterial);
	//repositionnement du cube
	cubeMesh.position.set(0, 1.5, -0.5);
	//ajout du cube au groupe (qui est déjà dans la scène)
	group.add(cubeMesh)

	const controllerModelFactory = new XRControllerModelFactory();

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
	// controllergrip events
    controllerGrip1.addEventListener('selectstart', onSelectStart);
	controllerGrip1.addEventListener('selectend', onSelectEnd);
	controllerGrip2.addEventListener('selectstart', onSelectStart);
	controllerGrip2.addEventListener('selectend', onSelectEnd);


    const geometry = new THREE.BufferGeometry().setFromPoints( [ new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, 0, -1 ) ] );
	const line = new THREE.Line( geometry );
	line.name = 'line';
	line.scale.z = 5;

	controllerGrip1.add( line.clone() );
	controllerGrip2.add( line.clone() );


    // logs
    // console.log(controllerGrip1)
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

function render()
{
	cleanIntersected();
	intersectObjects( controllerGrip1 );
	intersectObjects( controllerGrip2 );
	renderer.render( scene, camera );
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
	controller.updateMatrixWorld();
	rayCaster.setFromXRController( controller );

	return rayCaster.intersectObjects( group.children, false );
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

init();
animate();