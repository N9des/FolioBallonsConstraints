import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as dat from 'lil-gui';
import CannonDebugger from 'cannon-es-debugger';

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
		this.world = null;
		this.physics = [];
		this.model = null;
		this.children = [];
		this.letters = [];
		this.found = null;
		this.mouseClick = new THREE.Vector2();
		this.mouseMove = new THREE.Vector2();
		this.draggable = null;
		this.speedsPos = [1, 0.8, 1.2, 1.4, 1.2];
		this.speedsRot = [1, 1.1, 1.2, 1.4, 1.2];
		this.posXBalloon = [];
		this.lerpMultiplier = 0.005;
		this.utils = {
			// maValeur = lerp(maValeur, maValeurTarget, 0.09)
			lerp: (s, e, v) => s * (1 - v) + e * v,
		};

		this.addCannonWorld();

		this.addRaycaster();

		this.addLoader();

		this.addLights();

		this.addCamera();

		// this.addControls();

		this.addDebug();

		this.cannonDebugger = new CannonDebugger(this.scene, this.world, {});

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
					this.draggable = this.found[0].object;
					this.physic = this.found[0].object;
				}
			}
		});

		window.addEventListener('mouseup', (event) => {
			if (this.draggable !== null) {
				const idBalloon = this.draggable.userData.id;

				this.lerpMultiplier = 0.05;

				this.children[idBalloon].targ.x = this.posXBalloon[idBalloon];
				this.children[idBalloon].targ.y = 0;
				// this.draggable.position.set(this.posXBalloon[idBalloon], 0, 0);
				this.draggable = null;
				this.physic = null;
			}
		});

		window.addEventListener('mousemove', (event) => {
			this.mouseMove.x = (event.clientX / this.sizes.width) * 2 - 1;
			this.mouseMove.y = -(event.clientY / this.sizes.height) * 2 + 1;
		});
	}

	getIntersect(pos) {
		this.raycaster.setFromCamera(pos, this.camera);
		return this.raycaster.intersectObjects(this.scene.children);
	}

	dragObject() {
		if (this.draggable !== null) {
			if (this.found !== null && this.found.length > 0) {
				for (let i = 0; i < this.found.length; i++) {
					const index = this.found[i].object.userData.id;

					this.children[index].targ.x = this.mouseMove.x;
					this.children[index].targ.y = this.mouseMove.y;
					// this.children[index].meshBody.position.x = this.mouseMove.x;
					// this.children[index].meshBody.position.y = this.mouseMove.y;
				}
			}
		}
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
		this.camera.position.z = 2;
	}

	addDebug() {
		const gui = new dat.GUI();
	}

	addBalloon(mesh, posX = 0, index) {
		mesh.scale.set(0.3, 0.3, 0.3);
		mesh.position.set(posX, 0, 0);
		mesh.userData.draggable = true;
		mesh.userData.id = index;

		this.posXBalloon[index] = posX;
		this.scene.add(mesh);

		// Add physics
		const meshShape = new CANNON.Box(new CANNON.Vec3(0.1, 0.1, 0.1));
		const meshBody = new CANNON.Body({
			mass: 1000,
			linearFactor: new CANNON.Vec3(1, 1, 0),
			linearDamping: 0.9,
			velocity: new CANNON.Vec3(1, 1, 0),
			fixedRotation: true,
			force: new CANNON.Vec3(0.1, 0.1, 0),
			inertia: new CANNON.Vec3(1, 1, 1),
		});
		meshBody.addShape(meshShape);
		meshBody.position.x = mesh.position.x;
		meshBody.position.y = mesh.position.y;
		meshBody.position.z = mesh.position.z;
		this.world.addBody(meshBody);

		this.children[index] = {
			mesh,
			meshBody,
			targ: {
				x: mesh.position.x,
				y: mesh.position.y,
			},
			curr: {
				x: mesh.position.x,
				y: mesh.position.y,
			},
			init: {
				x: mesh.position.x,
				y: mesh.position.y,
			},
		};
	}

	staticAnim() {
		this.children.forEach((child, idx) => {
			if (child.mesh instanceof THREE.Mesh) {
				// Move mesh
				child.mesh.rotation.z =
					Math.sin(this.elapsedTime * this.speedsRot[idx]) * 0.05;
				// child.position.y = Math.sin(this.elapsedTime * this.speedsPos[idx]) * 0.03;
				child.targ.y = Math.sin(this.elapsedTime * this.speedsPos[idx]) * 0.03;
			}
		});
	}

	onAnim() {
		this.elapsedTime = this.clock.getElapsedTime();
		if (this.model) {
			// Anim neutral state
			this.staticAnim();
			// Grab/Drop anim
			this.dragObject();

			this.children.forEach((child, idx) => {
				if (child.mesh instanceof THREE.Mesh) {
					child.curr.x = this.utils.lerp(
						child.curr.x,
						child.targ.x,
						this.lerpMultiplier
					);
					child.curr.y = this.utils.lerp(
						child.curr.y,
						child.targ.y,
						this.lerpMultiplier
					);

					child.mesh.rotation.z =
						Math.sin(this.elapsedTime * this.speedsRot[idx]) * 0.05;

					if (this.physic && child.mesh.name !== this.physic.name) {
						child.mesh.position.x = child.meshBody.position.x;
						child.mesh.position.y = child.meshBody.position.y;
					} else {
						child.mesh.position.x = child.curr.x;
						child.mesh.position.y = child.curr.y;
						child.meshBody.position.x = child.curr.x;
						child.meshBody.position.y = child.curr.y;
					}
				}
			});
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
		const delta = Math.min(this.clock.getDelta(), 0.1);

		// Update World
		this.world.step(delta);
		this.cannonDebugger.update();

		this.onAnim();

		// Update controls
		// this.controls && this.controls.update();

		this.renderer.render(this.scene, this.camera);
		this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
		window.requestAnimationFrame(this.render.bind(this));
	}
}

new Sketch();
