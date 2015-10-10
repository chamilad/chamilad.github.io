---
layout: post
title: "Apache Stratos Cartridge Agent: Day 0"
date: 2015-03-17 04:25:03 +0530
comments: true
categories: [Apache Stratos, Cartridge Agent]
author: Chamila de Alwis
---

As the first post of a series of comprehensive guide to the Apache Stratos Cartridge Agent, let's look at the Cartridge Agent contract. Keep tuned in and expect more detailed explanations on the instance and Cartridge Agent configuration, workflow, different Cartridge Agent implementations, their configurations and newly introduced plugin system in the Python implementation.

# Role of the Cartridge Agent

When the instances are spawned in Apache Stratos, there are a few requirements that the particular instance should fulfill. It should

1. Listen to the message broker events that are intended to it and publish events notifying any listening parties of its current state (STARTED|ACTIVATED|MAINTENANCE_MODE etc)
2. Check if the intended ports of the instance are active or not and publish the status accordingly
3. Periodically check the health statistics of the instance and publish them to an expecting [Thrift compatible](http://code.chamiladealwis.com/blog/2014/10/10/thrift-communication-in-apache-stratos/) Complex Event Processor
4. Clone from and constantly update an artifact repository if specified 

It's obvious that there should be an independent common component in each instance that fulfills these requests. And just like that, we've stated the case for the cartridge agent.

## Message broker communication 

Apache Stratos has a loosely-coupled component structure which executes the major communication bulk over a message broker. This enables any new component to join the chit-chat without disrupting the ongoing communication or without any impact on the configuration of the existing components. Any component can go silent and it wouldn't affect the communication channel. The communication happens via message broker _Events_ and _Topics_ in the common communication channel. Therefore each component should only be aware of the location (and sometimes the credentials) of the common communication channel, the message broker. 

The Cartridge Agent connects to the message broker, publishes its initial status and listens to the _topics_ for any events that are important to it. We'll see what these events are and what their impact would be on the work flow of the agent in the walk through section.

## Ports activity check

For each cartridge, a set of ports are defined in the cartridge definition. The intended services should run on these ports. The agent should determine if a the intended service is up or not before it can announce that it is ready to accept requests. It does so by checking if the specified ports are active or not. 

## Health statistics publishing

The Cloud is about Scale, and Scale is about Health. Apache Stratos auto-scaling feature takes care of the complex scaling requirements of the deployed services based on a number of parameters, on a number of levels. From the point of the instance, its contribution to the scaling effort should be to announce its health status to the decision making process. 

The agent does this by collecting the memory usage and the load average values of the running instance and publishing them to a real time Complex Event Processor via Apache Thrift protocol. (Why doesn't it use the broker channel? Well, it's too darn slow to begin with for a real time event to be _real time_. Hammer and the problem anyone?) It does this periodically, usually every 15 seconds. If an instance stops publishing health stats events and stays dark for more than 60 seconds, the Complex Event Processor considers that instance to be a hopeless case and announces that an instance has gone dark. The auto-scaler, upon receiving this announcement (an _Event_ published on a _topic_ as you might have guessed), issues orders to terminate the faulty instance and spawn a new instance to take the place of the fallen comrade. 

## Artifacts Distribution

Most cartridge types deal with a set of artifacts that are hosted on a remote repository, that should be copied over to the instance and executed on. For an example a PHP cartridge will require a remote repository location to copy the web artifacts from. It is the Cartridge Agent that performs this artifact management task. In addition to cloning from the remote repository, there are cases where the locally modified artifacts should be pushed to the remote repository. This is also carried out by the Cartridge Agent. 

It is the responsibility of the Cartridge Agent to manage all the tasks and make sure the instance goes through its intended life cycle. But, who configures and starts the Cartridge Agent? Keeping aside the philosophical overtone of that question, let's take a look at the instance configuration process in the next article before diving in to the Cartridge Agent life cycle itself. 

