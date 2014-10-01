Ball.ball_array = []
Paddle.paddle_array = []

//---------------------------------------------------------------------------//
//Ball Object

//Id,velocity,position
//Id can be anything, vel and pos are objects with x and y properties eg {x:0,y:0}  
function Ball(id,vel,pos) {
	this._id = id
	this._domElement = document.createElementNS("http://www.w3.org/2000/svg", "circle")
	this._outOfBounds = false
	
	this.pos = pos || {x:Config.ball_origin.x,y:Config.ball_origin.y} //Clone object, don't have everything refer to the same object
	this.vel = vel || {x:0,y:0}
	
	this._domElement.setAttributeNS(null,"fill","white")
	this._domElement.setAttributeNS(null,"r",Config.ballRadius)
	
	//TODO: Change to be managed by court object
	document.getElementsByTagName("svg")[0].appendChild(this._domElement)
	Ball.addBall(this)
}

//Adds a ball the main ball array
Ball.addBall = function(ball) {
	Ball.ball_array.push(ball)
}


//Loops over every ball and physticks it
Ball.physTickAll = function(dt) {
	for(var i=0;i<Ball.ball_array.length;i++) {
		var ball = Ball.ball_array[i]
		ball.physTick(dt)
	}
}

//Same as above, but renders
Ball.renderAll = function () {
	for(var i=0;i<Ball.ball_array.length;i++) {
		Ball.ball_array[i].render()
	}
}

//Loops over every ball and removes balls outside court
Ball.filterInvisible = function() {
	Ball.ball_array = Ball.ball_array.filter(function(ball){return Math.pow(ball.pos.x,2)+Math.pow(ball.pos.y,2)<Config.ball_remove_postition})
}

//Loops over all balls and returns the first matching id
Ball.find = function(id) {
	for(var i=0;i<Ball.ball_array.length;i++) {
		var ball = Ball.ball_array[i]
		if(ball.getId()==id) {
			return ball
		}
	}
}

Ball.prototype.render = function() {
	this._domElement.setAttributeNS(null,"cx",this.pos.x)
	this._domElement.setAttributeNS(null,"cy",this.pos.y)
}

Ball.prototype.getDomElement = function() {
	return this._domElement
}


Ball.prototype.physTick = function(dt) {
	this.pos.x += this.vel.x * dt
	this.pos.y += this.vel.y * dt
}

Ball.prototype.getId = function(){
	return this._id
}

Ball.prototype.getOoB = function() {
	return this._outOfBounds
}

//Sets the ball as having left the playable area
Ball.prototype.leaveCourt = function() {
	//Sure sounds like CK2
	this._outOfBounds = true
	this._domElement.setAttributeNS(null,"fill","red")
}

//---------------------------------------------------------------------------//
//Paddle object
//Paddles are created and destroyed 

//Id, position
//Id can be anything, pos is the position in >radians<, 0 being right, -0.5PI being up, 0.5PI being right 
function Paddle(id,pos) {
	this._id = id
	this._domElement = document.createElementNS("http://www.w3.org/2000/svg", "line")
	
	this.pos = pos || 0
	
	//TODO: Change to static style config?
	this._domElement.setAttributeNS(null,"strike-width",Config.paddleThickness)
	this._domElement.setAttributeNS(null,"stroke","white")
	
	//TODO: Change to be managed by court object
	document.getElementsByTagName("svg")[0].appendChild(this._domElement)
	
	Paddle.addPaddle(this)
}


Paddle.renderAll = function() {
	for(var i=0;i<Paddle.paddle_array.length;i++) {
		Paddle.paddle_array[i].render()
	}
}

Paddle.addPaddle = function(paddle){
	Paddle.paddle_array.push(paddle)
}

//Loops over all balls and returns the first matching id
Paddle.find = function(id) {
	for(var i=0;i<Paddle.paddle_array.length;i++) {
		var paddle = Paddle.paddle_array[i]
		if(paddle.getId()==id) {
			return paddle
		}
	}
}

Paddle.prototype.getId = function(){
	return this._id
}

Paddle.prototype.render = function(){
	var minpos = util.posToCoords(this.pos-Config.paddleSize/2,Config.paddleRadius)
	var pluspos = util.posToCoords(this.pos+Config.paddleSize/2,Config.paddleRadius)
	
	this._domElement.setAttributeNS(null,"x1",minpos.x)
	this._domElement.setAttributeNS(null,"y1",minpos.y)
		
	this._domElement.setAttributeNS(null,"x2",pluspos.x)
	this._domElement.setAttributeNS(null,"y2",pluspos.y)
}

Paddle.prototype.getDomElement = function() {
	return this._domElement
}


//Removes given ID from the main array
Paddle.remove = function(id) {
	var index = Paddle.paddle_array.indexOf(Paddle.find(id))
	if (index >= 0) {
		Paddle.paddle_array.splice(index,1)
	}
	
}

//---------------------------------------------------------------------------//


//Clientside physics sim
function physicsTick(dt) {
	Ball.physTickAll(dt)
	Ball.filterInvisible()
	Ball.renderAll()
	Paddle.renderAll()
}

var lastStamp = null
//Wrapper to get physTick its deltatime
//TODO: Seperate physics and rendering
function animFunc(timestamp) {
	if (lastStamp!=null) {
		physicsTick(timestamp-lastStamp)
	}
	lastStamp = timestamp
	
	requestAnimationFrame(animFunc)
}
requestAnimationFrame(animFunc)


//Update or insert a paddle
function upsertPaddle(id,pos) {
	var paddle = Paddle.find(id)
	if(!paddle) {
		paddle = new Paddle(id,pos)
	} else {
		paddle.pos = pos
	}
	
}

//Find element with matching .id property in array, returns false if not found
function findIdInArray(r,id) {
	for(var i=0;i <r.length;i++) {
		var entry = r[i]
		if(typeof entry.id == "undefined") {
			throw "Invalid array, no ID element property"
		}
		if(entry.id==id) {
			return entry
		}
	}
	return false
}

//TODO: Explain somewhere why this just works considering networking
function updateSelfPos(pos) {
	upsertPaddle("self_paddle",pos)
}

//---------------------------------------------------------------------------//
//Message handling
//Note that unlike paddles, the server doesn't remove balls, only sets them to be out of the court

Stream.on("updatePaddlePos",function(message) {
	upsertPaddle(this.subscriptionId,message)
})

Stream.on("removePaddle",function(message) {
	Paddle.remove(message)
})

Stream.on("newBall",function(message) {
	new Ball(message.id,message.vel)
})

Stream.on("updateBall",function(message) {
	console.log("received ball update ",message)
	var ball = Ball.find(message.id)
	
	if(ball) {
		if(message.pos) {
			ball.pos = message.pos
		}
		
		if(message.vel) {
			ball.vel = message.vel
		}
		
		if(message.outOfBounds) {
			ball.leaveCourt()
		}
	}

})

//---------------------------------------------------------------------------//
//Template events

Template.court.events({
	"mousemove svg, tap svg" : function(e,tmp) {
		var x = e.offsetX-Config.courtX/2
		var y = e.offsetY-Config.courtY/2
		var pos = util.coordsToPos(x,y) 

		Stream.emit("updatePaddlePos",pos)
		updateSelfPos(pos)
	},
	
	"dblclick svg" : function(e,tmp) {
		Meteor.call("addball")
	}
})