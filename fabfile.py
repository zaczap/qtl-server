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
	sudo("cp -f {0}/config/{1} /etc/nginx/sites-available/{1} && ln -fs /etc/nginx/sites-available/{1} /etc/nginx/sites-enabled/{1}".format(config['project_dir'], config['nginx_conf']))
	sudo("cp -f {0}/config/{1} /etc/supervisor/conf.d/{1} ".format(config['project_dir'], config['supervisor_conf']))
	sudo("supervisorctl reread && supervisorctl update")
	sudo("/etc/init.d/nginx restart && supervisorctl restart {0}".format(config['application']))

def push_local_repo():
	pass
