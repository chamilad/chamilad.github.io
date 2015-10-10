---
layout: post
title: "Apache Stratos Cartridge Agent: Life Cycle Walkthough"
date: 2015-03-22 17:48:56 +0530
comments: true
categories: [Apache Stratos, Cartridge Agent]
author: Chamila de Alwis
published: true
---

>This is a part of a series of articles on Apache Stratos Cartridge Agent. If you feel like you've missed the memo, why not start from the [first article](http://code.chamiladealwis.com/blog/2015/03/17/apache-stratos-cartridge-agent-contract/)?

The Cartridge Agent is (usually) the first service that starts in a spawned Cartridge instance. From that point onwards, it is responsible for keeping the relevant services running, communicating with Stratos to subscribe and publish to message broker topics, processing received events, artifact distribution and health statistics reporting. In this article we will discuss in detail, in which order these tasks are performed.

# Setup
For our walkthrough let's take an application with a single PHP cartridge. The Puppet manifest for this PHP cartridge is distributed with Stratos source. The application will only consist of this cartridge. Following is the deployed application view of the Single PHP Cartridge Application.

{% img /images/post_resource/stratos/php-app-dep.png %}

## Deploying the Application
The sample scripts and artifacts for our scenario is available in the `samples` folder of the Stratos source. You can deploy this sample in any one of the available IaaS options including the Mock IaaS that is available in Stratos for developer testing purposes. Following is how it can be deployed in the Mock IaaS.

```bash
# navigate to the sample application folder
cd <STRATOS_SOURCE>/samples/applications/single-cartridge/scripts/mock
# run deploy script
./deploy.sh
```

However the Mock IaaS does not involve the Cartridge Agent execution, and therefore is a bit irrelevant in our scenario. You can deploy the same application in OpenStack or Amazon EC2 to witness the Cartridge Agent execution. You can even use Docker on Kubernetes and deploy a Kubernetes cluster to deploy this Single PHP Cartridge application.

## What to Look For
The steps that are explained here can be observed by looking at several sources. The Cartridge Agent logs and the Stratos log are the primary sources where published and received logs can be viewed. The Java Cartridge Agent logs are located in `/var/logs/apache-stratos/cartridge-agent.log` and the full Python Cartridge Agent logs can be located in the `/tmp/agent.screen.log`. The Python Cartridge Agent additionally has two other logs, `agent.log` which log the configured log level, `INFO` being the default, and the `error.log` which only log `ERROR` level logs. These two can be found in the Python Cartridge Agent home, by default in `/mnt/apache-stratos-python-cartridge-agent-4.1.0/`. 

