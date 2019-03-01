import { noEventInterest } from '../event-interest';
import { EventProducer } from '../event-producer';
import { EventSource, onEventKey } from '../event-source';
import { afterEventKey, CachedEventSource } from '../cached-event-source';
import { CachedEventProducer } from '../cached-event-producer';

/**
 * Value accessor and changes tracker.
 */
export abstract class ValueTracker<T = any, N extends T = T> implements EventSource<[N, T]>, CachedEventSource<[T]> {

  /**
   * @internal
   */
  private _by = noEventInterest();

  /**
   * Value changes event producer.
   *
   * The registered event consumers receive new and old values as arguments.
   */
  abstract readonly on: EventProducer<[N, T]>;

  /**
   * An event producer notifying on each value, including initial one.
   *
   * The registered event consumer will be notified an original value immediately on registration.
   */
  readonly each: CachedEventProducer<[T]> =
      CachedEventProducer.of<[T]>(consumer => this.on(value => consumer(value)), () => [this.it]);

  get [onEventKey](): EventProducer<[N, T]> {
    return this.on;
  }

  get [afterEventKey](): CachedEventProducer<[T]> {
    return this.each;
  }

  /**
   * Reads the tracked value.
   *
   * @returns The value.
   */
  abstract get it(): T;

  /**
   * Updates the tracked value.
   *
   * @param value New value.
   */
  abstract set it(value: T);

  /**
   * Binds the tracked value to the `source`.
   *
   * Updates the value when the `source` changes.
   *
   * If the value is already bound to another source, then unbinds from the old source first.
   *
   * Call the `off()` method to unbind the tracked value from the source.
   *
   * Note that explicitly updating the value would override the value received from the source.
   *
   * @param source The cached event source used as a value source.
   */
  by(source: CachedEventSource<[T]>): this {
    this.off();
    this._by = source[afterEventKey](value => this.it = value);
    return this;
  }

  /**
   * Unbinds the tracked value from the source.
   *
   * After this call the tracked value won't be updated on the source modification.
   *
   * If the value is not bound then doe nothing.
   */
  off() {
    this._by.off();
    this._by = noEventInterest();
  }

}
