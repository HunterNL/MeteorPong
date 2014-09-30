Stream = new Meteor.Stream("pongData")

Config = {
	courtX : 800,
	courtY : 800,
	
	ballSpeed : 0.2,
	ballRadius : 10,
	
	paddleThickness : 3,
	paddleRadius : 200,
	paddleSize : 0.2 //In radians
}
Config.ball_reflect_position = Math.pow(Config.paddleRadius-Config.ballRadius-Config.paddleThickness/2,2),
Config.ball_remove_postition = Math.pow(Config.courtX/2+Config.ballRadius*2,2)+Math.pow(Config.courtY/2+Config.ballRadius*2,2)

/*
var courtX = 800
var courtY = 800

var ballSpeed = 0.2
var ballRadius = 10

var paddleThickness = 3
var paddleRadius = 200
var paddleSize = 0.05
*/
//Below variables are squared(or not rooted) for optimized distance calculation



