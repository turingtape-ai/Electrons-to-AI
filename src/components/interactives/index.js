// Registers every interactive as a custom element. Imported once per chapter
// page; MDX then uses them as plain tags, e.g. <beacon-chain></beacon-chain>.
import { BeaconChain } from './beacon-chain.js';
import { SemaphoreTower } from './semaphore-tower.js';
import { MorseKey } from './morse-key.js';
import { FiveLampCode } from './five-lamp-code.js';
import { TelegraphLine } from './telegraph-line.js';
import { RelaySwitch } from './relay-switch.js';

const registry = {
  'beacon-chain': BeaconChain,
  'semaphore-tower': SemaphoreTower,
  'morse-key': MorseKey,
  'five-lamp-code': FiveLampCode,
  'telegraph-line': TelegraphLine,
  'relay-switch': RelaySwitch,
};

for (const [tag, cls] of Object.entries(registry)) {
  if (!customElements.get(tag)) customElements.define(tag, cls);
}
