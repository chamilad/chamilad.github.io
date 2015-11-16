---
layout: post
title: "Secure Message Broker Communication in Apache Stratos with Apache ActiveMQ"
date: 2015-10-11 00:55:36 +0530
comments: true
categories: [Apache Stratos, Apache ActiveMQ]
published: true
---

Apache Stratos relies heavily on message broker communication. In fact, message broker communication with message broker topics is the main method of communication between components such as the Cartridge Agent, Cloud Controller and the Autoscaler, as this allows a decoupled architecture for the components. 

{% img /images/post_resource/stratos/ca-overview.png %}

When it comes to message brokers, authentication is a crucial part of securing the communication channel since if left unsecured, anyone with access to the message broker can subscribe to the topics and listen to the communication between the components. This can expose sensitive data easily and the system would be compromised in no time. The purpose of this article is to explain how to engage Username and Password based authentication with Apache ActiveMQ in Stratos.

#Securing ActiveMQ
ActiveMQ allows to add authentication and authorization through an extensible plugin system. For our purpose, the out of the box `SimpleAuthenticationPlugin` is more than enough as it allows us to define a username and a password with the list of user groups the particular user belongs to. 

To engage `SimpleAuthenticationPlugin` we have to add the following section before the `broker` tag closes, in `<ACTIVEMQ_HOME>/conf/activemq.xml`. 

```xml
<plugins>
    <simpleAuthenticationPlugin>
        <users>
            <authenticationUser username="system" password="manager" groups="users,admins"/
        </users>
    </simpleAuthenticationPlugin>
</plugins>
```

As you can see we have introduced a user named `system` with password `manager` who belongs to groups `users` and `admins`. Since we have not allowed anonymous access, any subscriber or a publisher that connects to ActiveMQ should provide these credentials to successfully communicate. We can enable anonymous access by specifying the `allowAnonymousAccess` attribute on `simpleAuthenticationPlugin` to `true`. 

After the configuration file is saved, restart ActiveMQ. 

# Providing Credentials on Stratos
Within Stratos there are three configurations that we have to provide message broker credentials in to.

## Stratos Components - Cloud Controller, Autoscaler, Stratos Manager
The ActiveMQ credentials for Stratos components can be provided by the `jndi.properties` file. Simply add the following two lines in the `<STRATOS_HOME>/repository/conf/jndi.properties` file.

```
java.naming.security.principal=system
java.naming.security.credentials=manager
```

`java.naming.security.principal` corresponds to the ActiveMQ username and `java.naming.security.credentials` contains the password. 

## Complex Event Processor
Based on the health statistics published from the instances via [Thrift](http://code.chamiladealwis.com/blog/2014/10/10/thrift-communication-in-apache-stratos/), the Complex Event Processor publishes several crucial messages to the message broker. This is done using a JMSOutputAdaptor. To configure the JMSOutputAdaptor to use ActiveMQ credentials, add the following entries inside the `outputEventAdaptor` tag, in the configuration file at   `<STRATOS_HOME>/repository/deployment/server/outputeventadaptors/JMSOutputAdaptor.xml` 

```xml
<property name="transport.jms.UserName">system</property>
<property name="transport.jms.Password">manager</property>
```

## Cartridge Agent
The Python Cartridge Agent can be configured with ActiveMQ credentials by specifying the `mb.username` and `mb.password` options in the `agent.conf` file. 

To do this in a Docker image managed by Kubernetes, specify the following options in the Kubernetes Cluster Configuration JSON file, under the `property` array.

```json
{
  "name": "payload_parameter.MB_USERNAME",
  "value": "system"
},
{
  "name": "payload_parameter.MB_PASSWORD",
  "value": "manager"
}
```

For a VM, these values can be specified in the `base.pp` manifest in the Puppet server. 

```puppet
$mb_username          = 'system'
$mb_password          = 'manager'
```

After the credentials are enabled and configured, if anonymous access is not allowed, no external user without the credentials will not be able to listen to the communication or publish messages on the message broker.