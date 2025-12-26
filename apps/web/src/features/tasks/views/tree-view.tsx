import { useState, useMemo, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  FolderOpen,
  Folder,
  FileText,
  MoreHorizontal,
  Plus,
  Edit2,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Progress,
  ProgressTrack,
  ProgressIndicator,
} from "@/components/ui/progress";
import {
  type Task,
  type TaskStatus,
  TASK_STATUS_CONFIG as STATUS_CONFIG,
  TASK_PRIORITY_CONFIG as PRIORITY_CONFIG,
} from "../types";

// ============================================
// VIEW PROPS TYPE
// ============================================

type ViewProps = {
  tasks: Task[];
  onTaskClick: (taskId: string) => void;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onTaskCreate: (status?: TaskStatus) => void;
  isLoading?: boolean;
};

// ============================================
// TREE NODE INTERFACE
// ============================================

interface TreeNode extends Task {
  children: TreeNode[];
  level: number;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function buildTree(tasks: Task[]): TreeNode[] {
  const taskMap = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  // First pass: create nodes
  for (const task of tasks) {
    taskMap.set(task.id, { ...task, children: [], level: 0 });
  }

  // Second pass: build hierarchy
  for (const task of tasks) {
    const node = taskMap.get(task.id)!;
    if (task.parentId && taskMap.has(task.parentId)) {
      const parent = taskMap.get(task.parentId)!;
      node.level = parent.level + 1;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Sort children by position
  const sortChildren = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.position - b.position);
    for (const node of nodes) {
      sortChildren(node.children);
    }
  };
  sortChildren(roots);

  return roots;
}

function calculateProgress(node: TreeNode): number {
  if (node.children.length === 0) {
    return node.status === "completed" ? 100 : node.progress;
  }

  const childProgress = node.children.reduce(
    (sum, child) => sum + calculateProgress(child),
    0
  );
  return Math.round(childProgress / node.children.length);
}

function flattenTree(
  nodes: TreeNode[],
  expandedIds: Set<string>
): TreeNode[] {
  const result: TreeNode[] = [];

  const traverse = (nodeList: TreeNode[]) => {
    for (const node of nodeList) {
      result.push(node);
      if (expandedIds.has(node.id) && node.children.length > 0) {
        traverse(node.children);
      }
    }
  };

  traverse(nodes);
  return result;
}

// ============================================
// SORTABLE TREE ROW COMPONENT
// ============================================

interface SortableTreeRowProps {
  node: TreeNode;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onClick: () => void;
  onUpdate: (updates: Partial<Task>) => void;
}

function SortableTreeRow({
  node,
  isExpanded,
  onToggleExpand,
  onClick,
  onUpdate,
}: SortableTreeRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(node.title);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    paddingLeft: `${node.level * 24 + 8}px`,
  };

  const statusConfig = STATUS_CONFIG[node.status];
  const priorityConfig = PRIORITY_CONFIG[node.priority];
  const hasChildren = node.children.length > 0;
  const progress = calculateProgress(node);

  const handleSaveEdit = useCallback(() => {
    if (editValue.trim() && editValue !== node.title) {
      onUpdate({ title: editValue.trim() });
    }
    setIsEditing(false);
  }, [editValue, node.title, onUpdate]);

