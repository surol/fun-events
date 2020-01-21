/**
 * @module fun-events
 */
import { noop } from 'call-thru';
import { AfterEvent, afterEventBy, afterNever, afterSupplied } from '../after-event';
import { AfterEvent__symbol, EventKeeper } from '../event-keeper';
import { EventNotifier } from '../event-notifier';
import { EventReceiver } from '../event-receiver';

/**
 * Builds an [[AfterEvent]] keeper of events sent by all event keepers in `sources` map.
 *
 * @category Core
 * @typeparam S  A type of `sources` map.
 * @param sources  A map of named event keepers the events are originated from.
 *
 * @returns An event keeper sending a map of events received from each event keeper. Each event in this map has the
 * same name as its originating event keeper in `sources`.
 */
export function afterAll<S extends { readonly [key: string]: EventKeeper<any> }>(
    sources: S,
): AfterEvent<[{ readonly [K in keyof S]: EventKeeper.Event<S[K]> }]> {

  const keys = Object.keys(sources);

  if (!keys.length) {
    return afterNever;
  }

  return afterEventBy(registerReceiver, latestEvent).share();

  function registerReceiver(
      receiver: EventReceiver.Generic<[{ readonly [K in keyof S]: EventKeeper.Event<S[K]> }]>,
  ): void {

    const notifier = new EventNotifier<[{ readonly [K in keyof S]: EventKeeper.Event<S[K]> }]>();
    const supply = notifier.on(receiver);
    let send: () => void = noop;
    const result: { [K in keyof S]: EventKeeper.Event<S[K]> } = {} as any;

    keys.forEach((key: keyof S) => {
      supply.needs(sources[key][AfterEvent__symbol]((...event) => {
        result[key] = event;
        send();
      }).needs(supply));
    });

    if (!supply.isOff) {
      send = () => notifier.send(result);
    }
  }

  function latestEvent(): [{ readonly [K in keyof S]: EventKeeper.Event<S[K]> }] {

    const result: { [K in keyof S]: EventKeeper.Event<S[K]> } = {} as any;

    keys.forEach(
        key => afterSupplied(sources[key]).once(
            (...event) => result[key as keyof S] = event,
        ),
    );

    return [result];
  }
}
