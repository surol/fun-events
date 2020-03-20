/**
 * @packageDocumentation
 * @module @proc7ts/fun-events
 */
import { AfterEvent } from '../after-event';
import { AfterEvent__symbol, EventKeeper, EventSupplier, isEventKeeper } from '../base';
import { afterSent } from './after-sent';

/**
 * Builds an [[AfterEvent]] keeper of events sent by the given `keeper`.
 *
 * @category Core
 * @typeparam E  An event type. This is a list of event receiver parameter types.
 * @param keeper  A keeper of events.
 *
 * @returns An [[AfterEvent]] keeper of events originated from the given `keeper`.
 */
export function afterSupplied<E extends any[]>(keeper: EventKeeper<E>): AfterEvent<E>;

/**
 * Builds an [[AfterEvent]] keeper of events sent by the given `supplier`.
 *
 * The event generated by `fallback` will be sent to the registered first receiver, unless `supplier` sends one.
 *
 * This is a synonym of [[afterSent]], unless `supplier` is an [[EventKeeper]].
 *
 * @typeparam E  An event type. This is a list of event receiver parameter types.
 * @param supplier  An event supplier.
 * @param fallback  A function creating fallback event. When omitted, the initial event is expected to be sent by
 * `supplier`. A receiver registration would lead to an error otherwise.
 *
 * @returns An [[AfterEvent]] keeper of events either originated from the given `supplier`, or `initial` one.
 */
export function afterSupplied<E extends any[]>(
    supplier: EventSupplier<E>,
    fallback?: (this: void) => E,
): AfterEvent<E>;

export function afterSupplied<E extends any[]>(
    supplier: EventSupplier<E>,
    fallback?: (this: void) => E,
): AfterEvent<E> {
  return isEventKeeper(supplier) ? supplier[AfterEvent__symbol]() : afterSent(supplier, fallback);
}
