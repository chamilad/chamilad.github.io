---
layout: post
title: "Apache Stratos Cartridge Agent: Instance Configuration by Puppet 1"
date: 2015-03-17 05:43:48 +0530
comments: true
categories: [Apache Stratos, Cartridge Agent]
author: Chamila de Alwis
---

>This is a part of a series of articles on Apache Stratos Cartridge Agent. If you feel like you've missed the memo, why not start from the [first article](http://code.chamiladealwis.com/blog/2015/03/17/apache-stratos-cartridge-agent-contract/)?

# Instance Configuration
When an application is deployed in Apache Stratos, what happens is that for each cartridge in the application, an instance creation call is made to the configured IaaS via the Cloud Controller component. This call contains only the base image ID (in OpenStack this is an image UUID, in Amazon EC2 this is an AMI), the instance creation parameters like the instance flavor, security group etc and the payload of Stratos related information that is targeted to that particular instance. So how does the actual configuration of a spawned Virtual Machine happen? (We will discuss the exciting Kubernetes + Docker work flow separately)

The answer, my friend, is _dancing_ in the wind, like a puppet. 

Yes, with that bad pun sentence thingy, I've introduced you to Puppet, the tool which configures each and every instance spawned by Stratos.

## Puppeteering: A brief introduction
Simply said, Puppet automates the configuration details of a machine to bring it to an intended state. Let's take a scenario where you have to configure and start a LAMP stack on a single machine. Without Puppet you will be doing the following tasks manually.

1. Update the package management system and install util packages
2. Install and configure HTTPD
3. Install PHP and configure with HTTPD
4. Install and configure MySQL
5. A precautionary HTTPD restart

With Puppet, you will be defining all these steps in a manifest file, using Puppet's Ruby based DSL. Nope, that is not what a Puppet manifest contains. What you will be actually defining in a Puppet manifest will be the intended state of the machine. For example, you will be defining a list of packages that should be present (or not), the lines of configuration a certain file should have, and the list of services that should be running (or not), in the configured machine ("What's difference" you ask? Well, the difference is that, for example, Puppet wouldn't try to execute an install action on a package that is already there in the system).

You can apply this Puppet manifest in the target machine and the Puppet agent will make sure each state is changed to the intended state, and at the end of the Puppet run (if you wrote the manifest correctly) a LAMP stack will be ready for you. 

A Puppet setup consists of a server-client architecture. The Puppet server is called (surprisingly) the `Puppet Master`, and the client is the `Puppet agent`. You can add Puppet _modules_ for each service (modularizing services is arbitrary, you can break your configuration in to modules at any level), to the Puppet master, then add the machines which needs to be configured (each of these machines should have Puppet agent installed), define nodes (ex: LAMP, database, LAP etc) and classify each machine to the nodes. Upon classification, the modules defined by each node will be applied by the Puppet agent in the target machines. 

In our little example, we can have different Puppet modules for HTTPD, PHP, and MySQL, and then define node types for LAMP (which uses all three modules), Database (which only uses the MySQL module) and LAP (which uses only the HTTPD and the PHP modules). As you'd probably start to see, modules and nodes are a reuse strategy. 

## Puppet in Stratos
The intended Puppet strategy in Stratos is to define each cartridge as a Puppet node definition. For the PHP cartridge there will be a PHP Puppet node definition in the Puppet master. In turn, each node definition should be an aggregate of the following Puppet modules (ex: PHP).

* stratos_base - Installs common utility packages needed by every cartridge
* service module - PHP
* cartridge_agent - Python or Java Agent (and Java module if Java agent is used)

The PHP node definition should have something like the following that defines in which order these modules should be applied. 

```puppet
Class['stratos_base']->Class['php']->Class['python_agent']
# or if we are using the Java implementation of the Cartridge Agent
Class['stratos_base']->Class['php']->Class['java']->Class['agent']
```

To state the almost obvious, this Puppet directive states that the Puppet classes (which are *in no way* associated with the classes in OOP) `stratos_base`, `php`, (`java`, `agent`) | (`python_agent`) should be applied one after the other, or `python_agent` depends on `php` module, and `php` depends on `stratos_base` module. Apache Stratos ships a standard set of Puppet modules related to a various set of cartridge types, which are supported out of the box. 

All of this aside, how does Puppet master know which node definition to be applied to which instance? Unlike the usual work flow where a listed machine is classified manually from the Puppet master web interface, this is done automatically in Stratos. To understand this classification, we need to understand how the initialization of an instance happens when it is spawned in the IaaS.

# Base Images and init scripts
As I've mentioned earlier, when spawning an instance from the IaaS, Stratos specifies a _base image_ to spawn that particular instance from. Where does this base image come from? As a Stratos *user* you will most likely not be working with cartridge definitions and base images. However as a *sysadmin* working with a Stratos deployment you will be defining various cartridge types, their Puppet modules, and the base images to spawn these cartridge instances. 

