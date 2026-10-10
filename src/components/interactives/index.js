// Registers every interactive as a custom element. Imported once per chapter
// page; MDX then uses them as plain tags, e.g. <beacon-chain></beacon-chain>.
import { BeaconChain } from './beacon-chain.js';
import { SemaphoreTower } from './semaphore-tower.js';
import { MorseKey } from './morse-key.js';
import { FiveLampCode } from './five-lamp-code.js';
import { TelegraphLine } from './telegraph-line.js';
import { RelaySwitch } from './relay-switch.js';
import { RelayGates } from './relay-gates.js';
import { AnyTable } from './any-table.js';
import { BinaryLamps } from './binary-lamps.js';
import { RippleAdder } from './ripple-adder.js';
import { SrLatch } from './sr-latch.js';
import { MemoryBank } from './memory-bank.js';
import { TinyMachine } from './tiny-machine.js';
import { VacuumTube } from './vacuum-tube.js';
import { SwitchRace } from './switch-race.js';
import { TransistorValve } from './transistor-valve.js';
import { CmosInverter } from './cmos-inverter.js';
import { MaskStack } from './mask-stack.js';
import { WaferYield } from './wafer-yield.js';
import { MooreChart } from './moore-chart.js';
import { FeatureScale } from './feature-scale.js';
import { InstructionDecoder } from './instruction-decoder.js';
import { AssemblerView } from './assembler-view.js';
import { ExpressionCompiler } from './expression-compiler.js';
import { LanguageLadder } from './language-ladder.js';
import { TimeSlicer } from './time-slicer.js';
import { VirtualMemory } from './virtual-memory.js';
import { PacketRouter } from './packet-router.js';
import { ProtocolStack } from './protocol-stack.js';

const registry = {
  'beacon-chain': BeaconChain,
  'semaphore-tower': SemaphoreTower,
  'morse-key': MorseKey,
  'five-lamp-code': FiveLampCode,
  'telegraph-line': TelegraphLine,
  'relay-switch': RelaySwitch,
  'relay-gates': RelayGates,
  'any-table': AnyTable,
  'binary-lamps': BinaryLamps,
  'ripple-adder': RippleAdder,
  'sr-latch': SrLatch,
  'memory-bank': MemoryBank,
  'tiny-machine': TinyMachine,
  'vacuum-tube': VacuumTube,
  'switch-race': SwitchRace,
  'transistor-valve': TransistorValve,
  'cmos-inverter': CmosInverter,
  'mask-stack': MaskStack,
  'wafer-yield': WaferYield,
  'moore-chart': MooreChart,
  'feature-scale': FeatureScale,
  'instruction-decoder': InstructionDecoder,
  'assembler-view': AssemblerView,
  'expression-compiler': ExpressionCompiler,
  'language-ladder': LanguageLadder,
  'time-slicer': TimeSlicer,
  'virtual-memory': VirtualMemory,
  'packet-router': PacketRouter,
  'protocol-stack': ProtocolStack,
};

for (const [tag, cls] of Object.entries(registry)) {
  if (!customElements.get(tag)) customElements.define(tag, cls);
}
