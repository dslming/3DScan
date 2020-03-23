import * as THREE from './three.module.js';
import { OBJLoader } from './OBJLoader.js';
import { OrbitControls } from './OrbitControls.js';
import { MTLLoader } from './MTLLoader.js';

var container;

var camera, scene, renderer;

var windowHalfX = window.innerWidth / 2;
var windowHalfY = window.innerHeight / 2;

var object;
var sphere;
var sphereMat;
var sphereGeo;
var cube;
var sweeps = [];
var currentSweep;
var mouse = new THREE.Vector2(), INTERSECTED, MESHINTERSECTED;
var dummyObject;
var raycaster = new THREE.Raycaster();
var textureSwap = true;
var torusMouse;
var meshraycaster = new THREE.Raycaster();


init();
animate();

function init() {

    container = document.createElement('div');
    document.body.appendChild(container);




    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, .001, 5000);

    var tex = new THREE.CubeTextureLoader()
        .setPath('tex/6e7c7730593e4d96aa774f074ee6e29d/')
        .load([

            // 'nz.png',
            // 'pz.png',
            // 'py.png',
            // 'ny.png',
            // 'px.png',
            // 'nx.png'
            '512_face2_0_0.jpg',
            '512_face4_0_0.jpg',
            '512_face0_0_0.jpg',
            '512_face5_0_0.jpg',
            '512_face1_0_0.jpg',
            '512_face3_0_0.jpg'
        ]);


    renderer = new THREE.WebGLRenderer();

    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    var orbitControls = new OrbitControls(camera, renderer.domElement);

    orbitControls.minDistance = .001;
    orbitControls.maxDistance = .001;
    orbitControls.enableZoom = false;
    orbitControls.enablePan = false;
    // scene
    scene = new THREE.Scene();

    torusMouse = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.01, 16, 100), new THREE.MeshBasicMaterial({ color: 0xffff00 }))



    sphereGeo = new THREE.SphereGeometry(3500, 24, 24);
    var uniforms2 = {
        progress: {
            type: "f",
            value: 0
        },
        pano0Map: {
            type: "t",
            value: null
        },
        pano0Position: {
            type: "v3",
            value: new THREE.Vector3()
        },
        pano0Matrix: {
            type: "m4",
            value: new THREE.Matrix4()
        },
        pano1Map: {
            type: "t",
            value: null
        },
        pano1Position: {
            type: "v3",
            value: new THREE.Vector3()
        },
        pano1Matrix: {
            type: "m4",
            value: new THREE.Matrix4()
        },
        gradientOpacity: {
            type: "f",
            value: 0
        },
        topColor: {
            type: "v3",
            value: new THREE.Vector3(.094, .102, .11)
        },
        bottomColor: {
            type: "v3",
            value: new THREE.Vector3(.2, .216, .235)
        },
        radius: {
            type: "f",
            value: 100
        }

    };

    sphereMat = new THREE.RawShaderMaterial({

        uniforms: uniforms2,
        vertexShader: document.getElementById('vertexShader').textContent,
        fragmentShader: document.getElementById('fragmentShader').textContent

    });
    sphereMat.uniforms.pano0Map.value = tex;

    sphereMat.side = 1;


    sphere = new THREE.Mesh(sphereGeo, sphereMat);



    cube = new THREE.Mesh(new THREE.BoxGeometry(.3, .3, .3), new THREE.MeshStandardMaterial());

    scene.add(camera);
    scene.add(sphere);
    scene.add(torusMouse);


    sphere.renderOrder = 1;

    var ambientLight = new THREE.AmbientLight(0xcccccc, 0.4);
    scene.add(ambientLight);

    var pointLight = new THREE.PointLight(0xffffff, 0.8);

    dummyObject = new THREE.Object3D();


    camera.add(pointLight);
    scene.add(dummyObject);


    // model

    function onProgress(xhr) {

        if (xhr.lengthComputable) {

            var percentComplete = xhr.loaded / xhr.total * 100;
            console.log('model ' + Math.round(percentComplete, 2) + '% downloaded');

        }

    }


    window.addEventListener('mousedown', onmousedown, false);
    document.addEventListener('mousemove', onDocumentMouseMove, false);

    function onDocumentMouseMove(e) {
        // event.preventDefault();

        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;


    }



    function onmousedown(e) {
        // e.preventDefault();

        if (INTERSECTED)
            moveToSweep();
    }




    function getSweepData() {
        fetch('sweeps.json').then(res => {
            res.text().then(res => {
                var data = JSON.parse(res);
                if (data) {
                    for (let index = 0; index < data.length; index++) {
                        const element = data[index];
                        var clone = new THREE.Mesh(new THREE.CylinderGeometry(.2,.2,.01), new THREE.MeshBasicMaterial({transparent:true,opacity:.5}));
                        clone.position.set(element.floor_position.x, element.floor_position.z, -element.floor_position.y);
                        clone.name = 'sweeps' + index;
                        dummyObject.add(clone);
                        sweeps.push(element);

                    }
                    currentSweep = sweeps[0];
                    moveToSweep();
                }
            })
        });
    }

    function moveToSweep() {

        var texture = new THREE.CubeTextureLoader()
            .setPath('tex/' + currentSweep.sweep_uuid.replace(/-/g, '') + '/')
            .load([

                '512_face2_0_0.jpg',
                '512_face4_0_0.jpg',
                '512_face0_0_0.jpg',
                '512_face5_0_0.jpg',
                '512_face1_0_0.jpg',
                '512_face3_0_0.jpg'
            ]);


        sphereMat.uniforms['pano' + (textureSwap ? 1 : 0) + 'Map'].value = texture;
        sphereMat.uniforms['pano' + (textureSwap ? 1 : 0) + 'Matrix'].value.compose(currentSweep.position, fromVisionQuaternion(currentSweep.rotation), { x: 1, y: 1, z: 1 });


        TweenMax.to(camera.position, 1.5, { x: currentSweep.position.x, y: currentSweep.position.z, z: -currentSweep.position.y })

        sphereMat.progress = (textureSwap ? 0 : 1);
        TweenMax.to(sphereMat.uniforms.progress, 1.5, { value: (textureSwap ? 1 : 0) });




        setTimeout(() => {
            orbitControls.target0.set(currentSweep.position.x, currentSweep.position.z, -currentSweep.position.y);
            orbitControls.reset();

            textureSwap = !textureSwap;

        }, 1600);


    }


    function fromVisionQuaternion(rot) {
        return new THREE.Quaternion(rot.x, rot.z, -rot.y, rot.w).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2))
    }


    var manager = new THREE.LoadingManager();

    var loader = new OBJLoader(manager);
    var matLoader = new MTLLoader(manager);
    matLoader.load('models/building.mtl', mats => {
        mats.preload();

        loader.setMaterials(mats).load('models/building.obj', function (obj) {

            object = obj;

            obj.traverse(mesh => {
                if (mesh instanceof THREE.Mesh) {
                    mesh.material.transparent = true;
                    mesh.material.opacity = 0;
                }
            })


            object.rotation.set(Math.PI / 2, Math.PI, Math.PI);
            scene.add(object);

            // scene.add(boundingBox);
            getSweepData();


        }, onProgress);
    });



    //

    window.addEventListener('resize', onWindowResize, false);

}

