
var Ball_array = []
var Paddle_array = []

//Debug method to add ball
Meteor.methods({
	"addball" : function() {
		var pos = Math.random(-.5,.5)
		var ball = {
			id: Random.id(),
			vel : util.posToCoords(pos,Config.ballSpeed)
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
		return (Math.abs(entry.pos-pos)<Config.paddleSize/2)
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
		
		if (Math.pow(entry.pos.x,2)+Math.pow(entry.pos.y,2) > Config.ball_reflect_position) {
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