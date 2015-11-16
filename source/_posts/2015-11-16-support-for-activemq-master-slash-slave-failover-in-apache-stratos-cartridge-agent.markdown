---
layout: post
title: "Support for ActiveMQ Master/Slave failover in Apache Stratos Cartridge Agent"
date: 2015-11-16 20:20:07 +0530
comments: true
categories: [Apache Stratos, Apache ActiveMQ]
published: true
---

In Apache Stratos the message broker is a crucial point of operation upon which all components depend on. Recent Stratos releases included fixes to [secure the message broker communication](http://code.chamiladealwis.com/blog/2015/10/11/secure-message-broker-communication-in-apache-stratos/). The upcoming 4.1.5 release will contain a missing improvement for the Python Cartridge Agent related to message broker communication. 

ActiveMQ supports [various types of clustering patterns](http://activemq.apache.org/clustering.html). Out of these, [Master/Slave](http://activemq.apache.org/masterslave.html) is a deployment pattern where the message store is replicated or shared between the clustered brokers. This makes it possible for a client to failover from the `master` to the `slave` in case the master broker goes down, and continue the communication without any data loss. 

Earlier, the Cartridge Agent implementation was in Java and the ActiveMQ client used in Apache Stratos allowed the failover transport to be used right out of the box, by using the `failover` transport in the JNDI configuration.

```properties
connectionfactoryName=TopicConnectionFactory
java.naming.provider.url=failover:(tcp://localhost:61617,tcp://localhost:61618,tcp://localhost:61619)?initialReconnectDelay=100
java.naming.factory.initial=org.apache.activemq.jndi.ActiveMQInitialContextFactory
```

However when the Python implementation of the Cartridge Agent was done this support was not implemented initially. Therefore, it was only possible for Python Cartridge Agent to connect to only one given message broker making it a possible point of failure.

However the upcoming 4.1.5 release contains the fix for the Python Cartridge Agent which enables it to accept a list of message brokers. This is provided via the `agent.conf` configuration file as follows.

```ini
[agent]
mb.urls                               =localhost:1885,localhost:1886,localhost:1887
mb.username                           =system
mb.password                           =manager
mb.publisher.timeout                  =900
```

The crucial change is from `mb.username` and `mb.password` to `mb.urls`. This will be a comma separated list of host:port values of the available broker list. 

When communicating with the message broker, the Python Cartridge Agent will go through the provided URL list and connect to the first broker that is available. 

The listening subscriber client will always make an effort to keep a connection to one of the brokers. i.e. if the connected broker goes down (the Python Cartridge Agent will periodically check if the connected message broker is in fact alive or not), it will go through the message broker list and select the first available broker. If none of the provided message brokers are online, the subscribing client will keep retrying until one broker becomes available. This logic will separately execute for each topic subscription.

The publishing client will publish the events to the first broker available. If none of the brokers are available it will keep retrying to publish the event, until the provided `mb.publisher.timeout` value is exceeded. The default value for this is 15 minutes. After that timeout, if the event is still unpublished, it will be dropped, and life moves on. 

Notice that it will be possible for the events to be published to one broker and intended consumers to be connected to another. However, if the Master/Slave deployment is done correctly data sharing happens without an issue and this situation shouldn't be of any concern. 

