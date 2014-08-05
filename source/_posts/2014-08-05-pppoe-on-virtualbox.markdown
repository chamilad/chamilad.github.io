---
layout: post
title: "PPPOE on VirtualBox"
date: 2014-08-05 23:08:34 +0530
comments: true
categories: [Virtualization]
---

A quick note!

If your internet connection comes as a PPPOE connection and it can't be selected on the drop down list when "Bridged network" is selected on Network tab of the VM settings in VirtualBox. You can create a host-only network and configure a static ip for eth0 on the guest OS to make it accessible to outside. 

A host-only network virtualizes the network interface of the host OS and uses it as a loopback device to enable guest OS to communicate on their network and with the host[[1]](https://www.virtualbox.org/manual/ch06.html).

Go to VirtualBox preferences (Ctrl + G) and navigate to the Network tab. Click on the "Host-Only network" tab and add a new host-only network. On the dialog that comes, go to the "DHCP Server" tab and disable it. VirtualBox provides its own DHCP server so the guest OS are able to use it, but if you want a consistent IP disabling it is the best course. Note down the IP address of the host-only network and its netmask. You might want to restart the networking service on the host os. Issue an `ifconfig -a` and you will see the virtual loopback device being listed.

Go to your VM's settings and navigate to the "Network" tab. On the network adaptor you're going to use as the connection to the network, select "Host-Only adaptor" as the networking type to attach to. Then select the host-only network device we created in the VirtualBox preferences. Select "Allow All" for "Promiscuous Mode". 

Start your VM and login as a super user. Define[[2]](https://wiki.debian.org/NetworkConfiguration#Configuring_the_interface_manually)[[3]](http://www.putorius.net/2012/10/how-to-configure-static-ip-address-in.html) the network interface you attached to the Host-Only network with a static IP in the network of the host-only network. Point the gateway to the IP address of the host-only network. Restart the network service and your guest OS will have an IP which is accessible from the host. 

**Note**: If you come across any issues when restarting the network service with an error message containing "file exists" it's possible that network devices and their mappings to network device names have been jumbled. Best course to take is to delete the rules file and reboot the machine to regenerate it. This issue is likely to occur in Ubuntu distributions before 12.04 or in RedHat distributions[[4]](http://www.freedesktop.org/wiki/Software/systemd/PredictableNetworkInterfaceNames/). 

```bash
sudo rm -rv /etc/udev/rules.d/70-persistant-*
sudo reboot
```

[1] - [https://www.virtualbox.org/manual/ch06.html](https://www.virtualbox.org/manual/ch06.html)

[2] - [https://wiki.debian.org/NetworkConfiguration#Configuring_the_interface_manually](https://wiki.debian.org/NetworkConfiguration#Configuring_the_interface_manually)

[3] - [http://www.putorius.net/2012/10/how-to-configure-static-ip-address-in.html](http://www.putorius.net/2012/10/how-to-configure-static-ip-address-in.html)

[4] - [http://www.freedesktop.org/wiki/Software/systemd/PredictableNetworkInterfaceNames/](http://www.freedesktop.org/wiki/Software/systemd/PredictableNetworkInterfaceNames/)