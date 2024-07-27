---
layout: default
title: "Continuation passing macros in lisp from scratch (Part 1)"
excerpt: "Implementing Python like yield functionality in Lisp and building an inuition for implementing continuation passing, as mentioned in On Lisp book"
---

# Continuation passing macros in Lisp from scratch 
Paul Graham, in his book [On Lisp](https://paulgraham.com/onlisp.html), has written a few chapters on advanced macro usage, especially for creating 'Domain Specific Languages'.

In chapter 20, 'Continuations', he describes Scheme's continuation capture and call mechanism. This is like capturing process context at the point of `call/cc` function call and saving it somewhere. Intuitively, it follows that this mechanism can be used for a variety of things, from Python like `yield` statements to full-fledged cooperative multithreading.

In the second section of the same chapter, Paul has described how to implement this mechanism in common lisp using some macros and additional constraints. He has described six macros that are sufficient to implement any `call/cc` based use case. Although the total code required to implement these 6 macros is less than 20 lines, I found them quite difficult to understand. This difficulty stems from 2 reasons: Lisp is quite a terse language in itself, and secondly, Lisp macros are difficult to grasp for those who have worked in C or Python-like environments.

This is my attempt to build these macros from the ground up, starting with the simplest scenarios and solutions. Although the final code is just 2 macros, which resemble quite closely with the `bind` and `values` macros described in the book, I hope the process builds enough intuition to understand the rest.

## Step 1: A Python like range generator function using global variables
Let's start with a simple scenario. I want a function `(range n)` to give me values from 1 to n, one at a time. One simple approach to doing this is using a global variable to keep track of the current count and increment this global state on each call. 

Here is the code to implement this:
```
(defvar *state* 1)

(defun range (n)
  (if (> *state* n)
      nil
      (let ((ret *state*))
	(setf *state* (1+ *state*))
	ret)))
```
Essentially, I am setting `*state*` to the next value and incrementing it every time I call `range` function.

## Step 2: Iterator using closure
The Problem with the above approach is that we have only one shared global variable. So multiple calls to `range` with different `n` would affect each other. To avoid this, we can encapsulate this global state with the function using closures.

Thus, instead of returning value directly from a function, I will return an iterator (which is just a lambda) that will give a value on each call. 

Here is the code:
```
(defun iter-range (n)
  (let ((mystate 1))
    (lambda ()
      (if (> mystate n)
	  nil
	  (let ((ret mystate))
	    (setf mystate (1+ mystate))
	    ret)))))
```
Here, I am binding `mystate` in the closure of the returned lambda. On call to `iter-range` this lambda with closure is returned. Lambda works exactly the same way the `range` function above works, but now each call to `iter-range` returns an independent iterator that can be evaluated without affecting each other's state.

## Step 3: 'yield' using a global list
Let's put closure in the background for now. We know how to transform a function with a global variable into a lambda with closure for better isolation. From this step onwards, I'll just use globals until the last step.

Now that we have a Python `range`-like function, my next target is to create an iterator that gives arbitrary values instead of a sequence of 1..n. That is, I want a Python `yield`-like operator. So, if I add the following lines in a function body
```
(yield 2)
(yield 3)
(yield 5)
(yield 7)
(yield 11)
```
then the function should return these values one at a time.


### Implementing without the yield function
Let's implement a code to return custom values using the structure described in Step 1.
In step 1 we maintained a global variable to keep the next value to return and incremented this global on each function call. This time we can't assume any such relation between successive values. So instead of storing one value, let's store all values that we want to return in a global list. On each call, we'll just return the first value from the list and save the rest of the list.

Here is a code to implement this structure:
```
(defvar *state* '())

(defun fun1 ()
  (setf *state* '())
  (setf *state* (append *state* '(1)))
  (setf *state* (append *state* '(3)))
  (setf *state* (append *state* '(5)))
  (setf *state* (append *state* '(7)))
  (setf *state* (append *state* '(11)))
  (lambda ()
    (pop *state*)))

;; call this function
(defvar iter nil)
(setq iter (fun1))

;; call lambda multiple times to get each value
(print (funcall iter))      ; 1
(print (funcall iter))      ; 3
(print (funcall iter))      ; 5
(print (funcall iter))      ; 7
(print (funcall iter))      ; 11
```

**Explanation**: \*state\* is a list. Body of `fun1` appends values 1, 3, 5, 7, and 11 to this list. Finally it returns a lambda, which just returns a popped value from \*state\*.

### Implementing the yield function
Now we can write a function `yield` to abstract this part. 

```
(defun yield (x)
  (setf *state* (append *state* `(,x))))

(defun fun2 ()
  (setf *state* '())
  (yield 1)
  (yield 3)
  (yield 5)
  (yield 7)
  (yield 11)
  (lambda ()
    (pop *state*)))

;; call this function

(defvar iter nil)
(setq iter (fun2))

;; call lambda multiple times to get each value
(print (funcall iter))      ; 1
(print (funcall iter))      ; 3
(print (funcall iter))      ; 5
(print (funcall iter))      ; 7
(print (funcall iter))      ; 11
```    

In function `yield`, we abstract this line:
```
(setf *state* (append *state* '(1)))
```
to this line:
```
(setf *state* (append *state* `(,x)))
```
which is just quoting the list and unquoting the element inside. This unquoting already gives a taste of how a macro will evolve from this code.


[Continued in Part 2](/2024/07/24/lisp-yield-2.html)
