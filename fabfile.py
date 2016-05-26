from __future__ import with_statement
from fabric.api import *
from fabric.contrib import files
from fabric.contrib.console import confirm
from datetime import datetime
import json

secrets = json.load(open("secrets.json"))
config = json.load(open("config.json"))

env.use_ssh_config = True
env.user = secrets['user']
env.hosts = secrets['hosts']

def deploy():

	#push_local_repo()

	now = str(datetime.now())
	print "Deploying @ {0}".format(now)
	### Does git repo exist?
	gitRepoExists = files.exists(config['project_dir'])
	if not gitRepoExists:
		run("git clone {0} {1}".format(config['repository'], config['project_dir']))
	with cd(config['project_dir']):
		run("git pull origin master")

	restart()

def restart():
	sudo("/etc/init.d/nginx restart && supervisorctl restart {0}".format(config['application']))

def push_local_repo():
	pass