A base image is, simply said, an initial state of a Virtual machine, from where the execution can start. There can be a base image which only contains the Operating System, or there can be a base image which has gone a little bit further and installed a few of the services as well. It's a like a VM snapshot you take on VirtualBox, a starting point with a certain set of work already done, that otherwise need to be done to spawn a working instance. At most this should contain an Operating System. A Stratos Cartridge base image should have more, to be precise the following, to be a minimal (or as it is called in Stratos, a _default_) base image.

1. Operating system 
2. Utility packages (zip, unzip, etc)
3. Puppet agent
4. A Stratos init script

Others being self explanatory, an init script is simply a bash script which is copied in to the `/root/bin` folder [at the time of the creation of the base image](https://cwiki.apache.org/confluence/display/STRATOS/4.1.0+Creating+a+Cartridge+on+OpenStack). This script is then automatically executed when the instance is started. An init script's tasks should be the following in the stated order, in the context of a Stratos cartridge instance.

1. Retrieve payload parameters related to the spawned instance from the IaaS meta-data service ([in OpenStack](http://docs.openstack.org/admin-guide-cloud/content/section_metadata-service.html))
2. Parse payload parameters and set configuration values in the instance. 
3. Include service name (ex: php, tomcat i.e. the cartridge type) and the Puppet master host name, in the instance host name. (Yes, this is what we should look at to understand the communication between the Puppet agent and the master in Stratos)
4. Execute Puppet agent

The Puppet agent will apply the retrieved catalogs from the Puppet master and start the Cartridge Agent. 

## Payload Parameters
Ever IaaS has a meta-data service where instance specific data can be written to it to be queried by the instance. For an example, in OpenStack this service can be accessed by making a `wget` call to `http://169.254.169.254/latest/user-data` URL. When Stratos makes a instance spawn call to the IaaS (via JClouds library), it passes a set of payload parameters that are specific to the instance. This payload looks something like the following.

```
SERVICE_NAME         =php
HOST_NAME            =newoice.stratos.com
MULTITENANT          =false
TENANT_ID            =-1234
TENANT_RANGE         =-1234
CARTRIDGE_ALIAS      =newoice
CLUSTER_ID           =newoice.php.domain
CARTRIDGE_KEY        =BNdP01v8VEQPPYGY
DEPLOYMENT           =default
REPO_URL             =https://github.com/chamilad/NeWoice.git
PORTS                =80
PUPPET_IP            =192.133.10.53
PUPPET_HOSTNAME      =puppet.chamilad.org
COMMIT_ENABLED       =false
MEMBER_ID            =newoice.php.domain192a96cd-844e-4dca-a829-a63664d29724
LB_CLUSTER_ID        =null
NETWORK_PARTITION_ID =openstack1
PARTITION_ID         =p1
```

Now, the main fields to notice here are the `SERVICE_NAME`, `DEPLOYMENT` `PUPPET_IP`, and `PUPPET_HOSTNAME`. Why are they important? Because they are the main

## Configuration Values

(See what I did there? *nudge nudge* ..aaaanyways) The init script makes use of (mainly) these values to formulate the hostname of the newly spawned instance. It will be of format `{random_number}.DEPLOYMENT.SERVICE_NAME.PUPPET_HOSTNAME`. For example the instance hostname resulting from the above payload would look like something as follows.

```
2324332342243.default.php.puppet.chamilad.org
```

Why is the Puppet master hostname suffixed to the instance hostname? That is because of the way Puppet master and the agent communicates. 

For the secure communication between the Puppet agent and the master, a certificate is generated and signed by the Puppet master's in built Certificate Authority. Likewise, the client should also provide a signed certificate to prove its identity. At the initial moment when the connection between agent and the master establishes, the agent creates a certificate request and provide to the master. In Stratos Puppet master, a feature has been enabled, called AutoSign, which automatically signs and approves the certificate requests as long as their domain names is suffixed with Puppet master hostname. You can check this configuration, and change it even, at the `/etc/puppet/autosign.conf` file. If you change it, just keep in mind that the functionality of the init script will also have to be changed to let the agent certificate requests be signed automatically. 

Okay. Now I've forgotten what we were trying to understand by going this much deep in the code. Ah! Here it is! _"How does the Puppet master automatically classify nodes to different Cartridge types?"_

Look at our sample hostname of the spawned PHP instance. Just before suffixing the Puppet master hostname, the Service name of the Cartridge is suffixed. So this hostname String will match the regex pattern of `/php/`. And that is what exactly happens at the Puppet master side. Each node, being a service type, is matched with a regular expression in the hostname of the Puppet agent. If you look at the different node definitions inside `/etc/puppet/manifests/nodes/` folder in the Stratos Puppet master, you will see that each node definition maps to a service type. For example the node definition of the PHP service looks something like the following.

```puppet
node /php/ inherits base {

  $docroot = "/var/www/www"
  $syslog="/var/log/apache2/error.log"
  $samlalias="/var/www/"

  class {'php':}
}
```

Notice the node name being a regex? (The parent node, `base` defines a set of common variables that are useful to all or multiple Puppet modules, such as the Message Broker URL, Java distribution name etc). That is what gets matched to the Puppet agent certificate's hostname. 

Now that we have an overall understanding of the Puppet context in Stratos let's take a look at how Puppet configures and starts the services in a spawned instance.... in the next article!
