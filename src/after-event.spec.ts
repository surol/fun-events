import { noop, passIf } from 'call-thru';
import { AfterEvent, afterEventBy, afterNever, afterSupplied, afterThe } from './after-event';
import { EventEmitter } from './event-emitter';
import { AfterEvent__symbol } from './event-keeper';
import { EventNotifier } from './event-notifier';
import { EventReceiver } from './event-receiver';
import { OnEvent__symbol } from './event-sender';
import { eventSupply, EventSupply, noEventSupply } from './event-supply';
import { trackValue, ValueTracker } from './value';
import Mock = jest.Mock;

describe('AfterEvent', () => {
  describe('share', () => {

    let fallback: [string, string];
    let mockRegister: Mock;
    let registeredReceiver: (event1: string, event2: string) => void;
    let afterEvent: AfterEvent<[string, string]>;
    let mockReceiver: Mock<void, [string, string]>;
    let mockReceiver2: Mock<void, [string, string]>;

    beforeEach(() => {
      fallback = ['init1', 'init2'];
      mockRegister = jest.fn(receiver => {
        registeredReceiver = receiver;
        return eventSupply();
      });
      afterEvent = afterEventBy(mockRegister, () => fallback);
      mockReceiver = jest.fn();
      mockReceiver2 = jest.fn();
    });

    it('sends fallback event from the source', () => {

      const shared = afterEvent.share();

      shared(mockReceiver);
      shared(mockReceiver2);
      expect(mockReceiver).toHaveBeenCalledWith(...fallback);
      expect(mockReceiver2).toHaveBeenCalledWith(...fallback);
    });
    it('keeps initial event from the source', () => {

      const shared = afterEvent.share();

      shared.once((...received) => expect(received).toEqual(fallback));
    });
    it('sends events from the source', () => {

      const shared = afterEvent.share();

      shared(mockReceiver);
      shared(mockReceiver2);
      registeredReceiver('a', 'b');
      expect(mockReceiver).toHaveBeenCalledWith('a', 'b');
      expect(mockReceiver2).toHaveBeenCalledWith('a', 'b');
    });
  });

  describe('keep', () => {
    describe('dig', () => {

      let sender: ValueTracker<ValueTracker<string>>;
      let nested1: ValueTracker<string>;
      let nested2: ValueTracker<string>;
      let extract: Mock<ValueTracker<string>, [ValueTracker<string>]>;
      let result: AfterEvent<[string]>;
      let receiver: Mock<void, [string]>;

      beforeEach(() => {
        nested1 = trackValue('1');
        nested2 = trackValue('2');
        sender = trackValue(nested1);
        receiver = jest.fn();
        extract = jest.fn((nested) => nested);
        result = sender.read.keep.dig(extract);
        result(receiver);
      });

      it('returns `AfterEvent` keeper', () => {
        expect(result).toBeInstanceOf(AfterEvent);
      });
      it('receives nested events', () => {
        expect(receiver).toHaveBeenCalledWith('1');
        sender.it = nested2;
        expect(receiver).toHaveBeenCalledWith('2');
        nested2.it = '3';
        expect(receiver).toHaveBeenCalledWith('3');
      });
    });

    describe('thru', () => {

      let fallback: [string, string];
      let mockRegister: Mock;
      let registeredSupply: EventSupply;
      let mockOff: Mock<void, [any?]>;
      let registeredReceiver: (event1: string, event2: string) => void;
      let afterEvent: AfterEvent<[string, string]>;
      let mockReceiver: Mock<void, [string]>;

      beforeEach(() => {
        fallback = ['init1', 'init2'];
        mockOff = jest.fn();
        mockRegister = jest.fn(receiver => {
          registeredReceiver = receiver;
          return registeredSupply = eventSupply(mockOff);
        });
        afterEvent = afterEventBy(mockRegister, () => fallback);
        mockReceiver = jest.fn();
      });

      it('registers event receiver', () => {

        const transforming = afterEvent.keep.thru(
            (event1: string, event2: string) => `${event1}, ${event2}`
        );

        transforming(mockReceiver);
        expect(mockRegister).toHaveBeenCalled();
      });
      it('unregisters event receiver when supply is cut off', () => {

        const transforming = afterEvent.keep.thru(
            (event1: string, event2: string) => `${event1}, ${event2}`
        );

        const supply1 = transforming(mockReceiver);
        const supply2 = transforming(jest.fn());

        supply1.off();
        expect(mockOff).not.toHaveBeenCalled();
        supply2.off();
        expect(mockOff).toHaveBeenCalled();
      });
      it('transforms original event', () => {

        const transforming = afterEvent.keep.thru(
            (event1: string, event2: string) => `${event1}, ${event2}`
        );

        transforming(mockReceiver);

        registeredReceiver('a', 'bb');

        expect(mockReceiver).toHaveBeenCalledWith('init1, init2');
        expect(mockReceiver).toHaveBeenCalledWith('a, bb');
      });
      it('skips original event', () => {

        const transforming = afterEvent.keep.thru(
            passIf<[string, string], string>((event1: string, event2: string) => event1 < event2),
            (event1: string, event2: string) => `${event1}, ${event2}`,
        );

        transforming(mockReceiver);

        registeredReceiver('a', 'bb');
        expect(mockReceiver).toHaveBeenCalledWith('init1, init2');
        expect(mockReceiver).toHaveBeenCalledWith('a, bb');

        mockReceiver.mockClear();
        expect(mockReceiver).not.toHaveBeenCalled();
      });
      it('cuts off events supply when original sender cuts it off', () => {

        const mockOff2 = jest.fn();
        const transforming = afterEvent.keep.thru(
            (event1: string, event2: string) => `${event1}, ${event2}`
        );

        transforming(mockReceiver).whenOff(mockOff2);

        const reason = 'some reason';

        registeredSupply.off(reason);
        expect(mockOff2).toHaveBeenCalledWith(reason);
      });
    });
  });

  describe('[OnEvent__symbol]', () => {
    it('refers to itself', () => {

      const afterEvent = afterEventBy(() => noEventSupply());

      expect(afterEvent[OnEvent__symbol]).toBe(afterEvent);
    });
  });

  describe('[AfterEvent__symbol]', () => {
    it('refers to itself', () => {

      const afterEvent = afterEventBy(() => noEventSupply());

      expect(afterEvent[AfterEvent__symbol]).toBe(afterEvent);
    });
  });
});

