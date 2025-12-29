-- Add check constraints for data integrity

-- TaskNode.depth must be >= 0
ALTER TABLE "TaskNode" ADD CONSTRAINT "TaskNode_depth_check" CHECK (depth >= 0);

-- TaskNode.position must be >= 0
ALTER TABLE "TaskNode" ADD CONSTRAINT "TaskNode_position_check" CHECK (position >= 0);

-- TaskAIDecision.confidence must be between 0 and 1
ALTER TABLE "TaskAIDecision" ADD CONSTRAINT "TaskAIDecision_confidence_check" CHECK (confidence >= 0 AND confidence <= 1);
