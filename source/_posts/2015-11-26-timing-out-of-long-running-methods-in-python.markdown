---
layout: post
title: "Timing out of long running methods in Python"
date: 2015-11-26 22:26:03 +0530
comments: true
categories: ["Python"]
published: true
---

Sometimes there are conditions under which a function call could not return in a needed time period and would cause unexpected behavior. For example, a file read could take more time than anticipated and leave the code execution without proper control over what to do when such a situation occurs. This can be worse if the said function call directs to an external library which we can't control. 

Python has a nifty module called `signal` which exposes [UNIX Signal](https://en.wikipedia.org/wiki/Unix_signal#POSIX_signals) numbers and a way to register callbacks for each signal. Out of the UNIX Signals available, what interests us in this particular situation is the [SIGALRM](http://linux.die.net/man/2/alarm) signal which allows us to sort of wind out an OS level alarm clock that would send a signal to the calling process after the set number of seconds. We can make use of this functionality (only in UNIX of course) to set a timeout before a function call with the possibility to hang or take unexpected durations to finish.

```python
import signal
import time

def timeout_handler(num, stack):
    print("Received SIGALRM")
    raise Exception("FUBAR")

def long_function():
    print("LEEEEROYYY JENKINSSSSS!!!")
    time.sleep(60)

signal.signal(signal.SIGALRM, timeout_handler)
signal.alarm(10)

try:
    print("Before: %s" % time.strftime("%M:%S"))
    long_function()
except Exception as ex:
    if "FUBAR" in ex:
        print("Gotcha!")
    else:
        print("We're gonna need a bigger boat!")
finally:
    signal.alarm(0)
    print("After: %s" % time.strftime("%M:%S"))
```

If you run this Python code, you will see an output similar to the following. 

```
Before: 22:10
LEEEEROYYY JENKINSSSSS!!!
Received SIGALRM
Gotcha!
After: 22:20
```

Let us take a walk through the code. 

First let's look at the supposedly long running function. What this does is to simply wait for 60 seconds before continuing. This is to emulate a blocked file read, or a hung server connection.

```python
def long_function():
    print("LEEEEROYYY JENKINSSSSS!!!")
    time.sleep(60)
```

We need to tell the `signal` module to execute our own function when `SIGALRM` signal is received by the process. So let's first write a handler function. 

```python
def timeout_handler(num, stack):
    print("Received SIGALRM")
    raise Exception("FUBAR")
``` 

Notice that in the `timeout_handler` function we are raising an exception. This is to make our decision making process a bit easier. More on that later. Now let's register this with the `SIGALRM` signal.

```python
signal.signal(signal.SIGALRM, timeout_handler)
```

Now when this Python process receives a `SIGALRM` signal, it will execute the `timeout_handler` function. 

`signal.alarm(10)` tells the OS to send a `SIGALRM` after 10 seconds from this point onwards. After setting the alarm clock we invoke the long running function. 

```python
signal.alarm(10)

try:
    print("Before: %s" % time.strftime("%M:%S"))
    long_function()
except Exception as ex:
    if "FUBAR" in ex:
        print("Gotcha!")
    else:
        print("We're gonna need a bigger boat!")
finally:
    signal.alarm(0)
    print("After: %s" % time.strftime("%M:%S"))
```

10 seconds after invoking the `long_function`, the execution will be interrupted and `timeout_handler` function will raise the exception `FUBAR`. We are catching that at line 6 and based on that we can make a decision on what to do since our function with a possibility to hang has in fact seems to be hung and did not terminate in a healthy or unhealthy manner. 

Notice that we set the alarm to 0 seconds after all is done. That is to do one thing, cancel the previously set alarm (although in our case it [doesn't even matter](https://media.giphy.com/media/Vuw9m5wXviFIQ/giphy.gif)).

If we check the output of this program again, you will see that we received the `SIGALRM` exactly after 10 seconds.

```python
Before: 22:10
LEEEEROYYY JENKINSSSSS!!!
Received SIGALRM
Gotcha!
After: 22:20
```

Clear as a bell right?

Let's do some tweaking. Let's not set the OS alarm clock. Let's send the signal ourselves. 

```python
import signal
import time
import os

def timeout_handler(num, stack):
    print("Received SIGALRM [%s]" % num)
    raise Exception("FUBAR")

def long_function():
    print("LEEEEROYYY JENKINSSSSS!!!")
    time.sleep(60)

print("PID: %s" % os.getpid())
signal.signal(signal.SIGALRM, timeout_handler)
# signal.alarm(10)

try:
    print("Before: %s" % time.strftime("%M:%S"))
    long_function()
except Exception as ex:
    if "FUBAR" in ex:
        print("Gotcha!")
    else:
        print("We're gonna need a bigger boat!")

print("After: %s" % time.strftime("%M:%S"))
```

We have commented out the alarm clock setting in line 15 and in line 13 we have printed out the process ID of the Python process. We are going to send the `SIGALRM` signal using the `kill` command to that process ID.

Open two terminals and run the above script in one terminal. Note the process ID and in the other terminal execute the following command.

```bash
kill -14 {pid}
```

`14` is the integer number of the `SIGALRM` signal. Notice that the time duration between the start of the `long_function` call and the `FUBAR` exception differs based on the time we take to send the `SIGALRM` signal. 

One important fact to note when using `signal` module is that it doesn't work well in a multi-threaded flow. The callback has to be registered in main thread, and the alarm will also be received by the main thread. So if you're trying to match `signal` and `threading` modules together you'll frequently see the following exception being raised.

```
signal only works in main thread
```

Better thread down, or thread up and use a `Queue`. 