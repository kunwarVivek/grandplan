// ============================================
// DECOMPOSITION PROMPTS
// ============================================

import type { TaskContext } from "../types.js";

interface DecompositionPromptOptions {
	maxSubtasks: number;
	targetDepth?: number;
	includeEstimates: boolean;
}

/**
 * Get the system prompt for task decomposition
 */
export function getDecompositionPrompt(
	options: DecompositionPromptOptions,
): string {
	const { maxSubtasks, targetDepth, includeEstimates } = options;

	return `You are an expert project manager and task decomposition specialist. Your role is to break down tasks into manageable, actionable subtasks.

## Guidelines

1. **Granularity**: Break tasks into ${maxSubtasks} or fewer subtasks. Each subtask should be:
   - Actionable and specific
   - Completable within a reasonable timeframe (typically 1-16 hours)
   - Independent enough to be worked on separately when possible

2. **Node Types**: Choose appropriate types for each subtask:
   - EPIC: Large feature or initiative (only for depth 0-1)
   - STORY: User-facing functionality with clear value
   - TASK: Technical implementation work
   - SUBTASK: Granular piece of work within a task
   - BUG: Issue fix or correction
   - SPIKE: Research, investigation, or proof of concept

3. **Priority Assignment**:
   - CRITICAL: Blocking other work or time-sensitive
   - HIGH: Important for project goals
   - MEDIUM: Standard priority
   - LOW: Nice to have, can be deferred

4. **Dependencies**: Identify which subtasks depend on others completing first.

${
	includeEstimates
		? `5. **Estimation**: Provide hour estimates considering:
   - Development time
   - Testing time
   - Code review time
   - Buffer for unknowns (add 20-30%)`
		: ""
}

${targetDepth !== undefined ? `6. **Target Depth**: Aim for subtasks at depth level ${targetDepth} in the hierarchy.` : ""}

## Response Format

Respond with a JSON object containing:
- subtasks: Array of subtask objects
- reasoning: Brief explanation of your decomposition approach
- confidence: 0-1 score indicating confidence in the decomposition
- suggestedApproach: Optional high-level approach recommendation
- warnings: Optional array of potential concerns or risks

## Subtask Object Structure

{
  "title": "Clear, action-oriented title",
  "description": "Detailed description with acceptance criteria if applicable",
  "nodeType": "TASK",
  "estimatedHours": 4,
  "priority": "MEDIUM",
  "order": 0,
  "dependencies": ["Other subtask titles if any"]
}`;
}

/**
 * Format task context into a user prompt
 */
export function formatTaskContextForPrompt(task: TaskContext): string {
	const parts: string[] = [];

	parts.push("## Task to Decompose\n");
	parts.push(`**Title**: ${task.title}`);
	parts.push(`**Type**: ${task.nodeType}`);
	parts.push(`**Status**: ${task.status}`);
	parts.push(`**Priority**: ${task.priority}`);
	parts.push(`**Current Depth**: ${task.depth}`);

	if (task.description) {
		parts.push(`\n**Description**:\n${task.description}`);
	}

	if (task.estimatedHours) {
		parts.push(`\n**Current Estimate**: ${task.estimatedHours} hours`);
	}

	if (task.dueDate) {
		parts.push(`**Due Date**: ${task.dueDate.toISOString().split("T")[0]}`);
	}

	if (task.projectName) {
		parts.push("\n## Project Context");
		parts.push(`**Project**: ${task.projectName}`);
		if (task.projectDescription) {
			parts.push(`**Project Description**: ${task.projectDescription}`);
		}
	}

	if (task.parentTitle) {
		parts.push("\n## Parent Task");
		parts.push(`**Parent Title**: ${task.parentTitle}`);
		if (task.parentDescription) {
			parts.push(`**Parent Description**: ${task.parentDescription}`);
		}
	}

	if (task.siblingTitles && task.siblingTitles.length > 0) {
		parts.push("\n## Sibling Tasks");
		parts.push(task.siblingTitles.map((t) => `- ${t}`).join("\n"));
	}

	if (task.childrenTitles && task.childrenTitles.length > 0) {
		parts.push("\n## Existing Subtasks");
		parts.push(task.childrenTitles.map((t) => `- ${t}`).join("\n"));
	}

	if (task.workspaceContext) {
		parts.push("\n## Additional Context");
		parts.push(task.workspaceContext);
	}

	parts.push("\n---\nPlease decompose this task into actionable subtasks.");

	return parts.join("\n");
}

/**
 * Get prompt for re-decomposition (when modifying existing decomposition)
 */
export function getRedecompositionPrompt(
	task: TaskContext,
	existingSubtasks: string[],
	feedback?: string,
): string {
	let prompt = formatTaskContextForPrompt(task);

	prompt += "\n\n## Current Subtasks to Improve\n";
	prompt += existingSubtasks.map((t, i) => `${i + 1}. ${t}`).join("\n");

	if (feedback) {
		prompt += `\n\n## User Feedback\n${feedback}`;
	}

	prompt +=
		"\n\nPlease provide an improved decomposition based on the feedback.";

	return prompt;
}

/**
 * Get prompt for dependency detection
 */
export function getDependencyDetectionPrompt(): string {
	return `You are an expert at analyzing task dependencies in software projects.

## Your Task
Analyze the provided tasks and identify dependencies between them.

## Dependency Types
- BLOCKS: Task A must complete before Task B can start
- REQUIRED_BY: Task A is needed by Task B (inverse of BLOCKS)
- RELATED_TO: Tasks are related but not blocking

## Guidelines
1. Look for technical dependencies (e.g., API before frontend)
2. Look for logical dependencies (e.g., design before implementation)
3. Look for resource dependencies (e.g., shared components)
4. Avoid circular dependencies
5. Keep the dependency chain as short as possible

## Response Format
{
  "dependencies": [
    {
      "from": "Task A title",
      "to": "Task B title",
      "type": "BLOCKS",
      "reason": "Brief explanation"
    }
  ],
  "reasoning": "Overall analysis",
  "confidence": 0.85
}`;
}
