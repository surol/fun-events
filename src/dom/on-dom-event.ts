/**
 * @module fun-events
 */
import { EventReceiver } from '../event-receiver';
import { EventSupply } from '../event-supply';
import { OnEvent } from '../on-event';

/**
 * DOM event listener signature.
 *
 * DOM events are never recurrent.
 *
 * @category DOM
 * @typeparam E  Supported DOM event type.
 */
export type DomEventListener<E extends Event> = EventReceiver<[E]>;

/**
 * A DOM event listener registrar signature.
 *
 * @category DOM
 * @typeparam E  Supported DOM event type.
 */
export abstract class OnDomEvent<E extends Event> extends OnEvent<[E]> {

  /**
   * An [[OnDomEvent]] sender derived from this one that enables event capturing by default.
   *
   * This corresponds to specifying `true` or `{ capture: true }` as a second argument to
   * `EventTarget.addEventListener()`.
   */
  get capture(): OnDomEvent<E> {
    return onDomEventBy((
        listener: DomEventListener<E>,
        opts?: AddEventListenerOptions | boolean,
    ) => {
      if (opts == null) {
        return this(listener, true);
      }
      if (typeof opts === 'object' && opts.capture == null) {
        return this(listener, { ...opts, capture: true });
      }
      return this(listener, opts);
    });
  }

  /**
   * An [[OnDomEvent]] sender derived from this one that registers listeners to invoke instead of the default action.
   *
   * It invokes an `Event.preventDefault()` method prior to calling the registered listeners.
   */
  get instead(): OnDomEvent<E> {
    return onDomEventBy((
        listener: DomEventListener<E>,
        opts?: AddEventListenerOptions | boolean,
    ) => {
      return this(
          function(event) {
            event.preventDefault();
            listener.call(this, event);
          },
          opts);
    });
  }

  /**
   * An [[OnDomEvent]] sender derived from this one that registers listeners preventing further propagation of
   * current event in the capturing and bubbling phases.
   *
   * It invokes an `Event.stopPropagation()` method prior to calling the registered listeners.
   */
  get just(): OnDomEvent<E> {
    return onDomEventBy((
        listener: DomEventListener<E>,
        opts?: AddEventListenerOptions | boolean,
    ) => {
      return this(
          function (event) {
            event.stopPropagation();
            listener.call(this, event);
          },
          opts);
    });
  }

  /**
   * An [[OnDomEvent]] sender derived from this one that registers the last event listener.
   *
   * It invokes an `Event.stopImmediatePropagation()` method prior to calling the registered listeners.
   */
  get last(): OnDomEvent<E> {
    return onDomEventBy((
        listener: DomEventListener<E>,
        opts?: AddEventListenerOptions | boolean,
    ) => {
      return this(
          function (event) {
            event.stopImmediatePropagation();
            listener.call(this, event);
          },
          opts);
    });
  }

  /**
   * An [[OnDomEvent]] sender derived from this one that accepts listeners never calling `Event.preventDefault()`.
   *
   * This corresponds to specifying `{ passive: true }` as a second argument to `EventTarget.addEventListener()`.
   */
  get passive(): OnDomEvent<E> {
    return onDomEventBy((
        listener: DomEventListener<E>,
        opts?: AddEventListenerOptions | boolean,
    ) => {
      if (opts == null) {
        return this(listener, { passive: true });
      }
      if (typeof opts === 'boolean') {
        return this(listener, { capture: opts, passive: true });
      }
      if (opts.passive == null) {
        return this(listener, { ...opts, passive: true });
      }
      return this(listener, opts);
    });
  }

}

export interface OnDomEvent<E extends Event> {

  /**
   * Registers a DOM event listener.
   *
   * @param listener  A DOM event listener to register.
   * @param opts  DOM event listener options to pass to `EventTarget.addEventListener()`.
   *
   * @return A DOM events supply.
   */
  // tslint:disable-next-line:callable-types
  (this: void, listener: DomEventListener<E>, opts?: AddEventListenerOptions | boolean): EventSupply;

}

/**
 * Converts a plain DOM event listener registration function to [[OnDomEvent]] sender.
 *
 * @category DOM
 * @typeparam E  Supported DOM event type.
 * @param register  A DOM event listener registration function returning an event supply.
 *
 * @returns An [[OnDomEvent]] sender registering event listeners with the given `register` function.
 */
export function onDomEventBy<E extends Event>(
    register: (
        this: void,
        listener: DomEventListener<E>,
        opts?: AddEventListenerOptions | boolean,
    ) => EventSupply,
): OnDomEvent<E> {

  const onDomEvent = (
      (
          listener: (this: void, event: E) => void,
          opts?: AddEventListenerOptions | boolean,
      ) => register(listener, opts)
  ) as OnDomEvent<E>;

  Object.setPrototypeOf(onDomEvent, OnDomEvent.prototype);

  return onDomEvent;
}
