/**
 * @packageDocumentation
 * @module @proc7ts/fun-events
 */
import { OnEvent } from '../on-event';
import { shareOn } from './share-on';
import { translateOn_ } from './translate-on';

/**
 * Creates an event processor that sends the values of incoming events.
 *
 * Events are valued by provided `value` function. The `null`, `undefined`, and `false` values are dropped.
 *
 * @category Core
 * @typeParam TEvent - Incoming event type.
 * @typeParam TValue - Event value type.
 * @param valueOf - Event value detector function. Accepts incoming event as parameters and returns either its value,
 * or `false`/`null`/`undefined` to ignore it.
 *
 * @returns New event processor.
 */
export function valueEvents<TEvent extends any[], TValue>(
    valueOf: (this: void, ...event: TEvent) => TValue | false | null | undefined,
): (this: void, input: OnEvent<TEvent>) => OnEvent<[TValue]> {

  const mapper = valueEvents_(valueOf);

  return input => shareOn(mapper(input));
}

/**
 * Creates an event processor that sends the values of incoming events, and does not share the outgoing events supply.
 *
 * @category Core
 * @typeParam TEvent - Incoming event type.
 * @typeParam TValue - Event value type.
 * @param valueOf - Event value detector function. Accepts incoming event as parameters and returns either its value,
 * or `false`/`null`/`undefined` to ignore it.
 *
 * @returns New event processor.
 */
export function valueEvents_<TEvent extends any[], TValue>(// eslint-disable-line @typescript-eslint/naming-convention
    valueOf: (this: void, ...event: TEvent) => TValue | false | null | undefined,
): (this: void, input: OnEvent<TEvent>) => OnEvent<[TValue]> {
  return translateOn_((send, ...event) => {

    const value = valueOf(...event);

    if (value != null && value !== false) {
      send(value);
    }
  });
}
