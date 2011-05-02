var MOUSE_SPEED = 0.3;

var texture_cache = {}

function draw_create_cube(label, is_term, is_minor) {
	label = new String(label);

	var key = label+' '+is_term+' '+is_minor;

	if (!(key in texture_cache)) {
		var canvas = document.createElement('canvas');
		canvas.width = 256;
		canvas.height = 256;

		var ct = canvas.getContext('2d');

		ct.strokeStyle = is_minor ? 'rgb(255,255,0)' : is_term ? 'rgb(0,255,0)' : 'rgb(0,0,255)';
		ct.lineWidth = 30;
		ct.strokeRect(0, 0, canvas.width, canvas.height);

		if (label.length <= 3) ct.font = '140px sans-serif';
		else if (label.length <= 5) ct.font = '100px sans-serif';
		else ct.font = '50px sans-serif';

		ct.fillStyle = 'rgb(0,0,0)';
		ct.textAlign = 'center';
		ct.textBaseline = 'middle';
		ct.fillText(label, canvas.width/2, canvas.height/2);

		texture_cache[key] = new THREE.Texture(canvas);
	}

	return new THREE.Mesh(new THREE.Cube(256, 256, 256), new THREE.MeshBasicMaterial({map: texture_cache[key]}));
}

var camera = new THREE.Camera(45, 1.0, 1, 100000);
var scene = new THREE.Scene();
var renderer = new THREE.CanvasRenderer();

var camera_theta, camera_phi, camera_dist;

function draw_reset() {
	texture_cache = {};
	scene = new THREE.Scene();

	draw_move_camera(45, 60, 2000);

	draw_on_resize();

	if (!is_drawing) {
		is_drawing = true;

		document.body.appendChild(renderer.domElement);

		setInterval(draw_loop, 50);
	}
}

function draw_on_resize() {
	var w = window.innerWidth - 40;
	var h = window.innerHeight - 40;

	renderer.setSize(w, h);

	camera.aspect = w/h;
	camera.updateProjectionMatrix();

	must_redraw = true;
}

function draw_move_camera(theta, phi, dist) {
	if (theta === undefined || theta === null) theta = camera_theta;
	if (phi === undefined || phi === null) phi = camera_phi;
	if (dist === undefined || dist === null) dist = camera_dist;

	camera.position.x = dist * Math.sin(theta*Math.PI/360) * Math.cos(phi*Math.PI/360);
	camera.position.y = dist * Math.sin(phi*Math.PI/360);
	camera.position.z = dist * Math.cos(theta*Math.PI/360) * Math.cos(phi*Math.PI/360);
//	camera.updateMatrix();

	camera_theta = theta;
	camera_phi = phi;
	camera_dist = dist;

	must_redraw = true;
}

var is_mouse_down = false;
var mouse_down_x = 0;
var mouse_down_y = 0;
var mouse_down_theta = 0;
var mouse_down_phi = 0;
var mouse_moved = false;

function draw_on_mouse_down(ev) {
//	ev.preventDefault();

	is_mouse_down = true;
	mouse_down_x = ev.clientX;
	mouse_down_y = ev.clientY;
	mouse_down_theta = camera_theta;
	mouse_down_phi = camera_phi;

	mouse_moved = false;
}

var ray = new THREE.Ray(camera.position, null);
var projector = new THREE.Projector();

function draw_on_mouse_move(ev) {
//	ev.preventDefault();

	var mouse = projector.unprojectVector(new THREE.Vector3((ev.clientX/renderer.domElement.width)*2-1, -(ev.clientY/renderer.domElement.height)*2+1, 0.5), camera);
	ray.direction = mouse.subSelf(camera.position).normalize();

	if (is_mouse_down) {
		theta = -((ev.clientX-mouse_down_x)*MOUSE_SPEED)+mouse_down_theta;
		phi = ((ev.clientY-mouse_down_y)*MOUSE_SPEED)+mouse_down_phi;

		phi = Math.min(180, Math.max(-180, phi));

		draw_move_camera(theta, phi, null);
	}

	mouse_moved = true;

	must_check = true;
}

function draw_on_mouse_up(ev) {
//	ev.preventDefault();

	is_mouse_down = false;

	if (!mouse_moved) {
		if (cur_obj) {
			camera.target.position.x = cur_obj.position.x;
			camera.target.position.y = cur_obj.position.y;
			camera.target.position.z = cur_obj.position.z;

			camera.position.x = cur_obj.position.x + 500;
			camera.position.y = cur_obj.position.y + 500;
			camera.position.z = cur_obj.position.z + 1000;

			draw_move_camera(null, null, 2000);
		}
	}
}

function draw_on_mouse_wheel(ev) {
	var data = ev.detail ? -ev.detail : ev.wheelDelta/40;
	if (data > 0) {
		var dist = camera_dist-200;
		if (dist < 500) dist = 500;
		draw_move_camera(null, null, dist);
	} else {
		draw_move_camera(null, null, camera_dist+200);
	}
}

