from flask import *
import json
from backend import API

###
###
###

api = API()
app = Flask(__name__)

###
###
###

@app.route('/')
def index():
	return render_template('view_template.html')

@app.route('/about')
def about():
	return render_template('about_template.html')

@app.route('/search/<query>')
def search(query):
	results = api.search(query)
	return json.dumps(results)

@app.route('/search/')
def blank_search():
	return search('')

@app.route('/fetch/<ensembl_gene_id>')
def fetch(ensembl_gene_id):
	payload = api.fetch(ensembl_gene_id)
	return json.dumps(payload)

@app.route('/eqtls/<ensembl_gene_id>')
def fetch_eqtls(ensembl_gene_id):
	payload = api.get_eqtls(ensembl_gene_id)
	return json.dumps(payload)

@app.route('/isoqtls/<ensembl_gene_id>')
def fetch_isoqtls(ensembl_gene_id):
	payload = api.get_isoqtls(ensembl_gene_id)
	return json.dumps(payload)

@app.route('/genotypes/<site>')
def fetch_genotypes(site):
	payload = api.get_genotypes(site)
	return json.dumps(payload)

@app.route('/expression/<ensembl_gene_id>')
def fetch_expression(ensembl_gene_id):
	payload = api.get_expression(ensembl_gene_id)
	return json.dumps(payload)

@app.route('/ase/<ensembl_gene_id>')
def fetch_ase(ensembl_gene_id):
	payload = api.get_ase(ensembl_gene_id)
	return json.dumps(payload)

###
###
###

if __name__ == "__main__":

	host = '127.0.0.1'
	port = 5001
	use_debugger = True
	use_reloader = True

	app.run(host=host, port=port, debug=use_debugger, use_reloader=use_reloader)