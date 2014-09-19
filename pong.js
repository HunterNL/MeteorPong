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
var ball_remove_postition = Math.pow(courtX/2+ballRadius*2,2)+Math.pow(courtY/2+ballRadius*2,2) 

if (Meteor.isClient) {
	
	
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
		var minpos = util.posToCoords(pos-paddleSize/2,paddleRadius)
		var pluspos = util.posToCoords(pos+paddleSize/2,paddleRadius)
		
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
			var pos = util.coordsToPos(x,y) 

			Stream.emit("updatePaddlePos",pos)
			updateSelfPos(pos)
		},
		
		"dblclick svg" : function(e,tmp) {
			Meteor.call("addball")
		}
	})
}

if (Meteor.isServer) {
	
	var Ball_array = []
	var Paddle_array = []

	//Debug method to add ball
	Meteor.methods({
		"addball" : function() {
			var pos = Math.random(-.5,.5)
			var ball = {
				id: Random.id(),
				vel : util.posToCoords(pos,ballSpeed)
			}
			Stream.emit("newBall",ball)
			ball.pos={
				x: 0,
				y: 0
			}
			Ball_array.push(ball)
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
		for(var i = 0;i <Paddle_array.length;i++) {
			var entry = Paddle_array[i]
			if (entry.id == this.subscriptionId) {
				entry.pos = message
				entry.lastUpdate = Date.now()
				return
			}
		}
		
		Paddle_array.push({id: this.subscriptionId, pos: message})
		
	})
	
	function isPaddleAtPos(pos) {
		return Paddle_array.filter(function(entry) {
			return (Math.abs(entry.pos-pos)<paddleSize/2)
		}).length>0
	}
	
	
	//Physics
	var lastUpdate = Date.now()
	Meteor.setInterval(function() {
		var dt = Date.now() - lastUpdate
		lastUpdate = Date.now()
		
		//Move ever ball, check for reflection
		
		for(var i = 0;i <Ball_array.length;i++) {
			var entry = Ball_array[i]
			entry.pos.x=entry.pos.x+entry.vel.x*dt
			entry.pos.y=entry.pos.y+entry.vel.y*dt
			
			
			if (Math.pow(entry.pos.x,2)+Math.pow(entry.pos.y,2) > ball_reflect_position) {
				var pos = util.coordsToPos(entry.pos)
				if (isPaddleAtPos(pos)) {
					entry.vel.x=-entry.vel.x
					entry.vel.y=-entry.vel.y
					Stream.emit("updateBall",entry)
				} else {
					entry.scheduledForRemove = true
					Stream.emit("updateBall",{id:entry.id, outOfBounds : true})
				}
			}
		}
		
		//Remove the Ball_array we scheduled to remove in the loop
		Ball_array = Ball_array.filter(function(entry){return (!(
			entry.scheduledForRemove === true 
		))}) 
		
		//Remove old Paddle_array
		Paddle_array = Paddle_array.filter(function(entry){
			if (entry.lastUpdate + 10000 < Date.now()) {
					Stream.emit("removePaddle",entry.id)
					return false
				}
				return true
		})
		
		//Is this a decent way to remove items from arrays?
	},15)
	
}
