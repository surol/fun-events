import { noop } from 'call-thru';
import { eventInterest, EventInterest, noEventInterest } from './event-interest';
import Mock = jest.Mock;

describe('EventInterest', () => {
  describe('noEventInterest', () => {
    it('is no-op', () => {
      expect(noEventInterest().off()).toBe(noEventInterest());
    });
    it('is done', () => {
      expect(noEventInterest().done).toBe(true);
    });
    it('calls `whenDone` callback immediately', () => {

      const mockWhenDone = jest.fn();

      noEventInterest().whenDone(mockWhenDone);
      expect(mockWhenDone).toHaveBeenCalledWith();
    });
  });

  describe('eventInterest', () => {

    let mockOff: Mock<void, []>;
    let interest: EventInterest;

    beforeEach(() => {
      mockOff = jest.fn();
      interest = eventInterest(mockOff);
    });

    it('calls `off` function', () => {

      const reason = 'some reason';

      expect(interest.off(reason)).toBe(interest);
      expect(mockOff).toHaveBeenCalledWith(reason);
    });

    describe('done', () => {
      it('is set to `false` initially', () => {
        expect(interest.done).toBe(false);
      });
      it('is set to `true` when interest is lost', () => {
        interest.off();
        expect(interest.done).toBe(true);
      });
    });

    describe('whenDone', () => {
      it('returns `this` instance', () => {
        expect(interest.whenDone(noop)).toBe(interest);
      });
      it('calls registered completion callback', () => {

        const mockCallback = jest.fn();
        const reason = 'reason';

        interest.whenDone(mockCallback);
        interest.off(reason);
        expect(mockCallback).toHaveBeenCalledWith(reason);
      });
      it('calls registered completion callback only once', () => {

        const mockCallback = jest.fn();
        const reason1 = 'reason1';
        const reason2 = 'reason2';

        interest.whenDone(mockCallback);
        interest.off(reason1);
        interest.off(reason2);
        expect(mockCallback).toHaveBeenCalledWith(reason1);
        expect(mockCallback).not.toHaveBeenCalledWith(reason2);
        expect(mockCallback).toHaveBeenCalledTimes(1);
      });
      it('calls registered completion callback when interest is lost', () => {

        const mockCallback = jest.fn();

        interest.whenDone(mockCallback);
        interest.off();
        expect(mockCallback).toHaveBeenCalledWith(undefined);
      });
      it('calls registered completion callback immediately when event sending already completed', () => {

        const reason = 'reason';

        interest.off(reason);

        const mockCallback = jest.fn();

        interest.whenDone(mockCallback);
        expect(mockCallback).toHaveBeenCalledWith(reason);
      });
      it('calls registered completion callback immediately when interest already lost', () => {
        interest.off();

        const mockCallback = jest.fn();

        interest.whenDone(mockCallback);
        expect(mockCallback).toHaveBeenCalledWith(undefined);
      });
    });

    describe('needs', () => {
      it('is lost when events from another sender are exhausted', () => {

        const mockCallback = jest.fn();
        const mockOtherOff = jest.fn();
        const otherInterest = eventInterest(mockOtherOff);

        interest.needs(otherInterest);
        interest.whenDone(mockCallback);

        const reason = 'some reason';

        otherInterest.off(reason);
        expect(mockCallback).toHaveBeenCalledWith(reason);
      });
    });
  });
});