function draw_on_key_press(ev) {
	var ch = String.fromCharCode(ev.keyCode);

	switch (ev.keyCode) {
		case 37: /* left arrow */
			camera.position.x -= 200;
			camera.target.position.x -= 200;
			must_redraw = true;
			break;

		case 39: /* right arrow */
			camera.position.x += 200;
			camera.target.position.x += 200;
			must_redraw = true;
			break;

		case 38: /* up arrow */
			camera.position.y += 200;
			camera.target.position.y += 200;
			must_redraw = true;
			break;

		case 40: /* down arrow */
			camera.position.y -= 200;
			camera.target.position.y -= 200;
			must_redraw = true;
			break;
	}
}

var default_camera_pos_x, default_camera_pos_y, default_camera_pos_z;
var default_camera_target_x, default_camera_target_y, default_camera_target_z;
var default_camera_theta, default_camera_phi, default_camera_dist = -1;

function draw_tree(tree) {
	var queue = [tree];
	var nodes = [];

	tree.level = 0;

	while (queue.length) {
		var node = queue.shift();
		nodes.push(node);

		for (var i=0;i<node.childs.length;i++) {
			var child = node.childs[i];

			child.level = node.level+1;
			queue.push(child);
		}
	}

	var nodes_per_level = [];
	for (var i=0;i<nodes.length;i++) {
		var node = nodes[i];

		if (!(node.level in nodes_per_level)) nodes_per_level[node.level] = 0;
		nodes_per_level[node.level]++;
	}

	var idx = 0;
	var prev_level = 0;
	for (var i=0;i<nodes.length;i++) {
		var node = nodes[i];

		if (prev_level != node.level) {
			prev_level = node.level;
			idx = 0;
		}

		var cube = draw_create_cube(node.name, node.childs.length ? false : true, node.type == NIL);
		cube.position.x = 500*(idx - nodes_per_level[node.level]/2);
		cube.position.y = -500*node.level;
		scene.addObject(cube);

		node.cube = cube;

		if (node.tok) cube.tok = node.tok;

		idx++;
	}

	for (var i=0;i<nodes.length;i++) {
		var node = nodes[i];

		for (var j=0;j<node.childs.length;j++) {
			var child = node.childs[j];

			var start = node.cube.position;
			var end = child.cube.position;

			var geo = new THREE.Geometry();
			geo.vertices[0] = new THREE.Vertex(new THREE.Vector3(start.x, start.y, start.z));
			geo.vertices[1] = new THREE.Vertex(new THREE.Vector3(end.x, end.y, end.z));

			var line = new THREE.Line(geo, new THREE.LineBasicMaterial({color: 0xff0000, linewidth: 5}));
			scene.addObject(line);
		}
	}

	camera.position.x = 0;
	camera.position.y = -500*(nodes_per_level.length/2-1);
	camera.position.z = 4000;

	default_camera_pos_x = camera.position.x;
	default_camera_pos_y = camera.position.y;
	default_camera_pos_z = camera.position.z;

	camera.target.position.x = 0;
	camera.target.position.y = -500*(nodes_per_level.length/2 - 1);
	camera.target.position.z = 0;

	default_camera_target_x = camera.target.position.x;
	default_camera_target_y = camera.target.position.y;
	default_camera_target_z = camera.target.position.z;

	draw_move_camera(0, 0, 600*nodes_per_level.length);

	default_camera_theta = camera_theta;
	default_camera_phi = camera_phi;
	default_camera_dist = camera_dist;
}

function draw_revert_camera() {
	if (default_camera_dist == -1) return;

	camera.position.x = default_camera_pos_x;
	camera.position.y = default_camera_pos_y;
	camera.position.z = default_camera_pos_z;

	camera.target.position.x = default_camera_target_x;
	camera.target.position.y = default_camera_target_y;
	camera.target.position.z = default_camera_target_z;

	draw_move_camera(default_camera_theta, default_camera_phi, default_camera_dist);
}

var is_drawing = false;
var cur_obj = null;
var must_redraw = false;
var must_check = false;

function draw_loop() {
	if (!must_check && !must_redraw) return;
	must_check = false;

	cur_obj = null;
	var dummy, intersects = ray.intersectScene(scene);
	if (intersects.length) cur_obj = intersects[0].object;

	if (!must_redraw) return;
	must_redraw = false;

	renderer.render(scene, camera);
}

window.addEventListener('resize', draw_on_resize, false);
window.addEventListener('mousedown', draw_on_mouse_down, false);
window.addEventListener('mouseup', draw_on_mouse_up, false);
window.addEventListener('mousemove', draw_on_mouse_move, false);
window.addEventListener('mousewheel', draw_on_mouse_wheel, false);
window.addEventListener('DOMMouseScroll', draw_on_mouse_wheel, false);
window.addEventListener('keypress', draw_on_key_press, false);
