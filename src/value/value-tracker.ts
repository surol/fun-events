import { noEventInterest } from '../event-interest';
import { OnEvent, onEventFrom } from '../on-event';
import { EventSender, OnEvent__symbol } from '../event-sender';
import { AfterEvent__symbol, EventKeeper } from '../event-keeper';
import { AfterEvent, afterEventBy } from '../after-event';

/**
 * Value accessor and changes tracker.
 *
 * Can be used as `EventSender` and `EventKeeper`. Events originated from them never exhaust.
 */
export abstract class ValueTracker<T = any, N extends T = T> implements EventSender<[N, T]>, EventKeeper<[T]> {

  /**
   * @internal
   */
  private _by = noEventInterest();

  /**
   * Registers value changes receiver. The new value is sent as first argument, and the old value as a second one.
   */
  abstract readonly on: OnEvent<[N, T]>;

  /**
   * Registers current and updated values receiver.
   */
  readonly read: AfterEvent<[T]> = afterEventBy<[T]>(receiver => this.on(value => receiver(value)), () => [this.it]);

  get [OnEvent__symbol](): OnEvent<[N, T]> {
    return this.on;
  }

  get [AfterEvent__symbol](): AfterEvent<[T]> {
    return this.read;
  }

  /**
   * The tracked value.
   */
  abstract it: T;

  /**
   * Binds the tracked value to the given value `keeper`.
   *
   * Updates the value when the `keeper` sends another value.
   *
   * If the value is already bound to another value sender ot keeper, then unbinds from the old one first.
   *
   * Call the `off()` method to unbind the tracked value from the `keeper`.
   *
   * Note that explicitly updating the value would override the value received from the `keeper`.
   *
   * @param keeper The originating value keeper.
   *
   * @returns `this` instance.
   */
  by(keeper: EventKeeper<[T]>): this;

  /**
   * Binds the tracked value to the value keeper extracted from the events sent by the given `sender`.
   *
   * Updates the value when extracted keeper sends another value.
   *
   * If the value is already bound to another value sender or keeper, then unbinds from the old one first.
   *
   * Call the `off()` method to unbind the tracked value from the `sender`.
   *
   * Note that explicitly updating the value would override the value received from the `sender`.
   *
   * @param sender The event sender to extract value keepers from.
   * @param extract A function extracting value keepers from events received from the `sender`. May return `undefined`
   * to suspend receiving values.
   *
   * @returns `this` instance.
   */
  by<U extends any[]>(
      sender: EventSender<U>,
      extract: (this: void, ...event: U) => EventKeeper<[T]> | undefined): this;

  by<U extends any[]>(
      senderOrKeeper: EventSender<U> | EventKeeper<[T]>,
      extract?: (this: void, ...event: U) => EventKeeper<[T]> | undefined): this {
    this.off();

    if (!extract) {

      const keeper = senderOrKeeper as EventKeeper<[T]>;

      this._by = keeper[AfterEvent__symbol](value => this.it = value);
    } else {

      const sender = senderOrKeeper as EventSender<U>;

      this._by = onEventFrom(sender).consume((...event: U) => {

        const extracted = extract(...event);

        return extracted && extracted[AfterEvent__symbol](value => this.it = value);
      });
    }
    this._by.whenDone(() => this._by = noEventInterest());

    return this;
  }

  /**
   * Unbinds the tracked value from the value sender or keeper this tracker is bound to with `by()` method.
   *
   * If the tracker is not bound then does nothing.
   *
   * @param reason Arbitrary reason of unbinding the value.
   *
   * @returns `this` instance.
   */
  off(reason?: any): this {
    this._by.off(reason);
    return this;
  }

  /**
   * Removes all registered event receivers.
   *
   * After this method call they won't receive events. Informs all corresponding event interests on that by calling
   * the callbacks registered with `whenDone()`.

   * @param reason A reason to stop sending events to receivers.
   *
   * @returns `this` instance.
   */
  abstract done(reason?: any): this;

  /**
   * Removes all registered event receivers.
   *
   * This is a deprecated alias of `done()`
   *
   * @deprecated Use `done()` instead.
   */
  clear(reason?: any): this {
    return this.done(reason);
  }

}
