Ball_array = []

//Clientside physics sim
function physicsTick(dt) {
	for(var i=0;i<Ball_array.length;i++) {
		var entry = Ball_array[i]
		var x = parseFloat(entry.domElement.getAttributeNS(null,"cx"),10)
		var y = parseFloat(entry.domElement.getAttributeNS(null,"cy"),10)
		
		
		if(Math.pow(x,2)+Math.pow(y,2)>Config.ball_remove_postition) {
			entry.scheduledForRemove = true //Figure out how to do this nicer
			entry.domElement.parentNode.removeChild(entry.domElement)
			//delete entry.domElement
			continue
		}	
		
		entry.domElement.setAttributeNS(null,"cx",x+entry.vel.x*dt)
		entry.domElement.setAttributeNS(null,"cy",y+entry.vel.y*dt)
		
	}
	
	
	//As said above, do this nicer, or is this nice enough?
	Ball_array = Ball_array.filter(function(entry) {
		return (!entry.scheduledForRemove)
	})
}


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

function setPaddlePos(paddle,pos) {
	var minpos = util.posToCoords(pos-Config.paddleSize/2,Config.paddleRadius)
	var pluspos = util.posToCoords(pos+Config.paddleSize/2,Config.paddleRadius)
	
	paddle.setAttributeNS(null,"x1",minpos.x)
	paddle.setAttributeNS(null,"y1",minpos.y)
		
	paddle.setAttributeNS(null,"x2",pluspos.x)
	paddle.setAttributeNS(null,"y2",pluspos.y)
}


//Update or insert a paddle
function upsertPaddle(id,pos) {
	var paddle = document.getElementById(id)
	if (!paddle) {
		paddle = document.createElementNS("http://www.w3.org/2000/svg", "line")
		
		paddle.setAttributeNS(null,"strike-width",Config.paddleThickness)
		paddle.setAttributeNS(null,"stroke","white")
		
		paddle.id = id
		
		document.getElementsByTagName("svg")[0].appendChild(paddle)
	}
	
	setPaddlePos(paddle,pos)
}

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

function getBallById(id) {
	for(var i=0;i <Ball_array.length;i++) {
		var entry = Ball_array[i]
		if(entry.id==id) {
			return entry
		}
	}
	console.error("Invalid ID specified for getBallById")
}

//Update ball position
function updateBallPos(id,pos) {
	var ball = getBallById(id)
	ball.domElement.setAttributeNS(null,"cx",pos.x)
	ball.domElement.setAttributeNS(null,"cy",pos.y)
}

//Update ball velocity
function updateBallVel(id,vel) {
	var ball = getBallById(id)
	ball.vel = vel
}

//Set ball out of bounds true/false
//Note server removes ball when oob serverside
function setBallOoB(id,oob) {
	var ball = getBallById(id)
	ball.oob = oob
	if(oob) {
		ball.domElement.setAttributeNS(null,"fill","red")
	} else {
		//This shouldn't really happen
		//ball.domElement.setAttributeNS(null,"fill","white")
		//system.exit(-1)
	}
}


function updateSelfPos(pos) {
	upsertPaddle("self_paddle",pos)
}


Stream.on("updatePaddlePos",function(message) {
	upsertPaddle(this.subscriptionId,message)
})

Stream.on("removePaddle",function(message) {
	var paddle = document.getElementById(message)
	if (paddle) {
		paddle.parentNode.removeChild(paddle)
	}
})

Stream.on("newBall",function(message) {
	insertBall(message.id,message.vel)
})

Stream.on("updateBall",function(message) {
	console.log("received ball update ",message)
	var ball = document.getElementById(message.id)
	if(ball) {
		if(message.pos) {
			updateBallPos(message.id,message.pos)
		}
		
		if(message.vel) {
			updateBallVel(message.id,message.vel)
		}
		
		if(message.outOfBounds) {
			setBallOoB(message.id,true)
			
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