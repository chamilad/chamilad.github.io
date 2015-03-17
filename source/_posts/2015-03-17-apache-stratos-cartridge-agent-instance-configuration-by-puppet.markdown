---
layout: post
title: "Apache Stratos Cartridge Agent: Instance Configuration by Puppet"
date: 2015-03-17 05:43:48 +0530
comments: true
categories: 
published: false
---


# A Walk-through

With the introductory knowledge on the major tasks a Cartridge Agent should fulfill, let's take a walk along a typical Cartridge Agent life cycle. For this scenario, let's take in to consideration the life cycle of a Cartridge Agent inside a PHP cartridge instance. The PHP cartridge is a single-tenant cartridge, which basically means that for each subscription (for each tenant) a new instance will be spawned. It will require to copy the web artifacts from a specified remote repository and keep running until unsubscribed.

## Configuration
Let's first start with the configuration phase of the instance. This happens outside the actual life cycle of the Cartridge Agent. 

Currently in Apache Stratos, the instance configuration is managed through Puppet modules. When each instance is started, `/root/bin/init.sh` script will be executed, which starts a Puppet agent run. The Puppet agent will retrieve the 
