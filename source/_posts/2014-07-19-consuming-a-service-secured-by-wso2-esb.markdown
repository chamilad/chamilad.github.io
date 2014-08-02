---
layout: post
title: "Consuming a Service Secured by WSO2 ESB"
date: 2014-07-19 18:27:13 +0530
comments: true
categories: [WSO2, ESB, Web Services, Security]
---

In the [last post](http://code.chamiladealwis.com/blog/2014/07/18/securing-a-web-service-with-wso2-esb/) I explained the steps needed, although somewhat minimal, to secure an unsecured backend service with WSO2 ESB. In this post I will continue on to the client side of the communication explaining the minimal client needed to communicate with the secure proxy service we created and take a peak at the action going on under the hood.

# UsernameToken
Before we dive in to the client side code let's take a look at the WS-Policy for the UsernameToken security we applied to our service.

Login to the WSO2 ESB [Management console](https://localhost:9443/carbon) and go to the Proxy service we created. In the "Quality of Service Configuration" section there is a link to "Policies". Go to it and click in the "Edit Policy" button in front of the SOAP12Binding sub section. 

What we are interested here is the content inside the `<sp:SignedSupportingTokens xmlns:sp="http://schemas.xmlsoap.org/ws/2005/07/securitypolicy">` tag. This describes the authentication policy that is applied to the proxy service. Since we applied UsernameToken the content will be similar to the following. 

```xml
<sp:SignedSupportingTokens xmlns:sp="http://schemas.xmlsoap.org/ws/2005/07/securitypolicy">
    <wsp:Policy>
       <sp:UsernameToken sp:IncludeToken="http://schemas.xmlsoap.org/ws/2005/07/securitypolicy/IncludeToken/AlwaysToRecipient"></sp:UsernameToken>
    </wsp:Policy>
 </sp:SignedSupportingTokens>
```

This policy is embedded in the WSDL of the secured proxy service we created so the consuming party can derive the security demands of the service from it. 

#Writing the Java Client

To access the secure proxy service the following requirements should be satisfied.

1. The server certificate should be added to the trust store. 
2. Axis2 modules and libraries of Apache Rampart and its dependencies should be provided
3. The username and the password for the account which is granted access to the proxy service should be provided.

## Adding the certificate to the trust store

As you might be aware in HTTPS the server has to provide a self-signed or CA signed certificate for its secure communication and the client has to add that certificate as trusted to its trust store. WSO2Carbon products come with a self-signed certificate and you can add that certificate to your trust store to initiate secure communication. For demo purposes we'll use the same trust store that WSO2 ESB uses so you will not be needing to extract and import the certificate to your own trust store.

In case you're using your own trust store, [this article](http://udaraliyanage.wordpress.com/2014/06/14/convert-wso2carbon-jks-into-pem-format-extract-certificate-and-private-key/) by Udara Liyanage describes how to extract the server certificate from the keystore. After the certificate is extracted add it to your trust store. For this you can use the keytool command as follows.

```bash
keytool -import -alias wso2_esb_server -file /path/to/server-certificate-file.crt -keystore /path/to/trust-store.jks -storepass truststorepassword
```
You can use your own trust store and set the path to the keystore file in the code or you can use the Java runtime trust store which is located in `$JRE_HOME/lib/security`. 

To verify that the certificate was added you can grep the list of certificates in the trust store.

```bash
keytool -list -keystore /path/to/trust-store.jks -storepass truststorepassword | grep wso2_esb_server
```

## Apache Rampart

Apache Rampart handles the security aspects in Axis2 and is needed to make use of WS-Security. 

[Download Rampart](http://axis.apache.org/axis2/java/rampart/download.html) and extract the zip file. 

Inside the lib folder the rampart library and its dependencies are contained. Inside the modules folder rampart and rahas Axis2 modules are contained. Rampart libraries should be available in the Classpath of the Java client we are going to execute while the Rampart Axis2 modules should be available in an Axis2 repository.  

[An Axis2 repository](http://wso2.com/library/tutorials/axis2-repository/) consist of the following folder structure.

```
└── repository
    ├── modules
    ├── services
    └── conf
       └── axis2.xml
```

If you've downloaded and extracted Axis2 to be used as a standalone Axis2 server then you can use that location. Copy the module archive (.mar) files from the extracted rampart folder to the repository/modules folder. 

In the client code we will be engaging the Rampart module to handle the WS-Security headers.

## Client Code

Assuming the service and the operations described in the ["Creating a Web Service using Apache Axis2"](http://code.chamiladealwis.com/blog/2014/07/01/creating-a-web-service-using-apache-axis2-no-ide/) article the following Java client can be used to access the secured proxy service. 

Create the Stub and the CallbackHandler classes using the `wsdl2java` tool as described in the above mentioned article. You must use the WSDL of the secured proxy service for source generation. Then code the client as follows. Replace `ESB_HOME` and `AXIS2_HOME` with your own locations.

```java

package com.chamiladealwis.ws.client;

import java.rmi.RemoteException;

import org.apache.axis2.context.ConfigurationContext;
import org.apache.axis2.context.ConfigurationContextFactory;

public class SimpleServiceSecureClient {

    public static void main(String[] args) {
        try {
            
            // set trust store path and password. 
            System.setProperty("javax.net.ssl.trustStore",
                    "ESB_HOME/repository/resources/security/client-truststore.jks");
            System.setProperty("javax.net.ssl.trustStorePassword", "wso2carbon");

            // create the configuration context from an axis repository. 
            ConfigurationContext ctx =
                                   ConfigurationContextFactory.createConfigurationContextFromFileSystem("AXIS2_HOME/repository",null);

            SimpleServiceExampleProxyStub secureStub = new SimpleServiceExampleProxyStub(ctx);
            
            // set username and password to access the service
            secureStub._getServiceClient().getOptions().setUserName("admin");
            secureStub._getServiceClient().getOptions().setPassword("admin");
            
            // engage rampart module to set WS-Security headers.
            secureStub._getServiceClient().engageModule("rampart");

            // execute remote call
            SimpleServiceExampleProxyStub.Add addReq = new SimpleServiceExampleProxyStub.Add();
            addReq.setNum1(45);
            addReq.setNum2(53);

            SimpleServiceExampleProxyStub.AddResponse addResponse = secureStub
                    .add(addReq);

            System.out.println("Response received : " + addResponse.get_return());

        } catch (RemoteException e) {
            e.printStackTrace();
        }
    }
}
```

We have used the trust store that WSO2 ESB uses so we will not have to import the certificate used by the server.

```java
System.setProperty("javax.net.ssl.trustStore",
        "ESB_HOME/repository/resources/security/client-truststore.jks");
System.setProperty("javax.net.ssl.trustStorePassword", "wso2carbon");
```

The ConfigurationContext is generated from the repository location. We have copied the Rampart and Rahas Axis2 modules to this repository to be used when later engageModule("rampart") is called.

```java
ConfigurationContext ctx = ConfigurationContextFactory.createConfigurationContextFromFileSystem("AXIS2_HOME/repository",null);

SimpleServiceExampleProxyStub secureStub = new SimpleServiceExampleProxyStub(ctx);

....
secureStub._getServiceClient().engageModule("rampart");
```

The username and the password to the account that is allowed to use the secured proxy service is included.

```java
secureStub._getServiceClient().getOptions().setUserName("admin");
secureStub._getServiceClient().getOptions().setPassword("admin");
```

Note that this code works with SOAP messages and WS-* standards. If you want to use the REST communication method use the following code. This code does not make use of Rampart module since authentication is done using HTTP Authorization header (Basic auth mechanism since we've used UsernameToken policy in our proxy service). 

```java
package com.chamiladealwis.ws.client;

import java.rmi.RemoteException;

import org.apache.axis2.Constants;
import org.apache.axis2.transport.http.HTTPConstants;
import org.apache.axis2.transport.http.HttpTransportProperties;
import org.apache.axis2.transport.http.HttpTransportProperties.Authenticator;

public class SimpleServiceSecureClient {

    public static void main(String[] args) {
        try {
            System.setProperty("javax.net.ssl.trustStore",
                    "/home/chamilad/dev/wso2esb-4.8.1/repository/resources/security/client-truststore.jks");
            System.setProperty("javax.net.ssl.trustStorePassword", "wso2carbon");

            SimpleServiceExampleProxyStub secureStub = new SimpleServiceExampleProxyStub();
            
            // set credentials to the secure proxy service
            HttpTransportProperties.Authenticator authenticator = new Authenticator();
            authenticator.setUsername("admin");
            authenticator.setPassword("admin");
            secureStub._getServiceClient().getOptions().setProperty(HTTPConstants.AUTHENTICATE, authenticator);
            secureStub._getServiceClient().getOptions().setProperty(Constants.Configuration.ENABLE_REST, Constants.VALUE_TRUE);

            // execute remote call
            SimpleServiceExampleProxyStub.Add addReq = new SimpleServiceExampleProxyStub.Add();
            addReq.setNum1(45);
            addReq.setNum2(53);

            SimpleServiceExampleProxyStub.AddResponse addResponse = secureStub
                    .add(addReq);

            System.out.println("Response received : " + addResponse.get_return());
        } catch (RemoteException e) {
            e.printStackTrace();
        }
    }
}
```

Now get the backend service and the WSO2 ESB running and execute the client to see the results. If you use Wireshark or TCPMon you will observe that the communication between the client and the ESB is encrypted and thus not visible to outsiders while the communication between the ESB and the backend service is unencrypted. 

## "Unable to engage module : rampart"

If you get an error with the message "Unable to engage module : rampart" it is most likely because Axis2 cannot find the Rampart module archive files. Verify the following and try again. 

* See that the repository location specified when creating the ConfigurationContext contains rampart*.mar and rahas*.mar files in the modules folder. 
* Check the Classpath locations to verify that rampart*.jar files are available. 

#Action Under the Hood
Let us investigate the SOAP/REST messages that are used to communicate with the secured proxy service. 

I used [Charles Proxy](http://www.charlesproxy.com/documentation/proxying/ssl-proxying/) to capture the encrypted communication between the client and the ESB. For some reason (I'm guessing [this](http://vincent.bernat.im/en/blog/2011-ssl-perfect-forward-secrecy.html) to be the reason, but this is still to be verified. The cipher suite mentioned in the Server Hello packet is TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA.) Wireshark couldn't decrypt the captured packets even when the server's private key was provided. Charles Proxy can make use of SSL Proxying in which it produces its own certificates based on its root certificate to communicate as a man in the middle. Charles' root certificate should be added to the trust store that is used in our client.

The SOAP message that is sent from our client consists of the following SOAP header.

```xml
<soapenv:Header>
    <wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd" soapenv:mustUnderstand="true">
        <wsu:Timestamp wsu:Id="TS-1">
            <wsu:Created>2014-08-02T09:00:56.439Z</wsu:Created>
            <wsu:Expires>2014-08-02T09:05:56.439Z</wsu:Expires>
        </wsu:Timestamp>
        <wsse:UsernameToken wsu:Id="UsernameToken-2">
            <wsse:Username>admin</wsse:Username>
            <wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">admin</wsse:Password>
        </wsse:UsernameToken>
    </wsse:Security>
</soapenv:Header>
```

Notice the username and the password fields? Yes, the password is sent in plaint text over HTTPS therefore if somehow HTTPS is compromised the password will be visible. To overcome this the WS-Policy for WS-Security can be [modified to use a password digest](http://soasecurity.org/2014/03/19/securing-a-proxy-service-in-wso2-esb-1-1-using-hash-passwords-in-username-token) instead of a plain text password. 

The function of `<wsu:Timestamp>`, which in short is to prevent replay attacks, is best described [here](http://hasini-gunasinghe.blogspot.com/2012/02/timestamp-in-ws-security-to-mitigate.html). 

WSO2 ESB will process and strip the WSSE:Security header from the message to forward it to the backend service. When the response comes from the backend service ESB will add the related WS-Security headers to the outgoing message. 

```xml
<soapenv:Header>
    <wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" soapenv:mustUnderstand="true">
        <wsu:Timestamp xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd" wsu:Id="Timestamp-26">
            <wsu:Created>2014-08-02T09:00:56.704Z</wsu:Created>
            <wsu:Expires>2014-08-02T09:05:56.704Z</wsu:Expires>
        </wsu:Timestamp>
    </wsse:Security>
</soapenv:Header>
```

If you used REST instead of SOAP you will see the following HTTP headers in the outgoing message from your client. 

```
POST /services/SimpleServiceSecureExampleProxy.SimpleServiceSecureExampleProxyHttpsSoap12Endpoint HTTP/1.1
Content-Type: application/xml; charset=UTF-8
SOAPAction: urn:getItemsAvailable
User-Agent: Axis2
Transfer-Encoding: chunked
Host: hostname:8243
Authorization: Basic YWRtaW46YWRtaW4=
Content-Length: 101

<ns1:add xmlns:ns1="http://client.ws.chamiladealwis.com">
    <ns1:num1>45</ns1:itemName>
    <ns1:num2>53</ns1:clarkName>
</ns1:add>
```

Note the HTTP "Authorization" header and the value "Basic". The value after "Basic" is the base64 encoded string containing the username:password. You can decrypt the encoded string to verify this using any [online tool](http://www5.rptea.com/base64/).

There are many policies that can be used to secure a proxy service, and UsernameToken is just the simplest form. More complex policies involve defining custom password callback handlers to refer to resources like federated identity to authenticate server calls. UsernameToken deals with plain text passwords so it should be only used for development purposes and not for production. 

