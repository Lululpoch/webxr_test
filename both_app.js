import * as THREE from "three"
import { VRButton } from "three/addons/webxr/VRButton.js"
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';

let controls, hand1, hand2, controller1, controller2, controllerGrip1, controllerGrip2, controllerGrip3, controllerGrip4, rayCaster, group, controllerModelFactory, handModelFactory, handModel1, handModel2
const intersected = [];
let hands, trueRayCaster, falseRayCaster
const handModels =
{
	left: null,
	right: null
};
let scene, camera, renderer, session,  light, cubeMesh

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
	const sessionInit = {
		requiredFeatures: [ 'hand-tracking' ]
		//requiredFeatures: []
	};
	document.body.appendChild( VRButton.createButton( renderer , sessionInit) );
    window.addEventListener('resize', onWindowResize);

	//orbit controls
	controls = new OrbitControls( camera, renderer.domElement );
	controls.target.set( 0, 2, 0 );
	controls.update();

    falseRayCaster = null
    trueRayCaster = new THREE.Raycaster();
	
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

    // line for controller grips (other solution)
    /*
    const geometry = new THREE.BufferGeometry().setFromPoints( [ new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, -1, -1 ) ] );
    const line = new THREE.Line( geometry );
    line.name = 'line';
	line.scale.z = 5;
    controllerGrip1.add( line.clone() );
	controllerGrip2.add( line.clone() );
    */
}

function start()
{
    session = renderer.xr.getSession()
    // console.log("session : ", session)
    session.oninputsourceschange = inputChange
}

// function inputChange(event)  // simply sets line.visible to true or false
// {
//     // console.log("event : ", event)
//     // if input sources were added (should normally be true)
//     if (event.added.length != 0)
//     {
//         // getting the profiles of the first input to know wether the user uses hand tracking or controller inputs
//         let profiles = event.added[0].profiles
//         console.log("profiles : ", profiles)
//         const pattern = /hand/gi
//         const re = new RegExp(pattern)
//         for (let i = 0; i < profiles.length; i++)
//         {
//             hands = re.test(profiles[i])
//             if ( hands )
//             {
//                 break
//             }
//         }
//         if ( hands )
//         {
//             if ( controller1.children !== undefined && controller1.children.length > 0 )
//             {
//                 controller1.children.forEach( child => 
//                     {
//                         if ( child.name === "line" )
//                         {
//                             child.visible = false
//                         }
//                     })
//             }
//             if ( controller2.children !== undefined && controller2.children.length > 0 )
//             {
//                 controller2.children.forEach( child => 
//                     {
//                         if ( child.name === "line" )
//                         {
//                             child.visible = false
//                         }
//                     })
//             }
//         }
//         else
//         {
//             if ( controller1.children !== undefined && controller1.children.length > 0 )
//             {
//                 controller1.children.forEach( child => 
//                     {
//                         if ( child.name === "line" )
//                         {
//                             child.visible = true
//                         }
//                     })
//             }
//             if ( controller2.children !== undefined && controller2.children.length > 0 )
//             {
//                 controller2.children.forEach( child => 
//                     {
//                         if ( child.name === "line" )
//                         {
//                             child.visible = true
//                         }
//                     })
//             }
//         }
//     }
// }

function inputChange(event) // removes elements from the scene
{
    // console.log("event : ", event)
    // if input sources were added (should normally be true)
    if (event.added.length != 0)
    {
        // getting the profiles of the first input to know wether the user uses hand tracking or controller inputs
        let profiles = event.added[0].profiles
        // console.log("profiles : ", profiles)
        const pattern = /hand/gi
        const re = new RegExp(pattern)
        hands = false
        for (let i = 0; i < profiles.length; i++)
        {
            // console.log(i)
            hands = re.test(profiles[i])
            // console.log("hands", hands)
            if ( hands )
            {
                break
            }
        }
        if ( hands )
        {
            rayCaster = falseRayCaster
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
            rayCaster = trueRayCaster
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

function render()
{
	cleanIntersected();
    if ( hands == false )
    {
        // if using line on controllers
        intersectObjects( controller1 );
        intersectObjects( controller2 );

        // if using line on controller grips
        // intersectObjects( controllerGrip1 );
        // intersectObjects( controllerGrip2 );
    }

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
	// console.log("pinchstart")
	const controller = event.target;
	const indexTip = controller.joints[ 'index-finger-tip' ];
	const indexTipPosition = new THREE.Vector3().copy(indexTip.position);
	for (let i = 0; i < scene.children.length; i++) {
        const temp = scene.children[i];
		if ( temp instanceof THREE.Group && temp.children[0] instanceof THREE.Mesh)	// !!! adapté seulement à ce cas, à modifier pour jocly
		{
			const object = temp.children[0]
			const distance = indexTipPosition.distanceTo(object.position);
			if (distance < object.geometry.boundingSphere.radius * object.scale.x)
			{
				indexTip.attach( object );
				controller.userData.selected = object;
				break;
			}
		}
	}
}

function onPinchEnd ( event )
{
	// console.log("pinchend")
	const controller = event.target;
	if ( controller.userData.selected !== undefined )
	{
		const object = controller.userData.selected;
		group.attach( object );
		controller.userData.selected = undefined;
	}
}

init();
animate();