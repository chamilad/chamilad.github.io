---
layout: post
title: "Creating a Simple ActiveMQ Master/Slave Setup"
date: 2015-11-17 17:11:12 +0530
comments: true
categories: [Apache ActiveMQ]
---

ActiveMQ is a high performing message broker, however if clustering is needed, it supports [a number of methods](http://activemq.apache.org/clustering.html). Out of these, the [Master/Slave](http://activemq.apache.org/masterslave.html) is a pattern where the persistence layer is shared between multiple broker instances. A Single `Master` broker connects to the persistence, and the rest of the `Slave` brokers keep waiting to attain the lock on the persistence. If the Master node goes down the lock for the persistence is released and a Slave quickly acquires it, allowing a client to continue operation without any data loss. The clients should connect to the Master/Slave setup, using the `failover:` transport, or they should implement a manual failover mechanism to automatically connect to the next available broker when the first one goes down.

```properties
connectionfactoryName=TopicConnectionFactory
java.naming.provider.url=failover:(tcp://localhost:61617,tcp://localhost:61618,tcp://localhost:61619)?initialReconnectDelay=100
java.naming.factory.initial=org.apache.activemq.jndi.ActiveMQInitialContextFactory
```

# How to Setup a Master/Slave 
Let's setup two broker instances in the same machine. The two instances will open different ports for the protocols, so there will be no conflicts. They will use the flat file based embedded KahaDB as the persistence layer and the two instances will share the KahaDB instance. 

## Creating Two Broker Instances
Unzip the ActiveMQ distribution to two places and offset port values in the second one to use different ports so that there will be no conflicts for ports used by the different protocol connectors. The places to change are in `<ACTIVEMQ_HOME>/conf/activemq.xml` and `<ACTIVEMQ_HOME>/conf/jetty.xml`. 

```xml activemq.xml
<transportConnectors>
    <!-- DOS protection, limit concurrent connections to 1000 and frame size to 100MB -->
    <transportConnector name="openwire" uri="tcp://0.0.0.0:61626?maximumConnections=1000&amp;wireFormat.maxFrameSize=104857600"/>
    <transportConnector name="amqp" uri="amqp://0.0.0.0:5682?maximumConnections=1000&amp;wireFormat.maxFrameSize=104857600"/>
    <transportConnector name="stomp" uri="stomp://0.0.0.0:61623?maximumConnections=1000&amp;wireFormat.maxFrameSize=104857600"/>
    <transportConnector name="mqtt" uri="mqtt://0.0.0.0:1893?maximumConnections=1000&amp;wireFormat.maxFrameSize=104857600"/>
    <transportConnector name="ws" uri="ws://0.0.0.0:61624?maximumConnections=1000&amp;wireFormat.maxFrameSize=104857600"/>
</transportConnectors>
```

```xml jetty.xml
<bean id="jettyPort" class="org.apache.activemq.web.WebConsolePort" init-method="start">
  <!-- the default port number for the web console -->
  <property name="host" value="0.0.0.0"/>
  <property name="port" value="8171"/>
</bean>
```

Now let's point the KahaDB persistence to the same location. This will result in only one instance at a time being able to acquire the lock to the DB and when the lock is released the other instance will be able get it from the same location. 

Modify the `persistenceAdapter` tag inside `<ACTIVEMQ_HOME>/conf/activemq.xml` as follows. 

```xml
<persistenceAdapter>
    <kahaDB directory="/tmp/mq/kahadb"/>
</persistenceAdapter>
```

Do this change for both of the instances. 

Now, let's introduce the two instances to each other by adding a `networkConnector` pointing to each other. Add the following block to the `<ACTIVEMQ_HOME>/conf/activemq.xml` after the `persistenceAdapter` block in the master.

```xml
<networkConnectors>
    <networkConnector uri="static:(tcp://localhost:61626)" />
</networkConnectors>
```

Port `61626` is the OpenWire port in the Slave instance. Similarly add the same block in the Slave `activemq.xml` file, pointing to the Master's OpenWire port. Static discovery is used here to statically point to the existing broker instances.

## Starting the instances
Now let's start the Master broker instance. 

```bash
cd <ACTIVEMQ_HOME>/bin
./activemq start
# tail the logs just for the fun of it
tail -100f ../data/activemq.log
```

When observing the logs you will see some log entries similar to the following repeatedly appearing. 

```
2015-11-17 19:10:19,731 | INFO  | Establishing network connection from vm://localhost?async=false&network=true to tcp://localhost:61626 | org.apache.activemq.network.DiscoveryNetworkConnector | ActiveMQ Task-61
2015-11-17 19:10:19,733 | INFO  | Connector vm://localhost started | org.apache.activemq.broker.TransportConnector | ActiveMQ Task-61
2015-11-17 19:10:19,736 | INFO  | localhost Shutting down | org.apache.activemq.network.DemandForwardingBridgeSupport | ActiveMQ BrokerService[localhost] Task-134
2015-11-17 19:10:19,738 | INFO  | localhost bridge to Unknown stopped | org.apache.activemq.network.DemandForwardingBridgeSupport | ActiveMQ BrokerService[localhost] Task-134
2015-11-17 19:10:19,739 | INFO  | Connector vm://localhost stopped | org.apache.activemq.broker.TransportConnector | ActiveMQ Task-61
2015-11-17 19:10:19,741 | WARN  | Could not start network bridge between: vm://localhost?async=false&network=true and: tcp://localhost:61626 due to: Connection refused | org.apache.activemq.network.DiscoveryNetworkConnector | ActiveMQ Task-61

```

This is because we "introduced" the Slave broker to the Master broker and now it's looking for it. 

Now start the Slave broker and tail the logs. You will see a different set of logs appearing. 

```
2015-11-17 18:34:37,359 | INFO  | Database /tmp/mq/kahadb/lock is locked... waiting 10 seconds for the database to be unlocked. Reason: java.io.IOException: File '/tmp/mq/kahadb/lock' could not be locked. | org.apache.activemq.store.SharedFileLocker | main

```

This is because the lock for the shared DB is already acquired by the Master broker. The Slave broker will not start until it is able to acquire the log for the DB. If you try to see which ports are open using the `netstat` command you will see that only the Master broker is up and running and ready to accept requests. 

Now if you connect to the broker setup using the `failover:` transport you will see that the client connected the Master broker. Create a queue and publish an event to the queue without consuming it. Now stop the Master broker. You will see the Slave broker acquiring the lock to the DB and become ready to accept requests. Start a consumer with the `failover` transport and observe it connecting to and retrieving the event (which was published to the Master broker) from the Slave broker. There was no data loss and the service didn't stop responding for more than a few moments which the Slave took to start up after acquiring the DB lock. 