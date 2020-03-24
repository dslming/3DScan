import * as THREE from './three.module.js';
import { OBJLoader } from './OBJLoader.js';
import { OrbitControls } from './OrbitControls.js';
import { MTLLoader } from './MTLLoader.js';
import { CSS2DRenderer, CSS2DObject } from './CSS2DRenderer.js';


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
var meshMats = [];
var orbitControls;
var state = 'walk';
var clippingPlane;
var point;
var idlePoint;
var points = [];
var line;
var overlayDiv = document.createElement('div');
var labelRenderer = new CSS2DRenderer();
var overlayLabel = new CSS2DObject(overlayDiv);
var lollipop;
var lollipops = [];
var isModalOpen = true;


init();
animate();

function init() {

    container = document.createElement('div');
    document.body.appendChild(container);


    clippingPlane = new THREE.Plane(new THREE.Vector3(0, - 1, 0), 0.5);

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

    orbitControls = new OrbitControls(camera, labelRenderer.domElement);

    orbitControls.minDistance = .001;
    orbitControls.maxDistance = .001;
    orbitControls.enableZoom = false;
    orbitControls.enablePan = false;
    // scene
    scene = new THREE.Scene();

    torusMouse = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.01, 16, 100), new THREE.MeshBasicMaterial({ color: 0xffff00 }))

    labelRenderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = 0;
    document.body.appendChild(labelRenderer.domElement);

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
            value: .8
        },
        topColor: {
            type: "v3",
            value: new THREE.Vector3(.094, .102, .11)
        },
        bottomColor: {
            type: "v3",
            value: new THREE.Vector3(.094, .102, .11)
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
    scene.add(overlayLabel);


    sphere.renderOrder = 1;

    var ambientLight = new THREE.AmbientLight(0xcccccc, 0.4);
    scene.add(ambientLight);

    var pointLight = new THREE.PointLight(0xffffff, 1);

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


    document.addEventListener('mousedown', onmousedown, true);
    document.addEventListener('mousemove', onDocumentMouseMove, true);
    document.addEventListener('mouseup', onmouseup, true);

    function onDocumentMouseMove(e) {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

        if (state == 'measure' && line && !drawfinish) {
            line.geometry.vertices[1] = point;
            line.geometry.verticesNeedUpdate = true
            overlayDiv.textContent = line.geometry.vertices[0].distanceTo(line.geometry.vertices[1]) + 'm';
            overlayLabel.position.copy(point);
        }
    }

    function onmouseup(e) {
        event.preventDefault();

        if (state != 'walk') return;
        if (idlePoint && !isModalOpen)
            if (idlePoint.distanceTo(point) < .01) {
                var temp = [];

                for (let index = 0; index < dummyObject.children.length; index++) {
                    const element = dummyObject.children[index];

                    temp.push(element.position.distanceTo(point));

                }

                currentSweep = sweeps[temp.indexOf(Math.min.apply(null, temp))]
                moveToSweep();

            }

    }

    function onmousedown(e) {
        e.preventDefault();
        if (INTERSECTED && !isModalOpen) {
            currentSweep = sweeps[parseInt(INTERSECTED.name.replace('sweeps', ''))];

            if (state == 'walk')
                moveToSweep();

            if (state == 'measure')
                drawMeasurementLine();
            else
                overlayLabel.visible = false;


        } else if (e.buttons == 1 && !lollipop) {
            idlePoint = point;
        }
        if (e.buttons == 2)
            createLollipop();
        else if (lollipop) {
            lollipop = null;
            $('.modal').modal();
            $('.modal').modal('open');
            $('#lollipopInfo').val('');
            $('#lollipopInfo').focus();
            isModalOpen = true;
        }
    }




    function getSweepData() {
        fetch('sweeps.json').then(res => {
            res.text().then(res => {
                var data = JSON.parse(res);
                if (data) {
                    for (let index = 0; index < data.length; index++) {
                        const element = data[index];
                        var clone = new THREE.Mesh(new THREE.CylinderGeometry(.2, .2, .01), new THREE.MeshBasicMaterial({ transparent: true, opacity: .5 }));
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



    function createLollipop() {
        var material = new THREE.LineBasicMaterial({
            color: $('#candyColor').val(),
        });


        var geometry = new THREE.Geometry();
        geometry.vertices.push(
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, 1)
        );

        lollipop = new THREE.Line(geometry, material);


        var circle = new THREE.Mesh(new THREE.CircleGeometry(.1, 12), new THREE.MeshBasicMaterial({ color: $('#candyColor').val(), side: THREE.DoubleSide }));
        circle.rotation.x = Math.PI / 2;
        circle.position.z = 1.1;

        lollipop.add(circle);
        scene.add(lollipop);
        lollipops.push({
            info: '',
            lollipop: lollipop
        });



    }


    function moveToSweep() {

        $("body").css("cursor", "none");

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

        orbitControls.maxDistance = 22;

        TweenMax.to(camera.position, 1.5, { x: currentSweep.position.x, y: currentSweep.position.z, z: -currentSweep.position.y })

        sphereMat.progress = (textureSwap ? 0 : 1);
        TweenMax.to(sphereMat.uniforms.progress, 1.5, { value: (textureSwap ? 1 : 0) });



        setTimeout(() => {
            orbitControls.target.copy(camera.position);
            orbitControls.maxDistance = .001;
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
                    mesh.material.clippingPlanes = [clippingPlane]

                    meshMats.push(mesh.material);
                }
            })


            object.rotation.set(Math.PI / 2, Math.PI, Math.PI);
            scene.add(object);
            getSweepData();


        }, onProgress);
    });



    window.addEventListener('resize', onWindowResize, false);

    function onWindowResize() {

        windowHalfX = window.innerWidth / 2;
        windowHalfY = window.innerHeight / 2;

        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        renderer.setSize(window.innerWidth, window.innerHeight);

    }

    //listeners


    $('#lollipopInfo').change((e) => {
        lollipops[lollipops.length - 1].info = e.target.value;
        console.error(lollipops);
    });

    $('#modal-close').click(() => {
        lollipop = null;
        isModalOpen = false;
    });

    $('#measure').click(() => {
        $("body").css("cursor", "crosshair");
        torusMouse.visible = false;
        state = 'measure';

    });

    $('#floor1').click(() => {
        renderer.localClippingEnabled = true;

    });

    $('#floor2').click(() => {
        renderer.localClippingEnabled = false;


    });
    $('#walk').click(() => {
        $("body").css("cursor", "none");
        torusMouse.visible = true;

        state = 'walk';
        orbitControls.enablePan = false;
        orbitControls.enableZoom = false;
        orbitControls.maxDistance = .001;
        orbitControls.enableRotate = true;
        dummyObject.visible = true;
        for (let index = 0; index < meshMats.length; index++) {
            const element = meshMats[index];
            element.opacity = 0;
        }
        sphere.visible = true;
        moveToSweep();

    });
    $('#mesh').click(() => {
        $("body").css("cursor", "none");
        torusMouse.visible = true;

        state = 'walk';
        orbitControls.enablePan = false;
        orbitControls.enableZoom = false;
        orbitControls.maxDistance = .001;
        orbitControls.enableRotate = true;
        dummyObject.visible = true;
        for (let index = 0; index < meshMats.length; index++) {
            const element = meshMats[index];
            element.opacity = 1;
        }
        sphere.visible = false;
        moveToSweep();

    });



    $('#floorplan').click(() => {
        $("body").css("cursor", "default");

        state = 'floorplan';
        dummyObject.visible = false;
        orbitControls.enableRotate = false;
        changeCamBehaviour();
        orbitControls.target.copy({ x: 0, y: 0, z: 0 });
        TweenMax.to(camera.position, 1.5,
            { x: 0, y: 20, z: 0 }
        );


    });

    function changeCamBehaviour() {
        orbitControls.enablePan = true;
        orbitControls.enableZoom = true;
        orbitControls.maxDistance = 33;
        sphere.visible = false;
        for (let index = 0; index < meshMats.length; index++) {
            const element = meshMats[index];
            element.opacity = 1;
        }
    }

    $('#birdview').click(() => {
        state = 'birdview';
        $("body").css("cursor", "default");
        torusMouse.visible = false;
        dummyObject.visible = false;
        orbitControls.enableRotate = true;
        changeCamBehaviour();
        orbitControls.target.copy({ x: 0, y: 0, z: 0 });
        TweenMax.to(camera.position, 1.5, { x: 2, y: 1, z: 8 });


    });

    $('#save').click(() => {
        var content = JSON.stringify(lollipops);
        var a = document.createElement("a");
        var file = new Blob([content], { type: 'text / plain' });
        a.href = URL.createObjectURL(file);
        a.download = 'pinsData.json';
        a.click();

    })

}


var drawfinish = false;
function drawMeasurementLine() {

    if (line)
        drawfinish = !drawfinish;



    if (drawfinish) return; else scene.remove(line);


    points = [];
    points.push(point);
    points.push(point);
    var material = new THREE.LineBasicMaterial({ color: 0x0000ff });
    var geometry = new THREE.Geometry().setFromPoints(points);
    line = new THREE.Line(geometry, material);
    scene.add(line);
    overlayLabel.visible = true;

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

                point = MESHINTERSECTED.point;
                var normal = MESHINTERSECTED.face.normal.clone();

                normal.transformDirection(object.matrixWorld);
                normal.add(point);

                torusMouse.position.copy(point);
                torusMouse.lookAt(normal);

                if (lollipop) {
                    lollipop.position.copy(point);
                    lollipop.lookAt(normal);
                    lollipop.children[0].lookAt(camera.position);
                }
                for (let index = 0; index < lollipops.length; index++) {
                    const element = lollipops[index];
                    element.lollipop.children[0].lookAt(camera.position);

                }


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


        }

    } else {

        if (INTERSECTED) INTERSECTED.material.color.setHex(INTERSECTED.currentHex);

        INTERSECTED = null;

    }
    if (state != 'walk')
        orbitControls.update();

    labelRenderer.render(scene, camera);

    renderer.render(scene, camera);


}

