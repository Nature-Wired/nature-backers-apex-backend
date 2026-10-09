import { publicProject } from './presentation';
import { normalizeProject } from './atlas.service';
describe('public Atlas country presentation', () => {
  it('preserves source metadata while withholding the unusable country value', () => {
    const source = normalizeProject({ sourceTimestamp: '123.456', name: 'Source project', country: '-2', sdgs: [15] });
    const snapshot = Object.freeze(source);
    expect(publicProject(snapshot)).toEqual({ ...source, country: null });
    expect(snapshot.country).toBe('-2');
    expect(publicProject(snapshot).sourceTimestamp).toBe(source.sourceTimestamp);
    expect(publicProject(snapshot).sdgs).toEqual([15]);
    expect(publicProject(snapshot).provenance).toBe('SUSTAINABILITY_ATLAS');
  });
  it('retains supplied ordinary country names and missing values without inference', () => {
    expect(publicProject({ country: 'Source country' }).country).toBe('Source country');
    expect(publicProject({ country: null }).country).toBeNull();
    expect(publicProject({ country: ' -2 ' }).country).toBeNull();
  });
});
