import assert from 'node:assert/strict';
import { parseAssetLabel } from '../src/modules/lens/labelParser';
import { selectEvidence } from '../src/modules/lens/consolidation';

const printer = parseAssetLabel(`HP LaserJet Pro M404dn
MODEL: LaserJet Pro M404dn
S/N: BRBS123456
MAC Address: AA-BB-CC-DD-EE-FF
PAT: PAT-001234`);
assert.equal(printer.type?.value, 'IMPRESSORA');
assert.equal(printer.manufacturer?.value, 'HP');
assert.equal(printer.model?.value, 'LaserJet Pro M404dn');
assert.equal(printer.serialNumber?.value, 'BRBS123456');
assert.equal(printer.macAddress?.value, 'AA:BB:CC:DD:EE:FF');
assert.equal(printer.possibleAssetTag?.value, 'PAT-001234');

const notebook = parseAssetLabel(`Dell Latitude 5420
Service Tag: ABC1234
Product Number: LAT5420`);
assert.equal(notebook.type?.value, 'NOTEBOOK');
assert.equal(notebook.serviceTag?.value, 'ABC1234');
assert.equal(notebook.productNumber?.value, 'LAT5420');

const monitor = parseAssetLabel(`AOC
Model No.: 24B1XH2
S.N. ABC123456789
Part Number 24B1XH2-01`);
assert.equal(monitor.manufacturer?.value, 'AOC');
assert.equal(monitor.model?.value, '24B1XH2');
assert.equal(monitor.serialNumber?.value, 'ABC123456789');
assert.equal(monitor.productNumber?.value, '24B1XH2-01');

const printerVariant = parseAssetLabel(`EPSON
M/N L3250
Serial No X9AB012345
Product No. C11CJ67302
MAC Addr AA:BB:CC:DD:EE:FF`);
assert.equal(printerVariant.manufacturer?.value, 'Epson');
assert.equal(printerVariant.model?.value, 'L3250');
assert.equal(printerVariant.serialNumber?.value, 'X9AB012345');
assert.equal(printerVariant.productNumber?.value, 'C11CJ67302');
assert.equal(printerVariant.macAddress?.value, 'AA:BB:CC:DD:EE:FF');

const unknown = parseAssetLabel('generic unreadable label');
assert.equal(unknown.serialNumber, null);
assert.equal(unknown.macAddress, null);

assert.deepEqual(
  selectEvidence({ value: 'AOC', source: 'VISION', confidence: .78 }, { value: '', source: 'OCR', confidence: .99 }),
  { value: 'AOC', source: 'VISION', confidence: .78 },
);
assert.deepEqual(
  selectEvidence({ value: 'Modelo provável', source: 'VISION', confidence: .75 }, { value: '24B1XH2', source: 'OCR', confidence: .88 }),
  { value: '24B1XH2', source: 'OCR', confidence: .88 },
);
console.log('InfraField Lens parsing tests: OK');
