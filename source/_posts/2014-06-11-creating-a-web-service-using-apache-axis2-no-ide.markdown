---
layout: post
title: "Creating a Web Service using Apache Axis2 [No IDE]"
date: 2014-06-11 16:38:50 +0530
comments: true
categories: [WSO2, Axis2, Web Services]
published: true
---

#Outline

1. Pre-requisites
2. Deploying Axis2
3. Writing the service class
4. Deploying the service
5. Verification

# Pre-requisites

We need Apache Axis2 running and a suitable container. So in the following order

1. Download and install JDK7
2. Download and install Tomcat 7 (even 8 would do, but it seems as of now Tomcat 8 isn't being supported by Eclipse, so let's go with ver7)
3. Download and install AXis2 on Tomcat

## JDK7

TODO

## Tomcat 7

You could install tomcat through `apt-get` or manually.

``` bash
sudo apt-get install tomcat7
```

Or download and set paths manually.

``` bash
wget http://supergsego.com/apache/tomcat/tomcat-7/v7.0.54/bin/apache-tomcat-7.0.54.tar.gz
tar zxvf apache-tomcat-7.0.54.tar.gz
mv apache-tomcat-7.0.54 ~/dev/
```

Add the `$CATALINA_HOME` env var to the bash profile.

``` bash
vi ~/.profile
```

Prepend the following line before exporting the $PATH.

``` bash
export CATALINA_HOME=$HOME/dev/apache-tomcat-7.0.54
```

Server start/stop can be done by the scripts in the `$CATALINA_HOME/bin` folder.

``` bash
cd $CATALINA_HOME
./bin/startup.sh
```

# Deploying Axis2

Download Axis2 WAR distribution and copy the web archive file to the tomcat webapps root.

``` bash
wget http://apache.tradebit.com/pub//axis/axis2/java/core/1.6.2/axis2-1.6.2-war.zip
unzip axis2-1.6.2-war.zip -d axis2-war
cp axis2-war/axis2.war $CATALINA_HOME/webapps/
cd $CATALINA_HOME/bin
./shutdown.sh
./startup.sh
```

In the browser go to [http://localhost:8080/axis2](http://localhost:8080/axis2). Axis2 welcome page should appear. 

# Writing the service class

An Axis2 archive (of `.aar` extension) has a certain directory structure not so different from a Web Archive. 

``` bash linenos:false mark:4,9
.
├── SimpleService
    └─── META-INF
      └─── services.xml
    └── com
      └─── chamiladealwis
        └─── ws
          └─── service
            └─── SimpleService.java
```

META-INF folder contains the services descriptor file. The other is the binary which implements the service. 

The service class itself is a plain old Java class which exposes the services it offers through public methods. My simple service would be the following.

``` java SimpleService.java
package com.chamiladealwis.ws.service;

public class SimpleService 
{
	public int add(int num1, int num2)
	{
		return num1+num2;
	}
}
```

`SimpleService` offers just one service  named `add` which accepts two Integer parameters and returns the sum of them as an Integer. 

Now this service needs a service descriptor which exposes the service class to Axis2 when asked. 

``` xml services.xml mark:3
<service>
    <parameter name="ServiceClass" locked="false">
        com.chamiladealwis.ws.service.SimpleService
    </parameter>
    <operation name="sayHello">
        <messageReceiver class="org.apache.axis2.rpc.receivers.RPCMessageReceiver" />
    </operation>

</service>
```
A parameter named `ServiceClass` is defined with value `com.chamiladealwis.ws.service.SimpleService` which the FQN of the Java class we just wrote. 

Now compile and create the Axis2 archive.

``` bash

```
