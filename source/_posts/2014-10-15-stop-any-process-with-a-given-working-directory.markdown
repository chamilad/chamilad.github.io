---
layout: post
title: "Stop any process with a given working directory"
date: 2014-10-15 19:22:34 +0530
comments: true
categories: 
published: false
---


```bash
wd="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
for pid in $(pgrep java)
do
    pr_wd=`pwdx $pid`
    if [[ $pr_wd == *$wd* ]]; then
        echo "killing $pr_wd"
        kill $pid
    fi
done
```
