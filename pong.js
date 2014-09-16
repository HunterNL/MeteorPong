Stream = new Meteor.Stream("pongData")

var courtX = 800
var courtY = 800

var ballSpeed = 0.2
var ballRadius = 10

var paddleThickness = 3
var paddleRadius = 200
var paddleSize = 0.05

//Below variables are squared(or not rooted) for optimized distance calculation
var ball_reflect_position = Math.pow(paddleRadius-ballRadius-paddleThickness/2,2)
var ball_remove_postition = Math.pow(courtX/2,2)+Math.pow(courtY/2,2) 


var util = {
	clamp : function(a,min,max) {
		return Math.min(Math.max(a,min),max)
	},
	
	
	//Todo make me "modulus aware"
	approach : function(source,target,step,modulus) {
		//if (%)
		step = Math.abs(step)
		
		if (source<target) {
			return util.clamp(source+step,source,target)
		} 
		
		if (source>target) {
			return util.clamp(source-step,target,source)
		}
		return source //target==source at this point
	}
}




if (Meteor.isClient) {
	
	
	//Clientside physics sim
	function physicsTick(dt) {
		var balls = document.getElementsByTagName("circle")
		if (!balls) {return}
	
		for(var i = 0;i <balls.length;i++) {
			var entry = balls[i]
			
			//if(entry.dataset.outofbounds) {continue}
			if(typeof entry.dataset.vel_x == "undefined" || typeof entry.dataset.vel_y == "undefined") {continue}
			//Is it okay to store this stuff in the DOM?
			
			var ballX = parseFloat(entry.getAttributeNS(null,"cx"),10)
			var ballY = parseFloat(entry.getAttributeNS(null,"cy"),10)
			
			entry.setAttributeNS(null,"cx",ballX+parseFloat(entry.dataset.vel_x,10)*dt)
			entry.setAttributeNS(null,"cy",ballY+parseFloat(entry.dataset.vel_y,10)*dt)
			
			if(Math.pow(ballX,2)+Math.pow(ballY,2)>ball_remove_postition) {
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
		paddle.setAttributeNS(null,"x1",Math.sin((pos-paddleSize/2)*2*Math.PI)*paddleRadius)
		paddle.setAttributeNS(null,"y1",Math.cos((pos-paddleSize/2)*2*Math.PI)*paddleRadius)
			
		paddle.setAttributeNS(null,"x2",Math.sin((pos+paddleSize/2)*2*Math.PI)*paddleRadius)
		paddle.setAttributeNS(null,"y2",Math.cos((pos+paddleSize/2)*2*Math.PI)*paddleRadius)
	}
	
	
	//Update or insert a paddle
	function upsertPaddle(id,pos) {
		var paddle = document.getElementById(id)
		if (!paddle) {
			paddle = document.createElementNS("http://www.w3.org/2000/svg", "line")
			
			paddle.setAttributeNS(null,"strike-width",paddleThickness)
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
		ball.setAttributeNS(null,"r",ballRadius)
		
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
			var x = e.offsetX-courtX/2
			var y = e.offsetY-courtY/2
			var pos = Math.atan2(y,x)/-2/Math.PI+0.25 //This seems bad :(

			Stream.emit("updatePaddlePos",pos)
			updateSelfPos(pos)
		},
		
		"dblclick svg" : function(e,tmp) {
			Meteor.call("addball")
		}
	})
}

if (Meteor.isServer) {
	
	var Balls = []
	var Paddles = []

	//Debug method to add ball
	Meteor.methods({
		"addball" : function() {
			var pos = Math.random(-Math.PI/2,Math.PI/2)
			var ball = {
				id: Random.id(),
				vel : {
					x : Math.sin(pos) * ballSpeed,
					y : Math.cos(pos) * ballSpeed
				}
			}
			Stream.emit("newBall",ball)
			ball.pos={
				x: 0,
				y: 0
			}
			Balls.push(ball)
		}
	})
	
	//Second argument is false to disable caching
	Stream.permissions.write(function(eventname){
		return true
	},false)
	
	Stream.permissions.read(function(eventname){
		return true
	},false)
	
	Stream.on("updatePaddlePos",function(message) {
		var updated = false;
		Paddles.forEach(function(entry) {
			if (entry.id == this.subscriptionId) {
				updated = true
				entry.pos = message
				entry.lastUpdate = Date.now()
			}
		},this)
		
		if(updated) {return}
		
		Paddles.push({id: this.subscriptionId, pos: message})
		
	})
	
	function isPaddleAtPos(pos) {
		return Paddles.filter(function(entry) {
			return (Math.abs(entry.pos-pos)<paddleSize/2)
		}).length>0
	}
	
	
	//Physics
	var lastUpdate = Date.now()
	Meteor.setInterval(function() {
		var dt = Date.now() - lastUpdate
		lastUpdate = Date.now()
		
		//Move ever ball, check for reflection
		Balls.forEach(function(entry){
			entry.pos.x=entry.pos.x+entry.vel.x*dt
			entry.pos.y=entry.pos.y+entry.vel.y*dt
			
			
			if (Math.pow(entry.pos.x,2)+Math.pow(entry.pos.y,2) >= ball_reflect_position) {
				var pos = Math.atan2(entry.pos.y,entry.pos.x)/-2/Math.PI+0.25 //Oh no not again
				if (isPaddleAtPos(pos)) {
					entry.vel.x=-entry.vel.x
					entry.vel.y=-entry.vel.y
					Stream.emit("updateBall",entry)
				} else {
					entry.scheduledForRemove = true
					Stream.emit("updateBall",{id:entry.id, outOfBounds : true})
				}
			}
		})
		
		//Remove the balls we scheduled to remove in the foreach
		Balls = Balls.filter(function(entry){return (!(
			entry.scheduledForRemove === true 
		))}) 
		
		//Remove old paddles
		Paddles = Paddles.filter(function(entry){
			if (entry.lastUpdate + 10000 < Date.now()) {
					Stream.emit("removePaddle",entry.id)
					return false
				}
				return true
		})
		
		//Is this a decent way to remove items from arrays?
	},15)
	
}
