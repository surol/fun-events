import { asis, nextArgs, nextSkip, noop } from '@proc7ts/call-thru';
import { EventNotifier, EventReceiver, eventSupply, EventSupply, noEventSupply, OnEvent__symbol } from './base';
import { OnEvent, onEventBy } from './on-event';
import { EventEmitter } from './senders';
import Mock = jest.Mock;
import SpyInstance = jest.SpyInstance;

describe('OnEvent', () => {
  describe('[OnEvent__symbol]', () => {
    it('refers to itself', () => {

      const onEvent = onEventBy(() => noEventSupply());

      expect(onEvent[OnEvent__symbol]()).toBe(onEvent);
    });
  });

  describe('once', () => {

    let mockRegister: Mock<void, [EventReceiver.Generic<[string]>]>;
    let onEvent: OnEvent<[string]>;
    let supply: EventSupply;
    let offSpy: SpyInstance;
    let emitter: EventNotifier<[string]>;
    let mockReceiver: Mock<void, [string]>;

    beforeEach(() => {
      emitter = new EventNotifier();
      mockRegister = jest.fn(receiver => {
        emitter.on(receiver);
        supply = receiver.supply;
        offSpy = jest.spyOn(supply, 'off');
      });
      onEvent = onEventBy(mockRegister);
      mockReceiver = jest.fn();
    });

    it('registers event receiver', () => {
      expect(onEvent.once(mockReceiver)).toBe(supply);
      expect(mockRegister).toHaveBeenCalled();
    });
    it('unregisters notified event receiver', () => {
      onEvent.once(mockReceiver);
      expect(offSpy).not.toHaveBeenCalled();

      emitter.send('event');
      expect(mockReceiver).toHaveBeenCalledWith('event');
      expect(offSpy).toHaveBeenCalled();
    });
    it('unregisters immediately notified event receiver', () => {
      mockRegister.mockImplementation(receiver => {
        emitter.on(receiver);
        supply = receiver.supply;
        offSpy = jest.spyOn(supply, 'off');
        emitter.send('event');
      });

      onEvent.once(mockReceiver);

      expect(offSpy).toHaveBeenCalled();
      expect(mockReceiver).toHaveBeenCalledWith('event');
    });
    it('never sends events if their supply is initially cut off', () => {
      supply = noEventSupply();
      onEvent.once({ supply, receive: (_context, ...event) => mockReceiver(...event) });
      emitter.send('event');
      expect(mockReceiver).not.toHaveBeenCalled();
    });
    it('never sends events after their supply is cut off', () => {
      onEvent.once(mockReceiver).off();
      emitter.send('event');
      expect(mockReceiver).not.toHaveBeenCalled();
    });
    it('sends only one event', () => {
      onEvent.once(mockReceiver);
      emitter.send('event1');
      emitter.send('event2');
      expect(mockReceiver).toHaveBeenCalledTimes(1);
      expect(mockReceiver).toHaveBeenLastCalledWith('event1');
    });
  });

  describe('then', () => {

    let emitter: EventNotifier<[string]>;
    let mockRegister: Mock<void, [EventReceiver.Generic<[string]>]>;
    let onEvent: OnEvent<[string]>;

    beforeEach(() => {
      emitter = new EventNotifier();
      mockRegister = jest.fn(receiver => {
        emitter.on(receiver);
      });
      onEvent = onEventBy(mockRegister);
    });

    it('resolves to next event', async () => {

      const next = onEvent.then();

      emitter.send('event');
      expect(await next).toBe('event');
    });
    it('resolves to immediately available event', async () => {
      mockRegister.mockImplementation(receiver => {
        emitter.on(receiver);
        emitter.send('immediate');
      });

      expect(await onEvent).toBe('immediate');
    });
    it('executes resolution callback', async () => {

      const next = onEvent.then(event => `${event}!`);

      emitter.send('next event');
      expect(await next).toBe('next event!');
    });
    it('rejects when resolution callback fails', async () => {

      const error = new Error('test');
      const next = onEvent.then(() => {
        throw error;
      });

      emitter.send('next event');
      expect(await next.catch(asis)).toBe(error);
    });
    it('rejects when supply is cut off', async () => {

      const reason = 'reason';

      emitter.done(reason);

      expect(await onEvent.then().catch(asis)).toBe(reason);
    });
    it('resolves to cut off callback result when supply is cut off', async () => {

      const reason = 'reason';

      emitter.done(reason);

      expect(await onEvent.then(noop, asis)).toBe(reason);
    });
    it('rejects when cut off callback fails', async () => {
      emitter.done('reason');

      const error = new Error('test');

      expect(await onEvent.then(noop, () => {
        throw error;
      }).catch(asis)).toBe(error);
    });
  });

  describe('tillOff', () => {

    let mockRegister: Mock<void, [EventReceiver.Generic<[string]>]>;
    let onEvent: OnEvent<[string]>;
    let supply: EventSupply;
    let offSpy: Mock;
    let emitter: EventNotifier<[string]>;
    let mockReceiver: Mock<void, [string]>;
    let requiredSupply: EventSupply;

    beforeEach(() => {
      emitter = new EventNotifier();
      mockRegister = jest.fn(receiver => {
        emitter.on(receiver);
        supply = receiver.supply;
        supply.whenOff(offSpy = jest.fn());
      });
      onEvent = onEventBy(mockRegister);
      mockReceiver = jest.fn();
      requiredSupply = eventSupply();
    });

    it('sends original events', () => {
      onEvent.tillOff(requiredSupply).to(mockReceiver);
      emitter.send('event1');
      emitter.send('event2');

      expect(mockReceiver).toHaveBeenCalledWith('event1');
      expect(mockReceiver).toHaveBeenLastCalledWith('event2');
    });
    it('does not send any events if required supply is initially cut off', () => {

      const whenOff = jest.fn();

      onEvent.tillOff(noEventSupply()).to(mockReceiver).whenOff(whenOff);
      emitter.send('event1');
      expect(mockReceiver).not.toHaveBeenCalled();
      expect(whenOff).toHaveBeenCalled();
    });
    it('no longer sends events after original supply is cut off', () => {

      const whenOff = jest.fn();

      onEvent.tillOff(requiredSupply).to(mockReceiver).whenOff(whenOff);
      emitter.send('event1');
      supply.off('reason');
      emitter.send('event2');

      expect(mockReceiver).toHaveBeenLastCalledWith('event1');
      expect(mockReceiver).not.toHaveBeenCalledWith('event2');
      expect(whenOff).toHaveBeenCalledWith('reason');
      expect(offSpy).toHaveBeenCalledWith('reason');
    });
    it('no longer sends events after required supply is cut off', () => {

      const whenOff = jest.fn();

      onEvent.tillOff(requiredSupply).to(mockReceiver).whenOff(whenOff);
      emitter.send('event1');
      requiredSupply.off('reason');
      emitter.send('event2');

      expect(mockReceiver).toHaveBeenLastCalledWith('event1');
      expect(mockReceiver).not.toHaveBeenCalledWith('event2');
      expect(whenOff).toHaveBeenCalledWith('reason');
      expect(offSpy).toHaveBeenCalledWith('reason');
    });
  });

  describe('tillOff with dependent supply', () => {

    let mockRegister: Mock<void, [EventReceiver.Generic<[string]>]>;
    let onEvent: OnEvent<[string]>;
    let supply: EventSupply;
    let offSpy: Mock;
    let emitter: EventNotifier<[string]>;
    let mockReceiver: Mock<void, [string]>;
    let requiredSupply: EventSupply;
    let dependentSupply: EventSupply;

    beforeEach(() => {
      emitter = new EventNotifier();
      mockRegister = jest.fn(receiver => {
        emitter.on(receiver);
        supply = receiver.supply;
        supply.whenOff(offSpy = jest.fn());
      });
      onEvent = onEventBy(mockRegister);
      mockReceiver = jest.fn();
      requiredSupply = eventSupply();
      dependentSupply = eventSupply();
    });

    it('sends original events', () => {
      onEvent.tillOff(requiredSupply, dependentSupply).to(mockReceiver);
      emitter.send('event1');
      emitter.send('event2');

      expect(mockReceiver).toHaveBeenCalledWith('event1');
      expect(mockReceiver).toHaveBeenLastCalledWith('event2');
    });
    it('does not send any events if required supply is initially cut off', () => {

      const whenOff = jest.fn();

      onEvent.tillOff(noEventSupply(), dependentSupply).to(mockReceiver).whenOff(whenOff);
      emitter.send('event1');
      expect(mockReceiver).not.toHaveBeenCalled();
      expect(whenOff).not.toHaveBeenCalled();

      dependentSupply.whenOff(whenOff);
      expect(whenOff).toHaveBeenCalled();
    });
    it('no longer sends events after original supply is cut off', () => {

      const whenOff = jest.fn();

      onEvent.tillOff(requiredSupply, dependentSupply).to(mockReceiver).whenOff(whenOff);
      emitter.send('event1');
      supply.off('reason');
      emitter.send('event2');

      expect(mockReceiver).toHaveBeenLastCalledWith('event1');
      expect(mockReceiver).not.toHaveBeenCalledWith('event2');
      expect(offSpy).toHaveBeenCalledWith('reason');
      expect(whenOff).not.toHaveBeenCalledWith('reason');

      dependentSupply.whenOff(whenOff);
      expect(whenOff).toHaveBeenCalledWith('reason');
    });
    it('no longer sends events after required supply is cut off', () => {

      const whenOff = jest.fn();

      onEvent.tillOff(requiredSupply, dependentSupply).to(mockReceiver).whenOff(whenOff);
      emitter.send('event1');
      requiredSupply.off('reason');
      emitter.send('event2');

      expect(mockReceiver).toHaveBeenLastCalledWith('event1');
      expect(mockReceiver).not.toHaveBeenCalledWith('event2');
      expect(offSpy).toHaveBeenCalledWith('reason');
      expect(whenOff).not.toHaveBeenCalledWith('reason');

      dependentSupply.whenOff(whenOff);
      expect(whenOff).toHaveBeenCalledWith('reason');
    });
  });

  describe('consume', () => {

    let sender: EventEmitter<[EventNotifier<[string]>?]>;
    let nested1: EventNotifier<[string]>;
    let nested2: EventNotifier<[string]>;
    let consume: Mock<EventSupply | undefined, [EventNotifier<[string]>?]>;
    let receiver: Mock<void, [string]>;
    let supply: EventSupply;

    beforeEach(() => {
      sender = new EventEmitter();
      nested1 = new EventNotifier();
      nested2 = new EventNotifier();
      receiver = jest.fn();
      consume = jest.fn((nested?: EventNotifier<[string]>) => nested && nested.on(receiver));
      supply = sender.on().consume(consume);
    });

    it('receives nested event', () => {
      sender.send(nested1);
      nested1.send('value');
      expect(receiver).toHaveBeenCalledWith('value');
    });
    it('cuts off previous supply on new event', () => {

      const source = new EventEmitter<[]>();
      const supply1 = eventSupply();
      const supply2 = eventSupply();
      let calls = 0;

      source.on().consume(() => {

        const result = !calls ? supply1 : calls === 1 ? supply2 : undefined;

        ++calls;

        return result;
      });

      source.send();
      expect(supply1.isOff).toBe(false);
      expect(supply2.isOff).toBe(false);

      source.send();
      expect(supply1.isOff).toBe(true);
      expect(supply2.isOff).toBe(false);

      source.send();
      expect(supply1.isOff).toBe(true);
      expect(supply2.isOff).toBe(true);
    });
    it('does not cut off previous supply on new event returning the same supply', () => {

      const source = new EventEmitter<[]>();
      const supply1 = eventSupply();
      let calls = 0;

      source.on().consume(() => {

        const result = !calls || calls === 1 ? supply1 : undefined;

        ++calls;

        return result;
      });

      source.send();
      expect(supply1.isOff).toBe(false);

      source.send();
      expect(supply1.isOff).toBe(false);

      source.send();
      expect(supply1.isOff).toBe(true);
    });
    it('receives latest event', () => {
      sender.send(nested1);

      nested1.send('value1');
      expect(receiver).toHaveBeenCalledWith('value1');

      nested1.send('value2');
      expect(receiver).toHaveBeenCalledWith('value2');
    });
    it('receives event from latest nested sender', () => {
      sender.send(nested1);
      sender.send(nested2);

      nested1.send('value1');
      nested2.send('value2');
      expect(receiver).not.toHaveBeenCalledWith('value1');
      expect(receiver).toHaveBeenCalledWith('value2');
    });
    it('does not receive event when not registered in nested', () => {
      sender.send(nested1);
      sender.send();

      nested1.send('value');
      expect(receiver).not.toHaveBeenCalled();
    });
    it('does not receive events once their supply is cut off', () => {
      supply.off();

      sender.send(nested1);
      nested1.send('value');
      expect(receiver).not.toHaveBeenCalled();
      expect(consume).not.toHaveBeenCalled();
      expect(sender.size).toBe(0);
    });
    it('stops consumption when original events supply is cut off', () => {

      const mockOff = jest.fn();

      supply.whenOff(mockOff);

      const reason = 'some reason';

      sender.done(reason);

      expect(mockOff).toHaveBeenCalledWith(reason);

      sender.send(nested1);
      nested1.send('value');
      expect(receiver).not.toHaveBeenCalled();
      expect(consume).not.toHaveBeenCalled();
    });
    it('does not stop consumption when nested events supply is cut off', () => {

      const mockOff = jest.fn();

      supply.whenOff(mockOff);

      const reason = 'some reason';

      sender.send(nested1);
      nested1.send('value1');
      nested1.done(reason);
      nested1.send('value2');

      expect(mockOff).not.toHaveBeenCalledWith(reason);

      sender.send(nested2);
      nested2.send('value3');

      expect(receiver).toHaveBeenCalledWith('value1');
      expect(receiver).not.toHaveBeenCalledWith('value2');
      expect(receiver).toHaveBeenCalledWith('value3');
    });
  });

  describe('share', () => {

    let mockRegister: Mock<void, [EventReceiver.Generic<[string, string]>]>;
    let offSpy: SpyInstance;
    let emitter: EventNotifier<[string, string]>;
    let onEvent: OnEvent<[string, string]>;
    let mockReceiver: Mock<void, [string, string]>;
    let mockReceiver2: Mock<void, [string, string]>;

    beforeEach(() => {
      emitter = new EventNotifier();
      mockRegister = jest.fn(receiver => {
        emitter.on(receiver);
        offSpy = jest.spyOn(receiver.supply, 'off');
      });
      onEvent = onEventBy(mockRegister);
      mockReceiver = jest.fn();
      mockReceiver2 = jest.fn();
    });

    it('sends events from the source', () => {

      const shared = onEvent.share();

      shared.to(mockReceiver);
      shared.to(mockReceiver2);
      emitter.send('a', 'b');
      expect(mockReceiver).toHaveBeenCalledWith('a', 'b');
      expect(mockReceiver2).toHaveBeenCalledWith('a', 'b');
    });
    it('registers exactly one source receiver', () => {

      const shared = onEvent.share();

      shared.to(mockReceiver);
      shared.to(mockReceiver2);

      expect(mockRegister).toHaveBeenCalledTimes(1);
    });
    it('cuts off events supply from the source when all event supplies do', () => {

      const shared = onEvent.share();
      const supply1 = shared.to(mockReceiver);
      const supply2 = shared.to(mockReceiver2);

      supply1.off('reason1');
      expect(offSpy).not.toHaveBeenCalled();
      supply2.off('reason2');
      expect(offSpy).toHaveBeenCalledWith('reason2');
    });
    it('replicates events sent during registration', () => {
      mockRegister.mockImplementation(receiver => {
        emitter.on(receiver);
        emitter.send('init1', '1');
        emitter.send('init2', '2');
      });

      const shared = onEvent.share();

      shared.to(mockReceiver);
      shared.to(mockReceiver2);

      expect(mockReceiver).toHaveBeenCalledWith('init1', '1');
      expect(mockReceiver).toHaveBeenCalledWith('init2', '2');
      expect(mockReceiver).toHaveReturnedTimes(2);
      expect(mockReceiver2).toHaveBeenCalledWith('init1', '1');
      expect(mockReceiver2).toHaveBeenCalledWith('init2', '2');
      expect(mockReceiver2).toHaveReturnedTimes(2);
    });
    it('replicates events sent during registration to receivers registered after all event supplies cut off', () => {

      mockRegister.mockImplementation(receiver => {

        const receiverEmitter = new EventNotifier<[string, string]>();

        receiverEmitter.on(receiver);
        receiverEmitter.send('init1', '1');
        receiverEmitter.send('init2', '2');

        offSpy = jest.spyOn(receiver.supply, 'off');
      });

      const shared = onEvent.share();
      const supply1 = shared.to(mockReceiver);
      const supply2 = shared.to(mockReceiver2);

      supply1.off();
      supply2.off();
      expect(offSpy).toHaveBeenCalled();
      mockReceiver.mockClear();
      mockReceiver2.mockClear();

      shared.to(mockReceiver);
      shared.to(mockReceiver2);
      expect(mockReceiver).toHaveBeenCalledWith('init1', '1');
      expect(mockReceiver).toHaveBeenCalledWith('init2', '2');
      expect(mockReceiver).toHaveReturnedTimes(2);
      expect(mockReceiver2).toHaveBeenCalledWith('init1', '1');
      expect(mockReceiver2).toHaveBeenCalledWith('init2', '2');
      expect(mockReceiver2).toHaveReturnedTimes(2);
    });
    it('stops events replication of events sent during registration after new event received', () => {
      mockRegister.mockImplementation(receiver => {
        emitter.on(receiver);
        emitter.send('init1', '1');
        emitter.send('init2', '2');
      });

      const shared = onEvent.share();

      shared.to(mockReceiver);
      emitter.send('update1', '11');
      shared.to(mockReceiver2);
      emitter.send('update2', '12');

      expect(mockReceiver).toHaveBeenCalledWith('init1', '1');
      expect(mockReceiver).toHaveBeenCalledWith('init2', '2');
      expect(mockReceiver).toHaveBeenCalledWith('update1', '11');
      expect(mockReceiver).toHaveBeenCalledWith('update2', '12');
      expect(mockReceiver).toHaveReturnedTimes(4);
      expect(mockReceiver2).toHaveBeenCalledWith('update2', '12');
      expect(mockReceiver2).toHaveReturnedTimes(1);
    });
  });

  describe('thru', () => {

    let mockRegister: Mock<void, [EventReceiver.Generic<[string, string]>]>;
    let offSpy: SpyInstance;
    let emitter: EventNotifier<[string, string]>;
    let onEvent: OnEvent<[string, string]>;
    let mockReceiver: Mock<void, [string]>;

    beforeEach(() => {
      emitter = new EventNotifier();
      mockRegister = jest.fn(receiver => {
        emitter.on(receiver);
        offSpy = jest.spyOn(receiver.supply, 'off');
      });
      onEvent = onEventBy(mockRegister);
      mockReceiver = jest.fn();
    });

    it('registers event receiver', () => {

      const transforming = onEvent.thru(
          (event1: string, event2: string) => `${event1}, ${event2}`,
      );

      transforming.to(mockReceiver);
      expect(mockRegister).toHaveBeenCalled();
    });
    it('unregisters event receiver once events supply cut off', () => {

      const transforming = onEvent.thru(
          (event1: string, event2: string) => `${event1}, ${event2}`,
      );

      const supply1 = transforming.to(mockReceiver);
      const supply2 = transforming.to(noop);

      supply1.off();
      expect(offSpy).not.toHaveBeenCalled();
      supply2.off();
      expect(offSpy).toHaveBeenCalled();
    });
    it('transforms original event', () => {

      const transforming = onEvent.thru(
          (event1: string, event2: string) => `${event1}, ${event2}`,
      );

      transforming.to(mockReceiver);

      emitter.send('a', 'bb');

      expect(mockReceiver).toHaveBeenCalledWith('a, bb');
    });
    it('skips original event', () => {

      const transforming = onEvent.thru(
          (event1: string, event2: string) => event1 < event2 ? nextArgs(event1, event2) : nextSkip,
          (event1: string, event2: string) => `${event1}, ${event2}`,
      );

      transforming.to(mockReceiver);

      emitter.send('a', 'bb');
      expect(mockReceiver).toHaveBeenCalledWith('a, bb');

      mockReceiver.mockClear();
      emitter.send('b', 'a');
      expect(mockReceiver).not.toHaveBeenCalled();
    });
    it('cuts off transformed events supply once original events supply cut off', () => {

      const mockOff = jest.fn();
      const transforming = onEvent.thru(
          (event1: string, event2: string) => `${event1}, ${event2}`,
      );

      transforming.to(mockReceiver).whenOff(mockOff);

      const reason = 'some reason';

      emitter.done(reason);
      expect(mockOff).toHaveBeenCalledWith(reason);
    });
  });
});
