---
layout: post
title: "Securing a Web Service with WSO2 ESB"
date: 2014-07-18 23:17:46 +0530
comments: true
categories: [WSO2, ESB, Web Services]
---

WSO2 Enterprise Service Bus is one of the [best performing implementations](http://blog.samisa.org/2014/02/wso2-esb-performance-round-75.html) for the Enterprise market. In this article I will briefly go through what it takes to secure an unsecured backend web service using WSO2 ESB as a mediator. 

Security in Web Services is covered by the WS-Security standard. There are [various policies](http://docs.oasis-open.org/ws-sx/security-policy/examples/ws-sp-usecases-examples-cd-01.html) such as simple username and password authentication and PKI certificates that can be used to secure a Web Service. The policy that will be used is described using the WS-Policy standard.  

WSDL of the secured service will have the WS-Security policy embedded and the consumer will be able to filter out the WS-Security policy from it to implement the client side security demands. 

For this example we will be using the basic UsernameToken with Plain Text password policy which is supported right out of the box by WSO2 ESB. Note that this policy is recommended only for pre-production environments because the password is communicated in plain text. WSO2 ESB supports by default twenty security scenarios and you can always customize the policy to your liking. 

#Pre-requisites

1. Unsecured backend service
2. WSO2 ESB (4.8.1 is used in this article)

## Backend Service

For demo purposes get a simple Web Service running. Refer to my earlier post, [Creating a Web Service using Apache Axis2](http://code.chamiladealwis.com/blog/2014/07/01/creating-a-web-service-using-apache-axis2-no-ide/), for help. 

## Setting up WSO2 ESB

[Download](http://wso2.com/products/enterprise-service-bus/) WSO2 ESB and extract it. Go to its `bin` folder and execute `wso2server.sh`. After it is executed go to the [management console](https://localhost:9443/carbon) and log in. The default username and password is `admin`.  

# Creating the Proxy Service

We will create a proxy service for the backend service and then secure it with the UsernameToken policy. 

Go to the ESB [management console](https://localhost:9443/carbon) and add a proxy service by clicking on "Proxy Service" under Services->Add menu of the Main tab. 

{% img /images/post_resource/esb-new-proxy.jpg %}

Choose either "Pass Through Proxy" or "WSDL Based Proxy". Fill the details according to the following

##Pass Through Proxy

{% img /images/post_resource/esb-pass-through-options.jpg %}

* Proxy Service Name - Enter an identifying name for the Proxy service you're creating.

* Target Endpoint - Select "Enter URL". "Pick From Registry" option allows you to select the endpoint stored as a resource on the configuration registry or the governance registry. We will be entering the endpoint URL by hand.

* Target URL - Copy the URL of the backend service. This will be the WSDL url on the Axis2 service you created without the `?wsdl` string at the end.

* On the "Publish WSDL Options" select "Specify source URL" for "Publishing WSDL"

* WSDL URI - Enter the WSDL URL for the backend service. Click on "Test URI" to test the connection.

Click Next.

##WSDL Proxy

{% img /images/post_resource/esb-wdl-based-options.jpg %}

* Proxy Service Name - Enter an identifying name for the Proxy service you're creating.

* WSDL URI - The URI of the WSDL of the backend service. 

* WSDL Service - This is the service name that is used in the WSDL as the identifier for the service. In the WSDL document this is the value for the attribute `name` in the `wsdl:service` tag.

* WSDL Port - This is the endpoint that you're going to use for the proxy service. Normally three types of ports are exposed for a service. Those are
  * SOAP1.1 Endpoint - ServiceNameHttpSoap11Endpoint
  * SOAP1.2 Endpoint - ServiceNameHttpSOap12Endpoint
  * HTTP REST Endpoint - ServiceNameHttpEndpoint

Use either SOAP 1.1 or SOAP 1.2 endpoint as the port. You can find the names under the `<wsdl:service>-><wsdl:port>` tags.

Click Next.

Your proxy service will be created. WSO2 ESB has a tool called "Try It" which can be used as a test tool for Web Services. [Service list page](https://localhost:9443/carbon/service-mgt/index.jsp?region=region1&item=services_list_menu) will have a link to the "Try It" console in front of each service. Test the proxy service you just created to verify that we can go ahead to the securing phase. 

At this point you have an unsecured proxy service that does basically nothing as a mediator to the backend service. We need to secure the service with UsernameToken policy so that the ESB will handle security aspects and only pass SOAP messages back and forth to the backend service sans the WS-Security. 

#Securing the Proxy Service
If you list the services of the ESB you will see that the proxy service you created just now is marked as unsecured, with the unlocked padlock as the icon.

{% img /images/post_resource/esb-unsecured-proxy.jpg %}

Click on that icon to secure the service. Select "Yes" in the next page and you will be presented with the policy types that WSO2 ESB supports right out of the box. 

{% img /images/post_resource/esb-secure-service-options.jpg %}

Select "UsernameToken" and click Next.

Select the user groups that are allowed to use the service. In this case select admin. 

{% img /images/post_resource/esb-secure-users-options.jpg %}

Voilà! You have secured your proxy service. Run "Try It" again and enter the username and the password (in this case admin:admin) to consume the service. If you try to consume the service without entering the proper user credentials you will be presented with an AxisFault.

If you check the WSDL of the secured proxy service you will observe the embedded WS-Policy describing the WS-Security policy (UsernameToken in our case) in the top most part of the WSDL document. If you wish to edit this policy you can do so by selecting "Edit Policy" in the Policies page of the Proxy Service. I will go to details of customized policies in another article. 

In the next article I will elaborate on how to code a client to consume the secured proxy service and how UsernameToken policy is represented in the WS-Security headers. 