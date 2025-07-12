import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import slugify from 'slugify';
import { prisma, paginate } from '@/utils/database-simple';
import { ValidationError, NotFoundError, ForbiddenError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';

export class QuestionController {
  /**
   * Get all questions with pagination and filtering
   */
  static async getQuestions(req: Request, res: Response): Promise<void> {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        search,
        tags,
        author,
        status,
        timeframe
      } = req.query;

      // Build where clause
      const where: any = {
        isDeleted: false
      };

      // Search functionality
      if (search) {
        where.OR = [
          { title: { contains: search as string, mode: 'insensitive' } },
          { description: { contains: search as string, mode: 'insensitive' } }
        ];
      }

      // Filter by tags
      if (tags) {
        const tagArray = (tags as string).split(',').map(tag => tag.trim());
        where.tags = {
          some: {
            name: { in: tagArray }
          }
        };
      }

      // Filter by author
      if (author) {
        where.author = {
          OR: [
            { name: { contains: author as string, mode: 'insensitive' } },
            { email: { equals: author as string, mode: 'insensitive' } }
          ]
        };
      }

      // Filter by status
      if (status === 'resolved') {
        where.isResolved = true;
      } else if (status === 'unresolved') {
        where.isResolved = false;
      } else if (status === 'pinned') {
        where.isPinned = true;
      }

      // Filter by timeframe
      if (timeframe) {
        const now = new Date();
        let startDate: Date;

        switch (timeframe) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
          default:
            startDate = new Date(0);
        }

        where.createdAt = { gte: startDate };
      }

      // Validate sort parameters
      const validSortFields = ['createdAt', 'updatedAt', 'viewCount', 'voteCount', 'answerCount', 'title'];
      const sortField = validSortFields.includes(sortBy as string) ? sortBy as string : 'createdAt';

      const result = await paginate(prisma.question, {
        page: Number(page),
        limit: Math.min(Number(limit), 50), // Max 50 items per page
        sortBy: sortField,
        sortOrder: sortOrder as 'asc' | 'desc',
        where,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              avatar: true,
              reputation: true,
              role: true
            }
          },
          tags: {
            select: {
              id: true,
              name: true,
              color: true
            }
          },
          _count: {
            select: {
              answers: true,
              votes: true,
              views: true
            }
          }
        }
      });

      res.json({
        message: 'Questions retrieved successfully',
        questions: result.data,
        pagination: result.pagination,
        filters: {
          search,
          tags,
          author,
          status,
          timeframe
        }
      });

    } catch (error) {
      logger.error('Get questions failed:', error);
      throw error;
    }
  }

  /**
   * Get a single question by ID or slug
   */
  static async getQuestion(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const clientIp = req.ip || 'unknown';

      // Find question by ID or slug
      const question = await prisma.question.findFirst({
        where: {
          OR: [
            { id },
            { slug: id }
          ],
          isDeleted: false
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              avatar: true,
              reputation: true,
              role: true,
              bio: true
            }
          },
          tags: {
            select: {
              id: true,
              name: true,
              color: true,
              description: true
            }
          },
          answers: {
            where: { isDeleted: false },
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  avatar: true,
                  reputation: true,
                  role: true
                }
              },
              comments: {
                where: { isDeleted: false },
                include: {
                  author: {
                    select: {
                      id: true,
                      name: true,
                      avatar: true
                    }
                  }
                },
                orderBy: { createdAt: 'asc' }
              },
              _count: {
                select: {
                  votes: true
                }
              }
            },
            orderBy: [
              { isAccepted: 'desc' },
              { voteCount: 'desc' },
              { createdAt: 'asc' }
            ]
          },
          comments: {
            where: { isDeleted: false },
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  avatar: true
                }
              }
            },
            orderBy: { createdAt: 'asc' }
          },
          _count: {
            select: {
              votes: true,
              views: true
            }
          }
        }
      });

      if (!question) {
        throw new NotFoundError('Question');
      }

      // Record view (async, don't wait)
      this.recordView(question.id, userId, clientIp, req.get('User-Agent'));

      // Check if user has voted on this question
      let userVote = null;
      if (userId) {
        const vote = await prisma.vote.findUnique({
          where: {
            userId_questionId: {
              userId,
              questionId: question.id
            }
          }
        });
        userVote = vote?.type || null;
      }

      res.json({
        message: 'Question retrieved successfully',
        question: {
          ...question,
          userVote
        }
      });

    } catch (error) {
      logger.error('Get question failed:', error);
      throw error;
    }
  }

  /**
   * Create a new question
   */
  static async createQuestion(req: Request, res: Response): Promise<void> {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed: ' + errors.array().map(e => e.msg).join(', '));
    }

    try {
      const { title, description, tags } = req.body;
      const userId = req.user!.id;

      // Generate unique slug
      let baseSlug = slugify(title, { lower: true, strict: true });
      let slug = baseSlug;
      let counter = 1;

      while (await prisma.question.findUnique({ where: { slug } })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      // Process tags
      const tagIds: string[] = [];
      if (tags && Array.isArray(tags)) {
        for (const tagName of tags) {
          const normalizedName = tagName.trim().toLowerCase();
          
          // Find or create tag
          let tag = await prisma.tag.findUnique({
            where: { name: normalizedName }
          });

          if (!tag) {
            tag = await prisma.tag.create({
              data: {
                name: normalizedName,
                usageCount: 1
              }
            });
          } else {
            // Increment usage count
            await prisma.tag.update({
              where: { id: tag.id },
              data: { usageCount: { increment: 1 } }
            });
          }

          tagIds.push(tag.id);
        }
      }

      // Create question
      const question = await prisma.question.create({
        data: {
          title: title.trim(),
          description: description.trim(),
          slug,
          authorId: userId,
          tags: {
            connect: tagIds.map(id => ({ id }))
          }
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              avatar: true,
              reputation: true
            }
          },
          tags: {
            select: {
              id: true,
              name: true,
              color: true
            }
          }
        }
      });

      logger.info(`Question created: ${question.id} by user ${userId}`);

      res.status(201).json({
        message: 'Question created successfully',
        question
      });

    } catch (error) {
      logger.error('Create question failed:', error);
      throw error;
    }
  }

  /**
   * Update a question
   */
  static async updateQuestion(req: Request, res: Response): Promise<void> {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed: ' + errors.array().map(e => e.msg).join(', '));
    }

    try {
      const { id } = req.params;
      const { title, description, tags } = req.body;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      // Find existing question
      const existingQuestion = await prisma.question.findUnique({
        where: { id, isDeleted: false },
        include: { tags: true }
      });

      if (!existingQuestion) {
        throw new NotFoundError('Question');
      }

      // Check permissions
      if (existingQuestion.authorId !== userId && !['ADMIN', 'MODERATOR'].includes(userRole)) {
        throw new ForbiddenError('You can only edit your own questions');
      }

      // Update data
      const updateData: any = {};

      if (title !== undefined) {
        updateData.title = title.trim();
        
        // Generate new slug if title changed
        if (title.trim() !== existingQuestion.title) {
          let baseSlug = slugify(title, { lower: true, strict: true });
          let slug = baseSlug;
          let counter = 1;

          while (await prisma.question.findFirst({ 
            where: { slug, id: { not: id } } 
          })) {
            slug = `${baseSlug}-${counter}`;
            counter++;
          }
          updateData.slug = slug;
        }
      }

      if (description !== undefined) {
        updateData.description = description.trim();
      }

      // Handle tags update
      if (tags !== undefined && Array.isArray(tags)) {
        // Disconnect old tags and decrement their usage count
        for (const oldTag of existingQuestion.tags) {
          await prisma.tag.update({
            where: { id: oldTag.id },
            data: { usageCount: { decrement: 1 } }
          });
        }

        // Process new tags
        const tagIds: string[] = [];
        for (const tagName of tags) {
          const normalizedName = tagName.trim().toLowerCase();
          
          let tag = await prisma.tag.findUnique({
            where: { name: normalizedName }
          });

          if (!tag) {
            tag = await prisma.tag.create({
              data: {
                name: normalizedName,
                usageCount: 1
              }
            });
          } else {
            await prisma.tag.update({
              where: { id: tag.id },
              data: { usageCount: { increment: 1 } }
            });
          }

          tagIds.push(tag.id);
        }

        updateData.tags = {
          set: tagIds.map(id => ({ id }))
        };
      }

      // Update question
      const updatedQuestion = await prisma.question.update({
        where: { id },
        data: updateData,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              avatar: true,
              reputation: true
            }
          },
          tags: {
            select: {
              id: true,
              name: true,
              color: true
            }
          }
        }
      });

      logger.info(`Question updated: ${id} by user ${userId}`);

      res.json({
        message: 'Question updated successfully',
        question: updatedQuestion
      });

    } catch (error) {
      logger.error('Update question failed:', error);
      throw error;
    }
  }

  /**
   * Delete a question
   */
  static async deleteQuestion(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      const question = await prisma.question.findUnique({
        where: { id, isDeleted: false },
        include: { tags: true }
      });

      if (!question) {
        throw new NotFoundError('Question');
      }

      // Check permissions
      if (question.authorId !== userId && !['ADMIN', 'MODERATOR'].includes(userRole)) {
        throw new ForbiddenError('You can only delete your own questions');
      }

      // Soft delete
      await prisma.question.update({
        where: { id },
        data: { isDeleted: true }
      });

      // Decrement tag usage counts
      for (const tag of question.tags) {
        await prisma.tag.update({
          where: { id: tag.id },
          data: { usageCount: { decrement: 1 } }
        });
      }

      logger.info(`Question deleted: ${id} by user ${userId}`);

      res.json({
        message: 'Question deleted successfully'
      });

    } catch (error) {
      logger.error('Delete question failed:', error);
      throw error;
    }
  }

  /**
   * Vote on a question
   */
  static async voteQuestion(req: Request, res: Response): Promise<void> {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed: ' + errors.array().map(e => e.msg).join(', '));
    }

    try {
      const { id } = req.params;
      const { type } = req.body; // 'UPVOTE' or 'DOWNVOTE'
      const userId = req.user!.id;

      const question = await prisma.question.findUnique({
        where: { id, isDeleted: false }
      });

      if (!question) {
        throw new NotFoundError('Question');
      }

      // Users can't vote on their own questions
      if (question.authorId === userId) {
        throw new ForbiddenError('You cannot vote on your own question');
      }

      // Check existing vote
      const existingVote = await prisma.vote.findUnique({
        where: {
          userId_questionId: {
            userId,
            questionId: id
          }
        }
      });

      let voteChange = 0;

      if (existingVote) {
        if (existingVote.type === type) {
          // Remove vote (toggle off)
          await prisma.vote.delete({
            where: { id: existingVote.id }
          });
          voteChange = type === 'UPVOTE' ? -1 : 1;
        } else {
          // Change vote type
          await prisma.vote.update({
            where: { id: existingVote.id },
            data: { type }
          });
          voteChange = type === 'UPVOTE' ? 2 : -2;
        }
      } else {
        // Create new vote
        await prisma.vote.create({
          data: {
            type,
            userId,
            questionId: id
          }
        });
        voteChange = type === 'UPVOTE' ? 1 : -1;
      }

      // Update question vote count
      const updatedQuestion = await prisma.question.update({
        where: { id },
        data: {
          voteCount: { increment: voteChange }
        },
        select: {
          id: true,
          voteCount: true
        }
      });

      // Update author reputation (async)
      if (voteChange !== 0) {
        const reputationChange = type === 'UPVOTE' ? 
          (voteChange > 0 ? 5 : -5) : 
          (voteChange > 0 ? -2 : 2);

        prisma.user.update({
          where: { id: question.authorId },
          data: { reputation: { increment: reputationChange } }
        }).catch(error => {
          logger.warn('Failed to update reputation:', error);
        });
      }

      logger.info(`Question vote: ${type} on ${id} by user ${userId}`);

      res.json({
        message: 'Vote recorded successfully',
        question: updatedQuestion,
        voteType: existingVote?.type === type ? null : type
      });

    } catch (error) {
      logger.error('Vote question failed:', error);
      throw error;
    }
  }

  /**
   * Record a question view (private method)
   */
  private static async recordView(
    questionId: string, 
    userId: string | undefined, 
    ipAddress: string,
    userAgent: string | undefined
  ): Promise<void> {
    try {
      // Check if view already exists for this user/IP
      const existingView = await prisma.questionView.findFirst({
        where: {
          questionId,
          OR: [
            userId ? { userId } : {},
            { ipAddress }
          ]
        }
      });

      if (!existingView) {
        // Create new view record
        await prisma.questionView.create({
          data: {
            questionId,
            userId,
            ipAddress,
            userAgent
          }
        });

        // Increment view count
        await prisma.question.update({
          where: { id: questionId },
          data: { viewCount: { increment: 1 } }
        });
      }
    } catch (error) {
      logger.warn('Failed to record view:', error);
    }
  }
}

