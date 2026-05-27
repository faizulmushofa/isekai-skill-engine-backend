export class AiJsonFormats {
  public static readonly INSTRUCTION_PREFIX = `\n\nOUTPUT FORMAT: Return ONLY a valid JSON object strictly matching this structure:\n`;

  public static readonly LEARNING_EVIDENCE = `{
  "skills": [
    {
      "name": "<skill_name>",
      "confidence": 0.85,
      "complexity": "beginner",
      "evidence": ["<evidence_1>"],
      "reason": "<reasoning_text>"
    }
  ]
}`;

  public static readonly ASSESSMENT_GENERATOR = `{
  "questions": [
    {
      "question": "<question_text>",
      "type": "ESSAY",
      "guideline": "<grading_guideline>"
    }
  ]
}`;

  public static readonly PROJECT_EVIDENCE = `{
  "skills": [
    {
      "name": "<skill_name>",
      "confidence": 0.9,
      "complexity": "advanced",
      "evidence": ["<evidence_1>"],
      "reason": "<reasoning_text>"
    }
  ]
}`;

  public static readonly BEHAVIORAL_CAREER_ALIGNMENT = `{
  "careerGoals": [
    {
      "title": "<career_title>",
      "confidence": 0.95,
      "matchFactors": ["<factor_1>"],
      "reason": "<reasoning_text>"
    }
  ]
}`;

  public static readonly SKILL_INIT_CLASSIFICATION = `{
  "intent": "DIRECT_GOAL",
  "careerName": "<career_name_or_null>"
}`;

  public static readonly SKILL_INIT_ADAPTIVE_QUESTION = `{
  "question": "<question_text>",
  "dimension": "REALISTIC",
  "isDiscoveryComplete": false,
  "discoveredTraits": ["<trait_1>"]
}`;

  public static readonly SKILL_INIT_SKILLS_EXPLANATOR = `{
  "skills": [
    {
      "name": "<skill_name>",
      "description": "<description_text>",
      "whyImportant": "<reason_text>"
    }
  ]
}`;

  public static readonly QUIZ_BATCH_EVALUATION = `{
  "sessionScore": <number_0_to_100>,
  "questionEvaluations": [
    {
      "questionId": "<uuid>",
      "scores": {
        "theory": <number_0_to_100>,
        "analysis": <number_0_to_100>,
        "caseStudy": <number_0_to_100>
      },
      "finalScore": <number_0_to_100>
    }
  ],
  "skillBreakdown": [
    {
      "skillNode": "<skill_node_name>",
      "evidenceScore": <number_0_to_100>
    }
  ]
}`;

  public static readonly SKILL_TAXONOMY = `{
  "parentId": "<selected_parent_uuid_or_null>",
  "reason": "<reasoning_text_explaining_why_it_belongs_there_or_why_it_is_root>"
}`;

  /**
   * Helper method to attach the instruction prefix to the target format.
   */
  public static getInstruction(format: string): string {
    return `${this.INSTRUCTION_PREFIX}${format}`;
  }
}
