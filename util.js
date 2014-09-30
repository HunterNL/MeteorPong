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
		if(typeof pos == "undefined") {
			throw "Invalid argument for pos"
		}
		var pos = {
			x : Math.cos(pos),
			y : Math.sin(pos)
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
		return Math.atan2(y,x)//-2/Math.PI 
	
	},
	
	//Not 100% about the math, might be the wrong way around
	//Also can probably be done nicer with some abs
	posDifference : function(a,b) {
		var diff = a-b
		if(diff < -Math.PI) {
			return -2*Math.PI + diff
		}
		if(diff > Math.PI) {
			return 2*Math.PI - diff
		}
		return diff
	},
	//Phytagoras
	pyth : function(a,b) {
		return Math.sqrt(Math.pow(a,2)+Math.pow(b,2))
	}
}