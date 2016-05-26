import pysam
import vcf
import pandas as pd
from collections import namedtuple
import numpy as np
import sys
import requests
import requests_cache
import pybedtools
import json

###
###
###

config = json.load(open("config.json"))

project_dir = config['project_dir']
eqtl_window = 1000000
requests_cache.install_cache('rsid_cache', backend='sqlite', expire_after=1000)

###
###
###

class SymbolMap:

	def __init__(self, tested_ids):

		self.id2symbol = {}
		self.symbol2id = {}

		path = '{0}/data/geneID_to_symbol.txt'.format(project_dir)

		with open(path) as inputfile:
			for line in inputfile:
				geneID, biotype, symbol = line.strip().split('\t')
				if geneID in tested_ids:
					self.id2symbol[geneID] = symbol
					self.symbol2id[symbol] = geneID

	def lookup(self, name):
		if name not in self.id2symbol and name not in self.symbol2id:
			return None
		if name.startswith("ENSG"):
			return self.id2symbol[name]
		return self.symbol2id[name]


class Annotations:

	def __init__(self, tested_ids):
		
		self.catalog = {}

		path = '{0}/data/ensembl_gene_annotation.txt'.format(project_dir)
		with open(path) as inputfile:
			for line in inputfile:
				geneID, chrom, strand, tss, tes = line.strip().split('\t')
				if geneID in tested_ids:
					self.catalog[geneID] = (chrom, strand, int(tss), int(tes))

	def chrom(self, geneID):
		return self.catalog[geneID][0]

	def strand(self, geneID):
		return self.catalog[geneID][1]

	def tss(self, geneID):
		return self.catalog[geneID][2]

	def tes(self, geneID):
		return self.catalog[geneID][3]

