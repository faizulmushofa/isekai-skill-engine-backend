import { RequirementsTxtExtractor } from '../extractors/requirements-txt.extractor';

describe('RequirementsTxtExtractor', () => {
  let extractor: RequirementsTxtExtractor;

  beforeEach(() => {
    extractor = new RequirementsTxtExtractor();
  });

  it('should support requirements.txt only', () => {
    expect(extractor.supports('requirements.txt')).toBe(true);
    expect(extractor.supports('REQUIREMENTS.TXT')).toBe(true);
  });

  it('should extract Python package dependencies successfully', () => {
    const content = `
      # Comment line
      numpy==1.24.2
      pandas>=2.0.0
      requests<=2.28.2
      flask
    `;

    const result = extractor.extract(content);

    expect(result.dependencies).toContain('numpy');
    expect(result.dependencies).toContain('pandas');
    expect(result.dependencies).toContain('requests');
    expect(result.dependencies).toContain('flask');
  });
});
