import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as dat from 'lil-gui';
import CannonDebugger from 'cannon-es-debugger';
import { DragControls } from 'three/examples/jsm/controls/DragControls';

// import vertexShader from '../shaders/vertex.glsl';
// import fragmentShader from '../shaders/fragment.glsl';

export default class Sketch {
	constructor() {
		// Sizes
		this.sizes = {
			width: window.innerWidth,
			height: window.innerHeight,
		};
		// Init Renderer
		this.canvas = document.querySelector('canvas.webgl');

		this.renderer = new THREE.WebGLRenderer({
			canvas: this.canvas,
			antialias: true,
		});
		this.renderer.setSize(this.sizes.width, this.sizes.height);
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

		// Init scene
		this.scene = new THREE.Scene();
		// this.scene.background = new THREE.Color(0x8684E4);
		this.scene.background = new THREE.Color(0x330033);
		THREE.ColorManagement.enabled = false;

		// Init values
		this.clock = new THREE.Clock();
		this.delta = 0;
		this.down = false;
		this.world = null;
		this.meshBodies = [];
		this.model = null;
		this.children = [];
		this.letters = [];
		this.found = null;
		this.mouseClick = new THREE.Vector2();
		this.mouseMove = new THREE.Vector2();
		this.draggable = null;
		this.speedsPos = [1, 0.8, 1.2, 1.4, 1.2];
		this.speedsRot = [1, 1.1, 1.2, 1.4, 1.2];
		this.lerpMultiplier = 0.005;
		this.utils = {
			// maValeur = lerp(maValeur, maValeurTarget, 0.09)
			lerp: (s, e, v) => s * (1 - v) + e * v,
		};

		this.addCannonWorld();

		this.addLoader();

		this.addLights();

		this.addCamera();

		this.addRaycaster();

		// this.addControls();

		this.addDebug();

		this.render();

		// Resize
		window.addEventListener('resize', this.resize.bind(this));

		// Mouse event
		window.addEventListener('mousedown', (event) => {
			this.mouseClick.x = (event.clientX / this.sizes.width) * 2 - 1;
			this.mouseClick.y = -(event.clientY / this.sizes.height) * 2 + 1;
			this.lerpMultiplier = 0.005;

			this.found = this.getIntersect(this.mouseClick);

			if (this.found.length > 0) {
				if (this.found[0].object.userData.draggable) {
					this.draggable = this.found[0].object.userData.id;
				}
			}

			this.down = true;
		});

		window.addEventListener('mouseup', (event) => {
			if (this.draggable !== null) {
				this.lerpMultiplier = 0.05;

				this.draggable = null;

				setTimeout(() => {
					this.down = false;
				}, 1000);
			}
		});

		window.addEventListener('mousemove', (event) => {
			this.mouseMove.x = (event.clientX / this.sizes.width) * 2 - 1;
			this.mouseMove.y = -(event.clientY / this.sizes.height) * 2 + 1;
		});
	}

	addRaycaster() {
		this.raycaster = new THREE.Raycaster();
	}

	addCannonWorld() {
		this.world = new CANNON.World();
		this.world.gravity.set(0, 0, 0);
	}

	addLoader() {
		this.loader = new GLTFLoader();
		this.loader.load('./models/letters.glb', (gltf) => {
			this.model = gltf.scene;

			// Store all letters in an array
			this.model.traverse((child) => {
				if (child instanceof THREE.Mesh) {
					this.letters.push(child);
				}
			});

			// Add each letter as a mesh in our scene
			for (let i = 0; i < this.letters.length; i++) {
				const mesh = this.letters[i];
				const name = mesh.name.toLowerCase();

				if (name === 'f') {
					this.addBalloon(mesh, -0.45, 0);
				} else if (name === 'e') {
					this.addBalloon(mesh, -0.23, 1);
				} else if (name === 'l') {
					this.addBalloon(mesh, 0, 2);
				} else if (name === 'i') {
					this.addBalloon(mesh, 0.22, 3);
				} else {
					this.addBalloon(mesh, 0.45, 4);
				}
			}

			this.onAnim();
		});
	}

