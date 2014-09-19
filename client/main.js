//Clientside physics sim
function physicsTick(dt) {
	var ball_list = document.getElementsByTagName("circle")
	if (!ball_list) {return}

	for(var i = 0;i <ball_list.length;i++) {
		var entry = ball_list[i]
		
		//if(entry.dataset.outofbounds) {continue}
		
		if(typeof entry.dataset.vel_x == "undefined" || typeof entry.dataset.vel_y == "undefined") {continue}
		//Is it okay to store this stuff in the DOM?
		//Edit: Its not on firefox, no .dataset for SVGElements :(
		
		var ballX = parseFloat(entry.getAttributeNS(null,"cx"),10)
		var ballY = parseFloat(entry.getAttributeNS(null,"cy"),10)
		
		entry.setAttributeNS(null,"cx",ballX+parseFloat(entry.dataset.vel_x,10)*dt)
		entry.setAttributeNS(null,"cy",ballY+parseFloat(entry.dataset.vel_y,10)*dt)
		
		if(Math.pow(ballX,2)+Math.pow(ballY,2)>Config.ball_remove_postition) {
			entry.parentNode.removeChild(entry)
		}
	}
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
	
	ball.dataset.vel_x = vel.x
	ball.dataset.vel_y = vel.y
	
	ball.id = id
	document.getElementsByTagName("svg")[0].appendChild(ball)
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
			ball.setAttributeNS(null,"cx",message.pos.x)
			ball.setAttributeNS(null,"cy",message.pos.y)
		}
		
		if(message.vel) {
			ball.dataset.vel_x=message.vel.x
			ball.dataset.vel_y=message.vel.y
		}
		
		if(message.outOfBounds) {
			ball.dataset.outofbounds = true
			ball.setAttributeNS(null,"fill","red")
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