util = {
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
	},
	
	posToCoords : function(pos,radius) {
		var pos = {
			x : Math.cos(pos*2*Math.PI),
			y : -Math.sin(pos*2*Math.PI)
		}
		
		if (typeof radius != "undefined") {
			pos.x *= radius
			pos.y *= radius
		}
	
		return pos
	},
	
	
	coordsToPos : function(x,y) {
		if (typeof x.x != "undefined" && typeof x.y != "undefined") {
			y = x.y
			x = x.x
		}
		return Math.atan2(y,x)/-2/Math.PI 
	
	}
}