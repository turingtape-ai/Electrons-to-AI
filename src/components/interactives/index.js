// Registers every interactive as a custom element. Imported once per chapter
// page; MDX then uses them as plain tags, e.g. <beacon-chain></beacon-chain>.
import { BeaconChain } from './beacon-chain.js';
import { SemaphoreTower } from './semaphore-tower.js';

const registry = {
  'beacon-chain': BeaconChain,
  'semaphore-tower': SemaphoreTower,
};

for (const [tag, cls] of Object.entries(registry)) {
  if (!customElements.get(tag)) customElements.define(tag, cls);
}
