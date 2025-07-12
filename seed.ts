import { PrismaClient } from '@prisma/client';
import { PasswordUtils } from '../utils/auth';
import { logger } from '../utils/logger';
import slugify from 'slugify';

const prisma = new PrismaClient();

async function main() {
  logger.info('🌱 Starting database seeding...');

  try {
    // Clear existing data (in development only)
    if (process.env.NODE_ENV === 'development') {
      logger.info('Clearing existing data...');
      
      await prisma.notification.deleteMany();
      await prisma.questionView.deleteMany();
      await prisma.vote.deleteMany();
      await prisma.comment.deleteMany();
      await prisma.answer.deleteMany();
      await prisma.question.deleteMany();
      await prisma.tag.deleteMany();
      await prisma.follow.deleteMany();
      await prisma.session.deleteMany();
      await prisma.user.deleteMany();
    }

    // Create sample users
    logger.info('Creating sample users...');
    
    const users = await Promise.all([
      prisma.user.create({
        data: {
          name: 'John Doe',
          email: 'john@example.com',
          password: await PasswordUtils.hash('password123'),
          role: 'ADMIN',
          bio: 'Full-stack developer with 10+ years of experience. Love helping others solve coding problems.',
          location: 'San Francisco, CA',
          website: 'https://johndoe.dev',
          reputation: 1250,
          isVerified: true
        }
      }),
      prisma.user.create({
        data: {
          name: 'Jane Smith',
          email: 'jane@example.com',
          password: await PasswordUtils.hash('password123'),
          role: 'MODERATOR',
          bio: 'Frontend specialist and UI/UX enthusiast. Always excited about new web technologies.',
          location: 'New York, NY',
          reputation: 890,
          isVerified: true
        }
      }),
      prisma.user.create({
        data: {
          name: 'Mike Johnson',
          email: 'mike@example.com',
          password: await PasswordUtils.hash('password123'),
          role: 'USER',
          bio: 'Backend developer focusing on scalable systems and database optimization.',
          location: 'Austin, TX',
          reputation: 650,
          isVerified: true
        }
      }),
      prisma.user.create({
        data: {
          name: 'Sarah Wilson',
          email: 'sarah@example.com',
          password: await PasswordUtils.hash('password123'),
          role: 'USER',
          bio: 'DevOps engineer passionate about automation and cloud infrastructure.',
          location: 'Seattle, WA',
          reputation: 420,
          isVerified: true
        }
      }),
      prisma.user.create({
        data: {
          name: 'Alex Chen',
          email: 'alex@example.com',
          password: await PasswordUtils.hash('password123'),
          role: 'USER',
          bio: 'Mobile app developer with expertise in React Native and Flutter.',
          location: 'Los Angeles, CA',
          reputation: 320,
          isVerified: false
        }
      })
    ]);

    logger.info(`Created ${users.length} users`);

    // Create sample tags
    logger.info('Creating sample tags...');
    
    const tags = await Promise.all([
      prisma.tag.create({
        data: {
          name: 'javascript',
          description: 'Questions about JavaScript programming language',
          color: '#F7DF1E',
          usageCount: 0
        }
      }),
      prisma.tag.create({
        data: {
          name: 'react',
          description: 'Questions about React.js library',
          color: '#61DAFB',
          usageCount: 0
        }
      }),
      prisma.tag.create({
        data: {
          name: 'nodejs',
          description: 'Questions about Node.js runtime',
          color: '#339933',
          usageCount: 0
        }
      }),
      prisma.tag.create({
        data: {
          name: 'typescript',
          description: 'Questions about TypeScript programming language',
          color: '#3178C6',
          usageCount: 0
        }
      }),
      prisma.tag.create({
        data: {
          name: 'python',
          description: 'Questions about Python programming language',
          color: '#3776AB',
          usageCount: 0
        }
      }),
      prisma.tag.create({
        data: {
          name: 'database',
          description: 'Questions about databases and SQL',
          color: '#336791',
          usageCount: 0
        }
      }),
      prisma.tag.create({
        data: {
          name: 'css',
          description: 'Questions about CSS styling',
          color: '#1572B6',
          usageCount: 0
        }
      }),
      prisma.tag.create({
        data: {
          name: 'api',
          description: 'Questions about APIs and web services',
          color: '#FF6B35',
          usageCount: 0
        }
      })
    ]);

    logger.info(`Created ${tags.length} tags`);

    // Create sample questions
    logger.info('Creating sample questions...');
    
    const questions = [
      {
        title: 'How to handle async/await errors in JavaScript?',
        description: `I'm working with async/await in JavaScript and I'm not sure about the best practices for error handling. 

Here's what I'm currently doing:

\`\`\`javascript
async function fetchData() {
  try {
    const response = await fetch('/api/data');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}
\`\`\`

Is this the right approach? Should I be handling errors differently? What about handling specific HTTP status codes?`,
        authorId: users[4].id, // Alex Chen
        tags: [tags[0].id, tags[3].id] // javascript, typescript
      },
      {
        title: 'React useState vs useReducer - when to use which?',
        description: `I'm building a React application and I'm confused about when to use useState vs useReducer. 

I have a component that manages a form with multiple fields and some complex state logic. Currently using useState:

\`\`\`jsx
const [formData, setFormData] = useState({
  name: '',
  email: '',
  preferences: []
});
\`\`\`

But I've heard useReducer might be better for complex state. Can someone explain the differences and provide guidance on when to use each?`,
        authorId: users[2].id, // Mike Johnson
        tags: [tags[1].id, tags[0].id] // react, javascript
      },
      {
        title: 'Best practices for Node.js API authentication?',
        description: `I'm building a REST API with Node.js and Express, and I need to implement authentication. I've been researching different approaches:

1. JWT tokens
2. Session-based auth
3. OAuth 2.0

What are the pros and cons of each approach? For a medium-sized application with both web and mobile clients, which would you recommend?

Also, how should I handle token refresh and logout functionality?`,
        authorId: users[1].id, // Jane Smith
        tags: [tags[2].id, tags[7].id] // nodejs, api
      },
      {
        title: 'PostgreSQL vs MongoDB for a new project?',
        description: `I'm starting a new project and trying to decide between PostgreSQL and MongoDB. The application will be:

- A social platform with user profiles
- Posts with comments and likes
- Real-time messaging
- Analytics and reporting

I'm comfortable with both SQL and NoSQL, but I want to make the right choice for scalability and maintainability. What factors should I consider?`,
        authorId: users[3].id, // Sarah Wilson
        tags: [tags[5].id] // database
      },
      {
        title: 'CSS Grid vs Flexbox for responsive layouts?',
        description: `I'm working on a responsive website and trying to understand when to use CSS Grid vs Flexbox. 

I know the basic differences:
- Flexbox is 1-dimensional
- Grid is 2-dimensional

But in practice, I often find myself unsure which to choose for specific layouts. Can someone provide practical examples and guidelines for when to use each?`,
        authorId: users[0].id, // John Doe
        tags: [tags[6].id] // css
      }
    ];

    const createdQuestions: any[] = [];
    for (const questionData of questions) {
      const slug = slugify(questionData.title, { lower: true, strict: true });
      
      const question = await prisma.question.create({
        data: {
          title: questionData.title,
          description: questionData.description,
          slug,
          authorId: questionData.authorId,
          tags: {
            connect: questionData.tags.map(id => ({ id }))
          },
          viewCount: Math.floor(Math.random() * 100) + 10,
          voteCount: Math.floor(Math.random() * 20) - 5
        }
      });

      createdQuestions.push(question);

      // Update tag usage counts
      await prisma.tag.updateMany({
        where: { id: { in: questionData.tags } },
        data: { usageCount: { increment: 1 } }
      });
    }

    logger.info(`Created ${createdQuestions.length} questions`);

    // Create sample answers
    logger.info('Creating sample answers...');
    
    const answers = [
      {
        content: `Great question! Your approach is on the right track, but there are a few improvements you can make:

\`\`\`javascript
async function fetchData() {
  try {
    const response = await fetch('/api/data');
    
    // Check if the response is ok
    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    // Handle different types of errors
    if (error instanceof TypeError) {
      console.error('Network error:', error.message);
    } else {
      console.error('API error:', error.message);
    }
    
    // Re-throw or handle as needed
    throw error;
  }
}
\`\`\`

Key improvements:
1. Check \`response.ok\` to handle HTTP errors
2. Differentiate between network and API errors
3. Provide meaningful error messages`,
        questionId: createdQuestions[0].id,
        authorId: users[0].id, // John Doe
        isAccepted: true,
        voteCount: 15
      },
      {
        content: `The choice between useState and useReducer depends on the complexity of your state logic:

**Use useState when:**
- Simple state updates
- Independent state variables
- Straightforward logic

**Use useReducer when:**
- Complex state logic
- Multiple sub-values
- State transitions depend on previous state

For your form example, useReducer would be better:

\`\`\`jsx
const formReducer = (state, action) => {
  switch (action.type) {
    case 'UPDATE_FIELD':
      return { ...state, [action.field]: action.value };
    case 'RESET_FORM':
      return initialState;
    default:
      return state;
  }
};

const [formData, dispatch] = useReducer(formReducer, initialState);
\`\`\`

This makes state updates more predictable and easier to test.`,
        questionId: createdQuestions[1].id,
        authorId: users[1].id, // Jane Smith
        voteCount: 12
      },
      {
        content: `For your use case, I'd recommend **JWT tokens** with the following setup:

**Pros of JWT:**
- Stateless (good for scaling)
- Works well with mobile apps
- Can include user info in the token

**Implementation strategy:**
1. Short-lived access tokens (15-30 minutes)
2. Longer refresh tokens (7-30 days)
3. Store refresh tokens securely (httpOnly cookies for web)

\`\`\`javascript
// Token refresh middleware
const refreshToken = async (req, res, next) => {
  const { refreshToken } = req.cookies;
  
  if (!refreshToken) {
    return res.status(401).json({ error: 'No refresh token' });
  }
  
  try {
    const decoded = jwt.verify(refreshToken, REFRESH_SECRET);
    const newAccessToken = generateAccessToken(decoded.userId);
    
    res.json({ accessToken: newAccessToken });
  } catch (error) {
    res.status(403).json({ error: 'Invalid refresh token' });
  }
};
\`\`\`

For logout, maintain a blacklist of invalidated tokens or use short expiration times.`,
        questionId: createdQuestions[2].id,
        authorId: users[2].id, // Mike Johnson
        isAccepted: true,
        voteCount: 18
      }
    ];

    for (const answerData of answers) {
      await prisma.answer.create({
        data: answerData
      });

      // Update question answer count
      await prisma.question.update({
        where: { id: answerData.questionId },
        data: { 
          answerCount: { increment: 1 },
          isResolved: answerData.isAccepted || false
        }
      });
    }

    logger.info(`Created ${answers.length} answers`);

    // Create some follows
    logger.info('Creating follow relationships...');
    
    const follows = [
      { followerId: users[1].id, followingId: users[0].id },
      { followerId: users[2].id, followingId: users[0].id },
      { followerId: users[3].id, followingId: users[1].id },
      { followerId: users[4].id, followingId: users[0].id },
      { followerId: users[0].id, followingId: users[1].id }
    ];

    for (const follow of follows) {
      await prisma.follow.create({ data: follow });
    }

    logger.info(`Created ${follows.length} follow relationships`);

    // Create some sample votes
    logger.info('Creating sample votes...');
    
    const votes = [
      { type: 'UPVOTE', userId: users[1].id, questionId: createdQuestions[0].id },
      { type: 'UPVOTE', userId: users[2].id, questionId: createdQuestions[0].id },
      { type: 'UPVOTE', userId: users[3].id, questionId: createdQuestions[1].id },
      { type: 'DOWNVOTE', userId: users[4].id, questionId: createdQuestions[2].id }
    ];

    for (const vote of votes) {
      await prisma.vote.create({ data: vote });
    }

    logger.info(`Created ${votes.length} votes`);

    logger.info('✅ Database seeding completed successfully!');
    
    // Print summary
    const summary = await Promise.all([
      prisma.user.count(),
      prisma.question.count(),
      prisma.answer.count(),
      prisma.tag.count(),
      prisma.vote.count(),
      prisma.follow.count()
    ]);

    logger.info(`
📊 Seeding Summary:
- Users: ${summary[0]}
- Questions: ${summary[1]}
- Answers: ${summary[2]}
- Tags: ${summary[3]}
- Votes: ${summary[4]}
- Follows: ${summary[5]}
    `);

  } catch (error) {
    logger.error('❌ Seeding failed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    logger.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