function onWindowResize() {

    windowHalfX = window.innerWidth / 2;
    windowHalfY = window.innerHeight / 2;

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

}

function animate() {

    requestAnimationFrame(animate);
    render();

}

function render() {

    raycaster.setFromCamera(mouse, camera);
    meshraycaster.setFromCamera(mouse, camera);

    if (object) {
        var meshintersects = meshraycaster.intersectObjects(object.children, true);

        if (meshintersects.length > 0) {

            if (MESHINTERSECTED != meshintersects[0]) {

                MESHINTERSECTED = meshintersects[0];

                var point = MESHINTERSECTED.point;
                var normal = MESHINTERSECTED.face.normal.clone();

                normal.transformDirection(object.matrixWorld);
                normal.add(point);

                torusMouse.position.copy(point);
                torusMouse.lookAt(normal);


            }

        }
        else {
            MESHINTERSECTED = null;
        }
    }


    var intersects = raycaster.intersectObjects(dummyObject.children, true);

    if (intersects.length > 0) {

        if (INTERSECTED != intersects[0].object) {

            if (INTERSECTED) {
                if (INTERSECTED.name.includes('sweeps'))
                    INTERSECTED.material.color.setHex(INTERSECTED.currentHex);
                else
                    console.error(INTERSECTED.name);
            }

            INTERSECTED = intersects[0].object;
            INTERSECTED.currentHex = INTERSECTED.material.color.getHex();
            INTERSECTED.material.color.setHex(0xff0000);
            currentSweep = sweeps[parseInt(INTERSECTED.name.replace('sweeps', ''))];


        }

    } else {

        if (INTERSECTED) INTERSECTED.material.color.setHex(INTERSECTED.currentHex);

        INTERSECTED = null;

    }

    renderer.render(scene, camera);

}