class API:

	def search(self, query):
		QUERY = query.upper()

		### Do we have an exact match?
		if maps.lookup(QUERY) != None:
			if QUERY.startswith("ENSG"):
				symbol, geneID = maps.lookup(QUERY), QUERY
			else:
				geneID, symbol  = maps.lookup(QUERY), QUERY
			return {'response':'search', 'ensembl_gene_ids': [geneID], 'symbols': [symbol], 'query':query}
		elif QUERY.startswith("RS"):
			snpLookup = self.lookup_rsID(query)
			if snpLookup == ('error', -1):
				return {'response':'search', 'ensembl_gene_ids': [], 'symbols':[], 'query':query, 'message':"There were no results for your query: <strong>" + query + "</strong>"}
			else:
				search_results = self.find_nearby_genes(snpLookup[0], snpLookup[1])
				geneIDs = [x[0] for x in search_results]
				symbols = [x[1] for x in search_results]
				return {'response':'search', 'ensembl_gene_ids': geneIDs, 'symbols': symbols, 'query':query, 'message': 'There were <span class="badge">'+str(len(geneIDs))+'</span> genes found for your query: <strong>' + query + "</strong>"}	
		elif ':' in QUERY:
			snpLookup = self.parse_genomic_coordinate(query.lower()) # there is no error checking here currently
			search_results = self.find_nearby_genes(snpLookup[0], snpLookup[1])
			geneIDs = [x[0] for x in search_results]
			symbols = [x[1] for x in search_results]
			return {'response':'search', 'ensembl_gene_ids': geneIDs, 'symbols': symbols, 'query':query, 'message': 'There were <span class="badge">'+str(len(geneIDs))+'</span> genes found for your query: <strong>' + query + "</strong>"}	
		else:
			return {'response':'search', 'ensembl_gene_ids': [], 'symbols':[], 'query':query, 'message':"There were no results for your query: <strong>" + query + "</strong>"}

	def lookup_rsID(self, rsID, url="http://grch37.rest.ensembl.org/variation/human/{0}?"):
		query = url.format(rsID)
		r = requests.get(query, headers={ "Content-Type" : "application/json"})
		if not r.ok:
			return ('error', -1)
		else:
			decoded = dict(r.json())
			chromosome = decoded[u'mappings'][0][u'seq_region_name']
			position = int(decoded[u'mappings'][0][u'end'])
			chromosome = '{0}'.format(chromosome)
			return (chromosome, position)

	def find_nearby_genes(self, chromosome, position):
		query = 'chr{0} {1} {2}'.format(chromosome, position-1, position)
		searchBED = pybedtools.BedTool(query, from_string=True)
		genesBED = pybedtools.BedTool('{0}/data/gencode.v14.genes.bed'.format(project_dir))
		results = []
		for result in searchBED.window(genesBED, w=eqtl_window):
			ensembl_gene_id = result.fields[6].split('.')[0]
			if ensembl_gene_id in testedIDs:
				results.append([ensembl_gene_id, maps.lookup(ensembl_gene_id)])
		return results

	###
	###
	###

	def parse_genomic_coordinate(self, coordinate):
		chrom, pos = coordinate.split(':')
		if chrom.startswith('chr'):
			chrom = chrom[3:]
		return (str(int(chrom)), int(pos))

	def get_expression(self, gene):
		samples = [str(sample) for sample in expr.columns[1:]]
		values = np.array(expr[expr['ID'] == gene])[0][1:]
		values = list((values - values.mean())/values.std())
		return dict(zip(samples,values))

	def get_genotypes(self, site):
		sniafy = lambda x:"snia_"+x.zfill(6)
		chrom, pos = self.parse_genomic_coordinate(site)
		vcf_file = '{0}/data/vcfs/chr{1}.imputed.unphased.vcf.gz'.format(project_dir, chrom)
		vcf_reader = vcf.Reader(filename=vcf_file)
		#print >>sys.stderr, vcf_file, pos, pos+1
		genotype_data = {}
		for record in vcf_reader.fetch(chrom, pos-1, pos):#pos, pos+1):
			genotype_data = {sniafy(call.sample): call.gt_type for call in record.samples}
		return genotype_data

	def get_eqtls(self, geneID):
		QTL = namedtuple('QTL', ['type', 'trait', 'chrom','pos','ref','alt','effect','pvalue'])
		tss = anno.tss(geneID)
		chrom = anno.chrom(geneID)
		start = tss - eqtl_window
		end = tss + eqtl_window
		region = '{0}:{1}-{2}'.format(chrom, start, end)
		path = '{0}/data/eqtls.tsv.gz'.format(project_dir)
		inputfile = pysam.Tabixfile(path)
		
		associations = []
		for line in inputfile.fetch(region):
			if geneID not in line: continue
			chrom, snpPos, snpId, ref, alt, digits, trait, traitChrom, traitTSS, effect, sDigits, se, fakeHeritability, lod, pvalue = line.strip().split('\t') 
			associations.append(QTL('eQTL', geneID, chrom, int(snpPos), ref, alt, float(effect), float(pvalue)))

		return associations

	def get_isoqtls(self, geneID):
		QTL = namedtuple('QTL', ['type', 'trait', 'chrom','pos','ref','alt','effect','pvalue'])
		tss = anno.tss(geneID)
		chrom = anno.chrom(geneID)
		start = tss - eqtl_window
		end = tss + eqtl_window
		region = '{0}:{1}-{2}'.format(chrom, start, end)
		path = '{0}/data/isoqtls.tsv.gz'.format(project_dir)
		inputfile = pysam.Tabixfile(path)
		
		associations = []
		for line in inputfile.fetch(region):
			if geneID not in line: continue
			chrom, snpPos, snpId, ref, alt, digits, trait, traitChrom, traitTSS, effect, sDigits, se, fakeHeritability, lod, pvalue = line.strip().split('\t') 
			transcript = trait.split('___')[1]
			transcript = transcript[:transcript.index('.')]
			associations.append(QTL('isoQTL', '{0}:{1}'.format(geneID,transcript), chrom, int(snpPos), ref, alt, float(effect), float(pvalue)))

		return associations

	def get_ase(self, geneID):
		chrom = anno.chrom(geneID)
		start = anno.tss(geneID)
		end = anno.tes(geneID)
		if start > end: start, end = end, start
		region = '{0}:{1}-{2}'.format(chrom, start, end)
		path = '{0}/data/SRD.filtered.sorted.ase.exonic.CORRECTED.bed.gz'.format(project_dir)
		inputfile = pysam.Tabixfile(path)

		print region

		asedata = {}
		try:
			for line in inputfile.fetch(region):
				#print line.strip()
				_, pos0, pos1, data = line.strip().split('\t')
				pos1 = int(pos1)
				ref, alt, sampleID, depth, refCount, altCount = data.split(':')
				depth, refCount, altCount = int(depth), int(refCount), int(altCount)
				if pos1 not in asedata:
					asedata[pos1] = {}
				asedata[pos1][sampleID] = abs(float(refCount)/float(depth) - .5) #[refCount, altCount]
		except ValueError:
			# No ASE data for gene body
			pass
		return asedata

	def fetch(self, geneID):
		eqtls = self.get_eqtls(geneID)
		isoqtls = self.get_isoqtls(geneID)
		asedata = self.get_ase(geneID)
		expression = self.get_expression(geneID)
		return {'eqtls':eqtls, 'isoqtls':isoqtls, 'ase':asedata, 'expression':expression}

	###
	###
	###

expr = pd.read_table('{0}/data/residuals.clean.txt'.format(project_dir))
testedIDs = list(expr['ID'])
testedIDs = dict(zip(testedIDs, testedIDs))
anno = Annotations(testedIDs)
maps = SymbolMap(testedIDs)
