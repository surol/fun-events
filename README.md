Functional event producer/consumer API
======================================

[![NPM][npm-image]][npm-url]
[![CircleCI][ci-image]][ci-url]
[![codecov][codecov-image]][codecov-url]

The API implements a simple protocol of registering event consumers in event producers for the latter to be able
to notify the former on events:

```typescript
import { EventIterest, EventProducer } from 'fun-events';

// API supports arbitrary event consumer signatures
// An event is a set of arguments passed to consumers
function eventConsumer(type: string, event: Event) { 
  console.log('Event of type ', type, event);
}

// Event producer accepts consumers with predefined interface 
const eventProducer: EventProducer<(type: string, event: Event) => void>; // Some event producer;

// Call event producer to register consumer
// An event interest returned can be used to unregister
const interest: EventIterest = eventProducer(eventConsumer);

// Generate some events

interest.off(); // The eventConsumer will no longer recive events.
```


[npm-image]: https://img.shields.io/npm/v/fun-events.svg
[npm-url]: https://www.npmjs.com/package/fun-events
[ci-image]:https://circleci.com/gh/surol/fun-events.svg?style=shield
[ci-url]:https://circleci.com/gh/surol/fun-events  
[codecov-image]: https://codecov.io/gh/surol/fun-events/branch/master/graph/badge.svg
[codecov-url]: https://codecov.io/gh/surol/fun-events


`EventConsumer`
---------------

Event consumer is a function that is called to notify on each event produced by `EventProducer` when registered.

To register an event consumer in event producer just call the event producer with that event consumer as argument.


`EventProducer`
---------------

Event producer is a function accepting an event consumer as its only argument.

Once called, the consumer will be notified on events, while the consumer is interested in receiving them.

Note that event producer is a function, not a method.

An event producer also has a set of handy methods. More could be added at later time.

To convert a plain function into `EventProducer` an `EventProducer.of()` function can be used.


### `once()`

Registers an event consumer the will be notified on the next event at most once.


`EventIterest`
--------------

An interest for the events.

This is what returned returned from `EventProducer` when registering an event consumer.

Once the consumer is no longer interested in receiving events, an `off()` method should be called, indicated the
lost of interest.


`EventEmitter`
--------------

Event emitter is a handy implementation of event producer along with methods for emitting events.

It manages a list of registered event consumers, and removes them from the list once they lose their interest
(i.e. the `off()` is called on the returned event interest instance).

Implements `AIterable` interface by iterating over registered event consumers in order of their registration.

```typescript
import { EventEmitter } from 'fun-events';

const emitter = new EventEmitter<(event: string) => string>(); // Consumers may return values

// Register consumers
emitter.on(event => `${event}-`);
emitter.on(event => `-${event}`);

// Notify consumers
emitter.notify('listen');

// The returned values can be used
emitter.reduce((prev, consumer) => prev + consumer('o'), ''); // 'o--o` 
```


State Tracking
--------------

A state is a tree-like structure of sub-states (nodes) available under `StatePath`.

A `StateTracker` can be used to notify on state changes of particular nodes. Then the registered state update consumers
will be notified on these changes.

```typescript
import { StatePath, StateTracker } from 'fun-events';

const tracker = new StateTracker();

function stateChanged(path: StatePath) {
  console.log('State path changed:', path);
}

function property1Changed(path: StatePath, newValue: string, oldValue: string) {
  console.log('Property 1 changed from', oldValue, 'to', newValue);  
}

function property2Changed(path: StatePath, newValue: number, oldValue: number) {
  console.log('Property 2 changed from', oldValue, 'to', newValue);  
}

tracker.onUpdate(stateChanged); // Will be notified on all changes
tracker.track('property1', property1Changed); // Will be notified on `property1` changes
tracker.track(['property2'], property2Changed); // The path can be long

tracker.update(['some', 'path'], 'new', 'old');
// State path changed: ['some', 'path'] 

tracker.update('property1', 'new', 'old');
// State path changed: ['property1']
// Property 1 changed from old to new

tracker.update('property2', 1, 2);
// State path changed: ['property1']
// Property 2 changed from 2 to 1
```


Value Tracking
--------------

A `ValueTracker` class represents an accessor to some value which changes can be tracked.

A simple `ValueTracker` can be constructed using a `trackValue()` function:

```typescript
import { trackValue } from 'fun-events';

