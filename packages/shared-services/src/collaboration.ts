import type { UserId } from "@tnvios/database/contracts";
import { createEntityId, type EntityId } from "@tnvios/database/identifiers";

import {
  required,
  type EntityReference,
  type MutationRepository,
  type ServiceContext,
} from "./contracts.js";

export class Comment {
  readonly id: EntityId<"comment"> = createEntityId();
  readonly createdAt = new Date();
  updatedAt = this.createdAt;
  deletedAt: Date | null = null;
  constructor(
    readonly context: ServiceContext,
    readonly target: EntityReference,
    readonly body: string,
    readonly parentCommentId: EntityId<"comment"> | null = null,
  ) {
    this.body = required(body, "comment.body");
  }
}
export interface Mention {
  readonly id: EntityId<"comment_mention">;
  readonly commentId: Comment["id"];
  readonly userId: UserId;
}
export interface CollaborationRepository extends MutationRepository<Comment> {
  saveMentions(comment: Comment, mentions: readonly Mention[]): Promise<void>;
}
export class CommentsMentionsEngine {
  constructor(
    private readonly repository: CollaborationRepository,
    private readonly canAccessTarget: (userId: UserId, target: EntityReference) => Promise<boolean>,
  ) {}
  async create(input: {
    readonly context: ServiceContext;
    readonly target: EntityReference;
    readonly body: string;
    readonly mentionedUserIds?: readonly UserId[];
    readonly parentCommentId?: Comment["id"] | null;
  }): Promise<{ readonly comment: Comment; readonly mentions: readonly Mention[] }> {
    const mentionedUserIds = [...new Set(input.mentionedUserIds ?? [])];
    for (const userId of mentionedUserIds) {
      if (!(await this.canAccessTarget(userId, input.target))) throw new MentionAccessDeniedError();
    }
    const comment = new Comment(input.context, input.target, input.body, input.parentCommentId);
    await this.repository.save(comment, {
      eventType: "comment.created",
      aggregateType: input.target.entityType,
      aggregateId: input.target.entityId,
      payload: { commentId: comment.id, parentCommentId: comment.parentCommentId },
    });
    const mentions = mentionedUserIds.map((userId) => ({
      id: createEntityId<"comment_mention">(),
      commentId: comment.id,
      userId,
    }));
    if (mentions.length) await this.repository.saveMentions(comment, mentions);
    return { comment, mentions };
  }
}
export class MentionAccessDeniedError extends Error {
  constructor() {
    super("Mentioned user cannot access the target entity.");
    this.name = "MentionAccessDeniedError";
  }
}
