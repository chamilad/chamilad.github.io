---
layout: post
title: "WSO2 ESB Sample Screw Ups"
date: 2014-07-07 12:26:35 +0530
comments: true
categories: [WSO2, ESB] 
---

We all know the feeling when we follow every instruction of a sample page to the letter and the results turn out to be a total ~~clusterf..~~ disaster. 

Well, let me try to easy some of the pain by listing the following probable fixes and workarounds for the 100-odd samples of the renowned [WSO2 Enterprise Service Bus](http://wso2.com/products/enterprise-service-bus/).

>Keep in mind that this post will keep getting updated till I go through every sample. 

#Sample 50
The synapse configuration file that is shipped with 4.8.1 has an error where asterisks are missing from a filter mediater regex. Therefore execution of the main sequence stops after failing to match any `To` SOAP headers.

##Fix 

Change the following line in `<ESB_HOME>/repository/samples/synapse_sample_50.xml` to include the asterisks.

```xml
<filter source="get-property('To')" regex="./StockQuote.">
```
The modified line should be as follows.

```xml
<filter source="get-property('To')" regex=".*/StockQuote.*">
```

#Sample 57
In ESB 4.8.1 running this sample would not result in the expected outcome and would throw an error similar to the following.

```
org.apache.synapse.SynapseException: A LoadBalanceEventHandler has not been
specified in the axis2.xml file for the domain apache.axis2.application.domain
at
org.apache.synapse.core.axis2.Axis2LoadBalanceMembershipHandler.setConfigurationContext(Axis2LoadBalanceMembershipHandler.java:77)
```

The reason for this is the incompatibility between the clustering mechanisms used in ESB 4.8.1 (HazelCast) and the sample Axis2 server (Apache Tribes) it ships with. 

##Fix
As [this](http://wso2-oxygen-tank.10903.n7.nabble.com/Dev-Running-ESB-sample-57-td89484.html) email thread mentions this can be overcome by getting ESB 4.7.0 where the same clustering implementation is used that of the Axis2 server. 

#Sample 60, 61, 62
In ESB 4.8.1 the synapse configuration files for the samples 60, 61, and 62 are missing and the configurations that are on the sample pages are errorneous. 
For an example in sample #61 the mentioned configuration refers to a property named `EP_LIST` while there's no external registry resource or inline defined property that is of the name EP_LIST. 

```xml
<send>
    <endpoint>
        <recipientlist>
            <endpoints value="{get-property('EP_LIST')}" max-cache="20" />
        </recipientlist>
    </endpoint>
</send>
```

##Fix
However these synapse configuration files are present in the 4.7.0 release and they can be used to start the 4.8.1 ESB with the desired configuration. 

#Sample 152
You would probably get an error while trying to execute the client like the following. 

```
[2014-07-07 13:28:09,060] ERROR - ServerWorker Error processing POST request 
java.lang.NullPointerException: Tenant domain has not been set in CarbonContext
    at org.wso2.carbon.caching.impl.CacheManagerFactoryImpl.getCacheManager(CacheManagerFactoryImpl.java:79)
    at org.wso2.carbon.security.pox.POXSecurityHandler.getPOXCache(POXSecurityHandler.java:383)
    at org.wso2.carbon.security.pox.POXSecurityHandler.invoke(POXSecurityHandler.java:179)
    at org.apache.axis2.engine.Phase.invokeHandler(Phase.java:340)
    at org.apache.axis2.engine.Phase.invoke(Phase.java:313)
    at org.apache.axis2.engine.AxisEngine.invoke(AxisEngine.java:261)
    at org.apache.axis2.engine.AxisEngine.receive(AxisEngine.java:167)
    at org.apache.axis2.transport.http.HTTPTransportUtils.processHTTPPostRequest(HTTPTransportUtils.java:172)
    at org.apache.synapse.transport.nhttp.ServerWorker.processEntityEnclosingMethod(ServerWorker.java:459)
    at org.apache.synapse.transport.nhttp.ServerWorker.run(ServerWorker.java:279)
    at org.apache.axis2.transport.base.threads.NativeWorkerPool$1.run(NativeWorkerPool.java:172)
    at java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1110)
    at java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:603)
    at java.lang.Thread.run(Thread.java:722)
```

While I can't exactly pinpoint the cause of the error this happens due to the way we execute the samples. If you directly executed the sample #152 chances are that you wouldn't come across this. But if you started with a sample before #101 you'd probably get this. 

At sample #101 you have to enable the NHTTP configuration for Carbon. Non-Blocking HTTP is required to enable WS-ReliableMessaging so that the source can call the Web Service destination asynchronously. 

You are instructed to enable NHTTP configuration by editing the `carbon.xml` file in `<ESB_HOME>/repository/conf/`. 

```xml carbon.xml start:253
<!-- You are instructed to comment this line and enable the next one to enable NHTTP -->
<ConfigurationFile>${carbon.home}/repository/conf/axis2/axis2.xml</ConfigurationFile>                                                                                                                           
<ConfigurationFile>${carbon.home}/repository/conf/axis2/axis2_nhttp.xml</ConfigurationFile>
```

## Fix 
To make the sample #152 run properly revert this change. 