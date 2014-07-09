---
layout: post
title: "Wireshark Crashing in Ubuntu"
date: 2014-07-09 22:25:05 +0530
comments: true
categories: [Ubuntu, Wireshark]
---

If you have customized your ubuntu GTK theme, Wireshark would most likely crash as soon as scrollbars come in to play. I experienced this in Ubuntu 14.04 and found the solution to be disabling overlay scrollbars that come as the default. 

To do this simply add an environment variable called LIBOVERLAY_SCROLLBAR with value 0. 

```bash
export LIBOVERLAY_SCROLLBAR=0
```