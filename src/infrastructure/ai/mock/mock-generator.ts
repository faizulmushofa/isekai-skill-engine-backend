import { Injectable, Logger } from '@nestjs/common';
import { AiTaskType } from '../enums/ai-task-type.enum';

/**
 * MockAiGenerator
 *
 * Generates syntactically and semantically valid JSON responses for every
 * AiTaskType when all live AI providers (Gemini / Groq) are unavailable.
 *
 * Responses are deterministic but context-aware: the generator scans the
 * userPrompt for known technology/skill keywords so the mock data looks
 * realistic rather than generic.
 */
@Injectable()
export class MockAiGenerator {
  private readonly logger = new Logger(MockAiGenerator.name);

  // -----------------------------------------------------------------------
  // Public entry point
  // -----------------------------------------------------------------------

  generate(taskType: AiTaskType, userPrompt: string): string {
    this.logger.warn(
      `[MockAI] All live providers failed — serving mock response for task: ${taskType}`,
    );

    switch (taskType) {
      case AiTaskType.LEARNING_EVIDENCE:
        return this.learningEvidence(userPrompt);

      case AiTaskType.ASSESSMENT_GENERATOR:
        return this.assessmentGenerator(userPrompt);

      case AiTaskType.PROJECT_EVIDENCE:
        return this.projectEvidence(userPrompt);

      case AiTaskType.BEHAVIORAL_CAREER_ALIGNMENT:
        return this.behavioralCareerAlignment(userPrompt);

      case AiTaskType.SKILL_INIT_CLASSIFICATION:
        return this.skillInitClassification(userPrompt);

      case AiTaskType.SKILL_INIT_ADAPTIVE_QUESTION:
        return this.skillInitAdaptiveQuestion(userPrompt);

      case AiTaskType.SKILL_INIT_SKILLS_EXPLANATOR:
        return this.skillInitSkillsExplanator(userPrompt);

      case AiTaskType.SKILL_TAXONOMY_RESOLVER:
        return this.skillTaxonomyResolver();

      case AiTaskType.QUIZ_BATCH_EVALUATION:
        return this.quizBatchEvaluation(userPrompt);

      default:
        return JSON.stringify({ message: 'Mock response: task type not recognised.' });
    }
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  /** Extracts up to `limit` technology/skill keywords from free-form text. */
  private extractSkills(text: string, limit = 4): string[] {
    const KNOWN_SKILLS = [
      'NestJS', 'TypeScript', 'JavaScript', 'React', 'Vue', 'Angular',
      'Node.js', 'Express', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis',
      'Docker', 'Kubernetes', 'Git', 'CI/CD', 'REST API', 'GraphQL',
      'Python', 'Django', 'FastAPI', 'Java', 'Spring Boot', 'Golang',
      'AWS', 'GCP', 'Azure', 'Linux', 'Nginx', 'Prisma', 'Next.js',
      'Tailwind CSS', 'HTML', 'CSS', 'SQL', 'NoSQL', 'Microservices',
      'WebSocket', 'JWT', 'OAuth', 'Swagger', 'Jest', 'Zod',
    ];

    const lower = text.toLowerCase();
    const found = KNOWN_SKILLS.filter((s) => lower.includes(s.toLowerCase()));
    if (found.length > 0) return found.slice(0, limit);

    // Fallback: always return something plausible
    return ['TypeScript', 'NestJS', 'PostgreSQL', 'REST API'].slice(0, limit);
  }

  private complexityFor(index: number): 'beginner' | 'intermediate' | 'advanced' {
    const levels: Array<'beginner' | 'intermediate' | 'advanced'> = [
      'intermediate', 'beginner', 'advanced', 'intermediate',
    ];
    return levels[index % levels.length];
  }

  // -----------------------------------------------------------------------
  // Task-specific mock builders
  // -----------------------------------------------------------------------

  private learningEvidence(userPrompt: string): string {
    const skills = this.extractSkills(userPrompt);
    return JSON.stringify({
      skills: skills.map((name, i) => ({
        name,
        confidence: parseFloat((0.75 + i * 0.04).toFixed(2)),
        complexity: this.complexityFor(i),
        evidence: [`Disebutkan secara eksplisit dalam konten pembelajaran tentang ${name}`],
        reason: `Konten menunjukkan pemahaman praktis tentang ${name} melalui penjelasan dan contoh.`,
      })),
    });
  }

  private assessmentGenerator(userPrompt: string): string {
    const skills = this.extractSkills(userPrompt, 2);
    const skill = skills[0];
    return JSON.stringify({
      questions: [
        {
          question: `Jelaskan konsep utama dari ${skill} dan bagaimana Anda menerapkannya dalam proyek nyata.`,
          type: 'ESSAY',
          guideline: `Jawaban yang baik mencakup definisi ${skill}, skenario penggunaan, dan contoh implementasi praktis.`,
        },
        {
          question: `Analisis trade-off dalam memilih ${skill} dibandingkan alternatif lain. Faktor apa yang memengaruhi keputusan Anda?`,
          type: 'ANALYTICAL',
          guideline: `Evaluasi berdasarkan: performa, skalabilitas, kemudahan maintenance, dan kesesuaian dengan kebutuhan proyek.`,
        },
        {
          question: `Bagaimana Anda akan men-debug masalah umum yang muncul saat menggunakan ${skill} di lingkungan produksi?`,
          type: 'ESSAY',
          guideline: `Mencakup pendekatan debugging sistematis, tools yang digunakan, dan strategi mitigasi risiko.`,
        },
      ],
    });
  }

  private projectEvidence(userPrompt: string): string {
    const skills = this.extractSkills(userPrompt);
    return JSON.stringify({
      skills: skills.map((name, i) => ({
        name,
        parentId: null,
        confidence: parseFloat((0.72 + i * 0.05).toFixed(2)),
        complexity: this.complexityFor(i),
        evidence: [
          `Digunakan secara aktif dalam arsitektur proyek untuk ${name}`,
          `Implementasi nyata terlihat dari struktur kode dan konfigurasi`,
        ],
        reason: `Proyek secara eksplisit mengintegrasikan ${name} sebagai komponen inti.`,
      })),
    });
  }

  private behavioralCareerAlignment(userPrompt: string): string {
    const lower = userPrompt.toLowerCase();
    const isBackend = lower.includes('backend') || lower.includes('api') || lower.includes('server');
    const isFrontend = lower.includes('frontend') || lower.includes('ui') || lower.includes('react');
    const isDevOps = lower.includes('devops') || lower.includes('docker') || lower.includes('cloud');

    const careerGoals: { title: string; confidence: number; matchFactors: string[]; reason: string }[] = [];

    if (isBackend || (!isFrontend && !isDevOps)) {
      careerGoals.push({
        title: 'Backend Developer',
        confidence: 0.88,
        matchFactors: ['Ketertarikan pada logika server', 'Pengalaman dengan API & database', 'Kemampuan problem-solving analitis'],
        reason: 'Profil menunjukkan kecenderungan kuat pada pengembangan sistem backend dan arsitektur data.',
      });
    }
    if (isFrontend) {
      careerGoals.push({
        title: 'Frontend Developer',
        confidence: 0.81,
        matchFactors: ['Minat pada user experience', 'Ketertarikan pada desain UI', 'Kemampuan JavaScript/TypeScript'],
        reason: 'Profil menunjukkan ketertarikan pada pembuatan antarmuka pengguna yang interaktif.',
      });
    }
    if (isDevOps) {
      careerGoals.push({
        title: 'DevOps Engineer',
        confidence: 0.79,
        matchFactors: ['Pemahaman infrastruktur cloud', 'Pengalaman containerisasi', 'Ketertarikan pada otomasi'],
        reason: 'Profil menunjukkan kecocokan dengan peran engineering infrastruktur dan deployment.',
      });
    }

    if (careerGoals.length === 0) {
      careerGoals.push({
        title: 'Full Stack Developer',
        confidence: 0.75,
        matchFactors: ['Kemampuan adaptif', 'Pengalaman beragam teknologi', 'Ketertarikan pada end-to-end development'],
        reason: 'Profil menunjukkan kecocokan dengan peran pengembangan full stack yang fleksibel.',
      });
    }

    return JSON.stringify({ careerGoals });
  }

  private skillInitClassification(userPrompt: string): string {
    const lower = userPrompt.toLowerCase();
    const CAREER_KEYWORDS: Record<string, string> = {
      'backend': 'Backend Developer',
      'frontend': 'Frontend Developer',
      'fullstack': 'Full Stack Developer',
      'mobile': 'Mobile Developer',
      'data scientist': 'Data Scientist',
      'machine learning': 'Machine Learning Engineer',
      'devops': 'DevOps Engineer',
      'cloud': 'Cloud Engineer',
      'android': 'Android Developer',
      'ios': 'iOS Developer',
      'game': 'Game Developer',
      'security': 'Cybersecurity Engineer',
    };

    for (const [keyword, career] of Object.entries(CAREER_KEYWORDS)) {
      if (lower.includes(keyword)) {
        return JSON.stringify({ intent: 'DIRECT_GOAL', careerName: career });
      }
    }

    // If the prompt seems non-empty but vague
    if (userPrompt.trim().length > 5) {
      return JSON.stringify({ intent: 'VAGUE_GOAL', careerName: null });
    }

    return JSON.stringify({ intent: 'EMPTY', careerName: null });
  }

  private skillInitAdaptiveQuestion(userPrompt: string): string {
    const dimensions = [
      'REALISTIC', 'INVESTIGATIVE', 'ARTISTIC',
      'SOCIAL', 'ENTERPRISING', 'CONVENTIONAL',
    ] as const;
    const dim = dimensions[Math.floor(Math.random() * dimensions.length)];

    const questions: Record<string, string> = {
      REALISTIC: 'Apakah kamu lebih suka membangun sesuatu yang bisa langsung dipakai dan dirasakan manfaatnya?',
      INVESTIGATIVE: 'Apakah kamu menikmati menganalisis data atau memecahkan masalah yang kompleks?',
      ARTISTIC: 'Apakah kamu tertarik membuat antarmuka atau pengalaman yang indah secara visual?',
      SOCIAL: 'Apakah kamu lebih termotivasi ketika pekerjaanmu membantu banyak orang secara langsung?',
      ENTERPRISING: 'Apakah kamu tertarik memimpin tim teknis atau membangun produk yang skalabel?',
      CONVENTIONAL: 'Apakah kamu menyukai pekerjaan yang terstruktur dengan standar dan prosedur yang jelas?',
    };

    return JSON.stringify({
      question: questions[dim],
      dimension: dim,
      isDiscoveryComplete: false,
      discoveredTraits: null,
    });
  }

  private skillInitSkillsExplanator(userPrompt: string): string {
    const skills = this.extractSkills(userPrompt, 3);

    const descriptions: Record<string, { description: string; whyImportant: string }> = {
      TypeScript: {
        description: 'Superset dari JavaScript yang menambahkan sistem tipe statis untuk membantu mendeteksi bug lebih awal.',
        whyImportant: 'Meningkatkan keandalan kode, memudahkan refactoring, dan essential di ekosistem modern.',
      },
      NestJS: {
        description: 'Framework Node.js yang menggunakan TypeScript dan pola arsitektur seperti Angular untuk membangun API yang skalabel.',
        whyImportant: 'Standar industri untuk membangun backend enterprise yang terstruktur dan mudah di-maintain.',
      },
      PostgreSQL: {
        description: 'Database relasional open-source yang powerful dengan dukungan ACID dan fitur JSON yang canggih.',
        whyImportant: 'Pilihan utama untuk aplikasi produksi yang membutuhkan konsistensi data dan performa tinggi.',
      },
      'REST API': {
        description: 'Arsitektur komunikasi antar sistem menggunakan protokol HTTP dengan prinsip stateless.',
        whyImportant: 'Fondasi dari hampir semua komunikasi antara frontend dan backend di aplikasi modern.',
      },
    };

    return JSON.stringify({
      skills: skills.map((name) => {
        const info = descriptions[name] ?? {
          description: `${name} adalah teknologi populer yang digunakan secara luas dalam pengembangan perangkat lunak modern.`,
          whyImportant: `Memahami ${name} membuka peluang karir yang lebih luas dan meningkatkan produktivitas pengembangan.`,
        };
        return {
          name,
          description: info.description,
          whyImportant: info.whyImportant,
          isSpecificOrChildSkill: false,
        };
      }),
    });
  }

  private skillTaxonomyResolver(): string {
    // Always return null parentId — the skill is treated as a root node
    return JSON.stringify({
      parentId: null,
      reason: 'Skill ini merupakan kompetensi root level yang tidak memiliki parent dalam taksonomi yang tersedia.',
    });
  }

  private quizBatchEvaluation(userPrompt: string): string {
    // Extract questionId-like patterns from prompt (e.g., UUIDs or "q1", "q2")
    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
    const matches = userPrompt.match(uuidRegex) ?? [];

    // Default to 2 mock questions if none found
    const questionIds = matches.length > 0
      ? [...new Set(matches)].slice(0, 5)
      : ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002'];

    const questionEvaluations = questionIds.map((qId, i) => ({
      questionId: qId,
      scores: {
        theory: parseFloat((65 + i * 5).toFixed(1)),
        analysis: parseFloat((70 + i * 3).toFixed(1)),
        caseStudy: parseFloat((68 + i * 4).toFixed(1)),
      },
      finalScore: parseFloat((67.7 + i * 4).toFixed(1)),
    }));

    const skills = this.extractSkills(userPrompt, 2);

    return JSON.stringify({
      sessionScore: 72.5,
      questionEvaluations,
      skillBreakdown: skills.map((skillNode, i) => ({
        skillNode,
        evidenceScore: parseFloat((0.65 + i * 0.08).toFixed(2)),
      })),
    });
  }
}
