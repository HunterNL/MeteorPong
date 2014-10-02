window.addEventListener("load",function(){
	main_court = new Court({
		decoration : '<circle cy="0" cx="0" r="5" style="fill:white"></circle><line x1=0 y1=0 x2=-400 y2=0 stroke-width=1 stroke="red"></line>'
	})
	document.body.appendChild(main_court._domElement)
})

//---------------------------------------------------------------------------//
//Court Object

function Court(options) {
	if (typeof options =="undefined") {
		options = {}
	}
	this._id = options.id //Unused atm
	this.ball_origin = options.ball_origin || {x:0,y:0} //Not used or well supported atm
	this.width = options.width || 800
	this.height = options.height || 800
	this.decoration = options.decoration 
	
	
	this._ball_remove_radius = Math.pow(this.width/2,2)+Math.pow(this.height/2,2)
	
	this.ball_array = []
	this.paddle_array = []
	
	this._domElement = document.createElementNS("http://www.w3.org/2000/svg", "svg")
	this._domElement.setAttribute("viewBox",this.width/-2+" "+this.height/-2+" "+this.width+" "+this.height)
	this._domElement.width = this.width
	this._domElement.height = this.height
	this._domElement.innerHTML = this.decoration
	
	var court = this //Only used in event handler below
	
	this._domElement.addEventListener("mousemove",function(e){
		var x = e.offsetX-this.width/2
		var y = e.offsetY-this.height/2
		var pos = util.coordsToPos(x,y) 

		Stream.emit("updatePaddlePos",pos)
		court.updateHomePaddle(pos)
	}.bind(court))
	
	this._domElement.addEventListener("dblclick",function(e){
		if(Meteor) {
			Meteor.call("addball")
		}
	})
	
	//Start render and logic loops
	this.lastPhysTick = Date.now()
	requestAnimationFrame(this.renderrAFWrapper.bind(court))
	
	//util.customTimeout(this.physTickWrapper,16,this)
}

Court.prototype.addBall = function(ball) {
	this.ball_array.push(ball)
	this._domElement.appendChild(ball._domElement)
}

Court.prototype.addPaddle = function(paddle) {
	this.paddle_array.push(paddle)
	this._domElement.appendChild(paddle._domElement)
}

Court.prototype.upsertPaddle = function(id,pos) {
	console.log("upserting paddle",id,pos)
	var paddle = findIdInArray(this.paddle_array,id)
	if(paddle) {
		paddle.pos=pos
	} else {
		paddle = new Paddle(id,pos)
		this.addPaddle(paddle)
	}
}

Court.prototype.updateHomePaddle = function(pos) {
	this.upsertPaddle("self_paddle",pos)
}

Court.prototype.physTickWrapper = function() {
	var now = Date.now()
	var dif = now - this.lastPhysTick
	this.lastPhysTick = now
	
	this.physTick(dif)
	
	util.customTimeout(this.physTickWrapper,16,this)
}

Court.prototype.physTick = function(dt) {
	
	//Move all balls
	for(var i=0;i<this.ball_array.length;i++) {
		this.ball_array[i].physTick(dt)
	}
	
	//Remove no longer visible balls
	this.removeInvisibleBalls()
	
}

Court.prototype.removeInvisibleBalls = function() {
	for(var i=0;i<this.ball_array.length;i++) {
		var ball = this.ball_array[i]
		if(Math.pow(ball.pos.x,2)+Math.pow(ball.pos.y,2)>this._ball_remove_radius) {
			ball._domElement.parentNode.removeChild(ball._domElement)
			ball.scheduledForDeletion = true //soundtrack https://www.youtube.com/watch?v=r95DhqVbxL8
		}
	}

	this.ball_array = this.ball_array.filter(function(ball) {return !ball.scheduledForDeletion})
}

Court.prototype.removePaddle = function(id) {
	var paddle = findIdInArray(this.paddle_array,id)
	if(paddle) {
		paddle._domElement.parentNode.removeChild(paddle._domElement)
		this.paddle_array.splice(this.paddle_array.indexOf(paddle),1)
	}
}

Court.prototype.render = function() {
	for(var i=0;i<this.ball_array.length;i++) {
		this.ball_array[i].render()
	}
	
	for(var i=0;i<this.paddle_array.length;i++) {
		this.paddle_array[i].render()
	}
}

//Quick wrapper to keep rAF in one place
Court.prototype.renderrAFWrapper = function(func) {
	this.physTick(Date.now()-this.lastPhysTick)
	this.lastPhysTick = Date.now()
	this.render()
	requestAnimationFrame(this.renderrAFWrapper.bind(this))
}


	


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
	/*document.getElementsByTagName("svg")[0].appendChild(this._domElement)
	/*Ball.addBall(this)*/
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
	//document.getElementsByTagName("svg")[0].appendChild(this._domElement)
	
	//Paddle.addPaddle(this)
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


//---------------------------------------------------------------------------//

/*
//Clientside physics sim
function physicsTick(dt) {
	Ball.physTickAll(dt)
	Ball.filterInvisible()
	Ball.renderAll()
	Paddle.renderAll()
}
*/
/*
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
*/
/*
//Update or insert a paddle
function upsertPaddle(id,pos) {
	var paddle = Paddle.find(id)
	if(!paddle) {
		paddle = new Paddle(id,pos)
	} else {
		paddle.pos = pos
	}
	
}*/

//Find element with matching .id property in array, returns false if not found
function findIdInArray(r,id) {
	for(var i=0;i <r.length;i++) {
		var entry = r[i]
		if(typeof entry._id == "undefined") {
			throw {msg:"Invalid array, no ID element property",obj:entry}
		}
		if(entry._id==id) {
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
	console.log("received paddle update",message)
	main_court.upsertPaddle(this.subscriptionId,message)
})

Stream.on("removePaddle",function(message) {
	main_court.removePaddle(message)
})

Stream.on("newBall",function(message) {
	main_court.addBall(new Ball(message.id,message.vel))
})

Stream.on("updateBall",function(message) {
	console.log("received ball update ",message)
	var ball = findIdInArray(main_court.ball_array,message.id)
	
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
	/*
	"mousemove svg, tap svg" : function(e,tmp) {
		var x = e.offsetX-Config.courtX/2
		var y = e.offsetY-Config.courtY/2
		var pos = util.coordsToPos(x,y) 

		Stream.emit("updatePaddlePos",pos)
		updateSelfPos(pos)
	},
	
	"dblclick svg" : function(e,tmp) {
		Meteor.call("addball")
	}*/
})