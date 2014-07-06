---
layout: post
title: "Creating a Web Service using Apache Axis2 [No IDE]"
date: 2014-07-01 16:38:50 +0530
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

We need Apache Axis2 running and a suitable container. You could also run Axis2 as a standalone server but for this let's use Tomcat as a container. So in the following order

1. Download and install JDK7
2. Download and install Tomcat 7 (even 8 would do, but it seems as of now Tomcat 8 isn't being supported by Eclipse, so let's go with v7)
3. Download and install AXis2 on Tomcat

## JDK7

Download and extract the JDK tarball. 

```bash 
wget --no-check-certificate --no-cookies --header "Cookie: oraclelicense=accept-securebackup-cookie" http://download.oracle.com/otn-pub/java/jdk/7u60-b19/jdk-7u60-linux-x64.tar.gz
tar zxvf jdk-7u60-linux-x64.tar.gz
```
Add and modify the following lines in ~/.profile or /etc/profile (for system wide application) to add `JAVA_HOME` environment variable and it's bin folder to `$PATH`.

```bash
export JAVA_HOME=/path/to/jdk/extraction
export PATH=$PATH:$HOME/bin:$JAVA_HOME/bin
```

Refresh the terminal session and check if Java is working

```bash
source ~/.profile
java -version
```


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

# The Service

An Axis2 archive (of `.aar` extension) has a certain directory structure not so different from a Web Archive. 

``` bash Axis2 Archive Directory Structure start:1 linenos:false mark:4,9
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

Now compile sources, create the Axis2 archive and deploy it in the Axis Server.

``` bash
# go to the root dir and compile the sources
javac com/chamiladealwis/ws/service/*.java

# create the archive file
jar cvf SimpleService.aar *

# copy the archive over to the Axis2 web root
cp SimpleService.aar $CATALINE_HOME/webapps/axis2/WEB-INF/services/

# restart tomcat
cd $CATALINA_HOME/bin
./shutdown.sh
./startup.sh
```

Browse to [http://localhost:8080/axis2/services/listServices]( http://localhost:8080/axis2/services/listServices) in your browser and you will see `SimpleService` being listed as an availble service with `add` as an operation.

Click on the link to `SimpleService` to view the WSDL file which will describe the service and it's operation in an abstracted XML interpretation that can be used to create clients in any language to consume the service. 

#The Client
The client code has to make use of a "Stub" of the service which will act as a proxy and a communication agent. Axis2 binary distribution includes tools which can generate the Java stub using the WSDL file as the source. 

Download the Axis2 binary distribution, extract it and set `AXIS2_HOME` environment variable to its root. Add `$AXIS2_HOME` to `$PATH`.

```bash
wget http://apache.spinellicreations.com//axis/axis2/java/core/1.6.2/axis2-1.6.2-bin.zip
unzip axis2-1.6.2-bin.zip
pwd 
```

Add the `$AXIS2_HOME` variable before `export PATH` line and modify `$PATH` to include `$AXIS2_HOME/bin`. 

```bash
export AXIS2_HOME=/path/to/axis2/binary/folder
export PATH="$PATH:$AXIS2_HOME/bin"
```

Now refresh terminal by sourcing the .profile file.

```bash
source ~/.profile
echo $AXIS2_HOME
```

Copy the WSDL path of the `SimpleService`, go to the directory you're going to create your client code and execute the following. 

```bash
./wsdl2java.sh -uri WSDL_PATH_OF_THE_SIMPLESERVICE -o client
```

The WSDL path would be something similar to `http://localhost:8080/axis2/services/SimpleService?wsdl`. 

This will create the Java stub and the CallbackHandler classes. The CallbackHandler class can be extended to implement custom success and error callback executions. The Stub is the class of main importance here. It contains the Request and Response types of the operations available from the Service it was generated from and the skeletol methods that call to the target endpoint once invoked. We will use these members to call our simple service.

```java SimpleServiceClient.java
package com.chamiladealwis.ws.client;

import java.rmi.RemoteException;

import org.apache.axis2.AxisFault;

import com.chamiladealwis.ws.client.SimpleServiceStub.Add;
import com.chamiladealwis.ws.client.SimpleServiceStub.AddResponse;

public class SimpleClient 
{
    public static void main(String[] args) 
    {
        try 
        {
            // Create the Stub object
            SimpleServiceStub serviceStub = new SimpleServiceStub();
            
            // Create the Request object. The request class is autogenerated
            // as an inner class of the Stub class.
            Add addReq = new Add();
            
            // Set parameters
            addReq.setNum1(4);
            addReq.setNum2(8);
            
            // Invoke method and get response as a response object
            AddResponse response = serviceStub.add(addReq);
            
            // Response object's get_return() returns the return of the remote 
            // method
            int sum = response.get_return();
            System.out.println("Sum : " + sum);
        } 
        catch (AxisFault e) 
        {
            e.printStackTrace();
        } 
        catch (RemoteException e) 
        {
            e.printStackTrace();
        }        
    }
}
```

Let's go through the client code. 

Consuming an operation available through a Web Service consists of following steps.

1. Create an object of the stub. All method calls will be invoked through this object.
```java
SimpleServiceStub serviceStub = new SimpleServiceStub();
```
2. Create the request object. This will have methods to add input parameters to the request.
```java
Add addReq = new Add();
addReq.setNum1(4);
addReq.setNum2(8);
```
3. Invoke and the operation method. The operation method will be invoked through the stub object and the invocation accepts a parameter of type of request object. 
```java
serviceStub.add(addReq);
```
4. Catch the response object. The invocation will return the response object mainly containing the value returned by the operation. 
```java
AddResponse response = serviceStub.add(addReq);
```
5. Extract the return value. By calling `get_return()` of the response object the return value can be extracted. 
```java
int sum = response.get_return();
```

As you see it's pretty straightforward, although there are couple of things to keep in mind.

1. You have to regenerate the client stubs everytime you change most of the server code (obviously).
2. It's good to check if the service has been properly deployed by going to the services page and checking the WSDL generation.
3. This was a *simple* client with *simple* input and output types. When complex types are involved there are some standards to be practiced. Be mindful that Web Services operate on a language and platform agnostic environment. 
4. *You will not be writing web services and clients this way most of the time!* But that's a topic for another post :)
