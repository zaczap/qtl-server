ScatterPlot = function(selector, data, options) {
	var self = this;
	this.parent = d3.select(selector);
	this.parent.selectAll('*').remove();
	this.data = data;
	this.width = options.width || 1000;
	this.height = options.height || 340;
	this.wpadding = options.wpadding || 60;
	this.hpadding = options.hpadding || 30;
	this.extractX = options.extractX || function(d) {return d.x};
	this.extractY = options.extractY || function(d) {return d.y};
	this.extractColor = options.extractColor || function(d) { return '#000000';}
	this.extractRadius = options.extractRadius || function(d) { return 3.5};
	this.xLabel = options.xLabel || "";
	this.yLabel = options.yLabel || "";
	this.title = options.title || "";
	this.onclick = options.onclick || function(d) { };
	this.listeners = [];

	positions = data.map(this.extractX);
	minPosition = positions.reduce((prev, curr) => Math.min(prev, curr))
	maxPosition = positions.reduce((prev, curr) => Math.max(prev, curr))

	this.minX = data.map(this.extractX).reduce((prev, curr) => Math.min(prev, curr))
	this.maxX = data.map(this.extractX).reduce((prev, curr) => Math.max(prev, curr))
	this.rangeX = this.maxX - this.minX;

	this.minY = data.map(this.extractY).reduce((prev, curr) => Math.min(prev, curr))
	this.maxY = data.map(this.extractY).reduce((prev, curr) => Math.max(prev, curr))
	this.rangeY = this.maxY - this.minY;

	this.x = d3.scale.linear().domain([this.minX, this.maxX]).range([this.wpadding,this.width-this.wpadding])
	this.y = d3.scale.linear().domain([0, this.maxY]).range([this.height-2.1*this.hpadding, this.hpadding])

	this.svg = this.parent.append('svg').attr('width', this.width).attr('height', this.height)

	this.redraw();

	return this;
};


ScatterPlot.prototype.registerListener = function(splotTarget) {
	var self = this;
	self.listeners.push(splotTarget);
}


ScatterPlot.prototype.redraw = function() {
	
	var self = this;

	self.svg.selectAll('g').remove();
  	self.svg.selectAll('circle').remove();
  	self.svg.selectAll('text').remove();
	
	xAxis = d3.svg.axis().tickFormat(d3.format(",d")).ticks(Math.round(self.width/100));
	xAxis.scale(self.x);
	xAxis.orient("bottom");
	self.svg.append("g")
		.attr('class', 'axis xaxis')
		.attr("transform", "translate(0," + (self.height - 2*self.hpadding) + ")")
		.call(xAxis).selectAll('text')
		.attr("transform", function(d) { return "rotate(-15)" })
		.style('text-anchor','end');

	yAxis = d3.svg.axis().ticks(Math.round(self.height/50));
	yAxis.scale(self.y);
	yAxis.orient("left");
	self.svg.append("g")
		.attr('class', 'axis')
		.attr("transform", "translate(" + (self.wpadding) + ",0)").call(yAxis);

	// Perform data filtering

	filterMinX = self.x.domain()[0];
	filterMaxX = self.x.domain()[1];

	filteredData = this.data.filter(function(d) { pointX = self.extractX(d); 
		return  pointX >= filterMinX && pointX <= filterMaxX ;
	});

	console.log(filteredData.length)

	self.svg.selectAll("circle")
	      .data(filteredData)
	      .enter().append("circle")
	      .attr("class", "dot")
	      .attr("r", function(x) { return self.extractRadius(x) })
	      .attr("cx", function(x) { return self.x(self.extractX(x)) })
	      .attr("cy", function(x) { return self.y(self.extractY(x)) })
	      .attr('fill', function(x) { return self.extractColor(x)})
	      .style('opacity', .6)
	      .on('click', self.onclick);

	if(self.title != "") {
		self.svg.append('text')
			.attr('x', self.width/2)
			.attr('y',.5*self.hpadding)
			.style({'font-weight':'bold', 'font-size':'12px'})
			.style('text-anchor', 'middle')
			.text(self.title)
	}

	if(self.xLabel != "") {
		self.svg.append('text')
			.attr('x', self.width/2)
			.attr('y',self.height-.5*self.hpadding)
			.style({'font-weight':'bold', 'font-size':'12px'})
			.style('text-anchor', 'middle')
			.text(self.xLabel)
	}

	if(self.yLabel != "") {
		self.svg.append('text')
			.attr('x', 0)
			.attr('y', 0)
			.style({'font-weight':'bold', 'font-size':'12px'})
			.style('text-anchor', 'middle')
			.text(self.yLabel)
			.attr('transform', 'translate('+self.wpadding/2+','+(self.height-self.hpadding)/2+')rotate(-90)')
	}

	zoomFunction = function() {

		// Publish to listener plots
		self.listeners.map(function(splotTarget) {
			splotTarget.x.domain(self.x.domain())// = jQuery.extend({}, self.x)
			splotTarget.redraw()
		})

	  	self.redraw();
	}

	self.svg.call(d3.behavior.zoom().x(self.x).scaleExtent([0,2]).on("zoomend", zoomFunction));
};
