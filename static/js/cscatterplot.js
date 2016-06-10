/** Define browser track function **/
CanvasScatterPlot = function(parent_id, dataset, options) {
	var self = this;

	/** Create a unique ID **/
	this.UID = Math.random().toString(36).substring(2,10);

	/** Structural parameters **/
	this.width = options.width || 900;
	this.height = options.height || 340;
	this.wpadding = options.wpadding || 100;
	this.hpadding = options.hpadding || 30;
	self.ylabel = options.ylabel || "";
	self.xlabel = options.xlabel || "";
	self.title = options.title || "";

	this.click = {x:0,y:0}
	this.hover = {x:0,y:0}
	this.clicked = {x:0,y:0}
	this.hovered = {x:0,y:0}

	/** Dataset accession functions **/
	this.x = options.x || function(d) { return d.x };
	this.y = options.y || function(d) { return d.y };
 
	/** Create internal data representation **/
	this.points = [];
	dataset.forEach(function(value, index, array) {
		value['x'] = self.x(value)
		value['y'] = self.y(value)
		self.points.push(value)
	});
	this.rendered_points = []
	this.rendered_qtree = d3.geom.quadtree(this.rendered_points)

	/** Create metadata **/
	this.metadata = {}
	this.metadata.xmin = Math.floor(dataset.map(this.x).reduce((prev, curr) => Math.min(prev, curr)))
	this.metadata.xmax = Math.ceil(dataset.map(this.x).reduce((prev, curr) => Math.max(prev, curr)))
	this.metadata.ymin = Math.floor(dataset.map(this.y).reduce((prev, curr) => Math.min(prev, curr)))
	this.metadata.ymax = Math.ceil(dataset.map(this.y).reduce((prev, curr) => Math.max(prev, curr)))
	this.metadata.xrange = this.metadata.xmax - this.metadata.xmin;
	this.metadata.yrange = this.metadata.ymax - this.metadata.ymin;

	/** Setup listeners **/
	this.listeners = []

	/** Create X-axis and Y-axis **/
	this.xAxis = d3.scale.linear().domain([this.metadata.xmin, this.metadata.xmax]).range([this.wpadding/2,this.width-this.wpadding/2])
	this.yAxis = d3.scale.linear().domain([this.metadata.ymin, this.metadata.ymax]).range([this.height - 2*this.hpadding,this.hpadding])

	/** Define and create the on-screen rendering canvas **/
	this.parent = d3.select(parent_id);
	this.parent.style('cursor','crosshair')
	this.canvas = this.parent.append('canvas').attr({'width':this.width,'height':this.height})
	this.surface = this.canvas.node().getContext('2d');

	/** Define the off-screen rendering canvas **/
	this.bufferCanvas = document.createElement('canvas')
	this.bufferCanvas.width = this.width;
	this.bufferCanvas.height = this.height;
	this.bufferSurface = this.bufferCanvas.getContext('2d')

	/** Define the repaint function **/
	this.repaint = function() {
		self.surface.clearRect(0,0,self.width,self.height);
		self.surface.drawImage(self.bufferCanvas,0,0)
	}

	/** Define the drawing routine **/
	this.render = function() {

		self.bufferSurface.clearRect(0,0,self.width,self.height);

		/** Render labels **/
		self.bufferSurface.font = '14px Arial'
		self.bufferSurface.fillStyle = "black"
		self.bufferSurface.textAlign = "center"
		self.bufferSurface.save()
		self.bufferSurface.translate(10,(self.height-self.hpadding)/2)
		self.bufferSurface.rotate(-Math.PI/2)
		self.bufferSurface.fillText(self.ylabel, 0, 0)	
		self.bufferSurface.restore()
		self.bufferSurface.fillText(self.xlabel, self.width/2, self.height-self.hpadding/2)
		self.bufferSurface.font = 'bold 14px Arial'

		self.bufferSurface.fillText(self.title, self.width/2, self.hpadding/2)


		/** Render Y-axis **/
	    self.bufferSurface.strokeStyle = '#000'
		ticks = self.yAxis.ticks(Math.round(self.height / 40));		
		ticks.forEach(function(value, index, arr) {
			y = self.yAxis(value)
			self.bufferSurface.beginPath()
			self.bufferSurface.moveTo(self.wpadding/3+.5, y+.5)
			self.bufferSurface.lineTo(self.wpadding/3+5+.5, y+.5)
			self.bufferSurface.stroke();
			self.bufferSurface.closePath();
		})
		self.bufferSurface.beginPath();
		self.bufferSurface.moveTo(self.wpadding/3+5 + .5,self.yAxis.range()[0] + .5)
		self.bufferSurface.lineTo(self.wpadding/3+5 + .5,self.yAxis.range()[1] + .5)
		self.bufferSurface.stroke();
		self.bufferSurface.closePath();
		self.bufferSurface.font = '11px Arial'
		self.bufferSurface.fillStyle = "black"
		self.bufferSurface.textAlign = "right"
		ticks.forEach(function(value, index, arr) {
			y = self.yAxis(value)
			self.bufferSurface.fillText(value, self.wpadding/3.5 + .5, y+4 + .5)		
		})

		/** Render X-axis **/
		ticks = self.xAxis.ticks(Math.round(self.width / 125));
		ticks.forEach(function(value, index, arr) {
			x = self.xAxis(value)
			self.bufferSurface.beginPath()
			self.bufferSurface.moveTo(x+.5, self.height - self.hpadding*1.2 -5 + .5)
			self.bufferSurface.lineTo(x+.5, self.height - self.hpadding*1.2 - 10 + .5)
			self.bufferSurface.stroke();
			self.bufferSurface.closePath();
		})
		self.bufferSurface.beginPath();
		self.bufferSurface.moveTo(self.xAxis.range()[0]+.5, self.height - self.hpadding*1.2 - 10 + .5)
		self.bufferSurface.lineTo(self.xAxis.range()[1]+.5, self.height - self.hpadding*1.2 - 10 + .5)
		self.bufferSurface.stroke();
		self.bufferSurface.closePath();
		self.bufferSurface.font = '11px Arial'
		self.bufferSurface.fillStyle = "black"
		self.bufferSurface.textAlign = "center"
		ticks.forEach(function(value, index, arr) {
			x = self.xAxis(value)
			self.bufferSurface.fillText(value.toLocaleString(), x + .5, self.height - self.hpadding+ .5)		
		})

		/** Render points **/
		self.bufferSurface.fillStyle = "rgba(0,0,0,.5)";
		self.rendered_points = []
		self.points.forEach(function(node, index, array) {
			xcoord = node.x
			ycoord = node.y
			if(xcoord >= self.xAxis.domain()[0] && xcoord <= self.xAxis.domain()[1]) {
				self.bufferSurface.beginPath();
				self.bufferSurface.arc(self.xAxis(xcoord)+.5, self.yAxis(ycoord)+.5, 3, 0, 2 * Math.PI, false);
				self.rendered_points.push({x:self.xAxis(xcoord)+.5,y:self.yAxis(ycoord)+.5,inverted:node})
				self.bufferSurface.fill();
				self.bufferSurface.closePath();
			}
		})
		self.rendered_qtree = d3.geom.quadtree(self.rendered_points)

		/** Render clicked point **/
		/**
		// If you have this set you need to constanly re-render
		self.bufferSurface.fillStyle = "#0000ff";
		self.bufferSurface.beginPath();
		self.bufferSurface.arc(self.click.x+.5, self.click.y+.5, 5, 0, 2 * Math.PI, false);
		self.bufferSurface.fill();
		self.bufferSurface.closePath();
		**/

		self.bufferSurface.fillStyle = "#ff0000";
		if(self.clicked.x > 0 && self.clicked.y > 0 && self.clicked.x >= self.xAxis.domain()[0] && self.clicked.x <= self.xAxis.domain()[1]) {
			self.bufferSurface.beginPath();
			self.bufferSurface.arc(self.xAxis(self.clicked.x)+.5, self.yAxis(self.clicked.y)+.5, 3, 0, 2 * Math.PI, false);
			self.bufferSurface.fill();
			self.bufferSurface.closePath();
		}

		/** Render hover point **/
		/**
		// If you have this set you need to constantly re-render on hover
		self.bufferSurface.fillStyle = "#00ffff";
		self.bufferSurface.beginPath();
		self.bufferSurface.arc(self.hover.x+.5, self.hover.y+.5, 5, 0, 2 * Math.PI, false);
		self.bufferSurface.fill();
		self.bufferSurface.closePath();
		**/

		self.bufferSurface.fillStyle = "rgba(255,0,0,.5)";
		if(self.hovered.x > 0 && self.hovered.y > 0 && self.hovered.x >= self.xAxis.domain()[0] && self.hovered.x <= self.xAxis.domain()[1]) {
			self.bufferSurface.beginPath();
			self.bufferSurface.arc(self.xAxis(self.hovered.x)+.5, self.yAxis(self.hovered.y)+.5, 10, 0, 2 * Math.PI, false);
			self.bufferSurface.fill();
			self.bufferSurface.closePath();
		}

	}

	/** Publish function **/
	this.publish = function() {
		self.listeners.forEach(function(target, index, array) {
			target.clicked = {x:0,y:0}
			target.hovered = {x:0,y:0}
			target.xAxis.domain([self.xAxis.domain()[0], self.xAxis.domain()[1]])
			target.render()
		})
	}

	/** Define zoom interaction **/
	this.canvas.on("mousewheel", function (event) {
	    var mousex = d3.mouse(this)[0]//d3.event.x;
	    var mousey = d3.mouse(this)[1]//d3.event.y;
	    var wheel = -d3.event.wheelDelta/1200;
	    var zoom = Math.exp(wheel);
	    
	    xMin = self.xAxis.domain()[0];
	    xMax = self.xAxis.domain()[1];
		xWidth = xMax - xMin;
	    newWidth = Math.ceil(xWidth * zoom);
	    if(newWidth < 10) return;
	    if(newWidth > self.metadata.xrange * 1.1) newWidth = self.metadata.xrange * 1.1;

	    // If you are hovering, center to that point
	    if(self.hovered.x > 0) {
	    	xPoint = Math.round(self.hovered.x)
	    } else {
		    xPoint = Math.round(self.xAxis.invert(mousex));
	    }

	    newAxisMin = xPoint - ((xPoint-xMin)/xWidth)*newWidth;
	    newAxisMax = newAxisMin + newWidth;

	    /** Enforce minimum/maximum zoom extents **/
	    if(newAxisMin < 0) {
	    	newAxisMin = 0
	    }
	    	   	
	    self.xAxis.domain([newAxisMin, newAxisMax]);
	    self.render();
	    self.publish()
	});

	/** Define drag interaction **/
	this.drag = d3.behavior.drag();
	this.canvas.call(this.drag);
	this.drag.on("drag", function(x) {
		xMin = self.xAxis.domain()[0];
		xMax = self.xAxis.domain()[1];
		xWidth = xMax - xMin;
		xRange = self.xAxis.range()[1] - self.xAxis.range()[0];
		scale = -d3.event.dx/xRange * xWidth;
		newAxisMin = xMin+scale
		newAxisMax = xMax+scale
		if(newAxisMin < 0) {
			newAxisMin = 0
			newAxisMax = xWidth
		}
		self.xAxis.domain([newAxisMin,newAxisMax]);
		self.render();
		self.publish()
	});
	this.dragging = false
	this.drag.on("dragstart", function(x) { self.dragging=true})
	this.drag.on("dragend", function(x) { self.dragging=false})


	/** Define click behavior **/
	this.canvas.on('click', function(event) {
		
		/** If a drag is being performed, don't click **/
		if(d3.event.defaultPrevented) return;

		self.click.x = d3.mouse(this)[0]//d3.event.clientX-9; // centers click event in X-direction
		self.click.y = d3.mouse(this)[1]//d3.event.clientY-9; // centers click event in Y-direction

		console.log("Click @ (" + self.click.x + ", " + self.click.y + ") --> ("+self.xAxis.invert(self.click.x)+", "+self.yAxis.invert(self.click.y)+")")
		console.log(self.yAxis.domain())

		closest_point = self.rendered_qtree.find([self.click.x, self.click.y])

		if (closest_point && euclideanDistance(self.click, closest_point) < 9) {
			self.clicked = closest_point.inverted
			self.render()
			self.publish()
		} 
	})

	/** Define hover behavior **/
	this.canvas.on("mousemove", function(event) {

		/** If a drag is being performed, don't click **/
		if(self.dragging) return;
		
		self.hover.x = d3.mouse(this)[0]; // centers click event in X-direction
		self.hover.y = d3.mouse(this)[1]; // centers click event in Y-direction

		closest_point = self.rendered_qtree.find([self.hover.x, self.hover.y])

		if (closest_point) {
			hover_distance = euclideanDistance(self.hover, closest_point)
			if(hover_distance < 9) {
				self.hovered = closest_point.inverted
				self.render()
				self.publish()
			} else if(self.hovered.x > 0) {
				self.hovered = {x:0, y:0}
				self.render()
				self.publish()
			}
		}
	})

	/** Register listener function **/
	this.register = function(target) {
		self.listeners.push(target)
	}

	/** Trigger initial rendering **/
	this.render();

	/** Schedule the animation loop **/
	d3.timer(this.repaint);

	return this;
}


function euclideanDistance(pointA, pointB) {
	xs = (pointA.x - pointB.x)
	ys = (pointA.y - pointB.y)
	return Math.sqrt(xs*xs + ys*ys)
}
