---
layout: post
title: "Apache Stratos Cartridge Agent: Instance Configuration by Puppet 2"
date: 2015-03-21 23:25:09 +0530
comments: true
categories: [Apache Stratos, Cartridge Agent]
author: Chamila de Alwis
---

>This is a part of a series of articles on Apache Stratos Cartridge Agent. If you feel like you've missed the memo, why not start from the [first article](http://code.chamiladealwis.com/blog/2015/03/17/apache-stratos-cartridge-agent-contract/)?

One of the main responsibilities of the Cartridge Agent is to start the services related the Cartridge type. To do this the Cartridge Agent should be configured with proper parameters. As we discussed in the [last article](http://code.chamiladealwis.com/blog/2015/03/17/apache-stratos-cartridge-agent-instance-configuration-by-puppet/), Puppet can be used to install, configure and start the Cartridge Agent. In this article, we will discuss how this is done in detail.

# Configurations
The Cartridge Agent needs several parameters to start functioning correctly. 

1. Message broker IP address and port
2. Complex Event Processor IP address and port
3. Application path (for repository based cartridges)

In addition to these parameters, there are several others which might be crucial to Cartridge Agent life cycle, based on different scenarios. However, at minimum, it needs the details of the above mentioned parameters to successfully function. 

For orchestration in the VM scenario, we provide these values to Puppet, which in turn will configure the Cartridge Agent accordingly. 

## base.pp
The purpose of the `base.pp` in `/etc/puppet/manifests/nodes/` folder is to serve as a super node definition which can be inherited by service type node definitions. It contains a list of variables that can be used by any module that inherits it. As of Stratos 4.1.0 release the contents of the `base.pp` file looks like as follows. The variables are pretty much self explanatory. 

```puppet
node 'base' {

  #essential variables
  $package_repo         = 'http://10.4.128.7'
  $local_package_dir    = '/mnt/packs'
  $mb_url               = 'tcp://127.0.0.1:1883'
  $mb_type              = 'activemq' #in wso2 mb case, value should be 'wso2mb'
  $cep_ip               = '127.0.0.1'
  $cep_port             = '7711'
  $cep_username         ='admin'
  $cep_password         ='admin'
  $truststore_password  = 'wso2carbon'
  $java_distribution    = 'jdk-7u51-linux-x64.tar.gz'
  $java_name            = 'jdk1.7.0_51'
  $member_type_ip       = 'private'
  $lb_httpPort          = '80'
  $lb_httpsPort         = '443'
  $tomcat_version       = '7.0.52'
  $enable_log_publisher = 'false'
  $bam_ip               = '127.0.0.1'
  $bam_port             = '7611'
  $bam_secure_port      = '7711'
  $bam_username         = 'admin'
  $bam_password         = 'admin'
  $metadata_service_url = 'https://127.0.0.1:9443'

  require stratos_base 
}
```

The `base.pp` file should be modified to include proper values when the Puppet master is configured.

## Cartridge Agent modules

Apache Stratos 4.1.0 ships with two implementations of the Cartridge Agent, default Java agent and a Python based agent. The respective Puppet modules for these implementations are `agent` and `python_agent` inside `/etc/puppet/modules` folder. 

Both modules have a similar flow of execution, where there are separate steps to,

1. Copy the Cartridge Agent distribution from the Puppet master to the instance
2. Copy templates reflecting configuration files, Cartridge Agent extensions and plugins, and configure parameters as given by `base.pp` and calling modules
3. Start Cartridge Agent

If a calling module (the module which includes the Cartridge Agent module, typically a service type like PHP) needs to override a value provided through base.pp it can do so by assigning the new value to the variable at the time of Puppet module inclusion. 

### Cartridge Agent Extensions and Plugins
In addition to [what the Cartridge Agent does as a generic agent to all services](http://code.chamiladealwis.com/2015/03/17/apache-stratos-cartridge-agent-contract/), each service can make use of extensions, and in the Python implementation, plugins to add additional behavior to it. We will go in to more details about the extensions and plugins in a separate article, however you only need to be aware of them as being executed for specified events that are processed by the Cartridge Agent. For example, you can have an extension that can be specified to be executed, when an ArtifactUpdatedEvent is processed by the Cartridge Agent. 

For each service that includes the Puppet module for a certain implementation of the Cartridge Agent, it can specify a list of extensions and plugins that should be copied over to the Cartridge Agent. For example, this is how the PHP module specifies the list of plugins and extensions that should be included in the Cartridge Agent, when the running service is PHP.

```puppet
  $custom_agent_templates = ['extensions/artifacts-updated.sh']
  $custom_plugins = ['plugins/PhpServerStarterPlugin.py', 'plugins/PhpServerStarterPlugin.yapsy-plugin']
  class {'python_agent':
    custom_templates => $custom_agent_templates,
    custom_plugins => $custom_plugins,
    module=>'php'
  }
```

While the Cartridge Agent is executing, these specified extensions and plugins will be executed when their respective events are processed. 

As mentioned above, it is the responsibility of the Cartridge Agent to start the respective services related to the spawned Cartridge. This is also done using a Cartridge Agent plugin (Python implementation) or an extension (Java implementation).

# Conclusion for Configuration
By the end of this article, we should be aware of the details of the configuration needed by the Cartridge Agent. At least, that was my intention. If you feel like I've missed a crucial explanation, feel free to drop a comment. 

As of now, Apache Stratos only supports Puppet as a configuration tool for Cartridge instances. However in the future releases, it will also be possible use Chef, or another similar tool as a replacement for Puppet. 

From this point onwards, we will start on the details of the Cartridge Agent life cycle execution. For that we will first go through a typical work flow of a PHP Cartridge instance.... in the next article!