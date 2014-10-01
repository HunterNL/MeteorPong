Ball.ball_array = []
Paddle.paddle_array = []

//---------------------------------------------------------------------------//

function Ball(id,vel,pos) {
	this._id = id
	this._domElement = document.createElementNS("http://www.w3.org/2000/svg", "circle")
	this._outOfBounds = false
	
	this.pos = pos || {x:Config.ball_origin.x,y:Config.ball_origin.y} //Clone object, don't have everything refer to the same object
	this.vel = vel || {x:0,y:0}
		
	//domElement.setAttributeNS(null,"cx",0)
	//domElement.setAttributeNS(null,"cy",0)
	
	this._domElement.setAttributeNS(null,"fill","white")
	this._domElement.setAttributeNS(null,"r",Config.ballRadius)
	
	//TODO: Change to be managed by court object
	document.getElementsByTagName("svg")[0].appendChild(this._domElement)
	Ball.addBall(this)
}

Ball.addBall = function(ball) {
	Ball.ball_array.push(ball)
}

Ball.physTickAll = function(dt) {
	for(var i=0;i<Ball.ball_array.length;i++) {
		var ball = Ball.ball_array[i]
		ball.physTick(dt)
	}
}

Ball.renderAll = function () {
	for(var i=0;i<Ball.ball_array.length;i++) {
		Ball.ball_array[i].render()
	}
}

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

Ball.prototype.leaveCourt = function() {
	//Sure sounds like CK2
	outOfBounds = true
	this._domElement.setAttributeNS(null,"fill","red")
}

//---------------------------------------------------------------------------//

function Paddle(id,pos) {
	this._id = id
	this._domElement = document.createElementNS("http://www.w3.org/2000/svg", "line")
	
	this.pos = pos || 0
	
		
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

Paddle.remove = function(id) {
	console.log("revoving paddle id ",id)
	var index = Paddle.paddle_array.indexOf(Paddle.find(id))
	console.log(index)
	if (index >= 0) {
		Paddle.paddle_array.splice(index,1)
	}
	
}

//---------------------------------------------------------------------------//

//Clientside physics sim
function physicsTick(dt) {
	/*
	for(var i=0;i<Ball_array.length;i++) {
		var entry = Ball_array[i]
		var x = parseFloat(entry.domElement.getAttributeNS(null,"cx"),10)
		var y = parseFloat(entry.domElement.getAttributeNS(null,"cy"),10)
		
		
		if(Math.pow(x,2)+Math.pow(y,2)>Config.ball_remove_postition) {
			entry.scheduledForRemove = true //Figure out how to do this nicer
			entry.domElement.parentNode.removeChild(entry.domElement)
			continue
		}	
		
		entry.domElement.setAttributeNS(null,"cx",x+entry.vel.x*dt)
		entry.domElement.setAttributeNS(null,"cy",y+entry.vel.y*dt)
		
	}
	
	
	//As said above, do this nicer, or is this nice enough?
	Ball_array = Ball_array.filter(function(entry) {
		return (!entry.scheduledForRemove)
	})
	
	//console.log(Math.floor(1000/dt))
	*/
	Ball.physTickAll(dt)
	Ball.filterInvisible()
	Ball.renderAll()
	Paddle.renderAll()
}
/*
function renderTick(dt) {
	for(var i=0;i<Ball_array.length;i++) {
		var entry = Ball_array[i]
		entry.domElement.setAttributeNS(null,"cx",entry.pos.x)
		entry.domElement.setAttributeNS(null,"cy",entry.pos.y)
	}
}
*/


var lastStamp = null
//Wrapper to get physTick its deltatime
function animFunc(timestamp) {
	if (lastStamp!=null) {
		physicsTick(timestamp-lastStamp)
	}
	lastStamp = timestamp
	
	requestAnimationFrame(animFunc)
}
requestAnimationFrame(animFunc)
/*
function setPaddlePos(paddle,pos) {
	var minpos = util.posToCoords(pos-Config.paddleSize/2,Config.paddleRadius)
	var pluspos = util.posToCoords(pos+Config.paddleSize/2,Config.paddleRadius)
	
	paddle.setAttributeNS(null,"x1",minpos.x)
	paddle.setAttributeNS(null,"y1",minpos.y)
		
	paddle.setAttributeNS(null,"x2",pluspos.x)
	paddle.setAttributeNS(null,"y2",pluspos.y)
}
*/

//Update or insert a paddle
function upsertPaddle(id,pos) {
	/*
	var paddle = findIdInArray(id)
	if (!paddle) {
		paddle = document.createElementNS("http://www.w3.org/2000/svg", "line")
		
		paddle.setAttributeNS(null,"strike-width",Config.paddleThickness)
		paddle.setAttributeNS(null,"stroke","white")
		
		paddle.id = id
		Paddle_array.push({
			domElement : paddle,
			id : id,
			pos : pos,
			lastUpdate : Date.now()
		})
		
		document.getElementsByTagName("svg")[0].appendChild(paddle)
	}
	
	setPaddlePos(paddle,pos)
	*/
	var paddle = Paddle.find(id)
	if(!paddle) {
		paddle = new Paddle(id,pos)
	} else {
		paddle.pos = pos
	}
	
}
/*
function insertBall(id,vel) {
	var ball = document.createElementNS("http://www.w3.org/2000/svg", "circle")
		
	//paddle.setAttributeNS(null,"strike-width",3)
	ball.setAttributeNS(null,"fill","white")
	ball.setAttributeNS(null,"cx",0)
	ball.setAttributeNS(null,"cy",0)
	ball.setAttributeNS(null,"r",Config.ballRadius)
	
	ball.id = id //We'll use the Ball_array's id field but lets do this for good measure
	
	Ball_array.push({
		domElement : ball,
		id : id,
		vel : vel,
	})
	
	
	document.getElementsByTagName("svg")[0].appendChild(ball)
}
*/

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
/*
//Update ball position
function updateBallPos(id,pos) {
	var ball = findIdInArray(Ball_array,id)
	ball.domElement.setAttributeNS(null,"cx",pos.x)
	ball.domElement.setAttributeNS(null,"cy",pos.y)
}
*/
/*
//Update ball velocity
function updateBallVel(id,vel) {
	var ball = findIdInArray(Ball_array,id)
	ball.vel = vel
}
*/
//Set ball out of bounds true/false
//Note server removes ball when oob serverside
/*
function setBallOoB(id,oob) {
	var ball = findIdInArray(Ball_array,id)
	ball.oob = oob
	if(oob) {
		ball.domElement.setAttributeNS(null,"fill","red")
	} else {
		//This shouldn't really happen
		//ball.domElement.setAttributeNS(null,"fill","white")
		//system.exit(-1)
	}
}
*/

function updateSelfPos(pos) {
	upsertPaddle("self_paddle",pos)
}


Stream.on("updatePaddlePos",function(message) {
	upsertPaddle(this.subscriptionId,message)
})

Stream.on("removePaddle",function(message) {
	/*
	var paddle = document.getElementById(message)
	if (paddle) {
		paddle.parentNode.removeChild(paddle)
	}
	*/
	
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
			//updateBallPos(message.id,message.pos)
			ball.pos = message.pos
		}
		
		if(message.vel) {
			//updateBallVel(message.id,message.vel)
			ball.vel = message.vel
		}
		
		if(message.outOfBounds) {
			ball.leaveCourt()
		}
	}

})

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