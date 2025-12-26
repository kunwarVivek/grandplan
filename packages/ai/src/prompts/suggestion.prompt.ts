// ============================================
// SUGGESTION PROMPTS
// ============================================

import type { SuggestionType } from "../types.js";

/**
 * Get the system prompt for generating suggestions
 */
export function getSuggestionPrompt(type: SuggestionType): string {
	const baseInstructions = `You are an expert project manager and technical writer helping improve task quality.

Analyze the provided task and generate helpful suggestions. Be specific and actionable.`;

	const typeSpecificPrompts: Record<SuggestionType, string> = {
		title: `${baseInstructions}

## Title Improvement Guidelines

1. **Clarity**: The title should clearly communicate what the task is about
2. **Action-Oriented**: Start with a verb when possible (Add, Fix, Update, Implement)
3. **Specific**: Avoid vague terms like "stuff", "things", "misc"
4. **Concise**: Keep it under 80 characters while being descriptive
5. **Context**: Include enough context to understand without reading the description

## Response Format
{
  "suggestion": {
    "suggested": "Improved title",
    "alternatives": ["Alternative 1", "Alternative 2"],
    "reasoning": "Why this title is better",
    "improvements": ["Made it action-oriented", "Added specific component name"]
  },
  "confidence": 0.85
}`,

		description: `${baseInstructions}

## Description Enhancement Guidelines

1. **Structure**: Use clear sections (Overview, Acceptance Criteria, Technical Notes)
2. **Acceptance Criteria**: Define clear, testable success criteria
3. **Context**: Provide enough background for someone new to understand
4. **Technical Details**: Include relevant technical considerations
5. **Out of Scope**: Clarify what is NOT included to prevent scope creep

## Response Format
{
  "suggestion": {
    "suggested": "Full enhanced description",
    "sections": {
      "overview": "Brief summary of the task",
      "acceptanceCriteria": ["Criterion 1", "Criterion 2"],
      "technicalNotes": "Technical implementation details",
      "outOfScope": ["Not included item 1"]
    },
    "reasoning": "Explanation of improvements"
  },
  "confidence": 0.8
}`,

		priority: `${baseInstructions}

## Priority Assessment Guidelines

Consider these factors:
1. **Business Impact**: Revenue, user experience, compliance
2. **Urgency**: Deadlines, dependencies blocking others
3. **Effort vs Value**: Quick wins vs long projects
4. **Risk**: What happens if this is delayed?
5. **Dependencies**: Is this blocking other high-priority work?

## Priority Levels
- CRITICAL: Must be done immediately, blocking critical path
- HIGH: Important for current sprint/milestone goals
- MEDIUM: Should be done soon, standard work
- LOW: Can be deferred, nice to have

## Response Format
{
  "suggestion": {
    "suggested": "HIGH",
    "reasoning": "Detailed explanation",
    "factors": [
      { "factor": "Blocks 3 other tasks", "impact": "high", "direction": "increase" },
      { "factor": "No immediate deadline", "impact": "medium", "direction": "decrease" }
    ]
  },
  "confidence": 0.75
}`,

		status: `${baseInstructions}

## Status Recommendation Guidelines

Analyze the task context and recommend the most appropriate status:

1. **DRAFT**: Task needs more definition before starting
2. **PENDING**: Ready to start, waiting in backlog
3. **IN_PROGRESS**: Actively being worked on
4. **BLOCKED**: Cannot proceed due to dependency or issue
5. **IN_REVIEW**: Work complete, awaiting review/approval
6. **COMPLETED**: All done
7. **CANCELLED**: No longer needed

## Response Format
{
  "suggestion": {
    "suggested": "PENDING",
    "reasoning": "Why this status is recommended",
    "blockers": ["Blocker 1 if any"],
    "nextSteps": ["What should happen next"]
  },
  "confidence": 0.9
}`,

		assignee: `${baseInstructions}

## Assignee Recommendation Guidelines

Consider:
1. **Skills Match**: Required expertise vs team capabilities
2. **Availability**: Current workload of team members
3. **Context**: Who has relevant context or previous experience
4. **Growth**: Opportunity for skill development
5. **Bus Factor**: Spreading knowledge across team

Note: Without team member information, provide general guidance on ideal assignee profile.

## Response Format
{
  "suggestion": {
    "idealProfile": {
      "requiredSkills": ["Skill 1", "Skill 2"],
      "preferredExperience": "Description of ideal experience",
      "estimatedLevel": "senior|mid|junior"
    },
    "reasoning": "Why these requirements"
  },
  "confidence": 0.7
}`,

		deadline: `${baseInstructions}

## Deadline Recommendation Guidelines

Consider:
1. **Effort Estimate**: How long the work will take
2. **Priority**: Higher priority = sooner deadline
3. **Dependencies**: When do dependent tasks need this?
4. **Buffer**: Allow time for review and unexpected issues
5. **Team Capacity**: Realistic given current workload

## Response Format
{
  "suggestion": {
    "recommendedDeadline": "YYYY-MM-DD",
    "reasoning": "Why this deadline makes sense",
    "factors": [
      { "factor": "Estimated 16 hours of work", "impact": "3 business days" },
      { "factor": "Needs code review", "impact": "+1 day" }
    ],
    "risks": ["Holiday coming up might delay"]
  },
  "confidence": 0.65
}`,

		dependencies: `${baseInstructions}

## Dependency Detection Guidelines

Analyze the task and identify:
1. **Upstream Dependencies**: What must be done first
2. **Downstream Dependencies**: What this task enables
3. **Related Tasks**: Tasks that should be coordinated with

Look for:
- Technical dependencies (API before frontend)
- Data dependencies (schema before queries)
- Knowledge dependencies (design before implementation)

## Response Format
{
  "suggestion": {
    "upstreamDependencies": [
      { "description": "Task description", "reason": "Why it's needed first" }
    ],
    "downstreamDependencies": [
      { "description": "Task description", "reason": "Why it needs this" }
    ],
    "relatedTasks": [
      { "description": "Task description", "relationship": "Should be coordinated" }
    ]
  },
  "confidence": 0.7
}`,
	};

	return typeSpecificPrompts[type];
}

/**
 * Get prompt for batch suggestions
 */
export function getBatchSuggestionPrompt(types: SuggestionType[]): string {
	return `You are analyzing a task to provide multiple improvement suggestions.

Provide suggestions for the following aspects: ${types.join(", ")}

Respond with a JSON object containing suggestions for each requested type:
{
  "suggestions": {
    "title": { ... },
    "description": { ... }
  },
  "overallQualityScore": 0.7,
  "topPriorities": ["Fix description clarity", "Add acceptance criteria"]
}`;
}

/**
 * Get prompt for task quality assessment
 */
export function getQualityAssessmentPrompt(): string {
	return `Assess the overall quality of this task definition.

Score each dimension 1-10:
1. **Clarity**: Is it clear what needs to be done?
2. **Completeness**: Are all necessary details provided?
3. **Actionability**: Can someone start working on this immediately?
4. **Testability**: Are success criteria clear and testable?
5. **Scope**: Is the scope well-defined and appropriate?

Response format:
{
  "scores": {
    "clarity": 7,
    "completeness": 5,
    "actionability": 6,
    "testability": 4,
    "scope": 8
  },
  "overallScore": 6,
  "strengths": ["Clear title", "Good scope definition"],
  "weaknesses": ["Missing acceptance criteria", "Vague technical requirements"],
  "recommendations": [
    {
      "priority": "high",
      "suggestion": "Add acceptance criteria",
      "impact": "Improves testability and clarity"
    }
  ]
}`;
}
