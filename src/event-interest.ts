import { noop } from 'call-thru';

/**
 * An interest for the events.
 *
 * This is what returned returned from `EventProducer` when registering an event consumer.
 *
 * Once the consumer is no longer interested in receiving events, an `off()` method should be called indicating the
 * lost of interest.
 *
 * By convenience, `EventInterest` instances should be constructed using `eventInterest()` function.
 */
export abstract class EventInterest {

  /**
   * A method to call to indicate the lost of interest in receiving events.
   *
   * Once called, the corresponding event consumer would no longer be called.
   *
   * Calling this method for the second time has no effect.
   */
  abstract off(): void;

}

/**
 * Constructs new `EventInterest` instance.
 *
 * @param off A function to call to indicate the lost of interest in receiving events.
 */
export function eventInterest(off: (this: EventInterest) => void): EventInterest {
  return new class Interest extends EventInterest {
    off = off;
  };
}

class NoEventInterest extends EventInterest {
  off = noop;
}

const NONE = /*#__PURE__*/ new NoEventInterest();

/**
 * Returns a no-op event interest.
 *
 * This is handy to use e.g. when initializing fields.
 */
export function noEventInterest(): EventInterest {
  return NONE;
}