	addLights() {
		const white = 0xffffff;
		const intensity = 6;
		this.spotLight = new THREE.SpotLight(white, intensity);
		this.spotLight.position.set(1, 1, 1);
		this.scene.add(this.spotLight);

		this.spotLightHelper = new THREE.SpotLightHelper(this.spotLight);
		// this.scene.add(this.spotLightHelper);

		const green = 0xf9f863;
		const intensityGreen = 1.5;
		this.pointLight = new THREE.SpotLight(white, intensityGreen);
		this.pointLight.lookAt(0, 0, 0);
		this.pointLight.position.set(0, -1.5, 0);
		this.scene.add(this.pointLight);

		this.pointLightHelper = new THREE.SpotLightHelper(this.pointLight);
		// this.scene.add(this.pointLightHelper);

		const intensityWhite = 2;
		this.pointLightWhite = new THREE.PointLight(white, intensityWhite);
		this.pointLightWhite.position.set(-1, 1, 1);
		this.scene.add(this.pointLightWhite);

		this.pointLightWhiteHelper = new THREE.PointLightHelper(
			this.pointLightWhite
		);
		// this.scene.add(this.pointLightWhiteHelper);

		const intensityAmbient = 2;
		this.ambientLight = new THREE.AmbientLight(white, intensityAmbient);
		this.scene.add(this.ambientLight);
	}

	addControls() {
		this.controls = new OrbitControls(this.camera, this.canvas);
		this.controls.enableDamping = true;
	}

	addCamera() {
		this.camera = new THREE.PerspectiveCamera(
			70,
			this.sizes.width / this.sizes.height,
			0.01,
			10
		);
		this.camera.position.z = 1.2;
	}

	addDebug() {
		this.cannonDebugger = new CannonDebugger(this.scene, this.world, {});
		const gui = new dat.GUI();
	}

	addBalloon(mesh, posX = 0, index) {
		// Create balloon
		mesh.scale.set(0.3, 0.3, 0.3);
		mesh.position.set(posX, 0, 0);
		mesh.userData.draggable = true;
		mesh.userData.id = index;
		this.scene.add(mesh);
		// Add mesh to an array
		this.children[index] = {
			mesh,
			posX,
			targ: {
				x: mesh.position.x,
				y: mesh.position.y,
				z: mesh.position.z,
				zRot: mesh.rotation.z,
			},
			curr: {
				x: mesh.position.x,
				y: mesh.position.y,
				z: mesh.position.z,
				zRot: mesh.rotation.z,
			},
		};

		// Add physics mesh on balloon
		const meshShape = new CANNON.Sphere(0.11);
		const meshShapeTop = new CANNON.Sphere(0.08);
		const meshShapeBottom = new CANNON.Sphere(0.08);
		const meshBody = new CANNON.Body({
			mass: 1,
			velocity: new CANNON.Vec3(0.1, 0.1, 0),
			angularFactor: new CANNON.Vec3(0, 0, 0),
		});
		meshBody.addShape(meshShape, new CANNON.Vec3(0, 0, 0));
		meshBody.addShape(meshShapeTop, new CANNON.Vec3(0, 0.05, 0));
		meshBody.addShape(meshShapeBottom, new CANNON.Vec3(0, -0.05, 0));
		meshBody.position.x = mesh.position.x;
		meshBody.position.y = mesh.position.y;
		meshBody.position.z = mesh.position.z;
		Object.assign(meshBody, { balloonID: index });
		this.world.addBody(meshBody);
		this.meshBodies.push(meshBody);

		// Add bg plane for balloon
		const planeGeo = new THREE.PlaneGeometry(0.2, 0.2);
		const planeMat = new THREE.MeshNormalMaterial();
		const planeMesh = new THREE.Mesh(planeGeo, planeMat);
		planeMesh.position.set(mesh.position.x, 0, -0.15);
		planeMesh.visible = false;
		this.scene.add(planeMesh);

		// Add physics to plane
		const planeShape = new CANNON.Plane();
		const planeBody = new CANNON.Body({
			mass: 0,
			shape: planeShape,
		});
		planeBody.position.x = planeMesh.position.x;
		planeBody.position.y = planeMesh.position.y;
		planeBody.position.z = planeMesh.position.z;
		this.world.addBody(planeBody);

		// Add constraint point between plane and balloon
		const localPivotBox = new CANNON.Vec3(0, 0, -0.2);
		const localPivotPlane = new CANNON.Vec3(0, 0, 0.2);
		const constraints = new CANNON.PointToPointConstraint(
			meshBody,
			localPivotBox,
			planeBody,
			localPivotPlane
		);
		this.world.addConstraint(constraints);
	}