describe('afterNever', () => {
  it('returns a no-event supply', () => {
    expect(afterNever(noop)).toBe(noEventSupply());
  });
});

describe('afterEventBy', () => {

  let emitter: EventNotifier<[string]>;
  let mockSupply: EventSupply;
  let mockFallback: Mock<[string], []>;
  let mockRegister: Mock<EventSupply, [EventReceiver<[string]>]>;
  let afterEvent: AfterEvent<[string]>;
  let mockReceiver: Mock<void, [string]>;

  beforeEach(() => {
    emitter = new EventNotifier();
    mockSupply = eventSupply();
    mockFallback = jest.fn(() => ['fallback']);
    mockRegister = jest.fn<EventSupply, [EventReceiver<[string]>]>(rcv => {
      emitter.on(rcv);
      return mockSupply;
    });
    afterEvent = afterEventBy(mockRegister, mockFallback);
    mockReceiver = jest.fn();
  });

  it('builds an `AfterEvent` keeper', () => {
    expect(afterEvent(mockReceiver)).toBe(mockSupply);
    expect(mockRegister).toHaveBeenCalled();
    expect(mockReceiver).toHaveBeenCalledWith('fallback');
    expect(mockReceiver).toHaveBeenCalledTimes(1);

    emitter.send('event');
    expect(mockReceiver).toHaveBeenCalledWith('event');
    expect(mockReceiver).toHaveBeenCalledTimes(2);
  });
  it('sends an event sent by registration function', () => {
    mockRegister.mockImplementation(rcv => {
      emitter.on(rcv);
      emitter.send('event');
      return mockSupply;
    });

    afterEvent(mockReceiver);

    expect(mockReceiver).toHaveBeenCalledWith('event');
    expect(mockReceiver).toHaveBeenCalledTimes(1);
  });
  it('does not send an event sent by registration function if receiver supply is cut off already', () => {
    mockRegister.mockImplementation(rcv => {
      emitter.on(rcv);
      emitter.send('event');
      return noEventSupply();
    });

    afterEvent(mockReceiver);

    expect(mockReceiver).not.toHaveBeenCalled();
  });
  it('sends recurrent event sent during registration to recurrent receiver', () => {

    const recurrentReceiver = jest.fn();

    mockReceiver.mockImplementation(function (this: EventReceiver.Context<[string]>) {
      this.onRecurrent(recurrentReceiver);
      emitter.send('recurrent');
    });

    expect(afterEvent(mockReceiver)).toBe(mockSupply);
    expect(mockReceiver).toHaveBeenCalledWith('fallback');
    expect(recurrentReceiver).toHaveBeenCalledWith('recurrent');
  });
});