## Reference Image
Most events that occur in a successful execution cycle of the Cartridge Agent is illustrated as a [flow chart](https://cwiki.apache.org/confluence/download/attachments/42567880/Cartridge%20Agent%20Lifecycle.png?api=v2). This does not include the failure scenarios and some multi-threaded executions are not properly illustrated, due to the limited nature of showing such details in a flow chart. However it is a good reference point to understand the Cartridge Agent life cycle in a sequential manner. 

# Instance States
An instance goes through a set of states during its life cylce. These states determine the behavior of the instance as well as other components in Stratos, when taking decisions about the instance. Following are the states that a spawned instance goes through during its life cycle.

1. Created - Instance is created in the IaaS. But execution inside has not started.
2. Initialized - The execution of processes have started in the instance. Now the init scripts have started executing and Puppet agent would probably be running. Cartridge Agent will also start while being in this state.
3. Starting - The Cartridge Agent has published the InstanceStartedEvent for this instance
4. Active - The Cartridge Agent has published InstanceActivatedEvent. This indicates that the services in the cartridge instance are working and accepting requests. The instance can now be consumed. 
5. Pending Termination - The instance is moved to a termination pending queue, where the graceful shutdown of the instance has been called for. 
6. Obsolete - If the instance was in the Pending Termination state, then the Cartridge Agent has published InstanceReadyToShutdownEvent. An instance can also end up in the Obsolete state directly from Starting, or Initialized states because of various reasons. The instances in the obsolete queue will be terminated eventually. 

The state transitions can also be seen from the reference image. Additionally, you can understand how the member state transition happens from the Autoscaler side by going through [this](http://lahiruwrites.blogspot.com/2015/03/stratos-410-deveper-guide-autoscaler.html) article written by Lahiru Sandaruwan. 

With this knowledge at hand, let us dive in to the walkthrough right away. 

## Created
When the application is deployed after creating the Cluster Monitors for each cluster of Cartridges, Cloud Controller issues instance creation requests to the IaaS via JClouds. The instance state at the moment is "CREATED". 

## Initialized
When the instance creation is complete, the IP addresses are assigned, and the instance starts execution, the status changes to "INITIALIZED". The init scripts are executed and the Puppet agent downloads and applies the related Puppet manifests to the instance. Puppet is also responsible for starting the Cartridge Agent process. In the earlier releases, Puppet additionally started the service processes, for example Tomcat server etc. However, in the new release it is the responsibility of the Cartridge Agent to check and start the service processes. To achieve this, a Cartridge Agent plugin has to be written which will start the process. 

The reason to move the responsibility of starting the service to the Cartridge Agent was to make sure that the services would not be starting without artifact distribution succeeding for repository based Cartridge types such as Tomcat, PHP or WSO2 Identity Server. For example, for a Tomcat instance, starting the Tomcat server without the repository artifacts not cloned in to the `webapps` folder, does not make any sense. Therefore, the service should not be up and the Cartridge Agent will not be publishing the InstanceActivatedEvent to the message broker. 

Therefore for repository based Cartridge types, the service starter Cartridge Agent plugin should be mapped to the ArtifactsUpdatedEvent. If the Git clone operation performs successfully, the plugin will be executed and the service will be started. For non-repository based Cartridges such as MySQL, the service starter plugin can be mapped to InstanceStartedEvent.

After the Cartridge Agent is started it will start listening to the following topics in the message broker. 
1. topology
2. tenant
3. instance/notifier
4. application/signup
5. domain/mapping

For the Cartridge Agent to successfully continue it should populate itself an idea of the services deployed in Stratos and how they are distributed. This is called the Topology in Stratos. The Topology describes what services are deployed, how clusters and members are deployed under those services and the lifecycle states of the clusters and the members. 

The Topology information is distributed among Stratos components as a message broker event called the `CompleteTopologyEvent`. This is published every 60 seconds. The usual pattern for components to synchronize the Topology model is to receive the CompleteTopologyEvent only once and modify the topology based on the other events subsequently. 

Therefore, the Cartridge Agent should wait until it receives the first CompleteTopologyEvent. As mentioned before, this waiting will be at most 60 seconds. 

Just receiving the `CompleteTopologyEvent` is not sufficient. The Cartridge Agent should also verify that its instance is present in the Topology and the status of the instance is `INITIALIZED`. Usually, this will be the case when the first `CompleteTopologyEvent` is received, however there can be instance that it would be few minutes until the member is set to `INITIALIZED`. Cartridge Agent will also wait for that to happen. 

After the instance status becomes `INITIALIZED` and the message broker topic listeners are registered, the Cartridge Agent will publish `InstanceStartedEvent` to the `instance\status` topic. This changes the status of the instance from `INITIALIZED` to `STARTED`.

## Started
When the instance status changes to this state, the Cartridge Agent's next responsibility, from Stratos point of view, is to go in to the `ACTIVATED` state. This status is achieved through two effective flows, based on the type of the instance. 

### Non-repo based instances
If the instance is for example a MySQL instance, there is no need for a repository to be cloned inside (for most cases). In this case (determined by the absence of `REPO_URL` in the payload) the Cartridge agent checks if the service ports (ex: MySQL ports) are running and immediately publishes the `InstanceActivatedEvent`.  

### Repo based instance
In our case, the PHP instance is a repository based instance, where for example, a PHP application hosted on GitHub can be pointed to. If the `REPO_URL` is present on the payload the Cartridge Agent will move on without publishing the `InstanceActivatedEvent`. For a repo based instance, Stratos Manager will publish a separate event named `ArtifactUpdatedEvent` which the Cartridge Agent responds to by cloning the specified Git repository to the specified path. After the artifact repository is cloned, the Cartridge Agent will check if the service ports (in our case if Apache Server ports) are up and publish `InstanceActivatedEvent`. 

## Activated
Once the instance reaches the `ACTIVATED` stage, the initial tasks of the Cartridge Agent are done. It will periodically update the artifact repository based on the configuration, and would react to any events received via the message broker. 

## Termination
The instance can now go to either Pending Termination state if the application is undeployed. This is called a graceful shutdown flow, where the status of the instance switches from Active->Pending Termination->Obsolete->Terminated one after the other. 

However, an instance can be directly classified as obsolete too, as described by the [the first pods](http://code.chamiladealwis.com/blog/2015/03/17/apache-stratos-cartridge-agent-contract/) of this post series. If it fails to post health statistics events to the Complext Event Processor for more than 60 seconds, it will be classified as an obsolete instance and will be queued up for termination. 

When an instance reaches the Pending Termination queue, an `InstanceCleanupMemberEvent` will be published to the message broker. The relevant instance picks up this event and does the necessary cleanup operations and subsequently publishes that it is ready to be terminated by publishing `InstanceReadyToShutdownEvent` to the message broker. When that happens it will be moved up to the obsolete queue.

There are timeout values for the instances to be in these queues. The default value for an instance to be in the pending termination member list is 30 minutes. If the relevant `InstanceReadyToShutdownEvent` doesn't get published within that timeout period, the instance will be automatically moved to the obsolete queue. If the member termination from the IaaS doesn't successfully complete within the default timeout value of 24 hours, it will be considered as an instance that cannot be terminated by Stratos and will be removed from the obsolete member list. The timeout values for these can be modified by modifying the `pendingTerminationMemberExpiryTimeout` and `obsoletedMemberExpiryTimeout` values respectively in the `<STRATOS_HOME>/repository/conf/autoscaler.xml` configuration file. 

# Recap
When the instance reaches its life time, so does this post series on the Apache Stratos Cartridge Agent. There are few minute details that have changed while this series was being compiled, however the overall information about the architecture and the function remains unchanged. 

As always, the best strategy to understand the function is to go through the code. You can checkout the source for Apache Stratos from [GitHub](https://github.com/apache/stratos). Any issues or clarifications you come across can be quickly resolved by going through the [documentation](https://cwiki.apache.org/confluence/display/STRATOS). You can also get help and communicate with the Apache Stratos community via the mailing list. 
