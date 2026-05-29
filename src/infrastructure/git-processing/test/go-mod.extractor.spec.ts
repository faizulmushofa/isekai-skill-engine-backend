import { GoModExtractor } from '../extractors/go-mod.extractor';

describe('GoModExtractor', () => {
  let extractor: GoModExtractor;

  beforeEach(() => {
    extractor = new GoModExtractor();
  });

  it('should support go.mod only', () => {
    expect(extractor.supports('go.mod')).toBe(true);
    expect(extractor.supports('GO.MOD')).toBe(true);
  });

  it('should extract Golang module dependencies successfully', () => {
    const content = `
      module github.com/isekai/engine
      go 1.21

      require (
        github.com/gin-gonic/gin v1.9.1
        github.com/stretchr/testify v1.8.4
      )

      require github.com/google/uuid v1.4.0
    `;

    const result = extractor.extract(content);

    expect(result.dependencies).toContain('github.com/gin-gonic/gin');
    expect(result.dependencies).toContain('github.com/stretchr/testify');
    expect(result.dependencies).toContain('github.com/google/uuid');
  });
});
