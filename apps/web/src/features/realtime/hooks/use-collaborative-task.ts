// ============================================
// COLLABORATIVE TASK EDITING HOOK
// ============================================

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Awareness } from "y-protocols/awareness";
import * as Y from "yjs";

import type { CollaborativeTaskField, AwarenessUser } from "../types";

type TaskData = {
	id: string;
	title?: string;
	description?: string;
	status?: string;
	priority?: string;
	assigneeId?: string;
	dueDate?: string;
	[key: string]: unknown;
};

type UseCollaborativeTaskOptions = {
	doc: Y.Doc | null;
	awareness: Awareness | null;
	userId: string;
	userName: string;
	userColor: string;
};

type UseCollaborativeTaskReturn = {
	task: TaskData | null;
	updateField: <K extends keyof TaskData>(
		field: K,
		value: TaskData[K]
	) => void;
	isEditing: boolean;
	editors: CollaborativeTaskField[];
	startEditing: (fieldName: string) => void;
	stopEditing: () => void;
	getFieldEditor: (fieldName: string) => CollaborativeTaskField | null;
	isFieldBeingEdited: (fieldName: string) => boolean;
};

export function useCollaborativeTask(
	taskId: string | null,
	options: UseCollaborativeTaskOptions
): UseCollaborativeTaskReturn {
	const { doc, awareness, userId } = options;

	const [task, setTask] = useState<TaskData | null>(null);
	const [editors, setEditors] = useState<CollaborativeTaskField[]>([]);
	const [editingField, setEditingField] = useState<string | null>(null);

	// Get the tasks map from Yjs document
	const tasksMap = useMemo(() => {
		if (!doc) return null;
		return doc.getMap<Y.Map<unknown>>("tasks");
	}, [doc]);

	// Subscribe to task changes
	useEffect(() => {
		if (!tasksMap || !taskId) {
			setTask(null);
			return;
		}

		const taskYMap = tasksMap.get(taskId);

		const updateTask = () => {
			if (!taskYMap) {
				setTask(null);
				return;
			}

			const taskData: TaskData = { id: taskId };
			taskYMap.forEach((value, key) => {
				taskData[key] = value;
			});
			setTask(taskData);
		};

		// Initial update
		updateTask();

		// Subscribe to changes
		const handleChange = () => {
			updateTask();
		};

		if (taskYMap) {
			taskYMap.observe(handleChange);
		}

		// Also observe the tasks map for the task being added/removed
		const handleTasksChange = () => {
			const newTaskYMap = tasksMap.get(taskId);
			if (newTaskYMap !== taskYMap) {
				updateTask();
			}
		};

		tasksMap.observe(handleTasksChange);

		return () => {
			if (taskYMap) {
				taskYMap.unobserve(handleChange);
			}
			tasksMap.unobserve(handleTasksChange);
		};
	}, [tasksMap, taskId]);

	// Update a task field
	const updateField = useCallback(
		<K extends keyof TaskData>(field: K, value: TaskData[K]) => {
			if (!tasksMap || !taskId || !doc) return;

			let taskYMap = tasksMap.get(taskId);

			// Create task if it doesn't exist
			if (!taskYMap) {
				taskYMap = new Y.Map<unknown>();
				tasksMap.set(taskId, taskYMap);
			}

			doc.transact(() => {
				taskYMap!.set(field as string, value);
			});
		},
		[tasksMap, taskId, doc]
	);

	// Start editing a field
	const startEditing = useCallback(
		(fieldName: string) => {
			if (!awareness || !taskId) return;

			setEditingField(fieldName);

			const localState = awareness.getLocalState();
			awareness.setLocalStateField("user", {
				...localState?.user,
				editingTaskId: taskId,
				editingField: fieldName,
			});
		},
		[awareness, taskId]
	);

	// Stop editing
	const stopEditing = useCallback(() => {
		if (!awareness) return;

		setEditingField(null);

		const localState = awareness.getLocalState();
		awareness.setLocalStateField("user", {
			...localState?.user,
			editingTaskId: undefined,
			editingField: undefined,
		});
	}, [awareness]);

	// Track who is editing which fields
	useEffect(() => {
		if (!awareness || !taskId) {
			setEditors([]);
			return;
		}

		const updateEditors = () => {
			const states = awareness.getStates();
			const currentEditors: CollaborativeTaskField[] = [];

			states.forEach((state) => {
				const user = state.user as AwarenessUser | undefined;
				if (
					user &&
					user.editingTaskId === taskId &&
					user.editingField &&
					user.userId !== userId
				) {
					currentEditors.push({
						fieldName: user.editingField,
						editorId: user.userId,
						editorName: user.name,
						editorColor: user.color,
						timestamp: Date.now(),
					});
				}
			});

			setEditors(currentEditors);
		};

		// Initial update
		updateEditors();

		awareness.on("change", updateEditors);
		return () => {
			awareness.off("change", updateEditors);
		};
	}, [awareness, taskId, userId]);

	// Get editor for a specific field
	const getFieldEditor = useCallback(
		(fieldName: string): CollaborativeTaskField | null => {
			return editors.find((e) => e.fieldName === fieldName) || null;
		},
		[editors]
	);

	// Check if a field is being edited by someone else
	const isFieldBeingEdited = useCallback(
		(fieldName: string): boolean => {
			return editors.some((e) => e.fieldName === fieldName);
		},
		[editors]
	);

	return {
		task,
		updateField,
		isEditing: editingField !== null,
		editors,
		startEditing,
		stopEditing,
		getFieldEditor,
		isFieldBeingEdited,
	};
}

// Hook for optimistic task updates with conflict resolution
export function useOptimisticTaskUpdate(
	updateField: <K extends keyof TaskData>(field: K, value: TaskData[K]) => void
) {
	const [pendingUpdates, setPendingUpdates] = useState<
		Map<string, { value: unknown; timestamp: number }>
	>(new Map());

	const optimisticUpdate = useCallback(
		<K extends keyof TaskData>(field: K, value: TaskData[K]) => {
			// Track pending update
			setPendingUpdates((prev) => {
				const next = new Map(prev);
				next.set(field as string, { value, timestamp: Date.now() });
				return next;
			});

			// Apply update
			updateField(field, value);

			// Clear pending update after a delay (assume success)
			setTimeout(() => {
				setPendingUpdates((prev) => {
					const next = new Map(prev);
					next.delete(field as string);
					return next;
				});
			}, 1000);
		},
		[updateField]
	);

	const isPending = useCallback(
		(field: string): boolean => {
			return pendingUpdates.has(field);
		},
		[pendingUpdates]
	);

	return {
		optimisticUpdate,
		isPending,
		pendingCount: pendingUpdates.size,
	};
}

// Hook for collaborative text editing within a task field
export function useCollaborativeText(
	doc: Y.Doc | null,
	taskId: string,
	fieldName: string
) {
	const [text, setText] = useState<Y.Text | null>(null);

	useEffect(() => {
		if (!doc || !taskId) {
			setText(null);
			return;
		}

		// Get or create Y.Text for this field
		const textName = `task:${taskId}:${fieldName}`;
		const yText = doc.getText(textName);
		setText(yText);

		const handleChange = () => {
			// Text changes are handled by the Y.Text binding
		};

		yText.observe(handleChange);
		return () => {
			yText.unobserve(handleChange);
		};
	}, [doc, taskId, fieldName]);

	return text;
}