  const handleCancelEdit = useCallback(() => {
    setEditValue(node.title);
    setIsEditing(false);
  }, [node.title]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleSaveEdit();
      } else if (e.key === "Escape") {
        handleCancelEdit();
      }
    },
    [handleSaveEdit, handleCancelEdit]
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-2 rounded border-b bg-card py-2 pr-3 transition-colors hover:bg-muted/50",
        isDragging && "opacity-50 shadow-lg ring-2 ring-primary"
      )}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Expand/Collapse Button */}
      {hasChildren ? (
        <button
          type="button"
          onClick={onToggleExpand}
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          {isExpanded ? (
            <>
              <ChevronDown className="h-4 w-4" />
            </>
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      ) : (
        <div className="w-4" />
      )}

      {/* Icon */}
      {hasChildren ? (
        isExpanded ? (
          <FolderOpen className="h-4 w-4 shrink-0 text-primary" />
        ) : (
          <Folder className="h-4 w-4 shrink-0 text-primary" />
        )
      ) : (
        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
      )}

      {/* Title */}
      {isEditing ? (
        <div className="flex flex-1 items-center gap-1">
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-7 flex-1"
            autoFocus
          />
          <Button variant="ghost" size="icon-xs" onClick={handleSaveEdit}>
            <Check className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon-xs" onClick={handleCancelEdit}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onClick}
          className="flex-1 truncate text-left text-sm font-medium hover:underline"
        >
          {node.title}
        </button>
      )}

      {/* Child Count Badge */}
      {hasChildren && (
        <Badge variant="secondary" className="shrink-0">
          {node.children.length}
        </Badge>
      )}

      {/* Progress Indicator for Parents */}
      {hasChildren && (
        <div className="w-16 shrink-0">
          <Progress value={progress}>
            <ProgressTrack className="h-1.5">
              <ProgressIndicator />
            </ProgressTrack>
          </Progress>
        </div>
      )}

      {/* Status */}
      <Badge
        variant="outline"
        className={cn("shrink-0", statusConfig.bgColor, statusConfig.color)}
      >
        {statusConfig.label}
      </Badge>

      {/* Priority */}
      <span className={cn("shrink-0 text-xs font-medium", priorityConfig.color)}>
        {priorityConfig.icon}
      </span>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
        >
          <Edit2 className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon-xs">
          <MoreHorizontal className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

// ============================================
// LOADING SKELETON
// ============================================

function TreeSkeleton() {
  return (
    <div className="flex flex-col gap-1 p-4">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="flex items-center gap-2 py-2"
          style={{ paddingLeft: `${(i % 3) * 24 + 8}px` }}
        >
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-5 w-16" />
        </div>
      ))}
    </div>
  );
}

// ============================================
// TREE VIEW COMPONENT
// ============================================

export function TreeView({
  tasks,
  onTaskClick,
  onTaskUpdate,
  onTaskCreate,
  isLoading,
}: ViewProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Build tree structure
  const treeNodes = useMemo(() => buildTree(tasks), [tasks]);

  // Flatten for rendering with sortable
  const flatNodes = useMemo(
    () => flattenTree(treeNodes, expandedIds),
    [treeNodes, expandedIds]
  );

  const nodeIds = useMemo(() => flatNodes.map((n) => n.id), [flatNodes]);

  const activeNode = useMemo(
    () => (activeId ? flatNodes.find((n) => n.id === activeId) : null),
    [activeId, flatNodes]
  );

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    const allIds = new Set<string>();
    const collectIds = (nodes: TreeNode[]) => {
      for (const node of nodes) {
        if (node.children.length > 0) {
          allIds.add(node.id);
          collectIds(node.children);
        }
      }
    };
    collectIds(treeNodes);
    setExpandedIds(allIds);
  }, [treeNodes]);

  const collapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over || active.id === over.id) return;

      // Find the nodes
      const activeNode = flatNodes.find((n) => n.id === active.id);
      const overNode = flatNodes.find((n) => n.id === over.id);

      if (!activeNode || !overNode) return;

      // Update parent if dropped on a different parent level
      if (overNode.parentId !== activeNode.parentId) {
        onTaskUpdate(activeNode.id, { parentId: overNode.parentId });
      }
    },
    [flatNodes, onTaskUpdate]
  );

  if (isLoading) {
    return <TreeSkeleton />;
  }

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b p-3">
        <Button variant="outline" size="sm" onClick={expandAll}>
          Expand All
        </Button>
        <Button variant="outline" size="sm" onClick={collapseAll}>
          Collapse All
        </Button>
        <div className="flex-1" />
        <Button size="sm" onClick={() => onTaskCreate()}>
          <Plus className="mr-1 h-4 w-4" />
          Add Task
        </Button>
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={nodeIds} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col">
              {flatNodes.map((node) => (
                <SortableTreeRow
                  key={node.id}
                  node={node}
                  isExpanded={expandedIds.has(node.id)}
                  onToggleExpand={() => toggleExpanded(node.id)}
                  onClick={() => onTaskClick(node.id)}
                  onUpdate={(updates) => onTaskUpdate(node.id, updates)}
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeNode && (
              <div className="flex items-center gap-2 rounded border bg-card p-2 shadow-lg ring-2 ring-primary">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{activeNode.title}</span>
              </div>
            )}
          </DragOverlay>
        </DndContext>

        {flatNodes.length === 0 && (
          <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
            <Folder className="h-10 w-10" />
            <p className="text-sm">No tasks yet</p>
            <Button variant="outline" size="sm" onClick={() => onTaskCreate()}>
              <Plus className="mr-1 h-4 w-4" />
              Create your first task
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
