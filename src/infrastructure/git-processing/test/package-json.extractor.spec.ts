import { PackageJsonExtractor } from '../extractors/package-json.extractor';

describe('PackageJsonExtractor', () => {
  let extractor: PackageJsonExtractor;

  beforeEach(() => {
    extractor = new PackageJsonExtractor();
  });

  it('should support package.json only', () => {
    expect(extractor.supports('package.json')).toBe(true);
    expect(extractor.supports('PACKAGE.JSON')).toBe(true);
    expect(extractor.supports('pom.xml')).toBe(false);
  });

  it('should parse manifest and dependencies successfully', () => {
    const content = JSON.stringify({
      name: 'isekai-backend',
      dependencies: {
        '@nestjs/common': '^11.0.0',
        zod: '^3.0.0',
      },
      devDependencies: {
        typescript: '^5.0.0',
      },
    });

    const result = extractor.extract(content);

    expect(result.manifest.name).toBe('isekai-backend');
    expect(result.dependencies).toContain('@nestjs/common');
    expect(result.dependencies).toContain('zod');
    expect(result.dependencies).toContain('typescript');
  });

  it('should handle invalid JSON gracefully', () => {
    const result = extractor.extract('{ invalid json ');
    expect(result.manifest).toEqual({});
    expect(result.dependencies).toEqual([]);
  });
});
