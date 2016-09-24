(function(window, document) {

var requestAnimationFrame = (function() {
	if (window.requestAnimationFrame) return window.requestAnimationFrame;
	if (window.oRequestAnimationFrame) return window.oRequestAnimationFrame;
	if (window.msRequestAnimationFrame) return window.msRequestAnimationFrame;
	if (window.mozRequestAnimationFrame) return window.mozRequestAnimationFrame;
	return function(callback) {
		setTimeout(callback, 1000 / 60);
	}
})();

window.requestAnimFrame = requestAnimationFrame;

var RESOURCES = {
	"JUMP"               : "images/jump.png",
	"RUNNING_CHANGE_STEP": "images/running-change-step.png",
	"RUNNING_LEFT_STEP"  : "images/running-left-step.png",
	"RUNNING_RIGHT_STEP" : "images/running-right-step.png",
	"SHOOT_CHANGE_STEP"  : "images/shoot-change-step.png",
	"SHOOT_JUMP"         : "images/shoot-jump.png",
	"SHOOT_LEFT-STEP"    : "images/shoot-left-step.png",
	"SHOOT_RIGHT-STEP"   : "images/shoot-right-step.png",
	"SHOOT"              : "images/shoot.png",
	"SLIDE"              : "images/slide.png",
	"STANDING"           : "images/standing.png",
	"WEB_PROJECTILE"     : "images/web.png",
	"BACKGROUND"         : "images/background.jpg",
	"ROOF"               : "images/wall.jpg",
	"BUILDING"           : "images/building.png",
};

var AUDIO_RESOURCES = {
	"FRIENDLY_SPIDERMAN"   : new Audio("audio/60-theme-song.mp3"),
	"AMAZING_SPIDER_MAN_2" : new Audio("audio/amazing-spider-man-2.mp3"),
	"MOVIE_THEME"          : new Audio("audio/old-theme.mp3"),
	"ANIMATED_SERIES"      : new Audio("audio/animated-series-theme.mp3"),
};

// this is basically Object.values(AUDIO_RESOURCES); (but that doens't exist so)
var AUDIO_LOOP = Object.keys(AUDIO_RESOURCES).map(function(keyName) {
	return AUDIO_RESOURCES[keyName];
});

window.AUDIO_LOOP = AUDIO_LOOP;

var KEY = {
	ARROW_LEFT: 37,
	ARROW_UP: 38,
	ARROW_RIGHT: 39,
	ARROW_DOWN: 40,
	SPACEBAR: 32,
	A: 65,
	S: 87,
	D: 68,
	W: 87,
};

var RUNNING = {
	RIGHT: 1,
	LEFT: -1,
}

function SpidermanGame(opts) {
	var options = {
		canvas: "canvas",
	};

	opts = opts || {};

	for (var option in options) {
		if (opts.hasOwnProperty(option)) {
			options[option] = opts[option];
		}
	}

	// how many frames have passed
	this.frame = 0;
	this.resources = {};

	this.cameraX = 0;
	this.score = 0;

	this.options = options;
	this.scene = {
		spiderman: null,
		projectiles: [],
		roofs: [],
	}; // object that contains information about the next scene
}

SpidermanGame.prototype.initialized = false;

SpidermanGame.prototype.load = function() {
	if (!this.options) return false;
	if (this.initialized) return false;

	var self = this;

	this.canvas = document.querySelector(this.options.canvas);
	if (!this.canvas) {
		this.canvas = document.createElement("canvas");
		document.body.appendChild(this.canvas);
	}
	this.ctx = this.canvas.getContext("2d");
	this.canvas.height = 400;
	this.canvas.width = 711;

	var spiderman = new SpiderMan(this);
	this.spiderman = spiderman;

	document.addEventListener("keydown", function(e) {
		self.spiderman.keydown(e.keyCode || e.which);
	});

	document.addEventListener("keyup", function(e) {
		self.spiderman.keyup(e.keyCode || e.which);
	});

	for (var i = 0; i < AUDIO_LOOP.length; i++) {
		AUDIO_LOOP[i].ontimeupdate = function() {
			if (this.currentTime >= this.duration) {
				var current = AUDIO_LOOP.indexOf(this);
				var next = (current + 1) % (AUDIO_LOOP.length);
				
				self.playAudio(AUDIO_LOOP[next]);
			}
		}
	}

	var roof = new Roof(this);
	roof.x = 4;

	this.scene.spiderman = spiderman;
	this.scene.roofs = [roof];

	return new Promise(function(resolve, reject) {
		var reourcesArray = [];

		for (var resource in RESOURCES) {
			reourcesArray.push({
				name: resource,
				source: RESOURCES[resource],
			});
		}

		var index = 0;

		function loadNext() {
			if (!reourcesArray[index]) {
				self.update();
				self.playAudio(AUDIO_LOOP[0]);
				return resolve();
			}

			var resource = reourcesArray[index];
			var img = new Image();

			img.onload = function() {
				index++;
				self.resources[resource.name] = img;
				loadNext();
			}
			img.src = resource.source;
		}

		loadNext();
	});
}

SpidermanGame.prototype.playAudio = function(audio) {
	this.pauseAudio(); // first pause all audios

	if (audio && audio.play) {
		audio.play();
		return;
	}

	if (AUDIO_RESOURCES[audio]) {
		AUDIO_RESOURCES[audio].play();
	}
};

SpidermanGame.prototype.pauseAudio = function() {
	for (var audio in AUDIO_RESOURCES) {
		AUDIO_RESOURCES[audio].currentTime = 0;
		AUDIO_RESOURCES[audio].pause();
	}
}

SpidermanGame.prototype.drawBackground = function() {
	var background = this.resources.BACKGROUND;
	var backgroundWidth = background.width;
	var backgroundHeight = background.height;

	var x = this.cameraX / 5 * -1;
	var y = 0;

	x %= this.canvas.width;

	var ratio = backgroundWidth / backgroundHeight;
	this.ctx.drawImage(background, x, y, this.canvas.height * ratio, this.canvas.height);
	this.ctx.drawImage(background, x + this.canvas.height * ratio, y, this.canvas.height * ratio, this.canvas.height);
}

SpidermanGame.prototype.drawRoofs = function() {
	var roofs = this.scene.roofs;

	for (var i = 0; i < roofs.length; i++) {
		roofs[i].update();
	}

	// if roof left the frame and was removed, add another one
	if (roofs.length < 3) {
		var lastRoof = roofs[roofs.length - 1];
		var roof = new Roof(this);
		roof.x = lastRoof.x + lastRoof.width + Math.round(Math.random() * 80) + 50; // the gap between roofs
		this.addRoof(roof);
	}
}

SpidermanGame.prototype.update = function() {
	// draw the scene
	var scene = this.scene;
	var spiderman = scene.spiderman;
	var projectiles = scene.projectiles;
	var roofs = scene.roofs;

	// clear the canvas for re drawing
	this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
	this.drawBackground();
	this.drawRoofs();

	for (var i = 0; i < projectiles.length; i++) {
		projectiles[i].update();
	}

	for (var i = 0; i < roofs.length; i++) {
		roofs[i].update();
	}

	spiderman.update();

	this.ctx.fillStyle = "white";
	this.ctx.font = "20px Helvetica";
	this.ctx.textAlign = "center";
	this.ctx.fillText(this.score, this.canvas.width / 2, 30);

	requestAnimFrame(this.update.bind(this));
}

SpidermanGame.prototype.addProjectile = function(projectile) {
	if (projectile instanceof Projectile) {
		this.scene.projectiles.push(projectile);
	}
}

SpidermanGame.prototype.removeProjectile = function(projectile) {
	var projectiles = this.scene.projectiles;
	if (projectiles.indexOf(projectile) > -1) {
		projectiles.splice(projectiles.indexOf(projectile), 1);
	}
}

SpidermanGame.prototype.addRoof = function(roof) {
	if (roof instanceof Roof) {
		this.scene.roofs.push(roof);
	}
}

SpidermanGame.prototype.removeRoof = function(roof) {
	var roofs = this.scene.roofs;
	if (roofs.indexOf(roof) > -1) {
		roofs.splice(roofs.indexOf(roof), 1);
	}
}

// checks if given point is roof
SpidermanGame.prototype.isRoofAtPoint = function(x, y) {
	for (var i = 0; i < this.scene.roofs.length; i++) {
		var roof = this.scene.roofs[i];

		// since character is relative to the camera, calculate X of roof relative to camera as well
		var roofX = roof.x - this.cameraX - 4;

		if (roofX <= x && roofX + roof.width + 8 >= x && y >= roof.y) return roof;
	}

	return false;
}

SpidermanGame.prototype.gameover = function() {
	var roof = new Roof(this);
	roof.x = 4;

	this.spiderman = new SpiderMan(this);
	this.scene.spiderman = this.spiderman;
	this.scene.projectiles = [];
	this.scene.roofs = [roof];
	this.cameraX = 0;
	this.score = 0;
}

function SpiderMan(game) {
	this.game = game;
	this.canvas = game.canvas;
	this.ctx = game.ctx;
	this.x = 0;
	this.y = 0; 
	this.states = ["STANDING"];
	this.scale = 0.5;
	this.keydowns = [];

	// how many frames have passed
	this.frame = 0;

	this.runningFrames = ["RUNNING_RIGHT_STEP", "RUNNING_CHANGE_STEP", "RUNNING_LEFT_STEP", "RUNNING_CHANGE_STEP"];
	this.runningShootingFrames = ["SHOOT_RIGHT-STEP", "SHOOT_CHANGE_STEP", "SHOOT_LEFT-STEP", "SHOOT_CHANGE_STEP"];
	this.runningFrame = 0;

	this.gravityForce = 5;
	this.jumpForce = 0;

	this.runningDirection = 0;
	this.runningSpeed = 5;

	this.shootingFrame = 0;
}

SpiderMan.prototype.keyIsDown = function(keyCode) {
	return this.keydowns.indexOf(keyCode) > -1;
}

SpiderMan.prototype.hasState = function(state) {
	return this.states.indexOf(state) > -1;
}

SpiderMan.prototype.hasStates = function(states) {
	states = states.split(" ");
	var hasStates = true;
	for (var i = 0; i < states.length; i++) {
		hasState = hasState && this.hasState(states[i]);
	}
	return hasStates;
}

SpiderMan.prototype.addState = function(state) {
	if (this.hasState(state) === false) this.states.push(state);
}

SpiderMan.prototype.removeState = function(state) {
	if (state instanceof Array) {
		for (var i = 0; i < state.length; i++) {
			this.removeState(state[i]);
		}
	}

	if (this.hasState(state)) this.states.splice(this.states.indexOf(state), 1);
}

// returns the image to draw in position of spiderman
SpiderMan.prototype.stateImage = function() {
	var state = "STANDING";

	if (this.hasState("JUMP")) {
		state = "JUMP";
		if (this.jumpForce > 1) {
			this.y -= this.gravityForce * 4;
			this.jumpForce -= this.gravityForce * 2;
		} else {
			this.jumpForce = 0;
			this.removeState("JUMP");
			this.addState("FALL");
		}
	}

	if (this.hasState("SHOOT")) {
		state = "SHOOT";
		if (this.shootingFrame % 20 === 0) {
			this.shoot(this.game.resources[this.state] || this.game.resources["STANDING"]);
		}
		this.shootingFrame++;
	}

	if (this.hasState("RUNNING")) {
		state = this.runningFrames[this.runningFrame];

		// if user is shooting while running
		if (this.hasState("SHOOT")) state = this.runningShootingFrames[this.runningFrame];

		// every 10th frame update the image
		if (this.frame % 10 === 0) {
			this.runningFrame++;
			this.runningFrame %= this.runningFrames.length - 1;
		}

		this.x += this.runningDirection * this.runningSpeed;

		if (this.x < 0) this.x = 0;
		if (this.x > 150) {
			this.x = 150;
			this.game.cameraX += 5;
		}

		var img = this.game.resources[state];

		// if spiderman hits the wall (falls between them and hits it)
		if (this.game.isRoofAtPoint(this.x + img.width * this.scale, this.y + img.height * this.scale - 1)) {
			this.x -= this.runningDirection * this.runningSpeed;
		}
	}

	return this.game.resources[state] || this.game.resources["STANDING"];
}

SpiderMan.prototype.keydown = function(keyCode) {
	this.keydowns.push(keyCode);
}

SpiderMan.prototype.keyup = function(keyCode) {
	this.runningFrame = 0;
	this.shootingFrame = 0;

	this.removeState("RUNNING SHOOT".split(" "));

	while (this.keydowns.indexOf(keyCode) > -1) {
		this.keydowns.splice(this.keydowns.indexOf(keyCode), 1);
	}
}

SpiderMan.prototype.shoot = function(img) {
	var direction = this.runningDirection || 1;
	var web = new Projectile(this.game);
	web.x = this.x + img.width * this.scale;
	if (this.runningDirection == RUNNING.LEFT) {
		web.x = this.x; // left hand will be the X position of the spiderman
	}
	web.y = this.y + img.height * this.scale / 2;

	web.update = function() {
		this.ctx.fillStyle = "white";
		// well, the X is calculated but the X is center of the web, so we have to move it to right,
		// or to left by 10 pixels depending on direction
		this.ctx.drawImage(this.game.resources["WEB_PROJECTILE"], this.x + 10 * this.spiderman.runningDirection, this.y - 10, 20, 20);

		this.x += direction * 10;
		if (this.x >= this.canvas.width) this.remove();
	}
	web.spiderman = this;

	this.game.addProjectile(web);
}

// function that gets called with global update function
SpiderMan.prototype.update = function() {
	if (this.keyIsDown(KEY.ARROW_UP) && !this.jumpForce && !this.hasState("FALL")) {
		this.addState("JUMP");
		this.jumpForce = 100;
	}
	if (this.keyIsDown(KEY.ARROW_RIGHT)) {
		this.addState("RUNNING");
		this.runningDirection = RUNNING.RIGHT;
	}
	if (this.keyIsDown(KEY.ARROW_LEFT)) {
		this.addState("RUNNING");
		this.runningDirection = RUNNING.LEFT;
	}
	if (this.keyIsDown(KEY.SPACEBAR)) {
		this.addState("SHOOT");
	}

	if (this.y >= this.canvas.height) {
		this.game.gameover();
	}

	var img = this.stateImage();

	// if below this point is not a roof, fall down
	if (!this.game.isRoofAtPoint(this.x, this.y + img.height * this.scale + 1)) {
		this.y += 5;
		this.addState("FALL");
	}
	
	// if then it hits the bottom (or exceeds it)
	var roof = this.game.isRoofAtPoint(this.x, this.y + img.height * this.scale);
	if (roof) {
		this.y = this.canvas.height - roof.height - img.height * this.scale;
		this.removeState("FALL");
	}

	var x = this.x;
	var y = this.y;
	var width = img.width * this.scale;
	var height = img.height * this.scale;

	this.ctx.save();

	// if the spiderman is running to the left, flip him
	if (this.runningDirection == RUNNING.LEFT) {
		this.ctx.scale(-1, 1);
		x *= -1;
		x -= width;
	}

	this.ctx.drawImage(img, x, y, width, height);
	this.ctx.restore();
	this.frame++;
}

function Projectile(game) {
	this.x = 0;
	this.y = 0;

	this.canvas = game.canvas;
	this.ctx = game.ctx;
	this.game = game;
}

Projectile.prototype.update = function() {
}

Projectile.prototype.remove = function() {
	this.game.removeProjectile(this);
}

function Roof(game, x, y) {
	this.game = game;
	this.canvas = game.canvas;
	this.ctx = game.ctx;

	this.width = Math.round(Math.random() * this.canvas.width) + 200;
	this.height = Math.round(Math.random() * 50) + 100;
	this.fullWidth = this.width + 15; // 15 pixels for right end of the roof top

	this.x = 0;
	this.y = this.canvas.height - this.height;
}

Roof.prototype.update = function() {
	var renderX = this.x - this.game.cameraX;
	var roof = this.game.resources.BUILDING;

	this.ctx.drawImage(roof, 0, 0, this.width, this.height, renderX, this.y, this.width, this.height);
	this.ctx.drawImage(roof, this.width, 0, 15, 26, renderX + this.width, this.y, 15, 26);

	if (renderX + this.width <= 0) {
		this.game.removeRoof(this);
		// when this roof gets deleted, it means it has been jumped over
		this.game.score++;
	}
}

window.SpidermanGame = SpidermanGame;

})(window, document);