	getIntersect(pos) {
		this.raycaster.setFromCamera(pos, this.camera);
		return this.raycaster.intersectObjects(this.letters);
	}

	dragObject() {
		if (this.draggable !== null) {
			if (this.found !== null && this.found.length > 0) {
				for (let i = 0; i < this.found.length; i++) {
					const index = this.found[i].object.userData.id;

					this.children[index].targ.x = this.mouseMove.x;
					this.children[index].targ.y = this.mouseMove.y;
				}
			}
		}
	}

	staticAnim() {
		this.children.forEach((child, idx) => {
			const rotationZ = Math.sin(this.elapsedTime * this.speedsRot[idx]) * 0.1;
			child.targ.zRot = rotationZ;
		});
	}

	moveBalloons() {
		// Balloon mouvement
		const child = this.children.find(
			(x) => x.mesh.userData.id === this.draggable
		);

		if (child && child.mesh) {
			const meshBody = this.meshBodies.find(
				(m) => m.balloonID === this.draggable
			);

			meshBody.position.x = child.curr.x;
			meshBody.position.y = child.curr.y;
			meshBody.position.z = child.curr.z;
			meshBody.velocity.set(0, 0, 0);
			meshBody.angularVelocity.set(0, 0, 0);
		}

		const children = this.children.filter(
			(x) => x.mesh.userData.id !== this.draggable
		);

		for (const child of children) {
			const meshBody = this.meshBodies.find(
				(m) => m.balloonID === child.mesh.userData.id
			);

			child.targ.x = meshBody.position.x;
			child.targ.y = meshBody.position.y;
			child.targ.z = meshBody.position.z;
		}
	}

	onAnim() {
		this.elapsedTime = this.clock.getElapsedTime();
		if (this.model) {
			this.children.forEach((child, idx) => {
				child.curr.x = this.utils.lerp(child.curr.x, child.targ.x, 0.5);
				child.curr.y = this.utils.lerp(child.curr.y, child.targ.y, 0.5);
				child.curr.z = this.utils.lerp(child.curr.z, child.targ.z, 0.5);
				child.curr.zRot = this.utils.lerp(
					child.curr.zRot,
					child.targ.zRot,
					0.5
				);

				child.mesh.position.x = child.curr.x;
				child.mesh.position.y = child.curr.y;
				child.mesh.position.z = child.curr.z;
				child.mesh.rotation.z = child.curr.zRot;
			});

			this.staticAnim();
			// Grab/Drop anim
			this.dragObject();
			// Move Balloons out of drag
			this.moveBalloons();
		}
	}

	resize() {
		// Update sizes
		this.sizes.width = window.innerWidth;
		this.sizes.height = window.innerHeight;

		// Update camera
		this.camera.aspect = this.sizes.width / this.sizes.height;
		this.camera.updateProjectionMatrix();

		// Update renderer
		this.renderer.setSize(this.sizes.width, this.sizes.height);
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
	}

	render() {
		this.delta = Math.min(this.clock.getDelta(), 0.1);

		// Update World
		this.world.step(this.delta);
		this.cannonDebugger.update();

		// Animations
		this.onAnim();

		// Update controls
		// this.controls && this.controls.update();

		this.renderer.render(this.scene, this.camera);
		this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
		window.requestAnimationFrame(this.render.bind(this));
	}
}

new Sketch();
