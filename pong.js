Stream = new Meteor.Stream("pongData")

var util = {
	clamp : function(a,min,max) {
		return Math.min(Math.max(a,min),max)
	},

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


function physicsTick(dt) {
	/*
	Paddles.find().forEach(function(entry){
		Paddles.update(entry._id,{$set: {pos:util.approach(entry.pos,entry.targetPos,0.0002*dt)}})
	})
	
	Balls.find().forEach(function(entry) {
		Balls.update(entry._id, {$inc: {
			x : entry.x_vel * dt,
			y : entry.y_vel * dt
		}})
		
		if ((entry.x^2 + entry.y^2) > (400^2)) {
			console.log(entry.x,entry.y)
			Balls.remove(entry._id)
		}
	})
	*/
	
}


if (Meteor.isClient) {
	Paddles = []
	Balls = []
	
	var paddleRadius = 200
	var paddleSize = 50
	/*
	Paddles.push({
		id: "self",
		pos: 0,
		lastUpdate : Date.now()
	})
	*/
	
	function setPaddlePos(paddle,pos) {
		paddle.setAttributeNS(null,"x1",Math.sin(pos*2*Math.PI-paddleSize/2)*paddleRadius)
		paddle.setAttributeNS(null,"y1",Math.cos(pos*2*Math.PI-paddleSize/2)*paddleRadius)
			
		paddle.setAttributeNS(null,"x2",Math.sin(pos*2*Math.PI+paddleSize/2)*paddleRadius)
		paddle.setAttributeNS(null,"y2",Math.cos(pos*2*Math.PI+paddleSize/2)*paddleRadius)
	}
	
	function upsertPaddle(id,pos) {
		var paddle = document.getElementById(id)
		if (!paddle) {
			paddle = document.createElementNS("http://www.w3.org/2000/svg", "line")
			
			paddle.setAttributeNS(null,"strike-width",3)
			paddle.setAttributeNS(null,"stroke","white")
		
			paddle.stroke = "white"
			paddle.id = id
			
			document.getElementsByTagName("svg")[0].appendChild(paddle)
		}
		
		console.log("upsertpos",pos)
		setPaddlePos(paddle,pos)
	}
	
	
	
	function updateSelfPos(pos) {
		upsertPaddle("self_paddle",pos)
		
		
		
		/*
		Paddles.forEach(function(entry){
			if (entry.id == "self_paddle") {
				entry.pos = pos
			}
		})
		*/
	}
	
	//Stream.emit("requestPadddle",null)
	Stream.on("updatePos",function(message) {
		upsertPaddle(this.subscriptionId,message)
		/*
		var updated = false
		
		Paddles.forEach(function(entry){
			if (entry.id == this.subscriptionId) {
				entry.pos = message
				entry.lastUpdate = Date.now()
				updated = true
			}
		},this)
		
		if(updated) {return}
		
		Paddles.push({
			id : this.subscriptionId,
			pos : message,
			lastUpdate : Date.now()
		})
		*/
	})
	
	
	
	//window.requestAnimationFrame(physicsTick)
	
	Template.court.balls = function(){
		return Balls
	}
	
	Template.court.paddles = function(){
		return Paddles
	}
	
	Template.court.pos = function(){
	/*
		var paddle = Paddles.findOne(Session.get("paddle"))
		if (paddle) {
			return paddle.pos
		} else {
			return "No paddle"
		}*/
	}
	
	Template.court.tgt = function(){
	/*
		var paddle = Paddles.findOne(Session.get("paddle"))
		if (paddle) {
			return paddle.targetPos
		} else {
			return "No Paddle"
		}
		*/
	}
	
	Template.court.ownPaddle = function() {
		return ownPaddle
	}
	
	Template.court.events({
		"mousemove svg" : function(e,tmp) {
			var x = e.offsetX-400
			var y = e.offsetY-400
			var pos = Math.atan2(y,x)/-2/Math.PI+0.25
			/*
			Paddles.update(Session.get("paddle"),{$set: {
				targetPos:(Math.atan2(y,x)/-2/Math.PI+0.25),
				last_update: Date.now()
				
			}}) //
			*/
			Stream.emit("updatePos",pos)
			console.log("event pos",pos)
			updateSelfPos(pos)
		},
		
		"click svg" : function(e,tmp) {
			var dir = Math.random(-Math.PI/2,Math.PI/2)
			Balls.insert({
				x:0,
				y:0,
				x_vel: Math.sin(dir),
				y_vel: Math.cos(dir)
			})
		}
	})
	
	Template.ball.attr = function(){
		return {
			cx : this.x,
			cy : this.y,
			r : 10,
			style: "fill:white"
		}
	}
	
	Template.paddle.attr = function(){
		console.log(this)
		return {
			x1: Math.sin(this.pos*2*Math.PI-paddleSize/2)*paddleRadius,
			y1: Math.cos(this.pos*2*Math.PI-paddleSize/2)*paddleRadius,
			
			x2: Math.sin(this.pos*2*Math.PI+paddleSize/2)*paddleRadius,
			y2: Math.cos(this.pos*2*Math.PI+paddleSize/2)*paddleRadius,
			
			stroke : "white",
			"stroke-width" : 2
		}
	}
	
}

if (Meteor.isServer) {
	
	Stream.permissions.write(function(eventname){
		return true
	},false)
	
	Stream.permissions.read(function(eventname){
		return true
	},false)
	
	/*
	//Physics
	var lastUpdate = Date.now()
	Meteor.setInterval(function() {
		var dt = Date.now() - lastUpdate
		lastUpdate = Date.now()
		physicsTick(dt)
	},15)
	*/
	
	//Housekeeping
	/*
	Meteor.setInterval(function() {
		Paddles.find().forEach(function(entry){
			if ((!entry.last_update)||(entry.last_update + 10000 < Date.now())) {
				console.log("removing paddle"+entry._id)
				Paddles.remove(entry._id)
			}
		})
	},1000)
	*/

}