describe('afterSupplied', () => {
  describe('from event keeper', () => {

    let keeper: ValueTracker<string>;
    let afterEvent: AfterEvent<[string]>;
    let mockReceiver: EventReceiver<[string]>;
    let supply: EventSupply;

    beforeEach(() => {
      keeper = trackValue('initial');
      afterEvent = afterSupplied({
        [AfterEvent__symbol](receiver) {
          return keeper.read(receiver);
        }
      });
      mockReceiver = jest.fn();
      supply = afterEvent(mockReceiver);
    });

    it('sends the kept event upon receiver registration', () => {
      expect(mockReceiver).toHaveBeenCalledWith('initial');
    });
    it('sends events from the given keeper', () => {

      const event = 'other';

      keeper.it = event;
      expect(mockReceiver).toHaveBeenCalledWith(event);
    });
    it('does not send events once their supply is cut off', () => {
      supply.off();

      keeper.it = 'other';
      expect(mockReceiver).not.toHaveBeenCalledWith('other');
    });
  });

  describe('from event keeper with registrar implementing `AfterEvent`', () => {
    it('returns the keeper\'s registrar', () => {

      const keeper = trackValue('initial');

      expect(afterSupplied(keeper)).toBe(keeper[AfterEvent__symbol]);
    });
  });

  describe('from event sender', () => {

    let sender: EventEmitter<[string]>;
    let afterEvent: AfterEvent<[string]>;
    let mockReceiver: EventReceiver<[string]>;
    let supply: EventSupply;

    beforeEach(() => {
      sender = new EventEmitter();
      afterEvent = afterSupplied(sender, () => ['initial']);
      mockReceiver = jest.fn();
      supply = afterEvent(mockReceiver);
    });

    it('sends the initial event upon receiver registration', () => {
      expect(mockReceiver).toHaveBeenCalledWith('initial');
    });
    it('sends events from the given sender', () => {

      const event = 'other';

      sender.send(event);
      expect(mockReceiver).toHaveBeenCalledWith(event);
    });
    it('does not send events once their supply is cut off', () => {
      supply.off();

      sender.send('other');
      expect(mockReceiver).not.toHaveBeenCalledWith('other');
      afterEvent.once(event => expect(event).toEqual('initial'));
    });
  });

  describe('from event sender without initial value', () => {

    let sender: EventEmitter<[string]>;
    let afterEvent: AfterEvent<[string]>;

    beforeEach(() => {
      sender = new EventEmitter();
      afterEvent = afterSupplied(sender);
    });

    it('throws an exception upon receiver registration', () => {
      expect(() => afterEvent(noop)).toThrow('No events to send');
    });
    it('throws an exception when requesting the last event', () => {
      expect(() => afterEvent.once(noop)).toThrow('No events to send');
    });
  });
});

describe('afterThe', () => {
  it('always sends the same event', () => {

    const event = ['foo', 'bar'];
    const mockReceiver1 = jest.fn();
    const mockReceiver2 = jest.fn();
    const afterEvent = afterThe(...event);

    afterEvent(mockReceiver1);
    afterEvent(mockReceiver2);

    expect(mockReceiver1).toHaveBeenCalledWith(...event);
    expect(mockReceiver2).toHaveBeenCalledWith(...event);
  });
});
