---
layout: post
title: "Configuring Apache Stratos Python Cartridge Agent"
date: 2014-12-10 14:47:13 +0530
comments: true
categories:
published: false
---

#Introduction

#Working with the Python Cartridge Agent

##Building
###Checkout source
The Python cartridge agent source is in `components/org.apache.stratos.python.cartridge.agent` folder. The structure of the folder is as follows.

```
├── cartridgeagent
│   ├── cartridgeagent
│   │   └── modules
│   └── tests
```

`org.apache.stratos.python.cartridge.agent/cartridgeagent/cartridgeagent` contains the source of the agent while `org.apache.stratos.python.cartridge.agent/cartridgeagent/tests` contains the unit tests.

To get the deployable cartridge agent zip file, build the Stratos project. You can find the assembled zip file inside `products/python-cartridge-agent/target` as `apache-stratos-python-cartridge-agent-4.1.0-SNAPSHOT.zip`.

```bash
git clone https://github.com/apache/stratos.git
cd stratos
mvn clean install
ls -l products/python-cartridge-agent/target
```

##Configuration
The Python cartridge agent is configured by the configuration file at `<AGENT_HOME>/agent.conf`. From this file, the parameters like the message broker details, thrift receiver details, monitoring server details etc can be configured. In the case of VM's Puppet will handle setting the values in this file, while in the Kubernete's based container scenario, the Docker entrypoint script will handle setting values.

The agent also persist the payload parameters, similar to how the Java agent worked. At the agent initialization, it will read both these files, and will offer these values to the modules, as necessary.

Additionally the logging parameters can be configured via `<AGENT_HOME>/logging.ini` file.

##Log files
The log files associated with the agent are located at the `<AGENT_HOME>/`. `<AGENT_HOME>/agent.log` is the standard log file, while `<AGENT_HOME>/error.log` contains all the `ERROR` level logs, which would come handy when the `agent.log` is filled with a large number of `DEBUG` log entries. Additionally, `/tmp/agent.screen.log` file contains all the output by the agent Python process's stdout, which can help in certain situations where agent.log fails to include process related output.

#Including the Python Cartridge Agent
The configuration options for the Python agent are as follows.

* mb.ip                                 =
* mb.port                               =
* listen.address                        =
* thrift.receiver.ip                    =
* thrift.receiver.port                  =
* thrift.server.admin.username          =
* thrift.server.admin.password          =
* cep.stats.publisher.enabled           =
* lb.private.ip                         =
* lb.public.ip                          =
* enable.artifact.update                =
* auto.commit                           =
* auto.checkout                         =
* artifact.update.interval              =
* port.check.timeout                    =
* enable.data.publisher                 =
* monitoring.server.ip                  =
* monitoring.server.port                =
* monitoring.server.secure.port         =
* monitoring.server.admin.username      =
* monitoring.server.admin.password      =
* log.file.paths                        =
* super.tenant.repository.path          =/repository/deployment/server/
* tenant.repository.path                =/repository/tenants/
* extension.instance.started            =instance-started.sh
* extension.start.servers               =start-servers.sh
* extension.instance.activated          =instance-activated.sh
* extension.artifacts.updated           =artifacts-updated.sh
* extension.clean                       =clean.sh
* extension.mount.volumes               =mount_volumes.sh
* extension.member.started              =member-started.sh
* extension.member.activated            =member-activated.sh
* extension.member.suspended            =member-suspended.sh
* extension.member.terminated           =member-terminated.sh
* extension.complete.topology           =complete-topology.sh
* extension.complete.tenant             =complete-tenant.sh
* extension.subscription.domain.added   =subscription-domain-added.sh
* extension.subscription.domain.removed =subscription-domain-removed.sh
* extension.artifacts.copy              =artifacts-copy.sh
* extension.tenant.subscribed           =tenant-subscribed.sh
* extension.tenant.unsubscribed         =tenant-unsubscribed.sh

This is basically the content in the `agent.conf` file. Values for the parameters that have no default value should be provided by the calling party, since the cartridge agent will not start otherwise.

##Creating a Docker image

A sample Dockerfile can be found at [PHP Stratos Docker image](https://github.com/chamilad/stratos-container-image-php/blob/master/Dockerfile). The approach in the Dockerfile is to install the needed service (PHP|MySQL|Tomcat etc) and then add the Cartridge agent to the image. The entrypoint script is the [run script file](https://github.com/chamilad/stratos-container-image-php/blob/master/run) which sets the values provided for the configurable parameters as environment variables and start the Python process.  Additionally, run script will also persist the payload parameters at `<AGENT_HOME>/payload/launch.params` file.

Stratos will provide these values via Kubernetes, using the values provided via the [application definition JSON](https://cwiki.apache.org/confluence/display/STRATOS/4.1.0-M4+Testing+Grouping+with+Docker+Support#id-4.1.0-M4TestingGroupingwithDockerSupport-Deployinganapplicationdefinition).

> Please note that this example Dockerfile is not recommended as production ready. Using SSHD for Docker containers is [strongly discouraged](http://jpetazzo.github.io/2014/06/23/docker-ssh-considered-evil/).

###Building

Checkout the Dockerfile content. Build Stratos and copy the agent zip file from the products/ folder in to the packs folder. Build the Docker image.

```bash
# checkout
git clone https://github.com/chamilad/stratos-container-image-php.git
cd stratos-container-image-php
# copy the agent zip file
cp <STRATOS_HOME>/products/python-cartridge-agent/target/apache-stratos-python-cartridge-agent-4.1.0-SNAPSHOT.zip packs/
# build the docker image
sudo docker build -t chamilad/stratos-php:4.1.0-alpha .
# verify the built image
sudo docker images
```

##Puppet module configurations

To set the values for the agent configuration, the `base.pp` file at `/etc/puppet/manifests/nodes/` can be used. The Puppet module for the Python cartridge agent will configure the cartridge agent accordingly using the provided values.

The use of the Java agent is dropped from `4.1.0-m4` developer release onwards.

#Further information

Please find the Hangout done on Python Cartridge Agent [here](https://plus.google.com/events/c0rvi4fmeeloaa76np3cgnqpa84) which contains further details on troubleshooting and cartridge agent functionality.