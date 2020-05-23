import { EventReceiver, eventSupply, EventSupply, EventSupplyPeer } from '../base';
import { OnEvent } from '../on-event';

/**
 * @internal
 */
export function tillOff<E extends any[]>(
    onSource: OnEvent<E>,
    required: EventSupplyPeer,
    dependentSupply?: EventSupply,
): (receiver: EventReceiver.Generic<E>) => void {
  return (receiver: EventReceiver.Generic<E>): void => {
    if (dependentSupply) {
      onSource.to({
        supply: eventSupply().needs(required).cuts(dependentSupply),
        receive: (receiver.receive as (...args: any[]) => void).bind(receiver),
      });
    } else {
      receiver.supply.needs(required);
      onSource.to(receiver);
    }
  };
}
