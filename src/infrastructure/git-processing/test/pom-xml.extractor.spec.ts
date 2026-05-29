import { PomXmlExtractor } from '../extractors/pom-xml.extractor';

describe('PomXmlExtractor', () => {
  let extractor: PomXmlExtractor;

  beforeEach(() => {
    extractor = new PomXmlExtractor();
  });

  it('should support pom.xml only', () => {
    expect(extractor.supports('pom.xml')).toBe(true);
    expect(extractor.supports('pom.XML')).toBe(true);
    expect(extractor.supports('package.json')).toBe(false);
  });

  it('should extract artifactId Maven dependencies successfully using regex', () => {
    const content = `
      <project>
        <dependencies>
          <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
            <version>3.0.0</version>
          </dependency>
          <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
          </dependency>
        </dependencies>
      </project>
    `;

    const result = extractor.extract(content);

    expect(result.dependencies).toContain('spring-boot-starter-web');
    expect(result.dependencies).toContain('postgresql');
  });
});
