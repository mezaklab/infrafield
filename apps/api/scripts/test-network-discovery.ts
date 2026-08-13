import assert from 'node:assert/strict';
import { parseIpNeighborOutput } from '../src/modules/network/discovery/LocalNetworkDiscoveryProvider';
import { normalizeMacAddress } from '../src/modules/network/utils/macAddress';

const parsed = parseIpNeighborOutput(`
192.168.18.1 dev enp11s0 lladdr 70:4e:6b:62:12:83 REACHABLE
192.168.18.2 dev enp11s0 lladdr aa-bb-cc-dd-ee-ff STALE
192.168.18.3 dev enp11s0 lladdr 11:22:33:44:55:66 DELAY
192.168.18.4 dev enp11s0 lladdr 22:33:44:55:66:77 PROBE
192.168.18.5 dev enp11s0 FAILED
192.168.18.6 dev enp11s0 INCOMPLETE
`, '192.168.18.0/24');

assert.deepEqual(parsed.map(({ macAddress, ipAddress }) => [macAddress, ipAddress]), [
  ['70:4E:6B:62:12:83', '192.168.18.1'],
  ['AA:BB:CC:DD:EE:FF', '192.168.18.2'],
  ['11:22:33:44:55:66', '192.168.18.3'],
  ['22:33:44:55:66:77', '192.168.18.4'],
]);
assert.equal(normalizeMacAddress('70:4e:6b:62:12:83'), '70:4E:6B:62:12:83');
assert.equal(normalizeMacAddress('70-4e-6b-62-12-83'), '70:4E:6B:62:12:83');
assert.equal(normalizeMacAddress('704e.6b62.1283'), '70:4E:6B:62:12:83');
console.log('Network discovery parser tests: OK');