const value = trackValue(1);

value.on((newValue, oldValue) => console.log('Value changed from', oldValue, 'to', newValue));

console.log(value.it); // 1
value.it = 2; // Value changed from 1 to 2
console.log(value.it); // 2 
```

It is also possible to bind one value to another:
```typescript
import { trackValue } from 'fun-events';

const value1 = trackValue(1);
const value2 = trackValue(0).by(value1);

console.log(value2.it); // 1
value1.it = 2;
console.log(value2.it); // 2
```

To synchronize multiple values with each other a `ValueSync` can be used:
```typescript
import { trackValue, ValueSync } from 'fun-events';

const v1 = trackValue(1);
const v2 = trackValue(2);
const v3 = trackValue(3);

const sync = new ValueSync(0);

sync.sync(v1);
sync.sync(v2);
sync.sync(v3);

console.log(sync.it, v1.it === v2.it, v2.it === v3.it, v3.it === sync.it); // 0 true true true

v2.it = 11;
console.log(sync.it, v1.it === v2.it, v2.it === v3.it, v3.it === sync.it); // 11 true true true

sync.it = 22;
console.log(sync.it, v1.it === v2.it, v2.it === v3.it, v3.it === sync.it); // 22 true true true
```


DOM Events
----------

DOM events are supported by `DomEventProducer` and `DomEventDispatcher`. The former extends an `EventProducer` with
DOM-specific functionality. The latter can be attached to arbitrary `EventTarget` and provide a `DomEventProducer`s for
its events and to dispatch DOM events.

```typescript
import { DomEventDispatcher } from 'fun-events';

const dispatcher = new DomEventDispatcher(document.getElementById('my-button'));

dispatcher.on('click')(submit);
dispatcher.dispatch(new KeyboardEvent('click'));
```

### `DomEventProducer`

Extends `EventProducer` with the following properties:


#### `capture`

An event producer derived from this one that enables event capturing by default.

This corresponds to specifying `false` or `{ capture: true }` as a second argument to
`EventTarget.addEventListener()`.

```typescript
import { DomEventDispatcher } from 'fun-events';

const container = document.getElementById('my-container');

// Clicking on the inner elements would be handled by container first.
new DomEventDispatcher(container).on('click').capture(handleContainerClick);

// The above is the same as
container.addEventListener('click', handleContainerClick, true);
```


#### `instead`

An event producer derived from this one that registers listeners to invoke instead of default action.

It invokes an `Event.preventDefault()` method prior to calling the registered listeners. 

```typescript
import { DomEventDispatcher } from 'fun-events';

// Clicking on the link won't lead to navigation.
new DomEventDispatcher(document.getElementById('my-href')).on('click').instead(doSomethingElse); 
```


#### `just`

An event producer derived from this one that registers listeners preventing further propagation of the current
event in the capturing and bubbling phases.

It invokes an `Event.stopPropagation()` method prior to calling the registered listeners.

```typescript
import { DomEventDispatcher } from 'fun-events';

// The ascendants won't receive a click the div.
new DomEventDispatcher(document.getElementById('my-div')).on('click').just(handleClick); 
```


#### `last`

An event producer derived from this one that registers the last event listener.

It invokes an `Event.stopImmediatePropagation()` method prior to calling the registered listeners.

```typescript
import { DomEventDispatcher } from 'fun-events';

const dispatcher = new DomEventDispatcher(document.getElementById('my-div'))
const onClick = dispatcher.on('click');

// The ascendants won't receive a click the div.
onClick.last(() => console.log('1')); // This is the last handler 
onClick(() => console.log('2'));      // This one won't be called

dispatcher.dispatch(new KeyboardEvent('click')); // console: 1 
```


#### `passive`

An event producer derived from this one that accepts listeners that never call `Event.preventDefault()`.
   
This corresponds to specifying `{ passive: true }` as a second argument to `EventTarget.addEventListener()`.

```typescript
import { DomEventDispatcher } from 'fun-events';

// Scrolling events won't be prevented.
new DomEventDispatcher(document.body).on('scroll').passive(handleScroll);

// The above is the same as
document.body.addEventListener('scroll', handleScroll, { passive: true });
```
