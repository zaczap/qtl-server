var spinner;
var eqtl_data;
var isoqtl_data;
var ase_data;
var genotype_data;
var expression_data;

var spinnerOpts = {
  lines: 9, // The number of lines to draw
  length: 9, // The length of each line
  width: 7, // The line thickness
  radius: 14, // The radius of the inner circle
  color: '#e74c3c', // #rgb or #rrggbb or array of colors
  speed: 1.9, // Rounds per second
  trail: 40, // Afterglow percentage
  className: 'spinner', // The CSS class to assign to the spinner
};

$(document).ready(function(x) {
	// Enable the search bar
	$('#searchForm').submit(function(e) {
		e.preventDefault(); // prevent redirect
		search(); // trigger search
	});
});

search = function() {
	destroy_plots();
	d3.select('body').transition().style('background','white');
	query = $('#searchField').val();
	target = document.getElementById("spinner");
	spinner = new Spinner(spinnerOpts).spin(target);
	$("#content").html('');
	$('#plot_container').hide();
	console.log('Searching for: ' + query);
	d3.json("/search/"+query, function(error, payload) {
		if (error) throw error;
		console.log('Search results: # of results = ' + payload.ensembl_gene_ids.length)
		results = payload.ensembl_gene_ids
		if(results.length == 0) {
			// render error message
			spinner.stop();
			render_error_message(payload.message);
		} else if(results.length == 1) {
			// render plots
			fetch(results[0]);
		} else {
			// render search results
			spinner.stop();
			render_search_results(payload);
		}
	});
}

fetch = function(query) {
	$("#content").html('');
	if(spinner) spinner.stop();
	spinner = new Spinner(spinnerOpts).spin(target);
	d3.json("/fetch/"+query, function(error, payload) {
		if (error) throw error;
		spinner.stop()
		$('#plot_container').show();

		eqtl_data = payload.eqtls;
		isoqtl_data = payload.isoqtls;
		ase_data = payload.ase;
		expression_data = payload.expression;

		qmapX = function(d) { return d[3]; }
		qmapY = function(d) { return -1*Math.log10(d[7]); }
		colorRed = function(d) { return '#ff0000'; }
		colorRed = function(d) { return qmapY(d) > 3.5 ? "#ff0000":'#000000';}
		sizeThem = function(d) { return 3.5; }
		onclickFunction = function(d) {
			site = d[2] + ":" + d[3]
			console.log("Site selected: " + site);
			fetch_genotypes(site);
		}

		chromosome = eqtl_data[0][2];

		eqtls_plot = new ScatterPlot("#eqtls_plot_container", eqtl_data, {title:'Expression QTLs for ' + query,width:800,height: 280, extractX:qmapX, extractY:qmapY, extractRadius:sizeThem, xLabel:"chromosome " + chromosome, yLabel:"-log10 [p-value]", onclick:onclickFunction})
		isoqtls_plot = new ScatterPlot("#isoqtls_plot_container", isoqtl_data, {title:'Isoform QTLs for ' + query,width:800,height: 280, extractX:qmapX, extractY:qmapY, extractRadius:sizeThem, xLabel:"chromosome " + chromosome, yLabel:"-log10 [p-value]", onclick:onclickFunction})
		eqtls_plot.registerListener(isoqtls_plot);
		isoqtls_plot.registerListener(eqtls_plot);
	});
}

fetch_genotypes = function(site) {
	spinner = new Spinner(spinnerOpts).spin(document.getElementById('ase_plot_container'))
	d3.json('/genotypes/'+site, function(error, payload) {
		genotype_data = payload;
		spinner.stop()
		
		

		var pdata = Object.keys(expression_data).map(function(x) {
			return {genotype:genotype_data[x],expression:expression_data[x]}
		}).filter(function(x) { return typeof x.genotype != 'undefined'; });

		mapX = function(d) { return d.genotype }
		mapY = function(d) { return d.expression }

		eqtl_plot = new QTLPlot("#eqtl_plot_container", pdata, {width: 300, height:280, yLabel:'Expression (Z)', xLabel:'Genotype @ ' + site, extractX:mapX, extractY:mapY})

		var pdata = Object.keys(ase_data).map(function(x) {	
			return Object.keys(ase_data[x]).map(function(y) { 
				return {sampleID:y, genotype:genotype_data[y], ase:ase_data[x][y]}; 
			}) }).reduce(function(a, b) {
		  return a.concat(b);
		}, []);

		mapX = function(d) { return d.genotype }
		mapY = function(d) { return d.ase }

		ase_plot = new QTLPlot("#ase_plot_container", pdata, {width: 300, height:280, yLabel:'Allelic Imbalance', xLabel:'Genotype @ ' + site, extractX:mapX, extractY:mapY, forceRange:[0,.5]})


	});
}

render_search_results = function(payload) {
	$("#content").html(payload.message + "<br/><br/>");
	data = zip(payload.ensembl_gene_ids, payload.symbols)
	d3.select('#content').selectAll('li').data(data).enter().append('li').html(function(x) { return "<a href='javascript:fetch(\""+x[0]+"\")'>" + x[1] + "</a> (" + x[0] + ")"; });
}

render_error_message = function(message) {
	$("#content").html("<div class='alert alert-danger'><strong>Oops!</strong>&nbsp;"+message+"</div>")
}

destroy_plots = function() {
	d3.select('#eqtls_plot_container').selectAll('*').remove();
	d3.select('#isoqtls_plot_container').selectAll('*').remove();
	d3.select('#eqtl_plot_container').selectAll('*').remove();
	d3.select('#ase_plot_container').selectAll('*').remove();
}

zip = function() {
    var args = [].slice.call(arguments);
    var shortest = args.length==0 ? [] : args.reduce(function(a,b){
        return a.length<b.length ? a : b
    });

    return shortest.map(function(_,i){
        return args.map(function(array){return array[i]})
    });
}